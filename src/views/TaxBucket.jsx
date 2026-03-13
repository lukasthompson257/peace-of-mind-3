import { useState } from "react";
import { S, TAX_CATEGORIES, PALETTE, thisYear } from "../lib/config.js";
import { SectionTitle, EmptyState } from "../components/UI.jsx";

export default function TaxBucket({ store }) {
  const { taxItems, setAndSaveTaxItems, expenses } = store;
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState({ description:"", amount:"", category:"Home Office", date:"", notes:"" });
  const [editId, setEditId] = useState(null);
  const [filterCat, setFilterCat] = useState("All");
  const [year, setYear] = useState(thisYear());

  const years = [...new Set([thisYear(), ...(taxItems.map(t=>t.date?.split("-")[0]).filter(Boolean))])].sort().reverse();

  async function saveItem() {
    if (!form.description || !form.amount) return;
    const entry = { ...form, amount:parseFloat(form.amount), id:editId||Date.now() };
    const updated = editId ? taxItems.map(t=>t.id===editId?entry:t) : [...taxItems, entry];
    await setAndSaveTaxItems(updated);
    setForm({ description:"", amount:"", category:"Home Office", date:"", notes:"" });
    setShowForm(false); setEditId(null);
  }

  async function deleteItem(id) { await setAndSaveTaxItems(taxItems.filter(t=>t.id!==id)); }

  function startEdit(t) {
    setForm({ description:t.description, amount:t.amount, category:t.category, date:t.date||"", notes:t.notes||"" });
    setEditId(t.id); setShowForm(true);
  }

  // Also surface expenses that are likely tax-deductible from import history
  const yearItems = taxItems.filter(t=>t.date?.startsWith(year));
  const filtered = filterCat==="All" ? yearItems : yearItems.filter(t=>t.category===filterCat);

  const totalByCategory = Object.fromEntries(TAX_CATEGORIES.map(cat=>[cat, yearItems.filter(t=>t.category===cat).reduce((s,t)=>s+t.amount,0)]));
  const grandTotal = yearItems.reduce((s,t)=>s+t.amount,0);

  const catColors = Object.fromEntries(TAX_CATEGORIES.map((c,i)=>[c,PALETTE[i%PALETTE.length]]));

  return (
    <div style={{ maxWidth:600, margin:"0 auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:4 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:700 }}>🧾 Tax Bucket</div>
          <div style={{ fontSize:13, color:"#6b7280", marginTop:2 }}>Tag deductible expenses all year, export in April</div>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <select value={year} onChange={e=>setYear(e.target.value)} style={{ ...S.input, width:"auto", padding:"7px 12px", fontSize:13 }}>
            {years.map(y=><option key={y}>{y}</option>)}
          </select>
          <button onClick={()=>{setShowForm(s=>!s);setEditId(null);setForm({description:"",amount:"",category:"Home Office",date:"",notes:""});}}
            style={{ padding:"8px 16px", borderRadius:10, border:"1px solid rgba(99,102,241,0.4)", background:"rgba(99,102,241,0.1)", color:"#a5b4fc", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:13, whiteSpace:"nowrap" }}>
            {showForm?"✕":"+ Add"}
          </button>
        </div>
      </div>

      {/* Summary bar */}
      {yearItems.length > 0 && (
        <div style={{ ...S.card, margin:"14px 0", padding:18, background:"rgba(16,185,129,0.05)", border:"1px solid rgba(16,185,129,0.15)" }}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
            <div style={{ fontSize:11, fontWeight:600, color:"#34d399", textTransform:"uppercase", letterSpacing:"0.5px" }}>Total Deductible — {year}</div>
            <div style={{ fontSize:22, fontWeight:700, fontFamily:"monospace", color:"#34d399" }}>${grandTotal.toFixed(2)}</div>
          </div>
          <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
            {TAX_CATEGORIES.filter(c=>totalByCategory[c]>0).map(c=>(
              <div key={c} style={{ padding:"5px 12px", borderRadius:20, background:`${catColors[c]}18`, border:`1px solid ${catColors[c]}33`, fontSize:12 }}>
                <span style={{ color:catColors[c], fontWeight:600 }}>{c}</span>
                <span style={{ color:"#6b7280", marginLeft:6, fontFamily:"monospace" }}>${totalByCategory[c].toFixed(0)}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {showForm && (
        <div style={{ ...S.card, margin:"14px 0", padding:22, border:"1px solid rgba(99,102,241,0.25)", background:"rgba(99,102,241,0.05)" }}>
          <div style={{ fontSize:14, fontWeight:700, marginBottom:14 }}>{editId?"✏️ Edit Item":"➕ New Deductible Expense"}</div>
          <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:12, marginBottom:12 }}>
            <div style={{ gridColumn:"1/-1" }}><label style={S.label}>Description</label><input style={S.input} placeholder="e.g. Home office chair" value={form.description} onChange={e=>setForm(f=>({...f,description:e.target.value}))} /></div>
            <div><label style={S.label}>Amount ($)</label><input type="number" style={S.input} placeholder="0" value={form.amount} onChange={e=>setForm(f=>({...f,amount:e.target.value}))} /></div>
            <div><label style={S.label}>Date</label><input type="date" style={S.input} value={form.date} onChange={e=>setForm(f=>({...f,date:e.target.value}))} /></div>
            <div style={{ gridColumn:"1/-1" }}>
              <label style={S.label}>Tax Category</label>
              <select style={S.input} value={form.category} onChange={e=>setForm(f=>({...f,category:e.target.value}))}>
                {TAX_CATEGORIES.map(c=><option key={c}>{c}</option>)}
              </select>
            </div>
            <div style={{ gridColumn:"1/-1" }}><label style={S.label}>Notes (optional)</label><input style={S.input} placeholder="Any details for your accountant" value={form.notes} onChange={e=>setForm(f=>({...f,notes:e.target.value}))} /></div>
          </div>
          <button style={S.btn()} onClick={saveItem}>{editId?"Save Changes":"Add to Tax Bucket"}</button>
        </div>
      )}

      {/* Category filter chips */}
      {yearItems.length > 0 && (
        <div style={{ display:"flex", flexWrap:"wrap", gap:6, marginBottom:14 }}>
          {["All",...TAX_CATEGORIES.filter(c=>totalByCategory[c]>0)].map(c=>(
            <button key={c} onClick={()=>setFilterCat(c)} style={S.chip(filterCat===c, catColors[c])}>{c}</button>
          ))}
        </div>
      )}

      {yearItems.length===0 && !showForm && <EmptyState icon="🧾" title="No deductible expenses yet" body={`Start tagging tax-deductible expenses for ${year}. Come April you'll have everything organized and ready.`} />}

      {/* Items list */}
      {filtered.length > 0 && (
        <div style={S.card}>
          <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:14 }}>
            <SectionTitle>{filterCat==="All"?"All Items":filterCat}</SectionTitle>
            <button onClick={exportCSV} style={{ fontSize:12, padding:"5px 12px", borderRadius:8, border:"1px solid rgba(255,255,255,0.1)", background:"rgba(255,255,255,0.05)", color:"#9ca3af", cursor:"pointer", fontFamily:"'DM Sans',sans-serif" }}>⬇️ Export CSV</button>
          </div>
          {filtered.sort((a,b)=>a.date?.localeCompare(b.date||"")||0).reverse().map((t,i)=>(
            <div key={t.id} style={{ display:"flex", alignItems:"center", gap:12, padding:"11px 0", borderBottom:i<filtered.length-1?"1px solid rgba(255,255,255,0.04)":"none" }}>
              <div style={{ width:8, height:8, borderRadius:"50%", background:catColors[t.category]||PALETTE[0], flexShrink:0 }} />
              <div style={{ flex:1 }}>
                <div style={{ fontSize:14, fontWeight:500 }}>{t.description}</div>
                <div style={{ fontSize:11, color:"#4b5563", marginTop:2 }}>
                  <span style={{ color:catColors[t.category], fontWeight:600 }}>{t.category}</span>
                  {t.date && <span> · {t.date}</span>}
                  {t.notes && <span> · {t.notes}</span>}
                </div>
              </div>
              <div style={{ fontFamily:"monospace", fontWeight:700, color:"#34d399", fontSize:14, flexShrink:0 }}>${t.amount.toFixed(2)}</div>
              <div style={{ display:"flex", gap:6 }}>
                <button onClick={()=>startEdit(t)} style={{ fontSize:12, padding:"4px 8px", borderRadius:7, border:"1px solid rgba(255,255,255,0.1)", background:"transparent", color:"#6b7280", cursor:"pointer" }}>✏️</button>
                <button onClick={()=>deleteItem(t.id)} style={{ fontSize:12, padding:"4px 8px", borderRadius:7, border:"1px solid rgba(239,68,68,0.2)", background:"rgba(239,68,68,0.08)", color:"#f87171", cursor:"pointer" }}>✕</button>
              </div>
            </div>
          ))}
          <div style={{ paddingTop:12, borderTop:"1px solid rgba(255,255,255,0.07)", display:"flex", justifyContent:"space-between" }}>
            <span style={{ fontSize:13, color:"#9ca3af", fontWeight:600 }}>Subtotal</span>
            <span style={{ fontFamily:"monospace", fontWeight:700, color:"#34d399", fontSize:14 }}>${filtered.reduce((s,t)=>s+t.amount,0).toFixed(2)}</span>
          </div>
        </div>
      )}
    </div>
  );

  function exportCSV() {
    const headers = ["Date","Description","Category","Amount","Notes"];
    const rows = filtered.map(t=>[t.date||"",`"${(t.description||"").replace(/"/g,'""')}"`,t.category,t.amount.toFixed(2),`"${(t.notes||"").replace(/"/g,'""')}"`]);
    const csv = [headers,...rows].map(r=>r.join(",")).join("\n");
    const blob = new Blob([csv],{type:"text/csv"});
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href=url; a.download=`pennies-tax-${year}.csv`; a.click();
    URL.revokeObjectURL(url);
  }
}
