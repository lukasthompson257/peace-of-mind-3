import { useState } from "react";
import { S, ASSET_CATEGORIES, DEBT_CATEGORIES, PALETTE, getMYLabel, thisMonthKey, MONTHS } from "../lib/config.js";
import { SectionTitle, Row, ProgressBar, EmptyState } from "../components/UI.jsx";

export default function NetWorth({ store }) {
  const { netWorthLog, setAndSaveNetWorthLog } = store;
  const [editMonth, setEditMonth] = useState(thisMonthKey());
  const [form, setForm] = useState({ assets:{}, liabilities:{} });
  const [editing, setEditing] = useState(false);

  const sorted = [...netWorthLog].sort((a,b)=>a.month.localeCompare(b.month));
  const latest = sorted.at(-1);
  const prev    = sorted.at(-2);

  function totalA(entry) { return Object.values(entry?.assets||{}).reduce((s,v)=>s+(v||0),0); }
  function totalL(entry) { return Object.values(entry?.liabilities||{}).reduce((s,v)=>s+(v||0),0); }
  function nw(entry)     { return totalA(entry)-totalL(entry); }

  function startEdit(month) {
    const existing = netWorthLog.find(e=>e.month===month);
    setForm(existing ? { assets:{...existing.assets}, liabilities:{...existing.liabilities} } : { assets:{}, liabilities:{} });
    setEditMonth(month);
    setEditing(true);
  }

  async function saveEntry() {
    const existing = netWorthLog.find(e=>e.month===editMonth);
    const entry = { month:editMonth, assets:{...form.assets}, liabilities:{...form.liabilities} };
    const updated = existing ? netWorthLog.map(e=>e.month===editMonth?entry:e) : [...netWorthLog, entry];
    await setAndSaveNetWorthLog(updated);
    setEditing(false);
  }

  const allMonths = (() => {
    const cur = thisMonthKey();
    const [y,m] = cur.split("-").map(Number);
    return Array.from({length:12},(_,i)=>{const d=new Date(y,m-1-i,1);return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;});
  })();

  const maxNW = Math.max(...sorted.map(e=>Math.abs(nw(e))),1);

  return (
    <div style={{ maxWidth:600, margin:"0 auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:700 }}>🏦 Net Worth</div>
          <div style={{ fontSize:13, color:"#6b7280", marginTop:2 }}>Assets minus liabilities, tracked monthly</div>
        </div>
        <button onClick={()=>startEdit(thisMonthKey())} style={{ padding:"8px 16px", borderRadius:10, border:"1px solid rgba(99,102,241,0.4)", background:"rgba(99,102,241,0.1)", color:"#a5b4fc", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:13 }}>
          + Log This Month
        </button>
      </div>

      {/* Summary cards */}
      {latest && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:14 }}>
          {[
            { label:"Net Worth", value:`$${nw(latest).toLocaleString()}`, color:nw(latest)>=0?"#34d399":"#ff6b6b" },
            { label:"Total Assets", value:`$${totalA(latest).toLocaleString()}`, color:"#a8c5a0" },
            { label:"Total Debts", value:`$${totalL(latest).toLocaleString()}`, color:"#ff6b6b" },
          ].map(s=>(
            <div key={s.label} style={{ ...S.card, textAlign:"center" }}>
              <div style={{ fontSize:10, color:"#6b7280", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:5 }}>{s.label}</div>
              <div style={{ fontSize:20, fontWeight:700, fontFamily:"monospace", color:s.color }}>{s.value}</div>
              {prev && s.label==="Net Worth" && <div style={{ fontSize:10, marginTop:3, color:nw(latest)>=nw(prev)?"#34d399":"#ff6b6b" }}>{nw(latest)>=nw(prev)?"▲":"▼"} ${Math.abs(nw(latest)-nw(prev)).toLocaleString()} vs last mo</div>}
            </div>
          ))}
        </div>
      )}

      {/* Trend bar chart */}
      {sorted.length > 1 && (
        <div style={{ ...S.card, marginBottom:14 }}>
          <SectionTitle>Net Worth Trend</SectionTitle>
          <div style={{ display:"flex", alignItems:"flex-end", gap:6, height:100 }}>
            {sorted.map(e => {
              const val=nw(e), pct=(Math.abs(val)/maxNW)*90;
              const isPos=val>=0;
              return (
                <div key={e.month} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:4 }} onClick={()=>startEdit(e.month)}>
                  <div style={{ fontSize:9, color:"#4b5563", fontFamily:"monospace" }}>{val>=0?`$${(val/1000).toFixed(0)}k`:""}</div>
                  <div style={{ width:"100%", height:`${pct}px`, borderRadius:"4px 4px 0 0", background:isPos?"linear-gradient(180deg,#34d399,#10b981)":"linear-gradient(180deg,#ff6b6b,#ef4444)", cursor:"pointer", minHeight:3 }} />
                  <div style={{ fontSize:9, color:"#4b5563" }}>{getMYLabel(e.month).split(" ")[0]}</div>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* Edit form */}
      {editing && (
        <div style={{ ...S.card, marginBottom:14, padding:22, border:"1px solid rgba(99,102,241,0.25)", background:"rgba(99,102,241,0.05)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
            <div style={{ fontSize:14, fontWeight:700 }}>📝 {getMYLabel(editMonth)}</div>
            <select value={editMonth} onChange={e=>{setEditMonth(e.target.value);startEdit(e.target.value);}} style={{ ...S.input, width:"auto", padding:"6px 10px", fontSize:12 }}>
              {allMonths.map(m=><option key={m} value={m}>{getMYLabel(m)}</option>)}
            </select>
          </div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
            <div>
              <SectionTitle>Assets 💚</SectionTitle>
              {ASSET_CATEGORIES.map(cat=>(
                <div key={cat} style={{ marginBottom:10 }}>
                  <label style={S.label}>{cat}</label>
                  <input type="number" value={form.assets[cat]||""} placeholder="0" style={S.input}
                    onChange={e=>setForm(f=>({...f,assets:{...f.assets,[cat]:parseFloat(e.target.value)||0}}))} />
                </div>
              ))}
              <div style={{ paddingTop:8, borderTop:"1px solid rgba(255,255,255,0.07)", fontSize:13, fontWeight:700, fontFamily:"monospace", color:"#a8c5a0" }}>Total: ${totalA(form).toLocaleString()}</div>
            </div>
            <div>
              <SectionTitle>Liabilities 🔴</SectionTitle>
              {DEBT_CATEGORIES.map(cat=>(
                <div key={cat} style={{ marginBottom:10 }}>
                  <label style={S.label}>{cat}</label>
                  <input type="number" value={form.liabilities[cat]||""} placeholder="0" style={S.input}
                    onChange={e=>setForm(f=>({...f,liabilities:{...f.liabilities,[cat]:parseFloat(e.target.value)||0}}))} />
                </div>
              ))}
              <div style={{ paddingTop:8, borderTop:"1px solid rgba(255,255,255,0.07)", fontSize:13, fontWeight:700, fontFamily:"monospace", color:"#ff6b6b" }}>Total: ${totalL(form).toLocaleString()}</div>
            </div>
          </div>
          <div style={{ marginTop:16, padding:"12px 16px", background:"rgba(255,255,255,0.04)", borderRadius:10, display:"flex", justifyContent:"space-between", marginBottom:16 }}>
            <span style={{ fontWeight:600, color:"#9ca3af" }}>Net Worth</span>
            <span style={{ fontWeight:700, fontFamily:"monospace", fontSize:18, color:(totalA(form)-totalL(form))>=0?"#34d399":"#ff6b6b" }}>${(totalA(form)-totalL(form)).toLocaleString()}</span>
          </div>
          <div style={{ display:"flex", gap:8 }}>
            <button style={S.btn()} onClick={saveEntry}>Save</button>
            <button onClick={()=>setEditing(false)} style={{ flex:0.4, padding:"11px", borderRadius:12, border:"1px solid rgba(255,255,255,0.1)", background:"transparent", color:"#6b7280", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>Cancel</button>
          </div>
        </div>
      )}

      {/* History list */}
      {sorted.length === 0 && !editing && <EmptyState icon="🏦" title="No entries yet" body="Log your assets and debts once a month to track your net worth over time." />}
      {sorted.length > 0 && (
        <div style={S.card}>
          <SectionTitle>Monthly History</SectionTitle>
          {[...sorted].reverse().map((e,i)=>(
            <div key={e.month} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"11px 0", borderBottom:i<sorted.length-1?"1px solid rgba(255,255,255,0.04)":"none", cursor:"pointer" }} onClick={()=>startEdit(e.month)}>
              <div style={{ fontSize:13, color:"#9ca3af" }}>{getMYLabel(e.month)}</div>
              <div style={{ display:"flex", gap:20, alignItems:"center" }}>
                <span style={{ fontSize:12, color:"#a8c5a0", fontFamily:"monospace" }}>↑${totalA(e).toLocaleString()}</span>
                <span style={{ fontSize:12, color:"#ff6b6b", fontFamily:"monospace" }}>↓${totalL(e).toLocaleString()}</span>
                <span style={{ fontSize:14, fontWeight:700, fontFamily:"monospace", color:nw(e)>=0?"#34d399":"#ff6b6b" }}>${nw(e).toLocaleString()}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
