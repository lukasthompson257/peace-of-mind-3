import { S, getMYLabel, MONTHS } from "../lib/config.js";
import { MiniBar, StatCard, Alert, Row, ProgressBar } from "../components/UI.jsx";

export default function Dashboard({ store, selectedMonth, setSelectedMonth, setView }) {
  const { categories, expenses, budgets, income, monthlySavings, netWorthLog, bills } = store;

  const allMonths = [...new Set(expenses.map(e => { const d=new Date(e.date+"T12:00:00"); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; }))].sort().reverse();
  const curKey = (() => { const d=new Date(); return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; })();
  if (!allMonths.includes(curKey)) allMonths.unshift(curKey);

  const monthExpenses = expenses.filter(e => { const d=new Date(e.date+"T12:00:00"); const k=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`; return k===selectedMonth; });
  const totalSpent = monthExpenses.reduce((s,e) => s+e.amount, 0);
  const effectiveBudgets = Object.fromEntries(categories.map(c => [c.name, budgets[c.name] ?? c.budget]));
  const totalBudget = Object.values(effectiveBudgets).reduce((a,b) => a+b, 0);
  const byCategory = Object.fromEntries(categories.map(c => [c.name, monthExpenses.filter(e=>e.category===c.name).reduce((s,e)=>s+e.amount,0)]));
  const byUser = { You: monthExpenses.filter(e=>e.user==="You").reduce((s,e)=>s+e.amount,0), Wife: monthExpenses.filter(e=>e.user==="Wife").reduce((s,e)=>s+e.amount,0) };

  const totalIncome = (income.youSalary||0)+(income.wifeSalary||0)+(income.otherIncome||0);
  const autoSavings = (income.auto401k||0)+(income.autoOther||0);
  const manualSavings = Math.max(0, totalIncome-autoSavings-totalSpent);
  const totalSavings = autoSavings+manualSavings;
  const savingsPct = totalIncome>0?(totalSavings/totalIncome)*100:0;

  // Spending alerts: categories over 80% of budget
  const alerts = categories.filter(c => {
    const spent = byCategory[c.name]||0;
    const bud = effectiveBudgets[c.name]||0;
    return bud>0 && spent/bud >= 0.8;
  });

  // Latest net worth
  const latestNW = netWorthLog.length > 0 ? [...netWorthLog].sort((a,b)=>a.month.localeCompare(b.month)).at(-1) : null;
  const totalAssets = latestNW ? Object.values(latestNW.assets||{}).reduce((s,v)=>s+(v||0),0) : 0;
  const totalLiabilities = latestNW ? Object.values(latestNW.liabilities||{}).reduce((s,v)=>s+(v||0),0) : 0;
  const netWorth = totalAssets - totalLiabilities;

  // Upcoming bills (next 7 days)
  const today = new Date();
  const upcomingBills = bills.filter(b => {
    if (!b.nextDue) return false;
    const due = new Date(b.nextDue+"T12:00:00");
    const diff = (due-today)/(1000*60*60*24);
    return diff >= 0 && diff <= 7;
  }).sort((a,b) => a.nextDue.localeCompare(b.nextDue));

  return (
    <div>
      {/* Month picker */}
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:16 }}>
        <div style={{ fontSize:18, fontWeight:700, letterSpacing:"-0.5px" }}>Overview</div>
        <select value={selectedMonth} onChange={e=>setSelectedMonth(e.target.value)} style={{ ...S.input, width:"auto", padding:"7px 12px", fontSize:13, cursor:"pointer" }}>
          {allMonths.map(m => <option key={m} value={m}>{getMYLabel(m)}</option>)}
        </select>
      </div>

      {/* Spending alerts */}
      {alerts.map(c => {
        const spent=byCategory[c.name]||0, bud=effectiveBudgets[c.name];
        const over = spent>bud;
        return <Alert key={c.name} type={over?"danger":"warning"}>{c.icon} {c.name}: ${spent.toFixed(0)} {over?`over budget by $${(spent-bud).toFixed(0)}`:`is ${((spent/bud)*100).toFixed(0)}% of $${bud} budget`}</Alert>;
      })}

      {/* Top stats */}
      <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:10, marginBottom:14 }}>
        <StatCard label="Spent" value={`$${totalSpent.toFixed(0)}`} sub={`of $${totalBudget} budget`} color={totalSpent>totalBudget?"#ff6b6b":"#a8c5a0"} />
        <StatCard label="Your Share" value={`$${byUser.You.toFixed(0)}`} sub={`${totalSpent>0?((byUser.You/totalSpent)*100).toFixed(0):0}%`} color="#42A5F5" />
        <StatCard label="Wife's Share" value={`$${byUser.Wife.toFixed(0)}`} sub={`${totalSpent>0?((byUser.Wife/totalSpent)*100).toFixed(0):0}%`} color="#F06292" />
      </div>

      <div style={{ display:"grid", gridTemplateColumns:"1.3fr 1fr", gap:14 }}>
        {/* Budget bars */}
        <div style={S.card}>
          <div style={S.sectionTitle}>Budget vs Actual — {getMYLabel(selectedMonth)}</div>
          {categories.map(c => {
            const spent=byCategory[c.name]||0, bud=effectiveBudgets[c.name]||c.budget;
            return (
              <div key={c.name} style={{ marginBottom:11 }}>
                <div style={{ display:"flex", justifyContent:"space-between", marginBottom:3 }}>
                  <span style={{ fontSize:12.5, fontWeight:500 }}>{c.icon} {c.name}</span>
                  <span style={{ fontSize:11, fontFamily:"monospace", color:spent>bud?"#ff6b6b":"#a8c5a0" }}>${spent.toFixed(0)}<span style={{ color:"#4b5563" }}>/${bud}</span></span>
                </div>
                <MiniBar pct={(spent/bud)*100} color={c.color} over={spent>bud} />
              </div>
            );
          })}
        </div>

        <div style={{ display:"flex", flexDirection:"column", gap:12 }}>
          {/* Net worth snippet */}
          {latestNW && (
            <div style={{ ...S.card, cursor:"pointer" }} onClick={()=>setView("networth")}>
              <div style={S.sectionTitle}>Net Worth</div>
              <div style={{ fontSize:24, fontWeight:700, fontFamily:"monospace", color:netWorth>=0?"#34d399":"#ff6b6b", marginBottom:4 }}>${netWorth.toLocaleString()}</div>
              <div style={{ display:"flex", justifyContent:"space-between", fontSize:11, color:"#4b5563" }}>
                <span>Assets ${totalAssets.toLocaleString()}</span>
                <span>Debts ${totalLiabilities.toLocaleString()}</span>
              </div>
            </div>
          )}

          {/* Savings snippet */}
          {totalIncome > 0 && (
            <div style={{ ...S.card, cursor:"pointer" }} onClick={()=>setView("savings")}>
              <div style={S.sectionTitle}>Savings</div>
              <Row label="Saved" value={`$${totalSavings.toFixed(0)}`} color={totalSavings>=(income.savingsTarget||0)?"#a8c5a0":"#ff6b6b"} />
              <Row label="Target" value={`$${income.savingsTarget||0}`} color="#6b7280" size={12} />
              <ProgressBar pct={savingsPct} />
              <div style={{ fontSize:10, color:"#4b5563", marginTop:4, textAlign:"right" }}>{savingsPct.toFixed(1)}% rate</div>
            </div>
          )}

          {/* Upcoming bills */}
          {upcomingBills.length > 0 && (
            <div style={{ ...S.card, cursor:"pointer" }} onClick={()=>setView("bills")}>
              <div style={S.sectionTitle}>Due Soon</div>
              {upcomingBills.map(b => {
                const due = new Date(b.nextDue+"T12:00:00");
                const diff = Math.ceil((due-today)/(1000*60*60*24));
                return (
                  <div key={b.id} style={{ display:"flex", justifyContent:"space-between", marginBottom:7 }}>
                    <span style={{ fontSize:13 }}>{b.icon||"📅"} {b.name}</span>
                    <span style={{ fontSize:12, fontFamily:"monospace", color:diff<=2?"#ff6b6b":"#FFA726" }}>{diff===0?"Today":diff===1?"Tomorrow":`${diff}d`} · ${b.amount}</span>
                  </div>
                );
              })}
            </div>
          )}

          {/* Recent transactions */}
          <div style={{ ...S.card, flex:1 }}>
            <div style={S.sectionTitle}>Recent</div>
            {monthExpenses.slice(0,6).map(e => {
              const cat = categories.find(c=>c.name===e.category);
              return (
                <div key={e.id} style={{ display:"flex", justifyContent:"space-between", alignItems:"center", padding:"7px 0", borderBottom:"1px solid rgba(255,255,255,0.04)" }}>
                  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                    <span style={{ fontSize:15 }}>{cat?.icon||"💸"}</span>
                    <div>
                      <div style={{ fontSize:12.5, fontWeight:500, maxWidth:120, overflow:"hidden", textOverflow:"ellipsis", whiteSpace:"nowrap" }}>{e.description}</div>
                      <div style={{ fontSize:10, color:"#4b5563" }}>{e.user==="You"?"👤":"💝"} {e.user}</div>
                    </div>
                  </div>
                  <div style={{ fontSize:12, fontWeight:700, fontFamily:"monospace" }}>-${e.amount.toFixed(2)}</div>
                </div>
              );
            })}
            {monthExpenses.length===0 && <div style={{ color:"#4b5563", fontSize:13, textAlign:"center", padding:16 }}>No expenses yet</div>}
          </div>
        </div>
      </div>
    </div>
  );
}
