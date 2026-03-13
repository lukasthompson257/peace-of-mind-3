import { useState, useCallback } from "react";
import { S, PALETTE, ICONS, GOAL_ICONS, getMYLabel, getMYKey, aiCategorize, aiParseNote, thisMonthKey, DEFAULT_TAX_CATEGORIES } from "./lib/config.js";
import { useStore } from "./lib/useStore.js";
import { IconPicker, ColorPicker, UserToggle, ProgressBar, SectionTitle } from "./components/UI.jsx";

import Dashboard    from "./views/Dashboard.jsx";
import NetWorth     from "./views/NetWorth.jsx";
import Bills        from "./views/Bills.jsx";
import DebtTracker  from "./views/DebtTracker.jsx";
import TaxBucket    from "./views/TaxBucket.jsx";
import YearInReview from "./views/YearInReview.jsx";

const fontLink = document.createElement("link");
fontLink.rel = "stylesheet";
fontLink.href = "https://fonts.googleapis.com/css2?family=DM+Sans:wght@400;500;600;700;800&family=DM+Mono:wght@400;500&display=swap";
document.head.appendChild(fontLink);

const NAV_GROUPS = [
  { label:"Spending", items:[["dashboard","Overview"],["add","+ Add"],["notes","📋 Import"],["receipts","🧾 Receipts"],["transactions","History"],["budgets","Budgets"],["trends","📈 Trends"]] },
  { label:"Planning", items:[["savings","💰 Savings"],["bills","📅 Bills"],["debt","💳 Debt"]] },
  { label:"Wealth",   items:[["networth","🏦 Net Worth"],["tax","🧾 Tax"],["review","🎆 Review"]] },
  { label:"Goals",    items:[["goals","🎯 Goals"]] },
];

