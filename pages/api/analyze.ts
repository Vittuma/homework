/* eslint-disable @typescript-eslint/no-explicit-any */
import type { NextApiRequest, NextApiResponse } from 'next'
import Anthropic from '@anthropic-ai/sdk'

const anthropic = new Anthropic({
  apiKey: process.env.ANTHROPIC_API_KEY,
})

async function fetchCryptoPrice(symbol: string) {
  try {
    const coin = symbol.toLowerCase().replace('usdt', '').replace('usd', '')
    let resp = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coin}&sparkline=false&price_change_percentage=24h,7d`
    )
    let data = await resp.json()
    if (data && data[0]) return data[0]

    // Try searching by symbol
    const searchResp = await fetch(`https://api.coingecko.com/api/v3/search?query=${coin}`)
    const searchData = await searchResp.json()
    const coinId = searchData?.coins?.[0]?.id
    if (!coinId) return null

    resp = await fetch(
      `https://api.coingecko.com/api/v3/coins/markets?vs_currency=usd&ids=${coinId}&sparkline=false&price_change_percentage=24h,7d`
    )
    data = await resp.json()
    return data?.[0] || null
  } catch {
    return null
  }
}

async function fetchNews(symbol: string) {
  try {
    const response: any = await (anthropic.messages.create as any)({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 2000,
      tools: [{ type: 'web_search_20250305', name: 'web_search' }],
      messages: [{
        role: 'user',
        content: `Search for the latest crypto news about ${symbol} cryptocurrency from the last 24-48 hours. Search multiple sources: CoinDesk, CoinTelegraph, Decrypt, The Block, CryptoSlate. Find at least 5-8 recent news items. Return ONLY a JSON array (no markdown, no explanation) with objects having these exact fields: title, source, url, summary, sentiment (positive/negative/neutral), publishedAt, credibilityScore (1-10 based on source reputation where 10=most credible).`
      }]
    })

    const textBlock = (response.content as any[]).find((b: any) => b.type === 'text')
    if (!textBlock) return []
    const text: string = textBlock.text.trim()
    const jsonMatch = text.match(/\[[\s\S]*\]/)
    if (!jsonMatch) return []
    return JSON.parse(jsonMatch[0])
  } catch {
    return []
  }
}

async function analyzeAndScore(symbol: string, priceData: any, news: any[]) {
  const priceContext = priceData ? `
Current Price: $${priceData.current_price}
24h Change: ${Number(priceData.price_change_percentage_24h).toFixed(2)}%
7d Change: ${Number(priceData.price_change_percentage_7d_in_currency).toFixed(2)}%
Volume 24h: $${Number(priceData.total_volume).toLocaleString()}
Market Cap: $${Number(priceData.market_cap).toLocaleString()}
24h High: $${priceData.high_24h}
24h Low: $${priceData.low_24h}
ATH: $${priceData.ath}
ATH Change %: ${Number(priceData.ath_change_percentage).toFixed(2)}%
` : 'Price data unavailable'

  const newsContext = news.length > 0
    ? news.map((n: any) => `- [${n.source}] ${n.title}: ${n.summary} (Credibility: ${n.credibilityScore}/10)`).join('\n')
    : 'No news found'

  const response = await anthropic.messages.create({
    model: 'claude-sonnet-4-20250514',
    max_tokens: 2000,
    messages: [{
      role: 'user',
      content: `You are a crypto market analyst. Analyze ${symbol} and provide a comprehensive bullish/bearish score.

PRICE DATA:
${priceContext}

RECENT NEWS:
${newsContext}

Respond ONLY with a JSON object (no markdown, no explanation):
{
  "overallScore": <0-100, where 0=extremely bearish, 50=neutral, 100=extremely bullish>,
  "sentiment": "<Extremely Bearish|Bearish|Slightly Bearish|Neutral|Slightly Bullish|Bullish|Extremely Bullish>",
  "priceScore": <0-100>,
  "newsScore": <0-100>,
  "volumeScore": <0-100>,
  "momentumScore": <0-100>,
  "fakeNewsFlags": [
    {"title": "<suspicious headline>", "reason": "<why it seems suspicious or misleading>", "riskLevel": "<low|medium|high>"}
  ],
  "bullishFactors": ["<factor1>", "<factor2>", "<factor3>"],
  "bearishFactors": ["<factor1>", "<factor2>", "<factor3>"],
  "summary": "<2-3 sentence market summary>",
  "recommendation": "<Buy|Hold|Sell|Strong Buy|Strong Sell>",
  "confidence": <0-100>
}`
    }]
  })

  const textContent = response.content.find(b => b.type === 'text')
  if (!textContent || textContent.type !== 'text') throw new Error('No response')
  const text = textContent.text.trim()
  const jsonMatch = text.match(/\{[\s\S]*\}/)
  if (!jsonMatch) throw new Error('Invalid JSON')
  return JSON.parse(jsonMatch[0])
}

async function fetchHistoricalPrices(symbol: string) {
  try {
    const coin = symbol.toLowerCase().replace('usdt', '').replace('usd', '')
    const searchResp = await fetch(`https://api.coingecko.com/api/v3/search?query=${coin}`)
    const searchData = await searchResp.json()
    const coinId = searchData?.coins?.[0]?.id || coin

    const resp = await fetch(
      `https://api.coingecko.com/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=7&interval=daily`
    )
    if (!resp.ok) return []
    const data = await resp.json()
    return (data.prices || []).map(([timestamp, price]: [number, number]) => ({
      date: new Date(timestamp).toLocaleDateString('vi-VN', { month: 'short', day: 'numeric' }),
      price: parseFloat(price.toFixed(4))
    }))
  } catch {
    return []
  }
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' })
  const { symbol } = req.body
  if (!symbol) return res.status(400).json({ error: 'Symbol required' })

  try {
    const [priceData, news, historicalPrices] = await Promise.all([
      fetchCryptoPrice(symbol),
      fetchNews(symbol),
      fetchHistoricalPrices(symbol)
    ])

    const analysis = await analyzeAndScore(symbol, priceData, news)

    res.json({
      symbol: symbol.toUpperCase(),
      priceData,
      news,
      analysis,
      historicalPrices,
      timestamp: new Date().toISOString()
    })
  } catch (error) {
    console.error(error)
    res.status(500).json({ error: 'Analysis failed', details: String(error) })
  }
}
