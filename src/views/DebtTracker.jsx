import { useState } from "react";
import { S, DEBT_CATEGORIES, PALETTE } from "../lib/config.js";
import { SectionTitle, EmptyState, ProgressBar, Row } from "../components/UI.jsx";

export default function DebtTracker({ store }) {
  const { debts, setAndSaveDebts } = store;
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name:"", category:"Credit Card", balance:"", rate:"", minPayment:"", color:PALETTE[0] });
  const [editId, setEditId] = useState(null);
  const [method, setMethod] = useState("avalanche"); // avalanche | snowball
  const [extraPayment, setExtraPayment] = useState(0);

  async function saveDebt() {
    if (!form.name || !form.balance) return;
    const entry = { ...form, balance:parseFloat(form.balance), originalBalance:parseFloat(form.balance), rate:parseFloat(form.rate)||0, minPayment:parseFloat(form.minPayment)||0, id:editId||Date.now() };
    if (editId) {
      const existing = debts.find(d=>d.id===editId);
      entry.originalBalance = existing?.originalBalance || entry.balance;
    }
    const updated = editId ? debts.map(d=>d.id===editId?entry:d) : [...debts, entry];
    await setAndSaveDebts(updated);
    setForm({ name:"", category:"Credit Card", balance:"", rate:"", minPayment:"", color:PALETTE[0] });
    setShowForm(false); setEditId(null);
  }

  async function deleteDebt(id) { await setAndSaveDebts(debts.filter(d=>d.id!==id)); }

  async function logPayment(id, amount) {
    const updated = debts.map(d => d.id===id ? { ...d, balance: Math.max(0, d.balance-amount) } : d);
    await setAndSaveDebts(updated);
  }

  function startEdit(d) {
    setForm({ name:d.name, category:d.category||"Credit Card", balance:d.balance, rate:d.rate||0, minPayment:d.minPayment||0, color:d.color||PALETTE[0] });
    setEditId(d.id); setShowForm(true);
  }

  // Sort debts by method
  const sorted = [...debts].filter(d=>d.balance>0).sort((a,b)=>
    method==="avalanche" ? (b.rate||0)-(a.rate||0) : a.balance-b.balance
  );
  const paid = debts.filter(d=>d.balance<=0);

  const totalDebt = debts.reduce((s,d)=>s+d.balance,0);
  const totalOriginal = debts.reduce((s,d)=>s+(d.originalBalance||d.balance),0);
  const totalPaid = totalOriginal - totalDebt;
  const totalMin = debts.reduce((s,d)=>s+(d.minPayment||0),0);

  // Simple months-to-payoff estimate
  function monthsToPayoff(balance, rate, payment) {
    if (!payment || payment <= 0) return null;
    if (!rate || rate <= 0) return Math.ceil(balance/payment);
    const r = (rate/100)/12;
    if (payment <= balance*r) return null; // never pays off
    return Math.ceil(Math.log(payment/(payment-balance*r))/Math.log(1+r));
  }

  return (
    <div style={{ maxWidth:600, margin:"0 auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:700 }}>💳 Debt Payoff</div>
          <div style={{ fontSize:13, color:"#6b7280", marginTop:2 }}>Track and crush your debt</div>
        </div>
        <button onClick={()=>{setShowForm(s=>!s);setEditId(null);setForm({name:"",category:"Credit Card",balance:"",rate:"",minPayment:"",color:PALETTE[0]});}}
          style={{ padding:"8px 16px", borderRadius:10, border:"1px solid rgba(255,107,107,0.4)", background:"rgba(255,107,107,0.1)", color:"#fca5a5", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:13 }}>
          {showForm?"✕ Cancel":"+ Add Debt"}
        </button>
      </div>

      {/* Summary */}
      {debts.length > 0 && (
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, margin:"14px 0" }}>
          {[
            { label:"Total Debt", value:`$${totalDebt.toLocaleString()}`, color:"#ff6b6b" },
            { label:"Paid Off", value:`$${totalPaid.toLocaleString()}`, color:"#34d399" },
            { label:"Min/Month", value:`$${totalMin.toFixed(0)}`, color:"#FFA726" },
          ].map(s=>(
            <div key={s.label} style={{ ...S.card, textAlign:"center" }}>
              <div style={{ fontSize:10, color:"#6b7280", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:5 }}>{s.label}</div>
              <div style={{ fontSize:20, fontWeight:700, fontFamily:"monospace", color:s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {showForm && (
        <div style={{ ...S.card, margin:"14px 0", padding:22, border:"1px solid rgba(255,107,107,0.2)", background:"rgba(255,107,107,0.04)" }}>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>{editId?"✏️ Edit Debt":"➕ Add Debt"}</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <div><label style={S.label}>Name</label><input style={S.input} placeholder="e.g. Chase Sapphire" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div>
            <div>
              <label style={S.label}>Type</label>
              <select style={S.input} value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                {DEBT_CATEGORIES.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div><label style={S.label}>Current Balance ($)</label><input type="number" style={S.input} placeholder="0" value={form.balance} onChange={e=>setForm(f=>({...f,balance:e.target.value}))} /></div>
            <div><label style={S.label}>Interest Rate (%)</label><input type="number" step="0.01" style={S.input} placeholder="e.g. 19.99" value={form.rate} onChange={e=>setForm(f=>({...f,rate:e.target.value}))} /></div>
            <div><label style={S.label}>Min Payment ($)</label><input type="number" style={S.input} placeholder="0" value={form.minPayment} onChange={e=>setForm(f=>({...f,minPayment:e.target.value}))} /></div>
            <div>
              <label style={S.label}>Color</label>
              <div style={{ display:"flex", flexWrap:"wrap", gap:5, marginTop:6 }}>
                {PALETTE.slice(0,8).map(col=><button key={col} onClick={()=>setForm(f=>({...f,color:col}))} style={{ width:26, height:26, borderRadius:"50%", background:col, border:`3px solid ${form.color===col?"#fff":"transparent"}`, cursor:"pointer" }} />)}
              </div>
            </div>
          </div>
          <button style={S.btn("#ef4444")} onClick={saveDebt}>{editId?"Save Changes":"Add Debt"}</button>
        </div>
      )}

      {debts.length===0 && !showForm && <EmptyState icon="💳" title="No debts tracked" body="Add your debts to see a payoff plan using the avalanche or snowball method." />}

      {debts.length > 0 && (
        <div>
          {/* Strategy selector */}
          <div style={{ ...S.card, marginBottom:14, padding:16 }}>
            <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
              <SectionTitle>Payoff Strategy</SectionTitle>
              <div style={{ display:"flex", gap:6 }}>
                {[["avalanche","🏔️ Avalanche"],["snowball","❄️ Snowball"]].map(([v,label])=>(
                  <button key={v} onClick={()=>setMethod(v)} style={{ padding:"6px 14px", borderRadius:20, border:"1px solid", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:500, fontSize:12, borderColor:method===v?"#6366f1":"rgba(255,255,255,0.1)", background:method===v?"rgba(99,102,241,0.15)":"transparent", color:method===v?"#a5b4fc":"#6b7280" }}>{label}</button>
                ))}
              </div>
            </div>
            <div style={{ fontSize:12, color:"#4b5563", marginBottom:12 }}>
              {method==="avalanche"?"Highest interest rate first — saves the most money overall":"Smallest balance first — fastest wins to stay motivated"}
            </div>
            <div>
              <label style={S.label}>Extra monthly payment on top of minimums ($)</label>
              <input type="number" style={{ ...S.input }} placeholder="0" value={extraPayment||""} onChange={e=>setExtraPayment(parseFloat(e.target.value)||0)} />
            </div>
          </div>

          {/* Debt list */}
          <div style={S.card}>
            <SectionTitle>Your Debts — Payoff Order</SectionTitle>
            {sorted.map((d,i)=>{
              const pct = d.originalBalance>0?((d.originalBalance-d.balance)/d.originalBalance)*100:0;
              const payment = i===0 ? (d.minPayment||0)+extraPayment : (d.minPayment||0);
              const months = monthsToPayoff(d.balance, d.rate, payment);
              return (
                <div key={d.id} style={{ padding:"14px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                    <div style={{ display:"flex", alignItems:"center", gap:10 }}>
                      <div style={{ width:28, height:28, borderRadius:8, background:`${d.color}22`, border:`2px solid ${d.color}44`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, fontWeight:700, color:d.color, flexShrink:0 }}>#{i+1}</div>
                      <div>
                        <div style={{ fontSize:14, fontWeight:600 }}>{d.name}</div>
                        <div style={{ fontSize:11, color:"#4b5563" }}>{d.category} · {d.rate}% APR</div>
                      </div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:16, fontWeight:700, fontFamily:"monospace", color:"#ff6b6b" }}>${d.balance.toLocaleString()}</div>
                      {months && <div style={{ fontSize:11, color:"#6b7280" }}>{months} mo to payoff</div>}
                    </div>
                  </div>
                  <ProgressBar pct={pct} color={d.color} height={5} />
                  <div style={{ display:"flex", justifyContent:"space-between", marginTop:5 }}>
                    <span style={{ fontSize:11, color:"#4b5563" }}>{pct.toFixed(0)}% paid · min ${d.minPayment}/mo</span>
                    <div style={{ display:"flex", gap:6 }}>
                      <button onClick={()=>{ const amt=prompt("Log payment amount:"); if(amt) logPayment(d.id,parseFloat(amt)||0); }} style={{ fontSize:11, padding:"4px 10px", borderRadius:8, border:`1px solid ${d.color}44`, background:`${d.color}11`, color:d.color, cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>+ Payment</button>
                      <button onClick={()=>startEdit(d)} style={{ fontSize:11, padding:"4px 10px", borderRadius:8, border:"1px solid rgba(255,255,255,0.1)", background:"transparent", color:"#6b7280", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>✏️</button>
                      <button onClick={()=>deleteDebt(d.id)} style={{ fontSize:11, padding:"4px 10px", borderRadius:8, border:"1px solid rgba(239,68,68,0.2)", background:"rgba(239,68,68,0.08)", color:"#f87171", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>✕</button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>

          {/* Paid off */}
          {paid.length > 0 && (
            <div style={{ ...S.card, marginTop:14, background:"rgba(16,185,129,0.04)", border:"1px solid rgba(16,185,129,0.15)" }}>
              <SectionTitle>🎉 Paid Off</SectionTitle>
              {paid.map(d=>(
                <div key={d.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"8px 0", borderBottom:"1px solid rgba(16,185,129,0.1)" }}>
                  <span style={{ fontSize:13, color:"#34d399" }}>✅ {d.name}</span>
                  <div style={{ display:"flex", gap:8, alignItems:"center" }}>
                    <span style={{ fontSize:12, fontFamily:"monospace", color:"#4b5563", textDecoration:"line-through" }}>${(d.originalBalance||0).toLocaleString()}</span>
                    <button onClick={()=>deleteDebt(d.id)} style={{ fontSize:11, padding:"3px 8px", borderRadius:6, border:"1px solid rgba(239,68,68,0.2)", background:"transparent", color:"#6b7280", cursor:"pointer" }}>Remove</button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