export default function App() {
  const store = useStore();
  const { categories, expenses, budgets, income, monthlySavings, goals, loading, syncing, lastSync,
    setAndSaveCategories, setAndSaveExpenses, setAndSaveBudgets, setAndSaveIncome,
    setAndSaveMonthlySavings, setAndSaveGoals } = store;

  const [view, setView]                   = useState("dashboard");
  const [selectedMonth, setSelectedMonth] = useState(thisMonthKey());
  const [newExp, setNewExp]               = useState({ description:"", amount:"", category:"Groceries", date:new Date().toISOString().split("T")[0], user:"You", taxDeductible:false, taxCategory:"Other" });
  const [aiLoading, setAiLoading]         = useState(false);
  const [noteText, setNoteText]           = useState("");
  const [noteLoading, setNoteLoading]     = useState(false);
  const [parsed, setParsed]               = useState([]);
  const [selected, setSelected]           = useState([]);
  const [noteError, setNoteError]         = useState("");
  const [receiptMode, setReceiptMode]     = useState("text"); // text | image
  const [receiptText, setReceiptText]     = useState("");
  const [receiptImage, setReceiptImage]   = useState(null);  // base64
  const [receiptLoading, setReceiptLoading] = useState(false);
  const [receiptParsed, setReceiptParsed] = useState([]);
  const [receiptSelected, setReceiptSelected] = useState([]);
  const [receiptError, setReceiptError]   = useState("");
  const [receiptDate, setReceiptDate]     = useState(new Date().toISOString().split("T")[0]);
  const [receiptUser, setReceiptUser]     = useState("You");
  const [receiptTaxDeductible, setReceiptTaxDeductible] = useState(false);
  const [receiptTaxCategory, setReceiptTaxCategory]     = useState("Other");
  const [showNewCat, setShowNewCat]       = useState(false);
  const [newCat, setNewCat]               = useState({ name:"", icon:"🏠", color:PALETTE[0], budget:100 });
  const [showNewGoal, setShowNewGoal]     = useState(false);
  const [newGoal, setNewGoal]             = useState({ name:"", icon:"🎯", color:PALETTE[2], target:"", deadline:"" });
  const [contributingTo, setContributingTo] = useState(null);
  const [contribAmount, setContribAmount]   = useState("");
  const [contribNote, setContribNote]       = useState("");
  const [filterUser, setFilterUser]         = useState("All");
  const [taxCategories, setTaxCategories]   = useState(DEFAULT_TAX_CATEGORIES);
  const [newTaxCatInput, setNewTaxCatInput] = useState("");

  if (loading) return (
    <div style={{ ...S.app, display:"flex", alignItems:"center", justifyContent:"center", minHeight:"100vh" }}>
      <div style={{ textAlign:"center" }}>
        <div style={{ fontSize:40, marginBottom:12 }}>🧘</div>
        <div style={{ fontSize:16, color:"#6b7280" }}>Loading Peace of Mind…</div>
      </div>
    </div>
  );

  const monthExp        = expenses.filter(e => getMYKey(e.date) === selectedMonth);
  const totalSpent      = monthExp.reduce((s,e)=>s+e.amount,0);
  const effectiveBudgets= Object.fromEntries(categories.map(c=>[c.name, budgets[c.name]??c.budget]));
  const totalIncome     = (income.youSalary||0)+(income.wifeSalary||0)+(income.otherIncome||0);
  const autoSavings     = (income.auto401k||0)+(income.autoOther||0);
  const manualSavings   = Math.max(0, totalIncome-autoSavings-totalSpent);
  const totalSavings    = autoSavings+manualSavings;
  const savingsPct      = totalIncome>0?(totalSavings/totalIncome)*100:0;
  const filtered        = monthExp.filter(e=>filterUser==="All"||e.user===filterUser);
  const allMonths       = [...new Set(expenses.map(e=>getMYKey(e.date)))].sort().reverse();
  if (!allMonths.includes(thisMonthKey())) allMonths.unshift(thisMonthKey());

  async function addExpense() {
    if (!newExp.description||!newExp.amount) return;
    setAiLoading(true);
    const aiCat = await aiCategorize(newExp.description, categories.map(c=>c.name).join(", "));
    const entry = { ...newExp, amount:parseFloat(newExp.amount), category:aiCat&&categories.find(c=>c.name===aiCat)?aiCat:newExp.category, id:Date.now() };
    await setAndSaveExpenses([entry,...expenses]);
    if (newExp.taxDeductible) {
      const taxEntry = { id:Date.now()+1, description:entry.description, amount:entry.amount, date:entry.date, category:newExp.taxCategory||"Other", notes:"" };
      await setAndSaveTaxItems([...taxItems, taxEntry]);
    }
    setNewExp({ description:"", amount:"", category:"Groceries", date:new Date().toISOString().split("T")[0], user:newExp.user, taxDeductible:false, taxCategory:"Other" });
    setAiLoading(false);
  }

  async function deleteExpense(id) { await setAndSaveExpenses(expenses.filter(e=>e.id!==id)); }

  async function parseNote() {
    if (!noteText.trim()) return;
    setNoteLoading(true); setNoteError(""); setParsed([]);
    try {
      const items = await aiParseNote(noteText, categories.map(c=>c.name).join(", "));
      const today = new Date().toISOString().split("T")[0];
      const withMeta = items.map((it,i)=>({...it,id:Date.now()+i,date:today,user:"You"}));
      setParsed(withMeta); setSelected(withMeta.map(it=>it.id));
    } catch(e) { setNoteError("Couldn't parse note. Make sure it has items and amounts."); }
    setNoteLoading(false);
  }

  async function parseReceipt() {
    if (receiptMode === "text" && !receiptText.trim()) return;
    if (receiptMode === "image" && !receiptImage) return;
    setReceiptLoading(true); setReceiptError(""); setReceiptParsed([]);
    try {
      const catNames = categories.map(c=>c.name).join(", ");
      const prompt = `Extract all individual line items and their prices from this receipt. Return a JSON array where each item has: description (string), amount (number, positive), category (pick the best match from: ${catNames}). Only include actual purchased items with prices — ignore subtotals, tax lines, store names, addresses, dates. Reply ONLY with valid JSON array, no markdown.`;
      const messages = receiptMode === "image"
        ? [{ role:"user", content:[{ type:"image", source:{ type:"base64", media_type:receiptImage.type, data:receiptImage.data }},{ type:"text", text:prompt }]}]
        : [{ role:"user", content: prompt + "\n\nReceipt:\n" + receiptText }];
      const res = await fetch("https://api.anthropic.com/v1/messages", {
        method:"POST", headers:{"Content-Type":"application/json"},
        body: JSON.stringify({ model:"claude-sonnet-4-20250514", max_tokens:1500, messages })
      });
      const data = await res.json();
      const raw = data.content?.[0]?.text?.trim().replace(/```json|```/g,"").trim();
      const items = JSON.parse(raw);
      const withMeta = items.map((it,i)=>({...it, id:Date.now()+i, date:receiptDate, user:receiptUser}));
      setReceiptParsed(withMeta);
      setReceiptSelected(withMeta.map(it=>it.id));
    } catch(e) { setReceiptError("Couldn't parse receipt. Try again or switch input mode."); }
    setReceiptLoading(false);
  }

  async function importReceipt() {
    const toImport = receiptParsed.filter(it=>receiptSelected.includes(it.id));
    await setAndSaveExpenses([...toImport, ...expenses]);
    if (receiptTaxDeductible && toImport.length > 0) {
      const taxEntries = toImport.map((it,i) => ({
        id: Date.now()+i+9000, description: it.description,
        amount: it.amount, date: it.date,
        category: receiptTaxCategory, notes: "via receipt scanner"
      }));
      await setAndSaveTaxItems([...taxItems, ...taxEntries]);
    }
    setReceiptText(""); setReceiptImage(null); setReceiptParsed([]); setReceiptSelected([]);
    setReceiptTaxDeductible(false);
    setView("dashboard");
  }

  function handleReceiptImageUpload(e) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = ev => {
      const base64 = ev.target.result.split(",")[1];
      setReceiptImage({ data:base64, type:file.type });
      setReceiptParsed([]); setReceiptSelected([]);
    };
    reader.readAsDataURL(file);
  }

  async function importSelected() {
    await setAndSaveExpenses([...parsed.filter(it=>selected.includes(it.id)),...expenses]);
    setNoteText(""); setParsed([]); setSelected([]); setView("dashboard");
  }

  async function addCategory() {
    if (!newCat.name) return;
    await setAndSaveCategories([...categories, {...newCat,budget:parseFloat(newCat.budget)||100}]);
    setNewCat({name:"",icon:"🏠",color:PALETTE[0],budget:100}); setShowNewCat(false);
  }

  const DEFAULT_CATS = ["Groceries","Dining Out","Transport","Entertainment","Utilities","Shopping","Health","Travel","Skincare"];
  async function deleteCategory(name) {
    if (DEFAULT_CATS.includes(name)) return;
    await setAndSaveCategories(categories.filter(c=>c.name!==name));
  }

  async function saveBudget(name,val) { await setAndSaveBudgets({...budgets,[name]:parseFloat(val)||0}); }
  async function handleIncomeSave(field,val) { await setAndSaveIncome({...income,[field]:parseFloat(val)||0}); }
  async function handleActualSavingsSave(month,val) { await setAndSaveMonthlySavings({...monthlySavings,[month]:parseFloat(val)||0}); }

  async function addGoal() {
    if (!newGoal.name||!newGoal.target) return;
    const g = {...newGoal,target:parseFloat(newGoal.target),id:Date.now(),contributions:[],createdAt:new Date().toISOString().split("T")[0]};
    await setAndSaveGoals([...goals,g]);
    setNewGoal({name:"",icon:"🎯",color:PALETTE[2],target:"",deadline:""}); setShowNewGoal(false);
  }

  async function addContribution(goalId) {
    if (!contribAmount) return;
    const contrib = {id:Date.now(),amount:parseFloat(contribAmount),note:contribNote,date:new Date().toISOString().split("T")[0]};
    await setAndSaveGoals(goals.map(g=>g.id===goalId?{...g,contributions:[...(g.contributions||[]),contrib]}:g));
    setContribAmount(""); setContribNote(""); setContributingTo(null);
  }

  async function deleteGoal(id) { await setAndSaveGoals(goals.filter(g=>g.id!==id)); }
  async function deleteContrib(goalId,contribId) {
    await setAndSaveGoals(goals.map(g=>g.id===goalId?{...g,contributions:(g.contributions||[]).filter(c=>c.id!==contribId)}:g));
  }

  function exportCSV() {
    const headers=["Date","Description","Amount","Category","Person"];
    const rows=[...expenses].sort((a,b)=>a.date.localeCompare(b.date)).map(e=>[e.date,`"${e.description.replace(/"/g,'')}'`,e.amount.toFixed(2),e.category,e.user]);
    const csv=[headers,...rows].map(r=>r.join(",")).join("\n");
    const a=document.createElement("a"); a.href=URL.createObjectURL(new Blob([csv],{type:"text/csv"}));
    a.download='peace-of-mind-export.csv'; a.click();
  }

  function getTrendsData() {
    const cur=new Date(); const months=[];
    for(let i=5;i>=0;i--){const d=new Date(cur.getFullYear(),cur.getMonth()-i,1);months.push(`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`);}
    return months.map(m=>({month:m,total:expenses.filter(e=>getMYKey(e.date)===m).reduce((s,e)=>s+e.amount,0)}));
  }

  return (
    <div style={S.app}>
      <div style={{position:"sticky",top:0,zIndex:100,background:"rgba(13,15,20,0.92)",backdropFilter:"blur(16px)",borderBottom:"1px solid rgba(255,255,255,0.06)",padding:"10px 16px"}}>
        <div style={{maxWidth:960,margin:"0 auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:8}}>
            <div style={{fontSize:20,fontWeight:800,letterSpacing:"-0.5px"}}>🧘 Peace of Mind</div>
            <div style={{fontSize:11,color:syncing?"#FFA726":lastSync?"#34d399":"#4b5563"}}>
              {syncing?"⟳ Saving…":lastSync?`✓ Synced ${lastSync.toLocaleTimeString([],{hour:"2-digit",minute:"2-digit"})}`:"● Connecting…"}
            </div>
          </div>
          <div style={{display:"flex",gap:16,overflowX:"auto",paddingBottom:2}}>
            {NAV_GROUPS.map(group=>(
              <div key={group.label} style={{display:"flex",flexDirection:"column",gap:3}}>
                <div style={{fontSize:9,color:"#374151",textTransform:"uppercase",letterSpacing:"0.8px",paddingLeft:4}}>{group.label}</div>
                <div style={{display:"flex",gap:2}}>
                  {group.items.map(([v,label])=>(
                    <button key={v} onClick={()=>setView(v)} style={S.navBtn(view===v)}>{label}</button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:960,margin:"0 auto",padding:"20px 16px"}}>

        {view==="dashboard" && <Dashboard store={store} selectedMonth={selectedMonth} setSelectedMonth={setSelectedMonth} setView={setView} />}

        {view==="add" && (
          <div style={{maxWidth:480,margin:"0 auto"}}>
            <div style={{fontSize:18,fontWeight:700,marginBottom:16}}>➕ Add Expense</div>
            <div style={S.card}>
              <UserToggle value={newExp.user} onChange={u=>setNewExp(f=>({...f,user:u}))} />
              <div style={{marginTop:14}}><label style={S.label}>Description</label>
                <input style={S.input} placeholder="What did you buy?" value={newExp.description} onChange={e=>setNewExp(f=>({...f,description:e.target.value}))} onKeyDown={e=>e.key==="Enter"&&addExpense()} /></div>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginTop:10}}>
                <div><label style={S.label}>Amount ($)</label><input type="number" style={S.input} placeholder="0.00" value={newExp.amount} onChange={e=>setNewExp(f=>({...f,amount:e.target.value}))} /></div>
                <div><label style={S.label}>Date</label><input type="date" style={S.input} value={newExp.date} onChange={e=>setNewExp(f=>({...f,date:e.target.value}))} /></div>
              </div>
              <div style={{marginTop:10}}><label style={S.label}>Category (AI auto-detects)</label>
                <select style={S.input} value={newExp.category} onChange={e=>setNewExp(f=>({...f,category:e.target.value}))}>
                  {categories.map(c=><option key={c.name}>{c.icon} {c.name}</option>)}
                </select></div>
              <div style={{marginTop:14,padding:"12px 14px",background:"rgba(255,255,255,0.04)",borderRadius:10,border:`1px solid ${newExp.taxDeductible?"rgba(52,211,153,0.3)":"rgba(255,255,255,0.08)"}`}}>
                <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>setNewExp(f=>({...f,taxDeductible:!f.taxDeductible}))}>
                  <div style={{width:20,height:20,borderRadius:6,border:`2px solid ${newExp.taxDeductible?"#34d399":"rgba(255,255,255,0.2)"}`,background:newExp.taxDeductible?"#34d399":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>
                    {newExp.taxDeductible&&<span style={{color:"#000",fontSize:12,fontWeight:700}}>✓</span>}
                  </div>
                  <span style={{fontSize:13,color:newExp.taxDeductible?"#34d399":"#9ca3af",fontWeight:500}}>🧾 Tax deductible</span>
                </div>
                {newExp.taxDeductible&&(
                  <div style={{marginTop:10}}>
                    <label style={S.label}>Tax Category</label>
                    <select style={S.input} value={newExp.taxCategory||"Other"} onChange={e=>setNewExp(f=>({...f,taxCategory:e.target.value}))}>
                      {taxCategories.map(c=><option key={c}>{c}</option>)}
                    </select>
                    <div style={{display:"flex",gap:8,marginTop:8}}>
                      <input style={{...S.input,fontSize:12,padding:"7px 10px"}} placeholder="+ New category…" value={newTaxCatInput} onChange={e=>setNewTaxCatInput(e.target.value)}
                        onKeyDown={e=>{if(e.key==="Enter"&&newTaxCatInput.trim()){const c=newTaxCatInput.trim();setTaxCategories(t=>[...t,c]);setNewExp(f=>({...f,taxCategory:c}));setNewTaxCatInput("");}}} />
                      <button onClick={()=>{if(newTaxCatInput.trim()){const c=newTaxCatInput.trim();setTaxCategories(t=>[...t,c]);setNewExp(f=>({...f,taxCategory:c}));setNewTaxCatInput("");}}}
                        style={{padding:"7px 14px",borderRadius:10,border:"1px solid rgba(52,211,153,0.3)",background:"rgba(52,211,153,0.1)",color:"#34d399",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:12,whiteSpace:"nowrap"}}>Add</button>
                    </div>
                  </div>
                )}
              </div>
              <button style={{...S.btn(),marginTop:14}} onClick={addExpense} disabled={aiLoading}>{aiLoading?"🤖 Categorizing…":"Add Expense"}</button>
            </div>
          </div>
        )}

        {view==="notes" && (
          <div style={{maxWidth:540,margin:"0 auto"}}>
            <div style={{fontSize:18,fontWeight:700,marginBottom:4}}>📋 Import from Notes</div>
            <div style={{fontSize:13,color:"#6b7280",marginBottom:14}}>Paste your iPhone note and AI will extract the expenses</div>
            <div style={S.card}>
              <label style={S.label}>Paste your note</label>
              <textarea value={noteText} onChange={e=>setNoteText(e.target.value)} placeholder={"Starbucks $6.50\nWhole Foods $94.20\nUber $12.00"} style={{...S.input,height:160,resize:"vertical",lineHeight:1.6}} />
              <button style={{...S.btn(),marginTop:12}} onClick={parseNote} disabled={noteLoading}>{noteLoading?"🤖 Parsing…":"Extract Expenses"}</button>
              {noteError&&<div style={{color:"#ff6b6b",fontSize:13,marginTop:8}}>{noteError}</div>}
            </div>
            {parsed.length>0&&(
              <div style={{...S.card,marginTop:14}}>
                <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                  <span style={{fontWeight:600}}>{selected.length} of {parsed.length} selected</span>
                  <button onClick={()=>setSelected(selected.length===parsed.length?[]:parsed.map(p=>p.id))} style={{fontSize:12,color:"#a5b4fc",background:"none",border:"none",cursor:"pointer"}}>{selected.length===parsed.length?"Deselect all":"Select all"}</button>
                </div>
                {parsed.map(it=>{
                  const cat=categories.find(c=>c.name===it.category);
                  return (
                    <div key={it.id} style={{display:"flex",alignItems:"center",gap:12,padding:"10px 0",borderBottom:"1px solid rgba(255,255,255,0.04)",cursor:"pointer"}} onClick={()=>setSelected(s=>s.includes(it.id)?s.filter(x=>x!==it.id):[...s,it.id])}>
                      <div style={{width:18,height:18,borderRadius:5,border:`2px solid ${selected.includes(it.id)?"#6366f1":"rgba(255,255,255,0.2)"}`,background:selected.includes(it.id)?"#6366f1":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                        {selected.includes(it.id)&&<span style={{color:"#fff",fontSize:11}}>✓</span>}
                      </div>
                      <span style={{fontSize:16}}>{cat?.icon||"💸"}</span>
                      <div style={{flex:1}}><div style={{fontSize:14}}>{it.description}</div><div style={{fontSize:11,color:"#4b5563"}}>{it.category}</div></div>
                      <div style={{fontWeight:700,fontFamily:"monospace"}}>${it.amount.toFixed(2)}</div>
                    </div>
                  );
                })}
                <button style={{...S.btn(),marginTop:14}} onClick={importSelected}>Import {selected.length} Expense{selected.length!==1?"s":""}</button>
              </div>
            )}
          </div>
        )}

        
        {view==="receipts" && (
          <div style={{maxWidth:540,margin:"0 auto"}}>
            <div style={{fontSize:18,fontWeight:700,marginBottom:4}}>🧾 Receipt Scanner</div>
            <div style={{fontSize:13,color:"#6b7280",marginBottom:16}}>Paste an email receipt, or upload a photo or screenshot</div>

            {/* Mode toggle */}
            <div style={{display:"flex",gap:6,marginBottom:14}}>
              {[["text","📧 Email / Text"],["image","📷 Photo / Screenshot"]].map(([mode,label])=>(
                <button key={mode} onClick={()=>{setReceiptMode(mode);setReceiptParsed([]);setReceiptSelected([]);setReceiptError("");}}
                  style={{flex:1,padding:"10px",borderRadius:11,border:"1px solid",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:13,
                    borderColor:receiptMode===mode?"#6366f1":"rgba(255,255,255,0.1)",
                    background:receiptMode===mode?"rgba(99,102,241,0.15)":"rgba(255,255,255,0.03)",
                    color:receiptMode===mode?"#a5b4fc":"#6b7280"}}>
                  {label}
                </button>
              ))}
            </div>

            <div style={S.card}>
              {/* Who + date */}
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:14}}>
                <div>
                  <label style={S.label}>Who paid?</label>
                  <div style={{display:"flex",gap:6}}>
                    {["You","Wife"].map(u=>(
                      <button key={u} onClick={()=>setReceiptUser(u)} style={{flex:1,padding:"8px",borderRadius:9,border:"1px solid",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:13,
                        borderColor:receiptUser===u?"#6366f1":"rgba(255,255,255,0.1)",
                        background:receiptUser===u?"rgba(99,102,241,0.15)":"transparent",
                        color:receiptUser===u?"#a5b4fc":"#6b7280"}}>
                        {u==="You"?"👤":"💝"} {u}
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label style={S.label}>Date</label>
                  <input type="date" style={S.input} value={receiptDate} onChange={e=>setReceiptDate(e.target.value)} />
                </div>
              </div>

              {/* Text mode */}
              {receiptMode==="text" && (
                <>
                  <label style={S.label}>Paste receipt email or text</label>
                  <textarea value={receiptText} onChange={e=>setReceiptText(e.target.value)}
                    placeholder={"Order Confirmation - Whole Foods\n\nOrganic Bananas    $1.99\nChicken Breast     $12.49\nAlmond Milk        $4.29\nSourdough Bread    $5.99\n\nSubtotal: $24.76\nTax: $1.98\nTotal: $26.74"}
                    style={{...S.input,height:200,resize:"vertical",lineHeight:1.7,fontSize:12,fontFamily:"monospace"}} />
                </>
              )}

              {/* Image mode */}
              {receiptMode==="image" && (
                <div>
                  <label style={S.label}>Upload photo or screenshot</label>
                  <label style={{display:"block",cursor:"pointer"}}>
                    <input type="file" accept="image/*" onChange={handleReceiptImageUpload} style={{display:"none"}} />
                    <div style={{border:"2px dashed rgba(99,102,241,0.3)",borderRadius:12,padding:32,textAlign:"center",background:"rgba(99,102,241,0.04)",transition:"all 0.2s"}}>
                      {receiptImage ? (
                        <div>
                          <div style={{fontSize:32,marginBottom:8}}>✅</div>
                          <div style={{fontSize:13,color:"#34d399",fontWeight:600}}>Image loaded</div>
                          <div style={{fontSize:11,color:"#4b5563",marginTop:4}}>Tap to replace</div>
                        </div>
                      ) : (
                        <div>
                          <div style={{fontSize:36,marginBottom:8}}>📷</div>
                          <div style={{fontSize:14,color:"#6b7280"}}>Tap to choose photo or screenshot</div>
                          <div style={{fontSize:11,color:"#4b5563",marginTop:4}}>JPG, PNG, HEIC supported</div>
                        </div>
                      )}
                    </div>
                  </label>
                </div>
              )}

              <button style={{...S.btn(),marginTop:14}} onClick={parseReceipt} disabled={receiptLoading||(!receiptText.trim()&&!receiptImage)}>
                {receiptLoading?"🤖 Reading receipt…":"Extract Line Items"}
              </button>
              {receiptError&&<div style={{color:"#ff6b6b",fontSize:13,marginTop:10}}>{receiptError}</div>}
            </div>

            {/* Preview + import */}
            {receiptParsed.length>0&&(
              <div style={{...S.card,marginTop:14}}>
                <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
                  <div style={{fontWeight:700,fontSize:15}}>
                    {receiptSelected.length} item{receiptSelected.length!==1?"s":""} selected
                  </div>
                  <button onClick={()=>setReceiptSelected(receiptSelected.length===receiptParsed.length?[]:receiptParsed.map(p=>p.id))}
                    style={{fontSize:12,color:"#a5b4fc",background:"none",border:"none",cursor:"pointer",fontFamily:"'DM Sans',sans-serif"}}>
                    {receiptSelected.length===receiptParsed.length?"Deselect all":"Select all"}
                  </button>
                </div>
                <div style={{fontSize:12,color:"#4b5563",marginBottom:14}}>
                  Total: <span style={{color:"#e8e0d5",fontWeight:700,fontFamily:"monospace"}}>${receiptParsed.filter(it=>receiptSelected.includes(it.id)).reduce((s,it)=>s+it.amount,0).toFixed(2)}</span>
                  {" · "}{receiptDate}{" · "}{receiptUser==="You"?"👤 You":"💝 Wife"}
                </div>
                {receiptParsed.map((it,i)=>{
                  const cat=categories.find(c=>c.name===it.category);
                  const isSelected=receiptSelected.includes(it.id);
                  return (
                    <div key={it.id} style={{display:"flex",alignItems:"center",gap:12,padding:"11px 0",borderBottom:i<receiptParsed.length-1?"1px solid rgba(255,255,255,0.04)":"none",cursor:"pointer",opacity:isSelected?1:0.4}}
                      onClick={()=>setReceiptSelected(s=>s.includes(it.id)?s.filter(x=>x!==it.id):[...s,it.id])}>
                      <div style={{width:20,height:20,borderRadius:6,border:`2px solid ${isSelected?"#6366f1":"rgba(255,255,255,0.2)"}`,background:isSelected?"#6366f1":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>
                        {isSelected&&<span style={{color:"#fff",fontSize:11,fontWeight:700}}>✓</span>}
                      </div>
                      <div style={{width:32,height:32,borderRadius:9,background:`${cat?.color||"#6366f1"}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:15,flexShrink:0}}>{cat?.icon||"🧾"}</div>
                      <div style={{flex:1}}>
                        <div style={{fontSize:13,fontWeight:500}}>{it.description}</div>
                        <div style={{fontSize:11,color:"#4b5563",marginTop:1}}>{it.category}</div>
                      </div>
                      <div style={{fontWeight:700,fontFamily:"monospace",fontSize:14}}>${it.amount.toFixed(2)}</div>
                    </div>
                  );
                })}
                {/* Tax deductible toggle */}
                <div style={{marginTop:14,padding:"12px 14px",background:receiptTaxDeductible?"rgba(52,211,153,0.06)":"rgba(255,255,255,0.03)",borderRadius:10,border:`1px solid ${receiptTaxDeductible?"rgba(52,211,153,0.25)":"rgba(255,255,255,0.08)"}`}}>
                  <div style={{display:"flex",alignItems:"center",gap:10,cursor:"pointer"}} onClick={()=>setReceiptTaxDeductible(t=>!t)}>
                    <div style={{width:20,height:20,borderRadius:6,border:`2px solid ${receiptTaxDeductible?"#34d399":"rgba(255,255,255,0.2)"}`,background:receiptTaxDeductible?"#34d399":"transparent",display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,transition:"all 0.15s"}}>
                      {receiptTaxDeductible&&<span style={{color:"#000",fontSize:12,fontWeight:700}}>✓</span>}
                    </div>
                    <span style={{fontSize:13,color:receiptTaxDeductible?"#34d399":"#9ca3af",fontWeight:500}}>🧾 Mark all as tax deductible</span>
                  </div>
                  {receiptTaxDeductible&&(
                    <div style={{marginTop:10}}>
                      <label style={S.label}>Tax Category</label>
                      <select style={S.input} value={receiptTaxCategory} onChange={e=>setReceiptTaxCategory(e.target.value)}>
                        {DEFAULT_TAX_CATEGORIES.map(c=><option key={c}>{c}</option>)}
                      </select>
                      <div style={{fontSize:11,color:"#34d399",marginTop:6}}>All {receiptSelected.length} selected items will be added to your Tax Bucket</div>
                    </div>
                  )}
                </div>
                <div style={{display:"flex",gap:8,marginTop:12}}>
                  <button style={S.btn(receiptTaxDeductible?"#10b981":undefined)} onClick={importReceipt} disabled={receiptSelected.length===0}>
                    Import {receiptSelected.length} Item{receiptSelected.length!==1?"s":""}
                  </button>
                  <button onClick={()=>{setReceiptParsed([]);setReceiptSelected([]);setReceiptText("");setReceiptImage(null);setReceiptTaxDeductible(false);}}
                    style={{flex:0.4,padding:"11px",borderRadius:12,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"#6b7280",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:13}}>
                    Clear
                  </button>
                </div>
              </div>
            )}
          </div>
        )}

        {view==="transactions" && (
          <div>
            <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap",alignItems:"center"}}>
              {["All","You","Wife"].map(u=><button key={u} onClick={()=>setFilterUser(u)} style={S.chip(filterUser===u)}>{u==="Wife"?"💝 ":u==="You"?"👤 ":""}{u}</button>)}
              <div style={{marginLeft:"auto",display:"flex",alignItems:"center",gap:10}}>
                <span style={{fontSize:12,color:"#4b5563"}}>{filtered.length} · {getMYLabel(selectedMonth)}</span>
                <button onClick={exportCSV} style={{padding:"6px 14px",borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"rgba(255,255,255,0.05)",color:"#9ca3af",cursor:"pointer",fontSize:12,fontFamily:"'DM Sans',sans-serif"}}>⬇️ Export CSV</button>
              </div>
            </div>
            <div style={S.card}>
              {filtered.length===0&&<div style={{textAlign:"center",color:"#4b5563",padding:30}}>No transactions this month</div>}
              {filtered.map((e,i)=>{
                const cat=categories.find(c=>c.name===e.category);
                return (
                  <div key={e.id} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"12px 0",borderBottom:i<filtered.length-1?"1px solid rgba(255,255,255,0.04)":"none"}}>
                    <div style={{display:"flex",alignItems:"center",gap:11}}>
                      <div style={{width:38,height:38,borderRadius:11,background:`${cat?.color||"#6b7280"}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,border:`1px solid ${cat?.color||"#6b7280"}33`}}>{cat?.icon||"💸"}</div>
                      <div>
                        <div style={{fontSize:14,fontWeight:500}}>{e.description}</div>
                        <div style={{fontSize:11,color:"#4b5563",marginTop:2}}>
                          <span style={{color:e.user==="You"?"#42A5F5":"#F06292"}}>{e.user==="You"?"👤":"💝"} {e.user}</span>
                          {" · "}{e.date}{" · "}<span style={{color:cat?.color||"#6b7280"}}>{e.category}</span>
                        </div>
                      </div>
                    </div>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{fontSize:15,fontWeight:700,fontFamily:"monospace"}}>-${e.amount.toFixed(2)}</div>
                      <button onClick={()=>deleteExpense(e.id)} style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:7,padding:"4px 8px",color:"#f87171",cursor:"pointer",fontSize:12}}>✕</button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {view==="trends" && (()=>{
          const td=getTrendsData(), maxV=Math.max(...td.map(d=>d.total),1);
          const catSpend=categories.map(c=>({...c,total:expenses.filter(e=>e.category===c.name).reduce((s,e)=>s+e.amount,0)})).sort((a,b)=>b.total-a.total);
          return (
            <div style={{maxWidth:540,margin:"0 auto"}}>
              <div style={{fontSize:18,fontWeight:700,marginBottom:16}}>📈 Spending Trends</div>
              <div style={S.card}>
                <div style={{fontSize:11,fontWeight:600,color:"#9ca3af",textTransform:"uppercase",marginBottom:14}}>Last 6 Months</div>
                <div style={{display:"flex",alignItems:"flex-end",gap:8,height:120}}>
                  {td.map(d=>(
                    <div key={d.month} style={{flex:1,display:"flex",flexDirection:"column",alignItems:"center",gap:6,cursor:"pointer"}} onClick={()=>{setSelectedMonth(d.month);setView("dashboard");}}>
                      <div style={{fontSize:10,color:"#4b5563",fontFamily:"monospace"}}>{d.total>0?`$${(d.total/1000).toFixed(1)}k`:""}</div>
                      <div style={{width:"100%",height:`${(d.total/maxV)*90+10}%`,borderRadius:"6px 6px 0 0",background:d.month===selectedMonth?"linear-gradient(180deg,#a5b4fc,#6366f1)":"rgba(99,102,241,0.35)",minHeight:4}} />
                      <div style={{fontSize:10,color:"#4b5563"}}>{getMYLabel(d.month).split(" ")[0]}</div>
                    </div>
                  ))}
                </div>
              </div>
              <div style={{...S.card,marginTop:14}}>
                <div style={{fontSize:11,fontWeight:600,color:"#9ca3af",textTransform:"uppercase",marginBottom:14}}>All-Time by Category</div>
                {catSpend.filter(c=>c.total>0).map(c=>(
                  <div key={c.name} style={{marginBottom:12}}>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:4}}>
                      <span style={{fontSize:13}}>{c.icon} {c.name}</span>
                      <span style={{fontSize:12,fontFamily:"monospace",color:c.color}}>${c.total.toFixed(0)}</span>
                    </div>
                    <div style={{height:5,background:"rgba(255,255,255,0.06)",borderRadius:99,overflow:"hidden"}}>
                      <div style={{height:"100%",width:`${(c.total/catSpend[0].total)*100}%`,borderRadius:99,background:`linear-gradient(90deg,${c.color}88,${c.color})`}} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          );
        })()}

        {view==="budgets" && (
          <div style={{maxWidth:540,margin:"0 auto"}}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:4}}>
              <div style={{fontSize:18,fontWeight:700}}>Budgets & Categories</div>
              <button onClick={()=>setShowNewCat(s=>!s)} style={{padding:"8px 16px",borderRadius:10,border:"1px solid rgba(99,102,241,0.4)",background:"rgba(99,102,241,0.1)",color:"#a5b4fc",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:13}}>
                {showNewCat?"✕ Cancel":"+ Category"}
              </button>
            </div>
            <div style={{fontSize:13,color:"#6b7280",marginBottom:14}}>Total: ${Object.values(effectiveBudgets).reduce((a,b)=>a+b,0).toLocaleString()}/mo</div>
            {showNewCat&&(
              <div style={{...S.card,marginBottom:14,padding:22,border:"1px solid rgba(99,102,241,0.2)"}}>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                  <div><label style={S.label}>Name</label><input style={S.input} placeholder="Category name" value={newCat.name} onChange={e=>setNewCat(f=>({...f,name:e.target.value}))} /></div>
                  <div><label style={S.label}>Budget ($)</label><input type="number" style={S.input} placeholder="100" value={newCat.budget} onChange={e=>setNewCat(f=>({...f,budget:e.target.value}))} /></div>
                </div>
                <div style={{marginBottom:12}}><label style={S.label}>Icon</label><IconPicker icons={ICONS} value={newCat.icon} onChange={v=>setNewCat(f=>({...f,icon:v}))} /></div>
                <div style={{marginBottom:14}}><label style={S.label}>Color</label><ColorPicker palette={PALETTE} value={newCat.color} onChange={v=>setNewCat(f=>({...f,color:v}))} /></div>
                <button style={S.btn()} onClick={addCategory}>Add Category</button>
              </div>
            )}
            <div style={S.card}>
              {categories.map((c,i)=>(
                <div key={c.name} style={{display:"flex",alignItems:"center",gap:12,padding:"12px 0",borderBottom:i<categories.length-1?"1px solid rgba(255,255,255,0.04)":"none"}}>
                  <div style={{width:36,height:36,borderRadius:10,background:`${c.color}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:17,border:`1px solid ${c.color}33`,flexShrink:0}}>{c.icon}</div>
                  <div style={{flex:1}}>
                    <div style={{fontSize:14,fontWeight:500,marginBottom:4}}>{c.name}</div>
                    <input type="number" defaultValue={effectiveBudgets[c.name]} style={{...S.input,padding:"5px 9px",fontSize:13}} onBlur={e=>saveBudget(c.name,e.target.value)} />
                  </div>
                  {!DEFAULT_CATS.includes(c.name)&&(
                    <button onClick={()=>deleteCategory(c.name)} style={{background:"rgba(239,68,68,0.1)",border:"1px solid rgba(239,68,68,0.2)",borderRadius:8,padding:"6px 10px",color:"#f87171",cursor:"pointer",fontSize:13}}>✕</button>
                  )}
                </div>
              ))}
            </div>
          </div>
        )}

        {view==="savings" && (()=>{
          const curYear=selectedMonth.split("-")[0];
          const ytdAllMonths=Object.keys(monthlySavings).filter(m=>m.startsWith(curYear)&&m<=selectedMonth);
          const ytdTotal=ytdAllMonths.reduce((s,m)=>s+(monthlySavings[m]||0),0);
          const actualThisMonth=monthlySavings[selectedMonth]||0;
          const targetThisMonth=income.savingsTarget||0;
          const yearMonths=Array.from({length:12},(_,i)=>`${curYear}-${String(i+1).padStart(2,"0")}`).filter(m=>m<=thisMonthKey());
          return (
            <div style={{maxWidth:620,margin:"0 auto"}}>
              <div style={{fontSize:18,fontWeight:700,marginBottom:4}}>💰 Income & Savings</div>
              <div style={{fontSize:13,color:"#6b7280",marginBottom:16}}>{getMYLabel(selectedMonth)}</div>
              <div style={{...S.card,marginBottom:12,padding:22}}>
                <div style={S.sectionTitle}>Monthly Income</div>
                {[["youSalary","👤 Your Take-Home Pay"],["wifeSalary","💝 Wife's Take-Home Pay"],["otherIncome","➕ Other Income"]].map(([field,label])=>(
                  <div key={field} style={{marginBottom:12}}>
                    <label style={S.label}>{label}</label>
                    <input type="number" defaultValue={income[field]||""} placeholder="0" style={S.input} onBlur={e=>handleIncomeSave(field,e.target.value)} />
                  </div>
                ))}
                <div style={{paddingTop:12,borderTop:"1px solid rgba(255,255,255,0.07)",display:"flex",justifyContent:"space-between"}}>
                  <span style={{fontSize:13,fontWeight:600,color:"#9ca3af"}}>Total Income</span>
                  <span style={{fontSize:16,fontWeight:700,fontFamily:"monospace",color:"#a8c5a0"}}>${totalIncome.toLocaleString()}</span>
                </div>
              </div>
              <div style={{...S.card,marginBottom:12,padding:22}}>
                <div style={S.sectionTitle}>Automatic Savings</div>
                {[["auto401k","🏦 401k / Retirement"],["autoOther","📈 Other Auto-Invest / HSA"]].map(([field,label])=>(
                  <div key={field} style={{marginBottom:12}}>
                    <label style={S.label}>{label}</label>
                    <input type="number" defaultValue={income[field]||""} placeholder="0" style={S.input} onBlur={e=>handleIncomeSave(field,e.target.value)} />
                  </div>
                ))}
              </div>
              <div style={{...S.card,marginBottom:12,padding:22}}>
                <div style={S.sectionTitle}>Monthly Savings — {getMYLabel(selectedMonth)}</div>
                <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:12,marginBottom:12}}>
                  <div>
                    <label style={S.label}>🎯 Target ($)</label>
                    <input type="number" defaultValue={income.savingsTarget||""} placeholder="0" style={S.input} onBlur={e=>handleIncomeSave("savingsTarget",e.target.value)} />
                  </div>
                  <div>
                    <label style={S.label}>✅ Actual Saved ($)</label>
                    <input key={selectedMonth} type="number" defaultValue={actualThisMonth||""} placeholder="0"
                      style={{...S.input,borderColor:actualThisMonth>0?"rgba(16,185,129,0.4)":"rgba(255,255,255,0.1)"}}
                      onBlur={e=>handleActualSavingsSave(selectedMonth,e.target.value)} />
                    {actualThisMonth>0&&targetThisMonth>0&&(
                      <div style={{fontSize:11,marginTop:4,color:actualThisMonth>=targetThisMonth?"#34d399":"#ff6b6b",fontWeight:600}}>
                        {actualThisMonth>=targetThisMonth?`+$${(actualThisMonth-targetThisMonth).toFixed(0)} ahead 🎉`:`-$${(targetThisMonth-actualThisMonth).toFixed(0)} short`}
                      </div>
                    )}
                  </div>
                </div>
              </div>
              {ytdAllMonths.length>0&&(
                <div style={{...S.card,padding:22,background:"rgba(16,185,129,0.05)",border:"1px solid rgba(16,185,129,0.15)"}}>
                  <div style={{fontSize:11,fontWeight:600,color:"#34d399",marginBottom:14,textTransform:"uppercase",letterSpacing:"0.5px"}}>📊 YTD Savings — {curYear}</div>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:16,marginBottom:16}}>
                    <div style={{textAlign:"center",padding:14,background:"rgba(255,255,255,0.04)",borderRadius:12}}>
                      <div style={{fontSize:11,color:"#6b7280",marginBottom:6,textTransform:"uppercase"}}>Saved YTD</div>
                      <div style={{fontSize:26,fontWeight:700,fontFamily:"monospace",color:"#34d399"}}>${ytdTotal.toFixed(0)}</div>
                    </div>
                    <div style={{textAlign:"center",padding:14,background:"rgba(255,255,255,0.04)",borderRadius:12}}>
                      <div style={{fontSize:11,color:"#6b7280",marginBottom:6,textTransform:"uppercase"}}>Monthly Avg</div>
                      <div style={{fontSize:26,fontWeight:700,fontFamily:"monospace",color:"#a5b4fc"}}>${ytdAllMonths.length>0?(ytdTotal/ytdAllMonths.length).toFixed(0):0}</div>
                    </div>
                  </div>
                  <div style={{fontSize:11,fontWeight:600,color:"#4b5563",marginBottom:10,textTransform:"uppercase"}}>Month by Month</div>
                  {yearMonths.map(m=>{
                    const actual=monthlySavings[m]||0,target=income.savingsTarget||0,pct=target>0?Math.min((actual/target)*100,100):0;
                    return (
                      <div key={m} onClick={()=>setSelectedMonth(m)} style={{display:"flex",alignItems:"center",gap:12,padding:"8px 10px",borderRadius:10,marginBottom:4,cursor:"pointer",background:m===selectedMonth?"rgba(99,102,241,0.1)":"rgba(255,255,255,0.02)",border:`1px solid ${m===selectedMonth?"rgba(99,102,241,0.3)":"rgba(255,255,255,0.04)"}`}}>
                        <div style={{fontSize:12,fontWeight:m===selectedMonth?700:400,color:m===selectedMonth?"#a5b4fc":"#9ca3af",width:44}}>{getMYLabel(m)}</div>
                        <div style={{flex:1,height:5,background:"rgba(255,255,255,0.06)",borderRadius:99,overflow:"hidden"}}>
                          {actual>0&&<div style={{height:"100%",width:`${pct}%`,borderRadius:99,background:actual>=target&&target>0?"linear-gradient(90deg,#10b981,#34d399)":"linear-gradient(90deg,#6366f1,#8b5cf6)"}} />}
                        </div>
                        <div style={{fontSize:12,fontFamily:"monospace",fontWeight:600,color:actual>0?(actual>=target&&target>0?"#34d399":"#a5b4fc"):"#374151",width:64,textAlign:"right"}}>{actual>0?`$${actual.toFixed(0)}`:"—"}</div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })()}

        {view==="bills"    && <Bills       store={store} />}
        {view==="debt"     && <DebtTracker store={store} />}
        {view==="networth" && <NetWorth    store={store} />}
        {view==="tax"      && <TaxBucket   store={store} />}
        {view==="review"   && <YearInReview store={store} />}

        {view==="goals" && (()=>{
          const DEFAULT_CATS = ["Groceries","Dining Out","Transport","Entertainment","Utilities","Shopping","Health","Travel","Skincare"];
          return (
            <div style={{maxWidth:560,margin:"0 auto"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:16}}>
                <div style={{fontSize:18,fontWeight:700}}>🎯 Savings Goals</div>
                <button onClick={()=>setShowNewGoal(s=>!s)} style={{padding:"8px 16px",borderRadius:10,border:"1px solid rgba(99,102,241,0.4)",background:"rgba(99,102,241,0.1)",color:"#a5b4fc",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontWeight:600,fontSize:13}}>
                  {showNewGoal?"✕ Cancel":"+ New Goal"}
                </button>
              </div>
              {showNewGoal&&(
                <div style={{...S.card,marginBottom:16,padding:22,border:"1px solid rgba(99,102,241,0.2)"}}>
                  <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:10,marginBottom:12}}>
                    <div style={{gridColumn:"1/-1"}}><label style={S.label}>Goal Name</label><input style={S.input} placeholder="e.g. Europe Trip" value={newGoal.name} onChange={e=>setNewGoal(f=>({...f,name:e.target.value}))} /></div>
                    <div><label style={S.label}>Target ($)</label><input type="number" style={S.input} value={newGoal.target} onChange={e=>setNewGoal(f=>({...f,target:e.target.value}))} /></div>
                    <div><label style={S.label}>Deadline</label><input type="date" style={S.input} value={newGoal.deadline} onChange={e=>setNewGoal(f=>({...f,deadline:e.target.value}))} /></div>
                  </div>
                  <div style={{marginBottom:12}}><label style={S.label}>Icon</label><IconPicker icons={GOAL_ICONS} value={newGoal.icon} onChange={v=>setNewGoal(f=>({...f,icon:v}))} /></div>
                  <div style={{marginBottom:14}}><label style={S.label}>Color</label><ColorPicker palette={PALETTE} value={newGoal.color} onChange={v=>setNewGoal(f=>({...f,color:v}))} /></div>
                  <button style={S.btn()} onClick={addGoal}>Create Goal</button>
                </div>
              )}
              {goals.length===0&&!showNewGoal&&(
                <div style={{...S.card,textAlign:"center",padding:48}}>
                  <div style={{fontSize:40,marginBottom:12}}>🎯</div>
                  <div style={{fontSize:16,fontWeight:600,marginBottom:6}}>No goals yet</div>
                  <div style={{fontSize:13,color:"#6b7280"}}>Create your first savings goal.</div>
                </div>
              )}
              {goals.map(g=>{
                const saved=(g.contributions||[]).reduce((s,c)=>s+c.amount,0);
                const pct=g.target>0?(saved/g.target)*100:0;
                const done=saved>=g.target;
                const monthsLeft=g.deadline?Math.max(1,Math.ceil((new Date(g.deadline)-new Date())/(1000*60*60*24*30))):null;
                const needed=monthsLeft&&!done?(g.target-saved)/monthsLeft:null;
                return (
                  <div key={g.id} style={{...S.card,marginBottom:14,border:`1px solid ${g.color}22`}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                      <div style={{display:"flex",gap:12,alignItems:"center"}}>
                        <div style={{width:44,height:44,borderRadius:13,background:`${g.color}22`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:22}}>{g.icon}</div>
                        <div>
                          <div style={{fontSize:15,fontWeight:700}}>{g.name}{done&&" 🎉"}</div>
                          {g.deadline&&<div style={{fontSize:11,color:"#4b5563"}}>Due {g.deadline}</div>}
                        </div>
                      </div>
                      <button onClick={()=>deleteGoal(g.id)} style={{background:"rgba(239,68,68,0.08)",border:"1px solid rgba(239,68,68,0.15)",borderRadius:8,padding:"4px 10px",color:"#f87171",cursor:"pointer",fontSize:12}}>✕</button>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:6}}>
                      <span style={{fontSize:13,color:"#9ca3af"}}>${saved.toFixed(0)} saved</span>
                      <span style={{fontSize:13,fontWeight:700}}>${g.target.toLocaleString()}</span>
                    </div>
                    <div style={{height:10,background:"rgba(255,255,255,0.07)",borderRadius:99,overflow:"hidden",marginBottom:8}}>
                      <div style={{height:"100%",width:`${Math.min(pct,100)}%`,borderRadius:99,background:`linear-gradient(90deg,${g.color}88,${g.color})`,transition:"width 0.5s"}} />
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",marginBottom:12}}>
                      <span style={{fontSize:11,color:"#4b5563"}}>{pct.toFixed(0)}% funded</span>
                      {needed&&<span style={{fontSize:11,color:"#4b5563"}}>~${needed.toFixed(0)}/mo needed</span>}
                    </div>
                    {contributingTo===g.id?(
                      <div style={{background:"rgba(255,255,255,0.04)",borderRadius:10,padding:12}}>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:8}}>
                          <div><label style={S.label}>Amount ($)</label><input type="number" style={S.input} placeholder="0" value={contribAmount} onChange={e=>setContribAmount(e.target.value)} /></div>
                          <div><label style={S.label}>Note</label><input style={S.input} placeholder="optional" value={contribNote} onChange={e=>setContribNote(e.target.value)} /></div>
                        </div>
                        <div style={{display:"flex",gap:8}}>
                          <button style={{...S.btn(g.color),flex:1,padding:9}} onClick={()=>addContribution(g.id)}>Add</button>
                          <button onClick={()=>setContributingTo(null)} style={{flex:0.5,padding:9,borderRadius:10,border:"1px solid rgba(255,255,255,0.1)",background:"transparent",color:"#6b7280",cursor:"pointer",fontFamily:"'DM Sans',sans-serif",fontSize:13}}>Cancel</button>
                        </div>
                      </div>
                    ):(
                      <button onClick={()=>setContributingTo(g.id)} style={{...S.btn(g.color),padding:9,fontSize:13}}>+ Add Money</button>
                    )}
                    {(g.contributions||[]).length>0&&(
                      <div style={{marginTop:12,borderTop:"1px solid rgba(255,255,255,0.05)",paddingTop:10}}>
                        {[...(g.contributions||[])].reverse().slice(0,3).map(c=>(
                          <div key={c.id} style={{display:"flex",justifyContent:"space-between",marginBottom:5}}>
                            <span style={{fontSize:12,color:"#4b5563"}}>{c.date}{c.note&&` · ${c.note}`}</span>
                            <div style={{display:"flex",gap:8}}>
                              <span style={{fontSize:12,fontFamily:"monospace",color:g.color}}>+${c.amount}</span>
                              <button onClick={()=>deleteContrib(g.id,c.id)} style={{fontSize:10,color:"#4b5563",background:"none",border:"none",cursor:"pointer"}}>✕</button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          );
        })()}
      </div>
    </div>
  );
}
