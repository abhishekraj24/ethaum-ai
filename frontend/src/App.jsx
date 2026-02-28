import { useState, useEffect, useRef } from "react";
import axios from "axios";

const API = "http://localhost:5000";

const QUADRANT_CONFIG = {
  Leader:     { color: "#22c55e", bg: "rgba(34,197,94,0.12)",   border: "#22c55e" },
  Visionary:  { color: "#818cf8", bg: "rgba(129,140,248,0.12)", border: "#818cf8" },
  Challenger: { color: "#f97316", bg: "rgba(249,115,22,0.12)",  border: "#f97316" },
  Emerging:   { color: "#94a3b8", bg: "rgba(148,163,184,0.12)", border: "#94a3b8" },
};

/* ── COMPUTE SCORE LOCALLY (same formula as backend) ── */
function computeECI(reviews, upvotes) {
  if (!reviews || reviews.length === 0) return { score: 0, eci: 0 };
  const count = reviews.length;
  let total = { roi: 0, scalability: 0, security: 0, integration: 0 };
  reviews.forEach(r => { total.roi += Number(r.roi); total.scalability += Number(r.scalability); total.security += Number(r.security); total.integration += Number(r.integration); });
  const baseScore = ((total.roi/count)/5)*25 + ((total.scalability/count)/5)*25 + ((total.security/count)/5)*25 + ((total.integration/count)/5)*25;
  const eci = Math.min(baseScore + Math.min(upvotes*1.5,15) + Math.min(count*2,10), 100);
  return { score: Math.round(baseScore), eci: Math.round(eci) };
}

