import { useState, useEffect } from 'react'
import Head from 'next/head'
import { LineChart, Line, XAxis, YAxis, Tooltip, ResponsiveContainer, RadialBarChart, RadialBar, PolarAngleAxis } from 'recharts'
import { supabase } from '@/lib/supabase'

const QUICK_TOKENS = ['BTC','ETH','SOL','BNB','DOGE','ADA','XRP','AVAX','SUI','PEPE']

export default function Home() {
  const [input, setInput] = useState('')
  const [loading, setLoading] = useState(false)
  const [data, setData] = useState<any>(null)
  const [error, setError] = useState('')
  const [loadingStep, setLoadingStep] = useState(0)
  const [topCoins, setTopCoins] = useState<any[]>([])

  const steps = ['🔍 Scanning news sources...','📊 Fetching price data...','🧠 AI analyzing sentiment...','🔎 Detecting fake news...','📈 Computing score...']

  useEffect(() => {
    // Load recent analyzed coins
    supabase.from('coins').select('*').order('updated_at', { ascending: false }).limit(10)
      .then(({ data }) => { if (data) setTopCoins(data) })

    // Realtime subscription
    const channel = supabase.channel('coins-updates')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'coins' }, payload => {
        setTopCoins(prev => {
          const updated = payload.new as any
          const exists = prev.find(c => c.id === updated.id)
          if (exists) return prev.map(c => c.id === updated.id ? updated : c)
          return [updated, ...prev].slice(0, 10)
        })
      }).subscribe()

    return () => { supabase.removeChannel(channel) }
  }, [])

  useEffect(() => {
    if (!loading) return
    let i = 0
    const iv = setInterval(() => { i = (i+1) % steps.length; setLoadingStep(i) }, 1200)
    return () => clearInterval(iv)
  }, [loading])

  const analyze = async (sym?: string) => {
    const symbol = (sym || input).trim().toUpperCase()
    if (!symbol) return
    setInput(symbol)
    setLoading(true); setError(''); setData(null); setLoadingStep(0)
    try {
      const res = await fetch('/api/analyze', { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({symbol}) })
      const json = await res.json()
      if (!res.ok) throw new Error(json.error || 'Failed')
      setData(json)
    } catch(e) { setError(String(e)) }
    finally { setLoading(false) }
  }

  const score = data?.analysis?.overallScore ?? 0
  const col = score>=70?'#00ff9d':score>=50?'#f0c93a':score>=30?'#ff8c42':'#ff4d6d'

  return (<>
    <Head>
      <title>CryptoRadar v2 — AI Market Intelligence</title>
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=Syne:wght@700;800&display=swap" />
    </Head>
    <style>{`
      *{box-sizing:border-box;margin:0;padding:0}
      body{background:#050a0e;color:#e0e8f0;font-family:'Syne',sans-serif;min-height:100vh}
      .mono{font-family:'Space Mono',monospace}
      .grid-bg{background-image:linear-gradient(rgba(0,255,157,.03)1px,transparent 1px),linear-gradient(90deg,rgba(0,255,157,.03)1px,transparent 1px);background-size:40px 40px}
      .card{background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:14px}
      .scan{position:fixed;top:0;left:0;right:0;height:2px;background:linear-gradient(90deg,transparent,rgba(0,255,157,.8),transparent);animation:scan 3s linear infinite;pointer-events:none;z-index:100}
      @keyframes scan{0%{top:0}100%{top:100vh}}
      .pulse{animation:pulse 2s infinite}
      @keyframes pulse{0%,100%{opacity:1}50%{opacity:.4}}
      .bar{height:5px;border-radius:3px;background:rgba(255,255,255,.05);overflow:hidden}
      .bar-fill{height:100%;border-radius:3px;transition:width 1s}
      .tag{display:inline-block;padding:2px 8px;border-radius:3px;font-size:10px;font-family:'Space Mono',monospace;font-weight:700}
      .tag-pos{background:rgba(0,255,157,.12);color:#00ff9d}
      .tag-neg{background:rgba(255,77,109,.12);color:#ff4d6d}
      .tag-neu{background:rgba(240,201,58,.12);color:#f0c93a}
      .sp{width:7px;height:7px;border-radius:50%;background:#00ff9d;animation:bounce 1.2s infinite}
      .sp:nth-child(2){animation-delay:.2s}.sp:nth-child(3){animation-delay:.4s}
      @keyframes bounce{0%,100%{transform:translateY(0);opacity:.3}50%{transform:translateY(-7px);opacity:1}}
      .coin-chip{display:flex;align-items:center;gap:6px;padding:6px 10px;background:rgba(255,255,255,.03);border:1px solid rgba(255,255,255,.07);border-radius:8px;cursor:pointer;transition:all .15s}
      .coin-chip:hover{border-color:rgba(0,255,157,.3);background:rgba(0,255,157,.04)}
    `}</style>

    <div className="scan"/>
    <div className="grid-bg" style={{minHeight:'100vh'}}>
      {/* Header */}
      <div style={{borderBottom:'1px solid rgba(255,255,255,.05)',padding:'14px 20px',display:'flex',alignItems:'center',gap:10}}>
        <div style={{width:8,height:8,borderRadius:'50%',background:'#00ff9d',boxShadow:'0 0 8px #00ff9d'}} className="pulse"/>
        <span className="mono" style={{fontSize:11,color:'#00ff9d',letterSpacing:'.15em'}}>CRYPTO RADAR v2</span>
        <span style={{marginLeft:'auto',fontSize:10,color:'#334',fontFamily:'Space Mono'}}>SUPABASE · REALTIME · AI</span>
      </div>

      <div style={{maxWidth:1100,margin:'0 auto',padding:'28px 20px'}}>
        {/* Hero */}
        <div style={{textAlign:'center',marginBottom:36}}>
          <h1 style={{fontSize:'clamp(28px,5vw,56px)',fontWeight:800,lineHeight:1.1,letterSpacing:'-.02em',marginBottom:12}}>
            Market Intelligence<br/><span style={{color:'#00ff9d'}}>powered by AI</span>
          </h1>
          <p style={{color:'#556',fontSize:14,maxWidth:440,margin:'0 auto'}}>Crawl news · Score sentiment · Detect fake news · Track narratives</p>
        </div>

        {/* Search */}
        <div style={{maxWidth:580,margin:'0 auto 24px'}}>
          <div className="card" style={{display:'flex',overflow:'hidden',border:'1px solid rgba(0,255,157,.2)'}}>
            <input value={input} onChange={e=>setInput(e.target.value.toUpperCase())} onKeyDown={e=>e.key==='Enter'&&analyze()}
              placeholder="Token symbol: BTC, ETH, SOL..."
              className="mono" style={{flex:1,background:'transparent',border:'none',padding:'14px 18px',fontSize:14,color:'#e0e8f0',letterSpacing:'.05em'}}/>
            <button onClick={()=>analyze()} disabled={loading}
              style={{background:loading?'rgba(0,255,157,.1)':'#00ff9d',color:loading?'#00ff9d':'#050a0e',border:'none',padding:'14px 22px',fontSize:12,fontWeight:700,cursor:loading?'not-allowed':'pointer',fontFamily:'Space Mono',minWidth:110}}>
              {loading?<div style={{display:'flex',gap:4,justifyContent:'center'}}><div className="sp"/><div className="sp"/><div className="sp"/></div>:'ANALYZE →'}
            </button>
          </div>
          <div style={{display:'flex',gap:6,flexWrap:'wrap',marginTop:10,justifyContent:'center'}}>
            {QUICK_TOKENS.map(t=>(
              <button key={t} onClick={()=>{setInput(t);analyze(t)}}
                style={{background:'rgba(255,255,255,.04)',border:'1px solid rgba(255,255,255,.08)',borderRadius:5,padding:'4px 10px',color:'#667',cursor:'pointer',fontSize:11,fontFamily:'Space Mono',transition:'all .15s'}}
                onMouseOver={e=>{(e.target as any).style.color='#00ff9d';(e.target as any).style.borderColor='rgba(0,255,157,.3)'}}
                onMouseOut={e=>{(e.target as any).style.color='#667';(e.target as any).style.borderColor='rgba(255,255,255,.08)'}}>
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* Recently analyzed */}
        {topCoins.length > 0 && !data && !loading && (
          <div className="card" style={{padding:16,marginBottom:20}}>
            <div className="mono" style={{fontSize:10,color:'#445',letterSpacing:'.1em',marginBottom:10}}>RECENTLY ANALYZED</div>
            <div style={{display:'flex',gap:8,flexWrap:'wrap'}}>
              {topCoins.map((c:any) => (
                <div key={c.id} className="coin-chip" onClick={()=>{setInput(c.symbol);analyze(c.symbol)}}>
                  {c.image && <img src={c.image} width={16} height={16} style={{borderRadius:'50%'}} alt=""/>}
                  <span className="mono" style={{fontSize:11,fontWeight:700}}>{c.symbol}</span>
                  <span style={{fontSize:10,color:c.score>=60?'#00ff9d':c.score>=40?'#f0c93a':'#ff4d6d',fontFamily:'Space Mono'}}>{c.score}</span>
                  <span style={{fontSize:10,color:Number(c.change_24h)>=0?'#00ff9d':'#ff4d6d',fontFamily:'Space Mono'}}>
                    {Number(c.change_24h)>=0?'+':''}{Number(c.change_24h).toFixed(1)}%
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Loading */}
        {loading && (
          <div style={{textAlign:'center',padding:'50px 0'}}>
            <div className="card" style={{maxWidth:380,margin:'0 auto',padding:28}}>
              {steps.map((s,i)=>(
                <div key={i} style={{display:'flex',alignItems:'center',gap:10,padding:'7px 0',opacity:loadingStep===i?1:.25,transition:'opacity .3s'}}>
                  <span style={{fontSize:11,color:'#00ff9d'}}>{loadingStep===i?'▶':loadingStep>i?'✓':'○'}</span>
                  <span className="mono" style={{fontSize:11}}>{s}</span>
                </div>
              ))}
              <div className="bar" style={{marginTop:16}}>
                <div className="bar-fill" style={{width:`${((loadingStep+1)/steps.length)*100}%`,background:'linear-gradient(90deg,#00ff9d,#00cfff)'}}/>
              </div>
            </div>
          </div>
        )}

        {error && <div className="card" style={{padding:14,textAlign:'center',color:'#ff4d6d',fontFamily:'Space Mono',fontSize:12,background:'rgba(255,77,109,.05)',borderColor:'rgba(255,77,109,.2)'}}>⚠ {error}</div>}

        {/* Results */}
        {data && (
          <div style={{display:'flex',flexDirection:'column',gap:16}}>
            {data.fromCache && (
              <div className="mono" style={{fontSize:10,color:'#334',textAlign:'center'}}>
                ⚡ Served from cache · Expires in ~15 min
              </div>
            )}

            {/* Score + Price */}
            <div style={{display:'grid',gridTemplateColumns:'repeat(auto-fit,minmax(280px,1fr))',gap:14}}>
              <div className="card" style={{padding:24,textAlign:'center',background:'rgba(0,255,157,.02)',borderColor:'rgba(0,255,157,.1)'}}>
                <div className="mono" style={{fontSize:10,color:'#445',letterSpacing:'.1em',marginBottom:12}}>BULL / BEAR SCORE</div>
                <div style={{position:'relative',width:160,height:160,margin:'0 auto 10px'}}>
                  <ResponsiveContainer width="100%" height="100%">
                    <RadialBarChart cx="50%" cy="50%" innerRadius="60%" outerRadius="90%" data={[{value:score,fill:col}]} startAngle={90} endAngle={-270}>
                      <PolarAngleAxis type="number" domain={[0,100]} tick={false}/>
                      <RadialBar dataKey="value" background={{fill:'rgba(255,255,255,.05)'}} cornerRadius={8}/>
                    </RadialBarChart>
                  </ResponsiveContainer>
                  <div style={{position:'absolute',inset:0,display:'flex',flexDirection:'column',alignItems:'center',justifyContent:'center'}}>
                    <div style={{fontSize:42,fontWeight:800,color:col,fontFamily:'Space Mono',lineHeight:1}}>{score}</div>
                    <div style={{fontSize:10,color:'#445'}}>/100</div>
                  </div>
                </div>
                <div style={{fontSize:17,fontWeight:700,color:col,marginBottom:6}}>{data.analysis.sentiment}</div>
                <div className="mono" style={{fontSize:10,color:'#445',marginBottom:14}}>{data.analysis.recommendation} · {data.analysis.confidence}% conf.</div>
                <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                  {[['Price',data.analysis.priceScore],['News',data.analysis.newsScore],['Volume',data.analysis.volumeScore],['Momentum',data.analysis.momentumScore]].map(([l,v]:any)=>(
                    <div key={l} style={{textAlign:'left'}}>
                      <div className="mono" style={{fontSize:10,color:'#445',marginBottom:3}}>{l}</div>
                      <div className="bar"><div className="bar-fill" style={{width:`${v}%`,background:v>=60?'#00ff9d':v>=40?'#f0c93a':'#ff4d6d'}}/></div>
                      <div className="mono" style={{fontSize:10,color:'#667',marginTop:2}}>{v}/100</div>
                    </div>
                  ))}
                </div>
              </div>

              <div className="card" style={{padding:20}}>
                <div className="mono" style={{fontSize:10,color:'#445',letterSpacing:'.1em',marginBottom:14}}>PRICE DATA · LIVE</div>
                {data.priceData ? (<>
                  <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:16}}>
                    <div>
                      <div style={{fontSize:30,fontWeight:800,fontFamily:'Space Mono'}}>
                        ${Number(data.priceData.current_price).toLocaleString(undefined,{minimumFractionDigits:2,maximumFractionDigits:6})}
                      </div>
                      <div className="mono" style={{fontSize:12,color:Number(data.priceData.price_change_percentage_24h)>=0?'#00ff9d':'#ff4d6d',marginTop:4}}>
                        {Number(data.priceData.price_change_percentage_24h)>=0?'+':''}{Number(data.priceData.price_change_percentage_24h).toFixed(2)}% (24h)
                      </div>
                    </div>
                    <div style={{textAlign:'right'}}>
                      <img src={data.priceData.image} alt="" style={{width:40,height:40,borderRadius:'50%'}}/>
                      <div className="mono" style={{fontSize:10,color:'#445',marginTop:3}}>{data.priceData.name}</div>
                    </div>
                  </div>
                  <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:8}}>
                    {[['Vol 24h','$'+(Number(data.priceData.total_volume)/1e9).toFixed(2)+'B'],['Mkt Cap','$'+(Number(data.priceData.market_cap)/1e9).toFixed(2)+'B'],['24h High','$'+Number(data.priceData.high_24h).toLocaleString()],['24h Low','$'+Number(data.priceData.low_24h).toLocaleString()]].map(([l,v])=>(
                      <div key={l} className="card" style={{padding:'8px 10px'}}>
                        <div className="mono" style={{fontSize:9,color:'#445',marginBottom:2}}>{l}</div>
                        <div className="mono" style={{fontSize:12,fontWeight:700}}>{v}</div>
                      </div>
                    ))}
                  </div>
                </>) : <div style={{color:'#445',textAlign:'center',padding:30,fontSize:13}}>Price data unavailable</div>}
              </div>
            </div>

            {/* Summary */}
            <div className="card" style={{padding:20,background:'rgba(0,255,157,.015)',borderColor:'rgba(0,255,157,.08)'}}>
              <div className="mono" style={{fontSize:10,color:'#445',letterSpacing:'.1em',marginBottom:10}}>AI ANALYSIS</div>
              <p style={{color:'#ccc',lineHeight:1.7,fontSize:14,marginBottom:16}}>{data.analysis.summary}</p>
              <div style={{display:'grid',gridTemplateColumns:'1fr 1fr',gap:16}}>
                <div>
                  <div className="mono" style={{fontSize:10,color:'#00ff9d',marginBottom:8}}>▲ BULLISH</div>
                  {(data.analysis.bullishFactors||[]).map((f:string,i:number)=>(
                    <div key={i} style={{display:'flex',gap:7,marginBottom:5}}><span style={{color:'#00ff9d',fontSize:11}}>+</span><span style={{fontSize:12,color:'#aaa'}}>{f}</span></div>
                  ))}
                </div>
                <div>
                  <div className="mono" style={{fontSize:10,color:'#ff4d6d',marginBottom:8}}>▼ BEARISH</div>
                  {(data.analysis.bearishFactors||[]).map((f:string,i:number)=>(
                    <div key={i} style={{display:'flex',gap:7,marginBottom:5}}><span style={{color:'#ff4d6d',fontSize:11}}>−</span><span style={{fontSize:12,color:'#aaa'}}>{f}</span></div>
                  ))}
                </div>
              </div>
            </div>

            {/* Chart */}
            {data.historicalPrices?.length > 0 && (
              <div className="card" style={{padding:20}}>
                <div className="mono" style={{fontSize:10,color:'#445',letterSpacing:'.1em',marginBottom:16}}>7-DAY CHART</div>
                <ResponsiveContainer width="100%" height={180}>
                  <LineChart data={data.historicalPrices}>
                    <XAxis dataKey="date" tick={{fill:'#334',fontSize:10,fontFamily:'Space Mono'}} axisLine={false} tickLine={false}/>
                    <YAxis tick={{fill:'#334',fontSize:10,fontFamily:'Space Mono'}} axisLine={false} tickLine={false} width={75}
                      tickFormatter={v=>'$'+(v>=1000?(v/1000).toFixed(1)+'k':v.toFixed(2))}/>
                    <Tooltip contentStyle={{background:'#050a0e',border:'1px solid rgba(0,255,157,.2)',borderRadius:8,fontFamily:'Space Mono',fontSize:11}}
                      labelStyle={{color:'#445'}} itemStyle={{color:'#00ff9d'}}
                      formatter={(v:number)=>['$'+v.toLocaleString(),'Price']}/>
                    <Line type="monotone" dataKey="price" stroke="#00ff9d" strokeWidth={2} dot={false} activeDot={{r:3,fill:'#00ff9d'}}/>
                  </LineChart>
                </ResponsiveContainer>
              </div>
            )}

            {/* Fake news */}
            {(data.analysis.fakeNewsFlags||[]).length > 0 && (
              <div className="card" style={{padding:20,background:'rgba(255,140,66,.03)',borderColor:'rgba(255,140,66,.15)'}}>
                <div className="mono" style={{fontSize:10,color:'#ff8c42',letterSpacing:'.1em',marginBottom:12}}>⚠ FAKE NEWS DETECTED</div>
                {data.analysis.fakeNewsFlags.map((f:any,i:number)=>(
                  <div key={i} className="card" style={{padding:'10px 14px',marginBottom:8,borderColor:f.riskLevel==='high'?'rgba(255,77,109,.3)':'rgba(255,140,66,.2)'}}>
                    <div style={{display:'flex',justifyContent:'space-between',gap:10,marginBottom:4}}>
                      <div style={{fontSize:12,color:'#ccc',flex:1}}>"{f.title}"</div>
                      <span className="tag" style={{background:f.riskLevel==='high'?'rgba(255,77,109,.15)':'rgba(255,140,66,.15)',color:f.riskLevel==='high'?'#ff4d6d':'#ff8c42',border:'none',whiteSpace:'nowrap'}}>{f.riskLevel?.toUpperCase()} RISK</span>
                    </div>
                    <div style={{fontSize:11,color:'#556'}}>{f.reason}</div>
                  </div>
                ))}
              </div>
            )}

            {/* News */}
            {(data.news||[]).length > 0 && (
              <div className="card" style={{padding:20}}>
                <div className="mono" style={{fontSize:10,color:'#445',letterSpacing:'.1em',marginBottom:14}}>NEWS · {data.news.length} ARTICLES</div>
                {data.news.map((n:any,i:number)=>(
                  <div key={i} className="card" style={{padding:'12px 14px',marginBottom:10}}>
                    <div style={{display:'flex',justifyContent:'space-between',gap:10,marginBottom:6}}>
                      <a href={n.url} target="_blank" rel="noopener noreferrer" style={{fontSize:13,fontWeight:600,color:'#e0e8f0',textDecoration:'none',flex:1,lineHeight:1.4}}>{n.title}</a>
                      <span className={`tag tag-${n.sentiment==='positive'?'pos':n.sentiment==='negative'?'neg':'neu'}`}>{(n.sentiment||'neutral').toUpperCase()}</span>
                    </div>
                    <p style={{fontSize:11,color:'#556',lineHeight:1.6,marginBottom:8}}>{n.summary}</p>
                    <div style={{display:'flex',gap:10,alignItems:'center'}}>
                      <span className="mono" style={{fontSize:10,color:'#334'}}>{n.source}</span>
                      <div style={{marginLeft:'auto',display:'flex',gap:2}}>
                        {[...Array(10)].map((_,j)=>(
                          <div key={j} style={{width:5,height:5,borderRadius:1,background:j<(n.credibilityScore||5)?'#00ff9d':'rgba(255,255,255,.06)'}}/>
                        ))}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            <div className="mono" style={{textAlign:'center',fontSize:10,color:'#223',paddingBottom:8}}>
              {new Date(data.timestamp).toLocaleString('vi-VN')} · Powered by Claude AI + Supabase
            </div>
          </div>
        )}

        {!loading && !data && !error && (
          <div style={{textAlign:'center',padding:'50px 0',color:'#223'}}>
            <div style={{fontSize:48,marginBottom:12}}>📡</div>
            <div className="mono" style={{fontSize:12}}>Nhập token để bắt đầu phân tích</div>
          </div>
        )}
      </div>
    </div>
  </>)
}
