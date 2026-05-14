/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'
import { supabaseAdmin } from '@/lib/supabase'

const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY })

async function getCachedAnalysis(coinId: string) {
  const { data } = await supabaseAdmin
    .from('ai_analyses')
    .select('*')
    .eq('coin_id', coinId)
    .gt('expires_at', new Date().toISOString())
    .order('created_at', { ascending: false })
    .limit(1)
    .single()
  return data
}

async function getCachedNews(coinId: string) {
  const { data } = await supabaseAdmin
    .from('news_articles')
    .select('*')
    .eq('coin_id', coinId)
    .order('published_at', { ascending: false })
    .limit(10)
  return data || []
}

async function fetchCryptoPrice(symbol: string) {
  try {
    const coin = symbol.toLowerCase().replace('usdt','').replace('usd','')
    let resp = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coin}&sparkline=false&price_change_percentage=24h,7d`)
    let data = await resp.json()
    if (data?.[0]) return data[0]
    const search = await fetch(`https://api.coingecko.com/api/v3/search?query=${coin}`)
    const sd = await search.json()
    const coinId = sd?.coins?.[0]?.id
    if (!coinId) return null
    resp = await fetch(`https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinId}&sparkline=false&price_change_percentage=24h,7d`)
    data = await resp.json()
    return data?.[0] || null
  } catch { return null }
}

async function fetchAndStoreNews(symbol: string, coinId: string) {
  try {
    const response: any = await (anthropic.messages.create as any)({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: `Search for the latest crypto news about ${symbol} from the last 24-48 hours from CoinDesk, CoinTelegraph, Decrypt, The Block, CryptoSlate. Return ONLY a JSON array with objects: title, source, url, summary, sentiment (positive/negative/neutral), publishedAt, credibilityScore (1-10).`
      }]
    })
    const textBlock = (response.content as any[]).find((b: any) => b.type === 'text')
    if (!textBlock) return []
    const jsonMatch = textBlock.text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []
    const news = JSON.parse(jsonMatch[0])

    // Store in Supabase
    const articles = news.map((n: any) => ({
      coin_id: coinId,
      title: n.title,
      url: n.url || `https://cryptonews.com/${Date.now()}`,
      source: n.source,
      summary: n.summary,
      sentiment: n.sentiment,
      credibility: n.credibilityScore,
      published_at: n.publishedAt ? new Date(n.publishedAt).toISOString() : new Date().toISOString()
    }))

    await supabaseAdmin.from('news_articles').upsert(articles, { onConflict: 'url', ignoreDuplicates: true })
    return news
  } catch { return [] }
}

async function analyzeAndStore(symbol: string, coinId: string, priceData: any, news: any[]) {
  const priceCtx = priceData ? `Price: $${priceData.current_price}, 24h: ${Number(priceData.price_change_percentage_24h).toFixed(2)}%, 7d: ${Number(priceData.price_change_percentage_7d_in_currency).toFixed(2)}%, Vol: $${Number(priceData.total_volume).toLocaleString()}, MCap: $${Number(priceData.market_cap).toLocaleString()}` : 'No price data'
  const newsCtx = news.length > 0 ? news.map((n: any) => `[${n.source || n.credibilityScore}] ${n.title}: ${n.summary}`).join('\n') : 'No news'

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `Analyze ${symbol} crypto. Return ONLY JSON:
{"overallScore":<0-100>,"sentiment":"<Extremely Bearish|Bearish|Slightly Bearish|Neutral|Slightly Bullish|Bullish|Extremely Bullish>","priceScore":<0-100>,"newsScore":<0-100>,"volumeScore":<0-100>,"momentumScore":<0-100>,"fakeNewsFlags":[{"title":"...","reason":"...","riskLevel":"low|medium|high"}],"bullishFactors":["..."],"bearishFactors":["..."],"summary":"...","recommendation":"Buy|Hold|Sell|Strong Buy|Strong Sell","confidence":<0-100>}

PRICE: ${priceCtx}
NEWS: ${newsCtx}`
    }]
  })

  const textContent = response.content.find(b => b.type === 'text')
  if (!textContent || textContent.type !== 'text') throw new Error('No response')
  const jsonMatch = textContent.text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Invalid JSON')
  const analysis = JSON.parse(jsonMatch[0])

  // Store in Supabase
  await supabaseAdmin.from('ai_analyses').insert({
    coin_id: coinId,
    overall_score: analysis.overallScore,
    price_score: analysis.priceScore,
    news_score: analysis.newsScore,
    volume_score: analysis.volumeScore,
    momentum_score: analysis.momentumScore,
    bullish_factors: analysis.bullishFactors,
    bearish_factors: analysis.bearishFactors,
    fake_flags: analysis.fakeNewsFlags,
    summary: analysis.summary,
    confidence: analysis.confidence,
    expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString()
  })

  // Update coin score
  await supabaseAdmin.from('coins').upsert({
    id: coinId,
    symbol: symbol.toUpperCase(),
    name: priceData?.name || symbol,
    image: priceData?.image,
    score: analysis.overallScore,
    sentiment: analysis.sentiment,
    recommendation: analysis.recommendation,
    price: priceData?.current_price,
    change_24h: priceData?.price_change_percentage_24h,
    volume_24h: priceData?.total_volume,
    market_cap: priceData?.market_cap,
    updated_at: new Date().toISOString()
  })

  return analysis
}

