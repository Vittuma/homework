import { useState, useEffect } from 'react'
import Head from 'next/head'
import {
  LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer,
  RadialBarChart, RadialBar, PolarAngleAxis
} from 'recharts'

interface NewsItem {
  title: string
  source: string
  url: string
  summary: string
  sentiment: 'positive' | 'negative' | 'neutral'
  publishedAt: string
  credibilityScore: number
}

interface Analysis {
  overallScore: number
  sentiment: string
  priceScore: number
  newsScore: number
  volumeScore: number
  momentumScore: number
  fakeNewsFlags: { title: string; reason: string; riskLevel: string }[]
  bullishFactors: string[]
  bearishFactors: string[]
  summary: string
  recommendation: string
  confidence: number
}

interface PricePoint { date: string; price: number; volume: number }

interface CryptoData {
  symbol: string
  priceData: Record<string, unknown> | null
  news: NewsItem[]
  analysis: Analysis
  historicalPrices: PricePoint[]
  timestamp: string
}

const QUICK_TOKENS = ['BTC', 'ETH', 'SOL', 'BNB', 'DOGE', 'ADA', 'XRP', 'AVAX', 'SUI', 'PEPE']

export default function Home() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<CryptoData | null>(null)
  const [error, setError] = useState('')
  const [loadingStep, setLoadingStep] = useState(0)

  const steps = [
    '🔍 Scanning news sources...',
    '📊 Fetching real-time price data...',
    '🧠 AI analyzing sentiment...',
    '🔎 Verifying news authenticity...',
    '📈 Computing bull/bear score...'
  ]

  useEffect(() => {
    if (!loading) return
    let i = 0
    const interval = setInterval(() => {
      i = (i + 1) % steps.length
      setLoadingStep(i)
    }, 1200)
    return () => clearInterval(interval)
  }, [loading])

  const analyze = async (sym?: string) => {
    const symbol = sym || input.trim()
    if (!symbol) return
    setLoading(true)
    setError('')
    setData(null)
    setLoadingStep(0)
    try {
      const res = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ symbol })
      })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      setData(json)
    } catch (e) {
      setError(String(e))
    } finally {
      setLoading(false)
    }
  }

  const score = data?.analysis?.overallScore ?? 0
  const scoreColor = score >= 70 ? '#00ff9d' : score >= 50 ? '#f0c93a' : score >= 30 ? '#ff8c42' : '#ff4d6d'
  const scoreBg = score >= 70 ? 'from-emerald-900/40' : score >= 50 ? 'from-yellow-900/40' : score >= 30 ? 'from-orange-900/40' : 'from-red-900/40'

  const radialData = data ? [
    { name: 'Score', value: data.analysis.overallScore, fill: scoreColor }
  ] : []

  return (
    <>
      <Head>
        <title>CryptoRadar — Bullish/Bearish AI Scanner</title>
        <meta name="description" content="Real-time crypto sentiment analysis with fake news detection" />
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@400;600;700;800&display=swap" />
      </Head>

      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body {
          background: #050a0e;
          color: #e0e8f0;
          font-family: 'Syne', sans-serif;
          min-height: 100vh;
          overflow-x: hidden;
        }
        .mono { font-family: 'Space Mono', monospace; }
        .grid-bg {
          background-image: 
            linear-gradient(rgba(0,255,157,0.03) 1px, transparent 1px),
            linear-gradient(90deg, rgba(0,255,157,0.03) 1px, transparent 1px);
          background-size: 40px 40px;
        }
        .glow-green { box-shadow: 0 0 30px rgba(0,255,157,0.15); }
        .glow-text { text-shadow: 0 0 20px rgba(0,255,157,0.5); }
        .card {
          background: rgba(255,255,255,0.03);
          border: 1px solid rgba(255,255,255,0.07);
          border-radius: 16px;
          backdrop-filter: blur(10px);
        }
        .card-green {
          background: rgba(0,255,157,0.04);
          border: 1px solid rgba(0,255,157,0.15);
        }
        .card-red {
          background: rgba(255,77,109,0.04);
          border: 1px solid rgba(255,77,109,0.15);
        }
        .score-ring {
          position: relative;
          display: inline-flex;
          align-items: center;
          justify-content: center;
        }
        .pulse {
          animation: pulse 2s infinite;
        }
        @keyframes pulse {
          0%, 100% { opacity: 1; }
          50% { opacity: 0.5; }
        }
        .scan-line {
          position: fixed;
          top: 0; left: 0; right: 0;
          height: 2px;
          background: linear-gradient(90deg, transparent, rgba(0,255,157,0.8), transparent);
          animation: scan 3s linear infinite;
          pointer-events: none;
          z-index: 100;
        }
        @keyframes scan {
          0% { top: 0; }
          100% { top: 100vh; }
        }
        .tag {
          display: inline-block;
          padding: 2px 10px;
          border-radius: 4px;
          font-size: 11px;
          font-family: 'Space Mono', monospace;
          font-weight: 700;
          letter-spacing: 0.05em;
        }
        .tag-bullish { background: rgba(0,255,157,0.15); color: #00ff9d; border: 1px solid rgba(0,255,157,0.3); }
        .tag-bearish { background: rgba(255,77,109,0.15); color: #ff4d6d; border: 1px solid rgba(255,77,109,0.3); }
        .tag-neutral { background: rgba(240,201,58,0.15); color: #f0c93a; border: 1px solid rgba(240,201,58,0.3); }
        .tag-positive { background: rgba(0,255,157,0.1); color: #00ff9d; }
        .tag-negative { background: rgba(255,77,109,0.1); color: #ff4d6d; }
        .tag-neutral-news { background: rgba(150,150,150,0.1); color: #aaa; }
        input:focus { outline: none; }
        .custom-tooltip {
          background: rgba(5,10,14,0.95) !important;
          border: 1px solid rgba(0,255,157,0.2) !important;
          border-radius: 8px;
          padding: 8px 12px;
        }
        .loader {
          display: flex;
          gap: 6px;
          align-items: center;
        }
        .dot {
          width: 8px; height: 8px;
          border-radius: 50%;
          background: #00ff9d;
          animation: bounce 1.2s infinite;
        }
        .dot:nth-child(2) { animation-delay: 0.2s; }
        .dot:nth-child(3) { animation-delay: 0.4s; }
        @keyframes bounce {
          0%,100% { transform: translateY(0); opacity: 0.3; }
          50% { transform: translateY(-8px); opacity: 1; }
        }
        .progress-bar {
          height: 6px;
          border-radius: 3px;
          background: rgba(255,255,255,0.05);
          overflow: hidden;
          position: relative;
        }
        .progress-fill {
          height: 100%;
          border-radius: 3px;
          transition: width 1s ease;
        }
        ::-webkit-scrollbar { width: 4px; }
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(0,255,157,0.2); border-radius: 2px; }
      `}</style>

      <div className="scan-line" />

      <div className="grid-bg" style={{ minHeight: '100vh' }}>
        {/* Header */}
        <div style={{ borderBottom: '1px solid rgba(255,255,255,0.05)', padding: '20px 0' }}>
          <div style={{ maxWidth: 1200, margin: '0 auto', padding: '0 24px', display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 10, height: 10, borderRadius: '50%', background: '#00ff9d', boxShadow: '0 0 10px #00ff9d' }} className="pulse" />
            <span className="mono" style={{ fontSize: 13, color: '#00ff9d', letterSpacing: '0.15em' }}>CRYPTO RADAR</span>
            <span style={{ marginLeft: 'auto', fontSize: 12, color: '#444', fontFamily: 'Space Mono' }}>LIVE · AI-POWERED</span>
          </div>
        </div>

        <div style={{ maxWidth: 1200, margin: '0 auto', padding: '40px 24px' }}>
          {/* Hero */}
          <div style={{ textAlign: 'center', marginBottom: 48 }}>
            <h1 style={{ fontSize: 'clamp(32px, 6vw, 64px)', fontWeight: 800, lineHeight: 1.1, letterSpacing: '-0.02em', marginBottom: 16 }}>
              Bull or Bear?{' '}
              <span style={{ color: '#00ff9d' }} className="glow-text">AI decides.</span>
            </h1>
            <p style={{ color: '#566', fontSize: 16, maxWidth: 500, margin: '0 auto' }}>
              Real-time news crawling · Fake news detection · 100-point sentiment score
            </p>
          </div>

          {/* Search */}
          <div style={{ maxWidth: 600, margin: '0 auto 32px' }}>
            <div className="card" style={{ display: 'flex', overflow: 'hidden', border: '1px solid rgba(0,255,157,0.2)' }}>
              <input
                value={input}
                onChange={e => setInput(e.target.value.toUpperCase())}
                onKeyDown={e => e.key === 'Enter' && analyze()}
                placeholder="Enter token symbol: BTC, ETH, SOL..."
                className="mono"
                style={{
                  flex: 1, background: 'transparent', border: 'none',
                  padding: '16px 20px', fontSize: 15, color: '#e0e8f0',
                  letterSpacing: '0.05em'
                }}
              />
              <button
                onClick={() => analyze()}
                disabled={loading}
                style={{
                  background: loading ? 'rgba(0,255,157,0.1)' : '#00ff9d',
                  color: loading ? '#00ff9d' : '#050a0e',
                  border: 'none', padding: '16px 28px',
                  fontSize: 14, fontWeight: 700, cursor: loading ? 'not-allowed' : 'pointer',
                  fontFamily: 'Space Mono', letterSpacing: '0.05em', transition: 'all 0.2s',
                  minWidth: 120
                }}
              >
                {loading ? <div className="loader"><div className="dot"/><div className="dot"/><div className="dot"/></div> : 'ANALYZE →'}
              </button>
            </div>

            {/* Quick picks */}
            <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', marginTop: 12, justifyContent: 'center' }}>
              {QUICK_TOKENS.map(t => (
                <button key={t} onClick={() => { setInput(t); analyze(t) }}
                  style={{
                    background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
                    color: '#888', padding: '5px 12px', borderRadius: 6, cursor: 'pointer',
                    fontSize: 12, fontFamily: 'Space Mono', letterSpacing: '0.05em',
                    transition: 'all 0.15s'
                  }}
                  onMouseOver={e => { (e.target as HTMLButtonElement).style.borderColor = 'rgba(0,255,157,0.3)'; (e.target as HTMLButtonElement).style.color = '#00ff9d' }}
                  onMouseOut={e => { (e.target as HTMLButtonElement).style.borderColor = 'rgba(255,255,255,0.08)'; (e.target as HTMLButtonElement).style.color = '#888' }}
                >
                  {t}
                </button>
              ))}
            </div>
          </div>

          {/* Loading state */}
          {loading && (
            <div style={{ textAlign: 'center', padding: '60px 0' }}>
              <div className="card" style={{ maxWidth: 400, margin: '0 auto', padding: '32px' }}>
                <div style={{ marginBottom: 24 }}>
                  {steps.map((step, i) => (
                    <div key={i} style={{
                      display: 'flex', alignItems: 'center', gap: 10,
                      padding: '8px 0', opacity: loadingStep === i ? 1 : 0.3,
                      transition: 'opacity 0.3s'
                    }}>
                      <span>{loadingStep === i ? '▶' : loadingStep > i ? '✓' : '○'}</span>
                      <span style={{ fontSize: 13, fontFamily: 'Space Mono' }}>{step}</span>
                    </div>
                  ))}
                </div>
                <div className="progress-bar">
                  <div className="progress-fill" style={{
                    width: `${((loadingStep + 1) / steps.length) * 100}%`,
                    background: 'linear-gradient(90deg, #00ff9d, #00cfff)'
                  }} />
                </div>
              </div>
            </div>
          )}

          {/* Error */}
          {error && (
            <div className="card" style={{ background: 'rgba(255,77,109,0.05)', border: '1px solid rgba(255,77,109,0.2)', padding: 16, textAlign: 'center', color: '#ff4d6d', fontFamily: 'Space Mono', fontSize: 13 }}>
              ⚠ {error}
            </div>
          )}

          {/* Results */}
          {data && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 24 }}>
              {/* Top row: Score + Price */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: 20 }}>
                {/* Score card */}
                <div className={`card bg-gradient-to-br ${scoreBg} to-transparent`} style={{ padding: 32, textAlign: 'center' }}>
                  <div style={{ fontSize: 12, color: '#556', fontFamily: 'Space Mono', letterSpacing: '0.1em', marginBottom: 16 }}>BULL/BEAR SCORE</div>
                  
                  <div style={{ position: 'relative', width: 200, height: 200, margin: '0 auto 16px' }}>
                    <ResponsiveContainer width="100%" height="100%">
                      <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={radialData} startAngle={90} endAngle={-270}>
                        <PolarAngleAxis type="number" domain={[0, 100]} tick={false} />
                        <RadialBar dataKey="value" background={{ fill: 'rgba(255,255,255,0.05)' }} cornerRadius={10} />
                      </RadialBarChart>
                    </ResponsiveContainer>
                    <div style={{ position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
                      <div style={{ fontSize: 48, fontWeight: 800, color: scoreColor, fontFamily: 'Space Mono', lineHeight: 1 }}>{score}</div>
                      <div style={{ fontSize: 11, color: '#556', marginTop: 4 }}>/ 100</div>
                    </div>
                  </div>

                  <div style={{ fontSize: 20, fontWeight: 700, color: scoreColor, marginBottom: 8 }}>{data.analysis.sentiment}</div>
                  <div style={{ fontSize: 12, color: '#556', fontFamily: 'Space Mono' }}>
                    {data.analysis.recommendation} · {data.analysis.confidence}% confidence
                  </div>
                  
                  <div style={{ marginTop: 20, display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 8 }}>
                    {[
                      { label: 'Price', val: data.analysis.priceScore },
                      { label: 'News', val: data.analysis.newsScore },
                      { label: 'Volume', val: data.analysis.volumeScore },
                      { label: 'Momentum', val: data.analysis.momentumScore },
                    ].map(({ label, val }) => (
                      <div key={label} style={{ textAlign: 'left' }}>
                        <div style={{ fontSize: 11, color: '#556', fontFamily: 'Space Mono', marginBottom: 4 }}>{label}</div>
                        <div className="progress-bar">
                          <div className="progress-fill" style={{
                            width: `${val}%`,
                            background: val >= 60 ? '#00ff9d' : val >= 40 ? '#f0c93a' : '#ff4d6d'
                          }} />
                        </div>
                        <div style={{ fontSize: 11, color: '#888', marginTop: 2, fontFamily: 'Space Mono' }}>{val}/100</div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Price data */}
                <div className="card" style={{ padding: 24 }}>
                  <div style={{ fontSize: 12, color: '#556', fontFamily: 'Space Mono', letterSpacing: '0.1em', marginBottom: 16 }}>PRICE DATA · REAL-TIME</div>
                  
                  {data.priceData ? (
                    <>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 20 }}>
                        <div>
                          <div style={{ fontSize: 36, fontWeight: 800, fontFamily: 'Space Mono', color: '#e0e8f0' }}>
                            ${Number(data.priceData.current_price).toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 6 })}
                          </div>
                          <div style={{ fontSize: 13, color: Number(data.priceData.price_change_percentage_24h) >= 0 ? '#00ff9d' : '#ff4d6d', fontFamily: 'Space Mono', marginTop: 4 }}>
                            {Number(data.priceData.price_change_percentage_24h) >= 0 ? '+' : ''}{Number(data.priceData.price_change_percentage_24h).toFixed(2)}% (24h)
                          </div>
                        </div>
                        <div style={{ textAlign: 'right' }}>
                          <img src={data.priceData.image as string} alt="logo" style={{ width: 48, height: 48, borderRadius: '50%' }} />
                          <div style={{ fontSize: 11, color: '#556', marginTop: 4 }}>{data.priceData.name as string}</div>
                        </div>
                      </div>

                      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12 }}>
                        {[
                          { label: 'Volume 24h', val: '$' + (Number(data.priceData.total_volume) / 1e9).toFixed(2) + 'B' },
                          { label: 'Market Cap', val: '$' + (Number(data.priceData.market_cap) / 1e9).toFixed(2) + 'B' },
                          { label: '24h High', val: '$' + Number(data.priceData.high_24h).toLocaleString() },
                          { label: '24h Low', val: '$' + Number(data.priceData.low_24h).toLocaleString() },
                          { label: 'ATH', val: '$' + Number(data.priceData.ath).toLocaleString() },
                          { label: 'From ATH', val: Number(data.priceData.ath_change_percentage).toFixed(1) + '%' },
                        ].map(({ label, val }) => (
                          <div key={label} className="card" style={{ padding: '10px 12px' }}>
                            <div style={{ fontSize: 10, color: '#556', fontFamily: 'Space Mono', marginBottom: 2 }}>{label}</div>
                            <div style={{ fontSize: 14, fontFamily: 'Space Mono', fontWeight: 700 }}>{val}</div>
                          </div>
                        ))}
                      </div>
                    </>
                  ) : (
                    <div style={{ color: '#556', textAlign: 'center', padding: 40 }}>Price data unavailable for this token</div>
                  )}
                </div>
              </div>

              {/* Summary */}
              <div className="card" style={{ padding: 24, background: 'rgba(0,255,157,0.02)', borderColor: 'rgba(0,255,157,0.1)' }}>
                <div style={{ fontSize: 12, color: '#556', fontFamily: 'Space Mono', letterSpacing: '0.1em', marginBottom: 12 }}>AI ANALYSIS SUMMARY</div>
                <p style={{ color: '#ccc', lineHeight: 1.7, fontSize: 15 }}>{data.analysis.summary}</p>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20, marginTop: 20 }}>
                  <div>
                    <div style={{ fontSize: 12, color: '#00ff9d', fontFamily: 'Space Mono', marginBottom: 10 }}>▲ BULLISH FACTORS</div>
                    {data.analysis.bullishFactors.map((f, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                        <span style={{ color: '#00ff9d', marginTop: 1 }}>+</span>
                        <span style={{ fontSize: 13, color: '#aaa' }}>{f}</span>
                      </div>
                    ))}
                  </div>
                  <div>
                    <div style={{ fontSize: 12, color: '#ff4d6d', fontFamily: 'Space Mono', marginBottom: 10 }}>▼ BEARISH FACTORS</div>
                    {data.analysis.bearishFactors.map((f, i) => (
                      <div key={i} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 6 }}>
                        <span style={{ color: '#ff4d6d', marginTop: 1 }}>−</span>
                        <span style={{ fontSize: 13, color: '#aaa' }}>{f}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>

              {/* Price chart */}
              {data.historicalPrices.length > 0 && (
                <div className="card" style={{ padding: 24 }}>
                  <div style={{ fontSize: 12, color: '#556', fontFamily: 'Space Mono', letterSpacing: '0.1em', marginBottom: 20 }}>7-DAY PRICE CHART</div>
                  <ResponsiveContainer width="100%" height={200}>
                    <LineChart data={data.historicalPrices}>
                      <XAxis dataKey="date" tick={{ fill: '#445', fontSize: 11, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} />
                      <YAxis tick={{ fill: '#445', fontSize: 11, fontFamily: 'Space Mono' }} axisLine={false} tickLine={false} width={80}
                        tickFormatter={v => '$' + (v >= 1000 ? (v/1000).toFixed(1)+'k' : v.toFixed(2))} />
                      <Tooltip
                        contentStyle={{ background: '#050a0e', border: '1px solid rgba(0,255,157,0.2)', borderRadius: 8, fontFamily: 'Space Mono', fontSize: 12 }}
                        labelStyle={{ color: '#556' }}
                        itemStyle={{ color: '#00ff9d' }}
                        formatter={(v: number) => ['$' + v.toLocaleString(), 'Price']}
                      />
                      <Line type="monotone" dataKey="price" stroke="#00ff9d" strokeWidth={2} dot={false} activeDot={{ r: 4, fill: '#00ff9d' }} />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}

              {/* Fake news detection */}
              {data.analysis.fakeNewsFlags.length > 0 && (
                <div className="card" style={{ padding: 24, background: 'rgba(255,140,66,0.03)', borderColor: 'rgba(255,140,66,0.15)' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
                    <span style={{ fontSize: 18 }}>⚠️</span>
                    <div style={{ fontSize: 12, color: '#ff8c42', fontFamily: 'Space Mono', letterSpacing: '0.1em' }}>FAKE NEWS DETECTION</div>
                  </div>
                  {data.analysis.fakeNewsFlags.map((flag, i) => (
                    <div key={i} className="card" style={{ padding: '12px 16px', marginBottom: 10, borderColor: flag.riskLevel === 'high' ? 'rgba(255,77,109,0.3)' : 'rgba(255,140,66,0.2)' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12 }}>
                        <div style={{ fontSize: 13, color: '#ccc', marginBottom: 6, flex: 1 }}>"{flag.title}"</div>
                        <span className="tag" style={{
                          background: flag.riskLevel === 'high' ? 'rgba(255,77,109,0.15)' : flag.riskLevel === 'medium' ? 'rgba(255,140,66,0.15)' : 'rgba(240,201,58,0.15)',
                          color: flag.riskLevel === 'high' ? '#ff4d6d' : flag.riskLevel === 'medium' ? '#ff8c42' : '#f0c93a',
                          border: 'none', whiteSpace: 'nowrap'
                        }}>
                          {flag.riskLevel.toUpperCase()} RISK
                        </span>
                      </div>
                      <div style={{ fontSize: 12, color: '#666' }}>{flag.reason}</div>
                    </div>
                  ))}
                </div>
              )}

              {/* News list */}
              {data.news.length > 0 && (
                <div className="card" style={{ padding: 24 }}>
                  <div style={{ fontSize: 12, color: '#556', fontFamily: 'Space Mono', letterSpacing: '0.1em', marginBottom: 16 }}>
                    LATEST NEWS · {data.news.length} SOURCES
                  </div>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {data.news.map((item, i) => (
                      <div key={i} className="card" style={{ padding: '14px 16px', transition: 'border-color 0.2s' }}
                        onMouseOver={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.15)'}
                        onMouseOut={e => (e.currentTarget as HTMLDivElement).style.borderColor = 'rgba(255,255,255,0.07)'}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 12, marginBottom: 8 }}>
                          <a href={item.url} target="_blank" rel="noopener noreferrer"
                            style={{ fontSize: 14, fontWeight: 600, color: '#e0e8f0', textDecoration: 'none', flex: 1, lineHeight: 1.4 }}>
                            {item.title}
                          </a>
                          <span className={`tag tag-${item.sentiment === 'positive' ? 'bullish' : item.sentiment === 'negative' ? 'bearish' : 'neutral'}`}>
                            {item.sentiment.toUpperCase()}
                          </span>
                        </div>
                        <p style={{ fontSize: 12, color: '#666', lineHeight: 1.6, marginBottom: 8 }}>{item.summary}</p>
                        <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
                          <span style={{ fontSize: 11, color: '#445', fontFamily: 'Space Mono' }}>{item.source}</span>
                          {item.publishedAt && <span style={{ fontSize: 11, color: '#334', fontFamily: 'Space Mono' }}>{item.publishedAt}</span>}
                          <div style={{ marginLeft: 'auto', display: 'flex', alignItems: 'center', gap: 6 }}>
                            <span style={{ fontSize: 10, color: '#445', fontFamily: 'Space Mono' }}>CREDIBILITY</span>
                            <div style={{ display: 'flex', gap: 2 }}>
                              {[...Array(10)].map((_, j) => (
                                <div key={j} style={{
                                  width: 6, height: 6, borderRadius: 1,
                                  background: j < item.credibilityScore ? '#00ff9d' : 'rgba(255,255,255,0.05)'
                                }} />
                              ))}
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Footer timestamp */}
              <div style={{ textAlign: 'center', fontSize: 11, color: '#334', fontFamily: 'Space Mono' }}>
                Last updated: {new Date(data.timestamp).toLocaleString('vi-VN')} · Powered by Claude AI
              </div>
            </div>
          )}

          {/* Empty state */}
          {!loading && !data && !error && (
            <div style={{ textAlign: 'center', padding: '60px 0', color: '#334' }}>
              <div style={{ fontSize: 60, marginBottom: 16 }}>📡</div>
              <div style={{ fontFamily: 'Space Mono', fontSize: 13 }}>Enter a token symbol to begin scanning</div>
            </div>
          )}
        </div>
      </div>
    </>
  )
}
