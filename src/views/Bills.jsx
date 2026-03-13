import { useState } from "react";
import { S, PALETTE, BILL_FREQUENCIES } from "../lib/config.js";
import { SectionTitle, EmptyState, IconPicker, ColorPicker } from "../components/UI.jsx";

const BILL_ICONS = ["📱","💡","🌐","🏠","🚗","📺","🎵","🏥","🛡️","🐾","📦","💳","🏋️","☕","🧹"];

export default function Bills({ store }) {
  const { bills, setAndSaveBills } = store;
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ name:"", amount:"", nextDue:"", frequency:"Monthly", icon:"📱", color:PALETTE[0], autopay:false });
  const [editId, setEditId] = useState(null);

  const today = new Date();

  function getDaysUntil(dateStr) {
    if (!dateStr) return null;
    const diff = new Date(dateStr+"T12:00:00") - today;
    return Math.ceil(diff/(1000*60*60*24));
  }

  function getDueBadge(days) {
    if (days === null) return null;
    if (days < 0)  return { label:"Overdue", color:"#ff4444" };
    if (days === 0) return { label:"Today!", color:"#ff6b6b" };
    if (days <= 2)  return { label:`${days}d`, color:"#ff6b6b" };
    if (days <= 7)  return { label:`${days}d`, color:"#FFA726" };
    return { label:`${days}d`, color:"#6b7280" };
  }

  function startEdit(bill) {
    setForm({ name:bill.name, amount:bill.amount, nextDue:bill.nextDue||"", frequency:bill.frequency||"Monthly", icon:bill.icon||"📱", color:bill.color||PALETTE[0], autopay:bill.autopay||false });
    setEditId(bill.id);
    setShowForm(true);
  }

  async function saveBill() {
    if (!form.name || !form.amount) return;
    const entry = { ...form, amount:parseFloat(form.amount), id: editId||Date.now() };
    const updated = editId ? bills.map(b=>b.id===editId?entry:b) : [...bills, entry];
    await setAndSaveBills(updated);
    setForm({ name:"", amount:"", nextDue:"", frequency:"Monthly", icon:"📱", color:PALETTE[0], autopay:false });
    setShowForm(false); setEditId(null);
  }

  async function deleteBill(id) {
    await setAndSaveBills(bills.filter(b=>b.id!==id));
  }

  const sorted = [...bills].sort((a,b)=>{
    const da=getDaysUntil(a.nextDue)??999, db=getDaysUntil(b.nextDue)??999;
    return da-db;
  });

  const totalMonthly = bills.reduce((s,b)=>{
    const a = parseFloat(b.amount)||0;
    if (b.frequency==="Monthly") return s+a;
    if (b.frequency==="Bi-weekly") return s+a*2.17;
    if (b.frequency==="Weekly") return s+a*4.33;
    if (b.frequency==="Quarterly") return s+a/3;
    if (b.frequency==="Annually") return s+a/12;
    return s+a;
  },0);

  return (
    <div style={{ maxWidth:600, margin:"0 auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:700 }}>📅 Recurring Bills</div>
          <div style={{ fontSize:13, color:"#6b7280", marginTop:2 }}>~${totalMonthly.toFixed(0)}/mo in fixed expenses</div>
        </div>
        <button onClick={()=>{setShowForm(s=>!s);setEditId(null);setForm({name:"",amount:"",nextDue:"",frequency:"Monthly",icon:"📱",color:PALETTE[0],autopay:false});}}
          style={{ padding:"8px 16px", borderRadius:10, border:"1px solid rgba(99,102,241,0.4)", background:"rgba(99,102,241,0.1)", color:"#a5b4fc", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:13 }}>
          {showForm?"✕ Cancel":"+ Add Bill"}
        </button>
      </div>

      {showForm && (
        <div style={{ ...S.card, margin:"14px 0", padding:22, border:"1px solid rgba(99,102,241,0.25)", background:"rgba(99,102,241,0.05)" }}>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>{editId?"✏️ Edit Bill":"➕ New Bill"}</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <div><label style={S.label}>Bill Name</label><input style={S.input} placeholder="e.g. Netflix" value={form.name} onChange={e=>setForm(f=>({...f,name:e.target.value}))} /></div>
            <div><label style={S.label}>Amount ($)</label><input type="number" style={S.input} placeholder="0" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} /></div>
            <div><label style={S.label}>Next Due Date</label><input type="date" style={S.input} value={form.nextDue} onChange={e=>setForm(f=>({...f,nextDue:e.target.value}))} /></div>
            <div>
              <label style={S.label}>Frequency</label>
              <select style={S.input} value={form.frequency} onChange={e=>setForm(f=>({...f,frequency:e.target.value}))}>
                {BILL_FREQUENCIES.map(f=><option key={f}>{f}</option>)}
              </select>
            </div>
          </div>
          <div style={{ marginBottom:12 }}><label style={S.label}>Icon</label><IconPicker icons={BILL_ICONS} value={form.icon} onChange={v=>setForm(f=>({...f,icon:v}))} /></div>
          <div style={{ marginBottom:12 }}><label style={S.label}>Color</label><ColorPicker palette={PALETTE} value={form.color} onChange={v=>setForm(f=>({...f,color:v}))} /></div>
          <div style={{ marginBottom:16, display:"flex", alignItems:"center", gap:10 }}>
            <input type="checkbox" id="autopay" checked={form.autopay} onChange={e=>setForm(f=>({...f,autopay:e.target.checked}))} style={{ width:16, height:16, cursor:"pointer" }} />
            <label htmlFor="autopay" style={{ fontSize:13, color:"#9ca3af", cursor:"pointer" }}>✅ Autopay — no action needed</label>
          </div>
          <button style={S.btn()} onClick={saveBill}>{editId?"Save Changes":"Add Bill"}</button>
        </div>
      )}

      {bills.length===0 && !showForm && <EmptyState icon="📅" title="No bills yet" body="Add your recurring expenses — rent, subscriptions, utilities — and see what's due and when." />}

      {/* Calendar-style list */}
      {sorted.length > 0 && (
        <div>
          {/* Due soon section */}
          {sorted.filter(b=>{ const d=getDaysUntil(b.nextDue); return d!==null&&d<=7; }).length > 0 && (
            <div style={{ marginBottom:14 }}>
              <div style={{ fontSize:12, fontWeight:600, color:"#FFA726", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:8 }}>⚡ Due This Week</div>
              {sorted.filter(b=>{ const d=getDaysUntil(b.nextDue); return d!==null&&d<=7; }).map(b=>renderBill(b))}
            </div>
          )}
          <div style={S.card}>
            <SectionTitle>All Bills</SectionTitle>
            {sorted.map((b,i)=>renderBill(b,i,sorted.length))}
          </div>
        </div>
      )}
    </div>
  );

  function renderBill(b, i, total) {
    const days = getDaysUntil(b.nextDue);
    const badge = getDueBadge(days);
    return (
      <div key={b.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 0", borderBottom:i<total-1?"1px solid rgba(255,255,255,0.04)":"none" }}>
        <div style={{ width:38, height:38, borderRadius:11, background:`${b.color||PALETTE[0]}22`, display:"flex", alignItems:"center", justifyContent:"center", fontSize:18, border:`1px solid ${b.color||PALETTE[0]}33`, flexShrink:0 }}>{b.icon||"📅"}</div>
        <div style={{ flex:1 }}>
          <div style={{ display:"flex", alignItems:"center", gap:8 }}>
            <span style={{ fontSize:14, fontWeight:500 }}>{b.name}</span>
            {b.autopay && <span style={{ fontSize:10, color:"#34d399", background:"rgba(52,211,153,0.1)", padding:"2px 6px", borderRadius:20, border:"1px solid rgba(52,211,153,0.2)" }}>AUTO</span>}
          </div>
          <div style={{ fontSize:11, color:"#4b5563", marginTop:2 }}>{b.frequency} · {b.nextDue||"No date set"}</div>
        </div>
        <div style={{ textAlign:"right", flexShrink:0 }}>
          <div style={{ fontSize:15, fontWeight:700, fontFamily:"monospace" }}>${parseFloat(b.amount).toFixed(0)}</div>
          {badge && <div style={{ fontSize:11, color:badge.color, fontWeight:600 }}>{badge.label}</div>}
        </div>
        <div style={{ display:"flex", gap:6 }}>
          <button onClick={()=>startEdit(b)} style={{ background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:8, padding:"5px 9px", color:"#9ca3af", cursor:"pointer", fontSize:13 }}>✏️</button>
          <button onClick={()=>deleteBill(b.id)} style={{ background:"rgba(239,68,68,0.1)", border:"1px solid rgba(239,68,68,0.2)", borderRadius:8, padding:"5px 9px", color:"#f87171", cursor:"pointer", fontSize:13 }}>✕</button>
        </div>
      </div>
    );
  }
}