async function fetchHistoricalPrices(symbol: string) {
  try {
    const coin = symbol.toLowerCase().replace('usdt','').replace('usd','')
    const search = await fetch(`https://api.coingecko.com/api/v3/search?query=${coin}`)
    const sd = await search.json()
    const coinId = sd?.coins?.[0]?.id || coin
    const resp = await fetch(`https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=7&interval=daily`)
    if (!resp.ok) return []
    const data = await resp.json()
    return (data.prices || []).map(([ts, price]: [number, number]) => ({
      date: new Date(ts).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }),
      price: parseFloat(price.toFixed(4))
    }))
  } catch { return [] }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { symbol } = req.body
  if (!symbol) return res.status(400).json({ error: 'Symbol required' })

  const coinId = symbol.toLowerCase().replace('usdt','').replace('usd','')

  try {
    // Check cache first
    const [cachedAnalysis, cachedNews] = await Promise.all([
      getCachedAnalysis(coinId),
      getCachedNews(coinId)
    ])

    let priceData = null
    let news = cachedNews
    let analysis = cachedAnalysis
    let fromCache = false

    if (cachedAnalysis && cachedNews.length > 0) {
      // Use cache
      fromCache = true
      priceData = await fetchCryptoPrice(symbol)
      analysis = {
        overallScore: cachedAnalysis.overall_score,
        sentiment: cachedAnalysis.sentiment || 'Neutral',
        priceScore: cachedAnalysis.price_score,
        newsScore: cachedAnalysis.news_score,
        volumeScore: cachedAnalysis.volume_score,
        momentumScore: cachedAnalysis.momentum_score,
        fakeNewsFlags: cachedAnalysis.fake_flags || [],
        bullishFactors: cachedAnalysis.bullish_factors || [],
        bearishFactors: cachedAnalysis.bearish_factors || [],
        summary: cachedAnalysis.summary,
        recommendation: cachedAnalysis.recommendation || 'Hold',
        confidence: cachedAnalysis.confidence
      }
    } else {
      // Fresh fetch
      const [pd, freshNews, histPrices] = await Promise.all([
        fetchCryptoPrice(symbol),
        fetchAndStoreNews(symbol, coinId),
        fetchHistoricalPrices(symbol)
      ])
      priceData = pd
      news = freshNews
      analysis = await analyzeAndStore(symbol, coinId, priceData, news)
      
      const historicalPrices = histPrices
      return res.json({
        symbol: symbol.toUpperCase(),
        priceData,
        news,
        analysis,
        historicalPrices,
        fromCache: false,
        timestamp: new Date().toISOString()
      })
    }

    const historicalPrices = await fetchHistoricalPrices(symbol)

    res.json({
      symbol: symbol.toUpperCase(),
      priceData,
      news: news.map((n: any) => ({
        title: n.title,
        source: n.source,
        url: n.url,
        summary: n.summary,
        sentiment: n.sentiment,
        publishedAt: n.published_at,
        credibilityScore: n.credibility
      })),
      analysis,
      historicalPrices,
      fromCache,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Analysis failed', details: String(error) })
  }
}