export default function App() {
  const [startups, setStartups]     = useState([]);
  const [trending, setTrending]     = useState([]);
  const [activeTab, setActiveTab]   = useState("marketplace");
  const [showForm, setShowForm]     = useState(false);
  const [intelFeed, setIntelFeed]   = useState(null);
  const [feedLoading, setFeedLoading] = useState(false);
  const [allScores, setAllScores]   = useState({});
  const [form, setForm] = useState({ name:"", tagline:"", industry:"", stage:"", description:"", early_access:false, deal_text:"" });
  const [compareId1, setCompareId1] = useState("");
  const [compareId2, setCompareId2] = useState("");
  const [compareResult, setCompareResult] = useState(null);
  const [compareLoading, setCompareLoading] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  const [chatInput, setChatInput] = useState("");
  const [chatLoading, setChatLoading] = useState(false);

  useEffect(() => { fetchAll(); }, []);

  const fetchAll = async () => {
    const [sr, tr] = await Promise.all([
      axios.get(`${API}/startups`),
      axios.get(`${API}/startups/trending`),
    ]);
    setStartups(sr.data);
    setTrending(tr.data);
    // Fetch all scores for dashboard/quadrant
    const scores = {};
    await Promise.all(sr.data.map(async s => {
      try {
        const r = await axios.get(`${API}/startups/${s.id}/score`);
        scores[s.id] = r.data;
      } catch {}
    }));
    setAllScores(scores);
  };

  const createStartup = async (e) => {
    e.preventDefault();
    await axios.post(`${API}/startups`, form);
    setForm({ name:"", tagline:"", industry:"", stage:"", description:"", early_access:false, deal_text:"" });
    setShowForm(false);
    fetchAll();
  };

  const fetchFeed = async () => {
    setFeedLoading(true);
    try {
      const r = await axios.get(`${API}/ai/intelligence-feed`);
      setIntelFeed(r.data);
    } catch { setIntelFeed({ feed: "Failed to load feed." }); }
    setFeedLoading(false);
  };

  const runCompare = async () => {
    if (!compareId1 || !compareId2) return;
    setCompareLoading(true); setCompareResult(null);
    try {
      const r = await axios.post(`${API}/ai/compare`, { id1: compareId1, id2: compareId2 });
      setCompareResult(r.data);
    } catch { setCompareResult({ error: "Comparison failed." }); }
    setCompareLoading(false);
  };

  const sendChat = async () => {
    if (!chatInput.trim()) return;
    const userMsg = { role: "user", content: chatInput };
    const newHistory = [...chatHistory, userMsg];
    setChatHistory(newHistory); setChatInput(""); setChatLoading(true);
    try {
      const r = await axios.post(`${API}/ai/chat`, { message: chatInput, history: chatHistory });
      setChatHistory([...newHistory, { role: "assistant", content: r.data.reply }]);
    } catch { setChatHistory([...newHistory, { role: "assistant", content: "Sorry, I encountered an error." }]); }
    setChatLoading(false);
  };

  // Quadrant chart data
  const quadrantData = startups.map(s => {
    const sc = allScores[s.id];
    return { name: s.name, eci: sc ? Number(sc.confidenceIndex) : 0, upvotes: s.upvotes || 0, pos: sc?.marketPosition || "Emerging" };
  }).filter(d => d.eci > 0 || d.upvotes > 0);

  const maxUpvotes = Math.max(...quadrantData.map(d => d.upvotes), 10);

  return (
    <div style={S.page}>
      {/* ── HEADER ── */}
      <header style={S.header}>
        <div style={S.headerLeft}>
          <div style={S.logo}>⬡</div>
          <div>
            <h1 style={S.logoText}>EthAum<span style={S.logoAI}>.ai</span></h1>
            <p style={S.logoSub}>Enterprise AI Marketplace Intelligence</p>
          </div>
        </div>
        <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
          {[
            { id:"marketplace", label:"🏪 Marketplace" },
            { id:"dashboard",   label:"📊 VC Dashboard" },
            { id:"quadrant",    label:"🗺️ Quadrant Map" },
            { id:"feed",        label:"⚡ Intel Feed" },
            { id:"compare",     label:"⚔️ AI Compare" },
            { id:"chat",        label:"🤖 AI Chat" },
          ].map(t => (
            <button key={t.id} style={{ ...S.tabBtn, ...(activeTab===t.id ? S.tabBtnActive : {}) }}
              onClick={() => { setActiveTab(t.id); if(t.id==="feed" && !intelFeed) fetchFeed(); }}>
              {t.label}
            </button>
          ))}
          <button style={S.launchBtn} onClick={() => { setActiveTab("marketplace"); setShowForm(!showForm); }}>
            {showForm ? "✕ Cancel" : "＋ List Startup"}
          </button>
        </div>
      </header>

      {/* ── TAGLINE BAR ── */}
      <div style={S.taglineBar}>
        <span style={S.taglineDot}/><span style={S.taglineText}>The Future of Enterprise SaaS Intelligence</span><span style={S.taglineDot}/>
      </div>

      {/* ══ MARKETPLACE ══ */}
      {activeTab === "marketplace" && (
        <div style={S.tabContent}>
          {showForm && (
            <div style={S.formCard}>
              <h3 style={S.sectionTitle}>🚀 List a New Startup</h3>
              <form onSubmit={createStartup} style={{ display:"flex", flexDirection:"column", gap:12 }}>
                <div style={S.formGrid}>
                  <input style={S.input} placeholder="Startup Name *" value={form.name} onChange={e=>setForm({...form,name:e.target.value})} required/>
                  <input style={S.input} placeholder="Industry (e.g. FinTech)" value={form.industry} onChange={e=>setForm({...form,industry:e.target.value})}/>
                  <input style={S.input} placeholder="Tagline *" value={form.tagline} onChange={e=>setForm({...form,tagline:e.target.value})} required/>
                  <input style={S.input} placeholder="Stage (Series A/B/C/D)" value={form.stage} onChange={e=>setForm({...form,stage:e.target.value})}/>
                </div>
                <textarea style={{...S.input,minHeight:70,resize:"vertical"}} placeholder="Description" value={form.description} onChange={e=>setForm({...form,description:e.target.value})}/>
                <label style={S.checkLabel}>
                  <input type="checkbox" checked={form.early_access} onChange={e=>setForm({...form,early_access:e.target.checked})} style={{marginRight:8}}/>
                  ⚡ Enable Early Access
                </label>
                {form.early_access && <input style={S.input} placeholder="Deal text (e.g. 40% off for first 100 users)" value={form.deal_text} onChange={e=>setForm({...form,deal_text:e.target.value})}/>}
                <button type="submit" style={S.launchBtn}>🚀 List Startup</button>
              </form>
            </div>
          )}

          {/* TRENDING */}
          <div style={S.panel}>
            <h2 style={S.sectionTitle}>🔥 Trending Today</h2>
            <div style={{display:"flex",flexDirection:"column",gap:8,marginTop:12}}>
              {trending.length===0 && <p style={{color:"#64748b"}}>No startups yet.</p>}
              {trending.map((s,i) => (
                <div key={s.id} style={S.trendingItem}>
                  <span style={S.trendingRank}>#{i+1}</span>
                  <div style={{flex:1}}>
                    <div style={{fontWeight:600,fontSize:14}}>{s.name}</div>
                    <div style={{color:"#64748b",fontSize:12}}>{s.industry} · {s.stage}</div>
                  </div>
                  <div style={{color:"#f97316",fontWeight:700,fontSize:13}}>🔥 {Number(s.trending_score||0)}</div>
                  {s.early_access && <span style={S.earlyBadge}>⚡ Early Access</span>}
                </div>
              ))}
            </div>
          </div>

          {/* QUADRANT LEGEND */}
          <div style={S.panel}>
            <h2 style={S.sectionTitle}>📊 Market Intelligence Quadrant</h2>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:12,marginTop:12}}>
              {Object.entries(QUADRANT_CONFIG).map(([pos,cfg]) => (
                <div key={pos} style={{background:cfg.bg,border:`1px solid ${cfg.border}`,borderRadius:8,padding:"14px 12px",textAlign:"center"}}>
                  <div style={{fontSize:20}}>{pos==="Leader"?"🏆":pos==="Visionary"?"🔭":pos==="Challenger"?"⚡":"🌱"}</div>
                  <div style={{color:cfg.color,fontWeight:700,marginTop:4}}>{pos}</div>
                  <div style={{color:"#64748b",fontSize:11,marginTop:4}}>
                    {pos==="Leader"?"High ECI + High Adoption":pos==="Visionary"?"High ECI + Growing":pos==="Challenger"?"Strong Adoption + Building ECI":"Early stage"}
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* CARDS */}
          <h2 style={{...S.sectionTitle,marginBottom:16}}>🏢 All Startups <span style={{color:"#475569",fontSize:14,fontWeight:400}}>({startups.length})</span></h2>
          <div style={S.cardsGrid}>
            {startups.map(s => <StartupCard key={s.id} startup={s} refresh={fetchAll} allStartups={startups}/>)}
          </div>
        </div>
      )}

      {/* ══ VC DASHBOARD ══ */}
      {activeTab === "dashboard" && (
        <div style={S.tabContent}>
          <h2 style={S.sectionTitle}>📊 VC Portfolio Dashboard</h2>
          <p style={{color:"#64748b",marginBottom:24}}>AI-powered signals across all listed startups</p>

          {/* Summary Stats */}
          <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:16,marginBottom:24}}>
            {[
              { label:"Total Startups", val:startups.length, icon:"🏢", color:"#6366f1" },
              { label:"Leaders", val:Object.values(allScores).filter(s=>s.marketPosition==="Leader").length, icon:"🏆", color:"#22c55e" },
              { label:"Total Upvotes", val:startups.reduce((a,s)=>a+(s.upvotes||0),0), icon:"🔥", color:"#f97316" },
              { label:"Avg ECI", val: Object.values(allScores).length ? Math.round(Object.values(allScores).reduce((a,s)=>a+Number(s.confidenceIndex),0)/Object.values(allScores).length) : 0, icon:"🧠", color:"#818cf8" },
            ].map(stat => (
              <div key={stat.label} style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:12,padding:20,textAlign:"center"}}>
                <div style={{fontSize:28}}>{stat.icon}</div>
                <div style={{fontSize:28,fontWeight:800,color:stat.color,marginTop:8}}>{stat.val}</div>
                <div style={{fontSize:12,color:"#64748b",marginTop:4}}>{stat.label}</div>
              </div>
            ))}
          </div>

          {/* Startup Table */}
          <div style={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:12,overflow:"hidden"}}>
            <table style={{width:"100%",borderCollapse:"collapse"}}>
              <thead>
                <tr style={{background:"#0f172a",borderBottom:"1px solid #1e293b"}}>
                  {["Startup","Industry","Stage","ECI","Base Score","Upvotes","Reviews","Position","Trending"].map(h => (
                    <th key={h} style={{padding:"12px 16px",textAlign:"left",fontSize:11,color:"#475569",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.05em"}}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {startups.map((s,i) => {
                  const sc = allScores[s.id];
                  const pos = sc?.marketPosition || "Emerging";
                  const cfg = QUADRANT_CONFIG[pos];
                  return (
                    <tr key={s.id} style={{borderBottom:"1px solid #0f172a",background:i%2===0?"transparent":"rgba(15,23,42,0.5)"}}>
                      <td style={{padding:"12px 16px",fontWeight:700,color:"#f1f5f9"}}>{s.name}</td>
                      <td style={{padding:"12px 16px",color:"#64748b",fontSize:13}}>{s.industry}</td>
                      <td style={{padding:"12px 16px"}}><span style={{background:"#1e293b",color:"#6366f1",borderRadius:20,padding:"2px 10px",fontSize:11}}>{s.stage}</span></td>
                      <td style={{padding:"12px 16px",fontWeight:800,color:cfg.color,fontSize:16}}>{sc?.confidenceIndex||0}</td>
                      <td style={{padding:"12px 16px",color:"#94a3b8"}}>{sc?.score||0}</td>
                      <td style={{padding:"12px 16px",color:"#f97316",fontWeight:700}}>{s.upvotes||0}</td>
                      <td style={{padding:"12px 16px",color:"#64748b"}}>{sc?.reviewCount||0}</td>
                      <td style={{padding:"12px 16px"}}>
                        <span style={{background:cfg.bg,color:cfg.color,border:`1px solid ${cfg.border}`,borderRadius:20,padding:"2px 10px",fontSize:11,fontWeight:700}}>
                          {sc?.quadrantEmoji} {pos}
                        </span>
                      </td>
                      <td style={{padding:"12px 16px",color:"#f97316"}}>{sc?.trendingScore||0}</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* ══ QUADRANT MAP ══ */}
      {activeTab === "quadrant" && (
        <div style={S.tabContent}>
          <h2 style={S.sectionTitle}>🗺️ Market Quadrant Map</h2>
          <p style={{color:"#64748b",marginBottom:24}}>Visual positioning of all startups — X axis: Adoption Momentum (upvotes), Y axis: Enterprise Confidence Index</p>

          <div style={{background:"#0a0f1e",border:"1px solid #1e293b",borderRadius:12,padding:32,position:"relative"}}>
            {/* Chart area */}
            <div style={{position:"relative",height:480,border:"1px solid #1e293b",borderRadius:8,background:"#030712",overflow:"hidden"}}>
              {/* Quadrant dividers */}
              <div style={{position:"absolute",left:"50%",top:0,bottom:0,width:1,background:"#1e293b"}}/>
              <div style={{position:"absolute",top:"50%",left:0,right:0,height:1,background:"#1e293b"}}/>

              {/* Quadrant labels */}
              <div style={{position:"absolute",top:12,left:12,color:"#818cf8",fontSize:11,fontWeight:700}}>🔭 VISIONARY</div>
              <div style={{position:"absolute",top:12,right:12,color:"#22c55e",fontSize:11,fontWeight:700}}>🏆 LEADER</div>
              <div style={{position:"absolute",bottom:12,left:12,color:"#94a3b8",fontSize:11,fontWeight:700}}>🌱 EMERGING</div>
              <div style={{position:"absolute",bottom:12,right:12,color:"#f97316",fontSize:11,fontWeight:700}}>⚡ CHALLENGER</div>

              {/* Axis labels */}
              <div style={{position:"absolute",bottom:4,left:"50%",transform:"translateX(-50%)",color:"#475569",fontSize:10}}>← Adoption Momentum →</div>

              {/* Plot points */}
              {quadrantData.map((d,i) => {
                const x = Math.min((d.upvotes / maxUpvotes) * 90 + 5, 95);
                const y = Math.min(100 - (d.eci / 100) * 90 - 5, 95);
                const cfg = QUADRANT_CONFIG[d.pos];
                return (
                  <div key={i} title={`${d.name}\nECI: ${d.eci}\nUpvotes: ${d.upvotes}`}
                    style={{
                      position:"absolute", left:`${x}%`, top:`${y}%`,
                      transform:"translate(-50%,-50%)",
                      width:14, height:14, borderRadius:"50%",
                      background:cfg.color, border:`2px solid ${cfg.border}`,
                      boxShadow:`0 0 10px ${cfg.color}60`,
                      cursor:"pointer", transition:"transform 0.2s",
                    }}
                    onMouseEnter={e=>{e.target.style.transform="translate(-50%,-50%) scale(2)";}}
                    onMouseLeave={e=>{e.target.style.transform="translate(-50%,-50%) scale(1)";}}
                  />
                );
              })}

              {/* Labels */}
              {quadrantData.map((d,i) => {
                const x = Math.min((d.upvotes / maxUpvotes) * 90 + 5, 95);
                const y = Math.min(100 - (d.eci / 100) * 90 - 5, 95);
                return (
                  <div key={`label-${i}`} style={{
                    position:"absolute", left:`${x}%`, top:`${y}%`,
                    transform:"translate(-50%, -200%)",
                    background:"#0f172a", border:"1px solid #1e293b",
                    borderRadius:4, padding:"2px 6px",
                    fontSize:10, color:"#e2e8f0", whiteSpace:"nowrap", pointerEvents:"none",
                  }}>{d.name}</div>
                );
              })}
            </div>

            {/* Legend */}
            <div style={{display:"flex",gap:24,marginTop:16,flexWrap:"wrap",justifyContent:"center"}}>
              {Object.entries(QUADRANT_CONFIG).map(([pos,cfg]) => (
                <div key={pos} style={{display:"flex",alignItems:"center",gap:8}}>
                  <div style={{width:12,height:12,borderRadius:"50%",background:cfg.color}}/>
                  <span style={{color:cfg.color,fontSize:12,fontWeight:600}}>{pos}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}

      {/* ══ INTEL FEED ══ */}
      {activeTab === "feed" && (
        <div style={S.tabContent}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:24}}>
            <div>
              <h2 style={S.sectionTitle}>⚡ EthAum Intelligence Feed</h2>
              <p style={{color:"#64748b",marginTop:4}}>AI-generated daily market briefing from your marketplace data</p>
            </div>
            <button style={S.launchBtn} onClick={fetchFeed} disabled={feedLoading}>
              {feedLoading ? "⏳ Generating..." : "🔄 Refresh Feed"}
            </button>
          </div>

          {feedLoading && (
            <div style={{...S.panel,textAlign:"center",padding:60}}>
              <div style={{fontSize:32,marginBottom:16}}>⚡</div>
              <div style={{color:"#6366f1",fontWeight:700}}>EthAum AI is analyzing the marketplace...</div>
            </div>
          )}

          {intelFeed && !feedLoading && (
            <div style={{...S.panel,borderLeft:"3px solid #6366f1"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:16}}>
                <div style={{color:"#6366f1",fontSize:11,fontWeight:700,letterSpacing:"0.1em"}}>⚡ ETHAUM INTELLIGENCE BRIEFING</div>
                {intelFeed.generatedAt && <div style={{color:"#475569",fontSize:11}}>{new Date(intelFeed.generatedAt).toLocaleTimeString()}</div>}
              </div>
              {intelFeed.feed.split('\n').map((line,i) =>
                line.startsWith('##')
                  ? <h4 key={i} style={{color:"#f97316",margin:"16px 0 6px",fontSize:14}}>{line.replace('##','').trim()}</h4>
                  : <p key={i} style={{margin:"4px 0",color:"#cbd5e1",lineHeight:1.7,fontSize:14}}>{line}</p>
              )}
            </div>
          )}

          {!intelFeed && !feedLoading && (
            <div style={{...S.panel,textAlign:"center",padding:60}}>
              <div style={{fontSize:48,marginBottom:16}}>⚡</div>
              <div style={{color:"#64748b"}}>Click "Refresh Feed" to generate your market intelligence briefing</div>
            </div>
          )}
        </div>
      )}

      {/* ══ AI COMPARE ══ */}
      {activeTab === "compare" && (
        <div style={S.tabContent}>
          <h2 style={S.sectionTitle}>⚔️ AI Competitor Analysis</h2>
          <p style={{color:"#64748b",marginTop:4,marginBottom:24}}>Select two startups for a Gartner-style head-to-head AI analysis</p>
          <div style={{display:"flex",gap:16,marginBottom:20,flexWrap:"wrap"}}>
            <select style={S.select} value={compareId1} onChange={e=>setCompareId1(e.target.value)}>
              <option value="">— Select Startup A —</option>
              {startups.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <select style={S.select} value={compareId2} onChange={e=>setCompareId2(e.target.value)}>
              <option value="">— Select Startup B —</option>
              {startups.map(s=><option key={s.id} value={s.id}>{s.name}</option>)}
            </select>
            <button style={S.launchBtn} onClick={runCompare} disabled={compareLoading}>
              {compareLoading ? "⏳ Analyzing..." : "⚔️ Run AI Analysis"}
            </button>
          </div>
          {compareResult && !compareResult.error && (
            <div style={{...S.panel,borderLeft:"3px solid #818cf8"}}>
              <h3 style={{color:"#818cf8",marginTop:0}}>{compareResult.startup1} vs {compareResult.startup2}</h3>
              {compareResult.analysis.split('\n').map((line,i) =>
                line.startsWith('##')
                  ? <h4 key={i} style={{color:"#f97316",marginTop:20,marginBottom:6}}>{line.replace('##','').trim()}</h4>
                  : <p key={i} style={{margin:"4px 0",color:"#cbd5e1",lineHeight:1.7}}>{line}</p>
              )}
            </div>
          )}
          {compareResult?.error && <p style={{color:"#ef4444"}}>{compareResult.error}</p>}
        </div>
      )}

      {/* ══ AI CHAT ══ */}
      {activeTab === "chat" && (
        <div style={S.tabContent}>
          <h2 style={S.sectionTitle}>🤖 EthAum AI Assistant</h2>
          <p style={{color:"#64748b",marginTop:4,marginBottom:24}}>Ask anything about startups, market trends, or SaaS evaluation</p>
          <div style={S.chatBox}>
            {chatHistory.length===0 && (
              <div style={{color:"#475569",textAlign:"center",padding:"40px 20px"}}>
                <div style={{fontSize:40,marginBottom:12}}>🤖</div>
                <div style={{fontWeight:600,color:"#64748b"}}>EthAum AI is ready</div>
                <div style={{fontSize:13,marginTop:8,color:"#475569"}}>Ask about startup evaluation, investment signals, or market trends.</div>
              </div>
            )}
            {chatHistory.map((msg,i) => (
              <div key={i} style={{display:"flex",justifyContent:msg.role==="user"?"flex-end":"flex-start",marginBottom:12}}>
                <div style={{maxWidth:"75%",background:msg.role==="user"?"linear-gradient(135deg,#6366f1,#8b5cf6)":"#0f172a",border:msg.role==="assistant"?"1px solid #1e293b":"none",borderRadius:msg.role==="user"?"12px 12px 2px 12px":"12px 12px 12px 2px",padding:"10px 14px",color:"#f1f5f9",fontSize:14,lineHeight:1.6}}>
                  {msg.role==="assistant" && <div style={{color:"#6366f1",fontSize:11,fontWeight:700,marginBottom:4}}>ETHAUM AI</div>}
                  {msg.content}
                </div>
              </div>
            ))}
            {chatLoading && (
              <div style={{display:"flex",justifyContent:"flex-start",marginBottom:12}}>
                <div style={{background:"#0f172a",border:"1px solid #1e293b",borderRadius:"12px 12px 12px 2px",padding:"10px 14px",color:"#64748b",fontSize:13}}>⏳ EthAum AI is thinking...</div>
              </div>
            )}
          </div>
          <div style={{display:"flex",gap:10,marginTop:12}}>
            <input style={{...S.input,flex:1}} placeholder="Ask EthAum AI anything..." value={chatInput} onChange={e=>setChatInput(e.target.value)} onKeyDown={e=>e.key==="Enter"&&sendChat()}/>
            <button style={S.launchBtn} onClick={sendChat} disabled={chatLoading}>Send</button>
          </div>
          <button style={{...S.tabBtn,marginTop:8,fontSize:12}} onClick={()=>setChatHistory([])}>Clear Chat</button>
        </div>
      )}
    </div>
  );
}

/* ══════════════════════════════════════ */
/*  STARTUP CARD with all AI features     */
/* ══════════════════════════════════════ */
function StartupCard({ startup, refresh, allStartups }) {
  const [scoreData, setScoreData]   = useState(null);
  const [showReview, setShowReview] = useState(false);
  const [aiSummary, setAiSummary]   = useState(null);
  const [aiReport, setAiReport]     = useState(null);
  const [autoCompare, setAutoCompare] = useState(null);
  const [eciHistory, setEciHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [summaryLoading, setSummaryLoading] = useState(false);
  const [reportLoading, setReportLoading]   = useState(false);
  const [compareLoading, setCompareLoading] = useState(false);
  const [review, setReview] = useState({ roi:"", scalability:"", security:"", integration:"", comment:"" });
  const printRef = useRef();

  useEffect(() => { fetchScore(); }, []);

  const fetchScore = async () => {
    try {
      const r = await axios.get(`${API}/startups/${startup.id}/score`);
      setScoreData(r.data);
    } catch {}
  };

  const handleUpvote = async () => {
    await axios.post(`${API}/startups/${startup.id}/upvote`);
    refresh(); fetchScore();
  };

  const submitReview = async (e) => {
    e.preventDefault();
    await axios.post(`${API}/reviews`, { startup_id:startup.id, roi:Number(review.roi), scalability:Number(review.scalability), security:Number(review.security), integration:Number(review.integration), comment:review.comment });
    setReview({ roi:"", scalability:"", security:"", integration:"", comment:"" });
    setShowReview(false);
    fetchScore(); refresh();
  };

  const getAiSummary = async () => {
    setSummaryLoading(true); setAiSummary(null);
    try { const r = await axios.get(`${API}/startups/${startup.id}/ai-summary`); setAiSummary(r.data.summary); }
    catch { setAiSummary("Failed to generate summary."); }
    setSummaryLoading(false);
  };

  const getDueDiligence = async () => {
    setReportLoading(true); setAiReport(null);
    try { const r = await axios.get(`${API}/startups/${startup.id}/due-diligence`); setAiReport(r.data.report); }
    catch { setAiReport("Failed to generate report."); }
    setReportLoading(false);
  };

  const getAutoCompare = async () => {
    setCompareLoading(true); setAutoCompare(null);
    try { const r = await axios.get(`${API}/startups/${startup.id}/auto-compare`); setAutoCompare(r.data); }
    catch { setAutoCompare({ analysis:"Failed.", startup2:null }); }
    setCompareLoading(false);
  };

  const getEciHistory = async () => {
    try { const r = await axios.get(`${API}/startups/${startup.id}/eci-history`); setEciHistory(r.data); setShowHistory(true); }
    catch {}
  };

  const exportPDF = () => {
    const content = document.getElementById(`card-${startup.id}`);
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html><head><title>${startup.name} — EthAum Due Diligence</title>
      <style>
        body { font-family: 'Segoe UI', sans-serif; background: #fff; color: #1e293b; padding: 40px; max-width: 800px; margin: auto; }
        h1 { color: #6366f1; border-bottom: 2px solid #6366f1; padding-bottom: 10px; }
        h2 { color: #f97316; margin-top: 24px; }
        .badge { display: inline-block; background: #f1f5f9; border-radius: 20px; padding: 2px 10px; font-size: 12px; margin: 2px; }
        .metric { display: inline-block; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 10px 16px; margin: 4px; text-align: center; }
        .metric-val { font-size: 24px; font-weight: 800; color: #6366f1; }
        .metric-label { font-size: 10px; color: #94a3b8; text-transform: uppercase; }
        pre { background: #f8fafc; padding: 16px; border-radius: 8px; white-space: pre-wrap; }
        .footer { margin-top: 40px; border-top: 1px solid #e2e8f0; padding-top: 16px; color: #94a3b8; font-size: 12px; }
      </style></head><body>
      <h1>⬡ EthAum.ai — Due Diligence Report</h1>
      <h2>${startup.name}</h2>
      <p><span class="badge">${startup.industry}</span><span class="badge">${startup.stage}</span>${startup.early_access?'<span class="badge">⚡ Early Access</span>':''}</p>
      <p><em>${startup.tagline}</em></p>
      ${scoreData ? `
      <h2>Enterprise Confidence Index</h2>
      <div>
        <div class="metric"><div class="metric-val">${scoreData.confidenceIndex}</div><div class="metric-label">ECI Score</div></div>
        <div class="metric"><div class="metric-val">${scoreData.score}</div><div class="metric-label">Base Score</div></div>
        <div class="metric"><div class="metric-val">${scoreData.adoptionMomentum}</div><div class="metric-label">Upvotes</div></div>
        <div class="metric"><div class="metric-val">${scoreData.reviewCount}</div><div class="metric-label">Reviews</div></div>
        <div class="metric"><div class="metric-val">${scoreData.quadrantEmoji} ${scoreData.marketPosition}</div><div class="metric-label">Position</div></div>
      </div>
      <p>${scoreData.insight}</p>
      ` : ''}
      ${aiSummary ? `<h2>AI Review Summary</h2><p>${aiSummary}</p>` : ''}
      ${aiReport ? `<h2>Investor Due Diligence</h2><pre>${aiReport}</pre>` : ''}
      <div class="footer">Generated by EthAum.ai · ${new Date().toLocaleDateString()} · Enterprise AI Marketplace Intelligence</div>
      </body></html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const score = scoreData ? Number(scoreData.score) : 0;
  const eci   = scoreData ? Number(scoreData.confidenceIndex) : 0;
  const radius = 38, circ = 2 * Math.PI * radius;
  const offset = circ - (eci / 100) * circ;
  const pos  = scoreData?.marketPosition || "Emerging";
  const qCfg = QUADRANT_CONFIG[pos];

  // Mini sparkline for ECI history
  const MiniChart = ({ data }) => {
    if (!data || data.length < 2) return <span style={{color:"#475569",fontSize:12}}>Not enough data</span>;
    const vals = data.map(d => Number(d.eci));
    const max = Math.max(...vals), min = Math.min(...vals);
    const w = 120, h = 40;
    const points = vals.map((v,i) => `${(i/(vals.length-1))*w},${h-((v-min)/(max-min||1))*(h-4)-2}`).join(' ');
    return (
      <svg width={w} height={h}>
        <polyline points={points} fill="none" stroke={qCfg.color} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx={points.split(' ').pop().split(',')[0]} cy={points.split(' ').pop().split(',')[1]} r="3" fill={qCfg.color}/>
      </svg>
    );
  };

  return (
    <div id={`card-${startup.id}`} style={S.card}>
      {/* Badges */}
      <div style={{display:"flex",gap:8,flexWrap:"wrap"}}>
        {startup.early_access && <span style={S.earlyAccessBadge}>⚡ Early Access</span>}
        {scoreData && <span style={{...S.quadrantBadge,background:qCfg.bg,color:qCfg.color,border:`1px solid ${qCfg.border}`}}>{scoreData.quadrantEmoji} {pos}</span>}
      </div>

      {startup.deal_text && <div style={S.dealBanner}>🔥 {startup.deal_text}</div>}

      <h3 style={S.cardTitle}>{startup.name}</h3>
      <p style={S.cardTagline}>{startup.tagline}</p>
      <div style={{display:"flex",gap:8}}>
        <span style={S.industryTag}>{startup.industry}</span>
        <span style={S.stageTag}>{startup.stage}</span>
      </div>

      {/* ECI Gauge */}
      {scoreData && (
        <div style={{display:"flex",gap:16,alignItems:"flex-start"}}>
          <svg width="100" height="100">
            <circle stroke="#1e293b" fill="transparent" strokeWidth="8" r={radius} cx="50" cy="50"/>
            <circle stroke={qCfg.color} fill="transparent" strokeWidth="8" strokeDasharray={circ} strokeDashoffset={offset} strokeLinecap="round"
              style={{transition:"stroke-dashoffset 1.2s ease",transform:"rotate(-90deg)",transformOrigin:"50% 50%"}} r={radius} cx="50" cy="50"/>
            <text x="50%" y="46%" dominantBaseline="middle" textAnchor="middle" fill="white" fontSize="16" fontWeight="bold">{eci}</text>
            <text x="50%" y="66%" dominantBaseline="middle" textAnchor="middle" fill="#64748b" fontSize="9">ECI</text>
          </svg>
          <div style={{flex:1}}>
            <div style={{display:"grid",gridTemplateColumns:"repeat(4,1fr)",gap:6}}>
              {[["Base",score],["Upvotes",scoreData.adoptionMomentum],["Reviews",scoreData.reviewCount],["Trend",scoreData.trendingScore]].map(([label,val])=>(
                <div key={label} style={{background:"#0f172a",borderRadius:6,padding:"6px",textAlign:"center"}}>
                  <div style={{fontSize:15,fontWeight:800,color:"#f1f5f9"}}>{val}</div>
                  <div style={{fontSize:9,color:"#475569",textTransform:"uppercase"}}>{label}</div>
                </div>
              ))}
            </div>
            <p style={{color:"#94a3b8",fontSize:12,margin:"8px 0 0"}}>{scoreData.insight}</p>
          </div>
        </div>
      )}

      {/* Cert badge */}
      {scoreData && (
        <div style={{borderRadius:6,border:`1px solid ${qCfg.color}`,padding:"8px 12px",fontSize:12,fontWeight:600,textAlign:"center",color:qCfg.color,background:qCfg.bg}}>
          {eci>=70?"🟢 Enterprise Ready — Verified by EthAum AI":eci>=40?"🟡 Emerging Enterprise Candidate":"🔴 Early-Stage Risk Profile"}
        </div>
      )}

      {/* ECI History sparkline */}
      {showHistory && eciHistory.length > 0 && (
        <div style={{background:"#0f172a",borderRadius:8,padding:12,border:"1px solid #1e293b"}}>
          <div style={{color:"#64748b",fontSize:11,marginBottom:8}}>📈 ECI TREND</div>
          <MiniChart data={eciHistory}/>
          <div style={{display:"flex",justifyContent:"space-between",marginTop:4}}>
            <span style={{color:"#475569",fontSize:10}}>Start: {eciHistory[0]?.eci}</span>
            <span style={{color:qCfg.color,fontSize:10,fontWeight:700}}>Now: {eciHistory[eciHistory.length-1]?.eci}</span>
          </div>
        </div>
      )}

      {/* Auto-compare result */}
      {autoCompare && (
        <div style={{background:"#0a0f1e",border:"1px solid #1e293b",borderLeft:`3px solid #818cf8`,borderRadius:8,padding:12}}>
          <div style={{color:"#818cf8",fontSize:11,fontWeight:700,marginBottom:6}}>⚔️ VS {autoCompare.startup2 || "No competitor yet"}</div>
          <p style={{margin:0,color:"#94a3b8",fontSize:12,lineHeight:1.6}}>{autoCompare.analysis}</p>
        </div>
      )}

      {/* Action buttons */}
      <div style={{display:"flex",gap:6,flexWrap:"wrap"}}>
        <button onClick={handleUpvote} style={S.upvoteBtn}>🔥 {startup.upvotes||0}</button>
        <button onClick={()=>setShowReview(!showReview)} style={S.reviewBtn}>⭐ Review</button>
        <button onClick={getAiSummary} style={S.aiBtn} disabled={summaryLoading}>{summaryLoading?"⏳":"🤖 Summary"}</button>
        <button onClick={getDueDiligence} style={S.aiBtn} disabled={reportLoading}>{reportLoading?"⏳":"📋 DD Report"}</button>
        <button onClick={getAutoCompare} style={S.aiBtn} disabled={compareLoading}>{compareLoading?"⏳":"⚔️ vs Competitor"}</button>
        <button onClick={()=>{ getEciHistory(); }} style={S.aiBtn}>📈 History</button>
        <button onClick={exportPDF} style={{...S.aiBtn,color:"#22c55e",border:"1px solid #22c55e"}}>⬇️ PDF</button>
      </div>

      {/* AI Summary */}
      {aiSummary && (
        <div style={{background:"#0f172a",border:"1px solid #1e293b",borderLeft:"3px solid #6366f1",borderRadius:8,padding:14}}>
          <div style={{color:"#6366f1",fontSize:11,fontWeight:700,marginBottom:6}}>🤖 AI REVIEW SUMMARY</div>
          <p style={{margin:0,color:"#cbd5e1",fontSize:13,lineHeight:1.7}}>{aiSummary}</p>
        </div>
      )}

      {/* Due Diligence */}
      {aiReport && (
        <div style={{background:"#0a0f1e",border:"1px solid #1e293b",borderLeft:"3px solid #f97316",borderRadius:8,padding:16,maxHeight:400,overflowY:"auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10}}>
            <div style={{color:"#f97316",fontSize:11,fontWeight:700}}>📋 INVESTOR DUE DILIGENCE</div>
            <button onClick={exportPDF} style={{background:"#22c55e22",border:"1px solid #22c55e",color:"#22c55e",borderRadius:6,padding:"4px 10px",cursor:"pointer",fontSize:11,fontWeight:700}}>⬇️ Export PDF</button>
          </div>
          {aiReport.split('\n').map((line,i) =>
            line.startsWith('##')
              ? <h4 key={i} style={{color:"#818cf8",margin:"14px 0 4px",fontSize:13}}>{line.replace('##','').trim()}</h4>
              : <p key={i} style={{margin:"3px 0",color:"#94a3b8",fontSize:12,lineHeight:1.6}}>{line}</p>
          )}
        </div>
      )}

      {/* Review Form */}
      {showReview && (
        <form onSubmit={submitReview} style={{display:"flex",flexDirection:"column",gap:8,background:"#0a0f1e",borderRadius:8,padding:14}}>
          <div style={S.formGrid}>
            {["roi","scalability","security","integration"].map(field=>(
              <input key={field} style={S.inputSmall} placeholder={`${field.charAt(0).toUpperCase()+field.slice(1)} (1–5)`}
                value={review[field]} type="number" min="1" max="5" required
                onChange={e=>setReview({...review,[field]:e.target.value})}/>
            ))}
          </div>
          <textarea style={{...S.inputSmall,minHeight:60,resize:"vertical"}} placeholder="Enterprise review comment..." value={review.comment} onChange={e=>setReview({...review,comment:e.target.value})}/>
          <button type="submit" style={{background:"#6366f1",border:"none",color:"white",padding:"8px 16px",borderRadius:6,cursor:"pointer",fontWeight:600,fontSize:13}}>Submit Enterprise Review</button>
        </form>
      )}
    </div>
  );
}

/* ── STYLES ── */
const S = {
  page:       { minHeight:"100vh", background:"#030712", color:"#e2e8f0", fontFamily:"'DM Sans','Segoe UI',sans-serif", paddingBottom:80 },
  header:     { display:"flex", alignItems:"center", justifyContent:"space-between", padding:"16px 32px", borderBottom:"1px solid #0f172a", background:"rgba(3,7,18,0.97)", position:"sticky", top:0, zIndex:100, backdropFilter:"blur(12px)", flexWrap:"wrap", gap:10 },
  headerLeft: { display:"flex", alignItems:"center", gap:14 },
  logo:       { fontSize:28, color:"#6366f1" },
  logoText:   { margin:0, fontSize:20, fontWeight:800, letterSpacing:"-0.5px", color:"#f1f5f9" },
  logoAI:     { color:"#6366f1" },
  logoSub:    { margin:0, fontSize:10, color:"#475569" },
  launchBtn:  { background:"linear-gradient(135deg,#6366f1,#8b5cf6)", border:"none", color:"white", padding:"9px 18px", borderRadius:8, cursor:"pointer", fontWeight:700, fontSize:13 },
  tabBtn:     { background:"transparent", border:"1px solid #1e293b", color:"#64748b", padding:"7px 12px", borderRadius:8, cursor:"pointer", fontSize:12 },
  tabBtnActive:{ background:"#0f172a", border:"1px solid #6366f1", color:"#818cf8" },
  taglineBar: { display:"flex", alignItems:"center", justifyContent:"center", gap:16, padding:"12px 32px", background:"linear-gradient(90deg,#0a0f1e,#0f172a,#0a0f1e)", borderBottom:"1px solid #1e293b" },
  taglineText:{ fontSize:12, fontWeight:700, letterSpacing:"0.2em", textTransform:"uppercase", background:"linear-gradient(90deg,#6366f1,#a78bfa,#6366f1)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" },
  taglineDot: { width:5, height:5, borderRadius:"50%", background:"linear-gradient(135deg,#6366f1,#a78bfa)", display:"inline-block" },
  tabContent: { padding:"24px 32px" },
  panel:      { background:"#0a0f1e", border:"1px solid #1e293b", borderRadius:12, padding:24, marginBottom:24 },
  formCard:   { background:"#0f172a", border:"1px solid #1e293b", borderRadius:12, padding:24, marginBottom:24 },
  formGrid:   { display:"grid", gridTemplateColumns:"1fr 1fr", gap:12 },
  input:      { background:"#1e293b", border:"1px solid #334155", color:"#e2e8f0", borderRadius:8, padding:"10px 14px", fontSize:14, width:"100%", boxSizing:"border-box", outline:"none" },
  inputSmall: { background:"#0f172a", border:"1px solid #1e293b", color:"#e2e8f0", borderRadius:6, padding:"8px 12px", fontSize:13, width:"100%", boxSizing:"border-box", outline:"none" },
  select:     { background:"#0f172a", border:"1px solid #1e293b", color:"#e2e8f0", borderRadius:8, padding:"10px 14px", fontSize:14, minWidth:200, outline:"none" },
  checkLabel: { display:"flex", alignItems:"center", fontSize:13, color:"#94a3b8", cursor:"pointer" },
  sectionTitle:{ margin:"0 0 4px", fontSize:18, fontWeight:800, color:"#f1f5f9" },
  trendingItem:{ display:"flex", alignItems:"center", gap:12, background:"#0f172a", borderRadius:8, padding:"10px 14px", border:"1px solid #1e293b" },
  trendingRank:{ color:"#475569", fontWeight:800, fontSize:16, minWidth:28 },
  earlyBadge: { background:"#7c3aed22", color:"#a78bfa", border:"1px solid #7c3aed", borderRadius:20, padding:"2px 10px", fontSize:11, fontWeight:700 },
  cardsGrid:  { display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(420px,1fr))", gap:20 },
  card:       { background:"#0c1322", border:"1px solid #1e293b", borderRadius:12, padding:20, display:"flex", flexDirection:"column", gap:12 },
  earlyAccessBadge:{ background:"#7c3aed22", color:"#a78bfa", border:"1px solid #7c3aed", borderRadius:20, padding:"3px 12px", fontSize:11, fontWeight:700 },
  quadrantBadge:   { borderRadius:20, padding:"3px 12px", fontSize:11, fontWeight:700 },
  dealBanner: { background:"linear-gradient(90deg,#92400e22,#78350f22)", border:"1px solid #92400e", borderRadius:6, padding:"6px 12px", color:"#fbbf24", fontSize:12, fontWeight:600 },
  cardTitle:  { margin:0, fontSize:17, fontWeight:800, color:"#f1f5f9" },
  cardTagline:{ margin:0, fontSize:13, color:"#64748b" },
  industryTag:{ background:"#1e293b", color:"#94a3b8", borderRadius:20, padding:"2px 10px", fontSize:11 },
  stageTag:   { background:"#1e293b", color:"#6366f1", borderRadius:20, padding:"2px 10px", fontSize:11 },
  upvoteBtn:  { background:"#f9731622", border:"1px solid #f97316", color:"#f97316", borderRadius:6, padding:"7px 10px", cursor:"pointer", fontWeight:700, fontSize:12, flex:1 },
  reviewBtn:  { background:"#6366f122", border:"1px solid #6366f1", color:"#818cf8", borderRadius:6, padding:"7px 10px", cursor:"pointer", fontWeight:700, fontSize:12, flex:1 },
  aiBtn:      { background:"#0f172a", border:"1px solid #334155", color:"#94a3b8", borderRadius:6, padding:"7px 10px", cursor:"pointer", fontWeight:600, fontSize:11, flex:1 },
  chatBox:    { background:"#0a0f1e", border:"1px solid #1e293b", borderRadius:12, padding:20, minHeight:400, maxHeight:500, overflowY:"auto", display:"flex", flexDirection:"column" },
};