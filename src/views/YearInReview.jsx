import { useState } from "react";
import { S, MONTHS, getMYLabel, thisYear } from "../lib/config.js";
import { ProgressBar } from "../components/UI.jsx";

export default function YearInReview({ store }) {
  const { expenses, categories, income, monthlySavings, netWorthLog } = store;
  const currentYear = thisYear();
  const availableYears = [...new Set(expenses.map(e=>e.date?.split("-")[0]).filter(Boolean))].sort().reverse();
  if (!availableYears.includes(currentYear)) availableYears.unshift(currentYear);
  const [year, setYear] = useState(availableYears[0]||currentYear);

  const yearExpenses = expenses.filter(e=>e.date?.startsWith(year));
  if (yearExpenses.length === 0) {
    return (
      <div style={{ maxWidth:560, margin:"0 auto" }}>
        <div style={{ fontSize:18, fontWeight:700, marginBottom:4 }}>🎆 Year in Review</div>
        <div style={{ fontSize:13, color:"#6b7280", marginBottom:16 }}>Your financial Wrapped</div>
        <div style={{ ...S.card, textAlign:"center", padding:48 }}>
          <div style={{ fontSize:40, marginBottom:12 }}>📊</div>
          <div style={{ fontSize:16, fontWeight:600, marginBottom:6 }}>No data for {year} yet</div>
          <div style={{ fontSize:13, color:"#6b7280" }}>Start adding expenses and come back at year end for your full review.</div>
        </div>
      </div>
    );
  }

  // Core stats
  const totalSpent  = yearExpenses.reduce((s,e)=>s+e.amount,0);
  const byMonth     = Object.fromEntries(MONTHS.map((_,i)=>{
    const k=`${year}-${String(i+1).padStart(2,"0")}`;
    return [k, yearExpenses.filter(e=>e.date?.startsWith(k)).reduce((s,e)=>s+e.amount,0)];
  }));
  const maxMonth    = Math.max(...Object.values(byMonth),1);
  const biggestMonth = Object.entries(byMonth).sort((a,b)=>b[1]-a[1])[0];
  const quietestMonth = Object.entries(byMonth).filter(([,v])=>v>0).sort((a,b)=>a[1]-b[1])[0];

  // By category
  const byCat = Object.fromEntries(categories.map(c=>[c.name, yearExpenses.filter(e=>e.category===c.name).reduce((s,e)=>s+e.amount,0)]));
  const topCats = Object.entries(byCat).sort((a,b)=>b[1]-a[1]).filter(([,v])=>v>0).slice(0,5);

  // By person
  const byUser = {
    You:  yearExpenses.filter(e=>e.user==="You").reduce((s,e)=>s+e.amount,0),
    Wife: yearExpenses.filter(e=>e.user==="Wife").reduce((s,e)=>s+e.amount,0),
  };

  // Savings
  const yearSavings = Object.entries(monthlySavings).filter(([m])=>m.startsWith(year));
  const totalSaved  = yearSavings.reduce((s,[,v])=>s+v,0);
  const savingsRate = income.youSalary||income.wifeSalary ? (totalSaved/((((income.youSalary||0)+(income.wifeSalary||0)+(income.otherIncome||0))*12)))*100 : null;

  // Net worth change
  const nwEntries = netWorthLog.filter(e=>e.month?.startsWith(year)).sort((a,b)=>a.month.localeCompare(b.month));
  const nwStart   = nwEntries[0];
  const nwEnd     = nwEntries.at(-1);
  const calcNW    = e => Object.values(e?.assets||{}).reduce((s,v)=>s+(v||0),0) - Object.values(e?.liabilities||{}).reduce((s,v)=>s+(v||0),0);
  const nwChange  = nwStart && nwEnd ? calcNW(nwEnd) - calcNW(nwStart) : null;

  // Biggest single expense
  const biggestExpense = [...yearExpenses].sort((a,b)=>b.amount-a.amount)[0];
  const avgTransaction = totalSpent / yearExpenses.length;

  // Monthly avg spending
  const monthsWithData = Object.values(byMonth).filter(v=>v>0).length;
  const monthlyAvg = monthsWithData > 0 ? totalSpent/monthsWithData : 0;

  const CARD = (children, extra={}) => (
    <div style={{ ...S.card, marginBottom:14, padding:24, ...extra }}>{children}</div>
  );

  return (
    <div style={{ maxWidth:560, margin:"0 auto" }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div>
          <div style={{ fontSize:18, fontWeight:700 }}>🎆 Year in Review</div>
          <div style={{ fontSize:13, color:"#6b7280", marginTop:2 }}>Your financial Wrapped</div>
        </div>
        <select value={year} onChange={e=>setYear(e.target.value)} style={{ ...S.input, width:"auto", padding:"7px 12px", fontSize:13 }}>
          {availableYears.map(y=><option key={y}>{y}</option>)}
        </select>
      </div>

      {/* Hero stat */}
      {CARD(<>
        <div style={{ textAlign:"center", marginBottom:20 }}>
          <div style={{ fontSize:11, color:"#6b7280", textTransform:"uppercase", letterSpacing:"1px", marginBottom:8 }}>Total Spent in {year}</div>
          <div style={{ fontSize:48, fontWeight:800, fontFamily:"monospace", letterSpacing:"-2px", background:"linear-gradient(135deg,#a5b4fc,#f0abfc)", WebkitBackgroundClip:"text", WebkitTextFillColor:"transparent" }}>${totalSpent.toLocaleString()}</div>
          <div style={{ fontSize:13, color:"#4b5563", marginTop:6 }}>{yearExpenses.length} transactions · ${monthlyAvg.toFixed(0)}/mo average</div>
        </div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {[
            { label:"Your Share", value:`$${byUser.You.toFixed(0)}`, pct:`${totalSpent>0?((byUser.You/totalSpent)*100).toFixed(0):0}%`, color:"#42A5F5" },
            { label:"Wife's Share", value:`$${byUser.Wife.toFixed(0)}`, pct:`${totalSpent>0?((byUser.Wife/totalSpent)*100).toFixed(0):0}%`, color:"#F06292" },
          ].map(s=>(
            <div key={s.label} style={{ background:"rgba(255,255,255,0.04)", borderRadius:12, padding:14, textAlign:"center" }}>
              <div style={{ fontSize:10, color:"#6b7280", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:4 }}>{s.label}</div>
              <div style={{ fontSize:20, fontWeight:700, fontFamily:"monospace", color:s.color }}>{s.value}</div>
              <div style={{ fontSize:11, color:"#4b5563" }}>{s.pct}</div>
            </div>
          ))}
        </div>
      </>)}

      {/* Monthly bars */}
      {CARD(<>
        <div style={{ fontSize:11, fontWeight:600, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:14 }}>Month by Month</div>
        <div style={{ display:"flex", alignItems:"flex-end", gap:4, height:80, marginBottom:8 }}>
          {MONTHS.map((mo,i)=>{
            const k=`${year}-${String(i+1).padStart(2,"0")}`;
            const v=byMonth[k]||0;
            const pct=(v/maxMonth)*100;
            const isBig = k===biggestMonth?.[0];
            return (
              <div key={mo} style={{ flex:1, display:"flex", flexDirection:"column", alignItems:"center", gap:2 }}>
                <div style={{ width:"100%", height:`${Math.max(pct,2)}%`, borderRadius:"3px 3px 0 0", background:isBig?"linear-gradient(180deg,#f0abfc,#a5b4fc)":"rgba(99,102,241,0.4)", minHeight:v>0?4:0 }} />
                <div style={{ fontSize:8, color:"#4b5563" }}>{mo.slice(0,1)}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display:"flex", justifyContent:"space-between", fontSize:12, color:"#6b7280" }}>
          {biggestMonth && <span>🔴 Biggest: <span style={{ color:"#f0abfc", fontWeight:600 }}>{getMYLabel(biggestMonth[0])} (${biggestMonth[1].toFixed(0)})</span></span>}
          {quietestMonth && <span>🟢 Quietest: <span style={{ color:"#34d399", fontWeight:600 }}>{getMYLabel(quietestMonth[0])}</span></span>}
        </div>
      </>)}

      {/* Top categories */}
      {CARD(<>
        <div style={{ fontSize:11, fontWeight:600, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:14 }}>Top Spending Categories</div>
        {topCats.map(([cat,amt],i)=>{
          const c = categories.find(x=>x.name===cat);
          return (
            <div key={cat} style={{ marginBottom:14 }}>
              <div style={{ display:"flex", justifyContent:"space-between", marginBottom:5 }}>
                <span style={{ fontSize:13, fontWeight:500 }}>
                  <span style={{ fontSize:11, color:"#4b5563", marginRight:6 }}>#{i+1}</span>
                  {c?.icon} {cat}
                </span>
                <div style={{ textAlign:"right" }}>
                  <span style={{ fontSize:13, fontWeight:700, fontFamily:"monospace" }}>${amt.toFixed(0)}</span>
                  <span style={{ fontSize:11, color:"#4b5563", marginLeft:6 }}>{((amt/totalSpent)*100).toFixed(0)}%</span>
                </div>
              </div>
              <ProgressBar pct={(amt/topCats[0][1])*100} color={c?.color||"#6366f1"} height={6} />
            </div>
          );
        })}
      </>)}

      {/* Fun facts */}
      {CARD(<>
        <div style={{ fontSize:11, fontWeight:600, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:14 }}>Fun Facts</div>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:10 }}>
          {[
            biggestExpense && { label:"Biggest Purchase", value:`$${biggestExpense.amount.toFixed(0)}`, sub:biggestExpense.description, icon:"💸" },
            { label:"Avg Transaction", value:`$${avgTransaction.toFixed(0)}`, sub:`across ${yearExpenses.length} purchases`, icon:"🧾" },
            monthsWithData && { label:"Active Months", value:`${monthsWithData}/12`, sub:"months with spending", icon:"📅" },
            totalSaved>0 && { label:"Total Saved", value:`$${totalSaved.toFixed(0)}`, sub:savingsRate?`${savingsRate.toFixed(1)}% savings rate`:"nice work!", icon:"💰" },
          ].filter(Boolean).map(f=>(
            <div key={f.label} style={{ background:"rgba(255,255,255,0.04)", borderRadius:12, padding:14 }}>
              <div style={{ fontSize:20, marginBottom:6 }}>{f.icon}</div>
              <div style={{ fontSize:11, color:"#6b7280", marginBottom:2 }}>{f.label}</div>
              <div style={{ fontSize:18, fontWeight:700, fontFamily:"monospace", color:"#e8e0d5" }}>{f.value}</div>
              <div style={{ fontSize:11, color:"#4b5563", marginTop:2 }}>{f.sub}</div>
            </div>
          ))}
        </div>
      </>)}

      {/* Net worth change */}
      {nwChange !== null && CARD(<>
        <div style={{ fontSize:11, fontWeight:600, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:14 }}>Net Worth Change — {year}</div>
        <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:11, color:"#6b7280", marginBottom:4 }}>Start of year</div>
            <div style={{ fontSize:18, fontWeight:700, fontFamily:"monospace", color:"#9ca3af" }}>${calcNW(nwStart).toLocaleString()}</div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:28, fontWeight:800, fontFamily:"monospace", color:nwChange>=0?"#34d399":"#ff6b6b" }}>
              {nwChange>=0?"▲":"▼"} ${Math.abs(nwChange).toLocaleString()}
            </div>
            <div style={{ fontSize:11, color:nwChange>=0?"#34d399":"#ff6b6b" }}>{nwChange>=0?"net worth grew":"net worth dropped"}</div>
          </div>
          <div style={{ textAlign:"center" }}>
            <div style={{ fontSize:11, color:"#6b7280", marginBottom:4 }}>End of year</div>
            <div style={{ fontSize:18, fontWeight:700, fontFamily:"monospace", color:calcNW(nwEnd)>=0?"#34d399":"#ff6b6b" }}>${calcNW(nwEnd).toLocaleString()}</div>
          </div>
        </div>
      </>, { background:"rgba(16,185,129,0.04)", border:"1px solid rgba(16,185,129,0.15)" })}
    </div>
  );
}
