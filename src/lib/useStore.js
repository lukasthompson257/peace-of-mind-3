import { useState, useEffect, useCallback, useRef } from "react";
import { supabase, DEFAULT_CATEGORIES, thisMonthKey } from "./config.js";

export function useStore() {
  const [categories,     setCategories]     = useState(DEFAULT_CATEGORIES);
  const [expenses,       setExpenses]       = useState([]);
  const [budgets,        setBudgets]        = useState({});
  const [income,         setIncome]         = useState({ youSalary:0, wifeSalary:0, otherIncome:0, savingsTarget:0, auto401k:0, autoOther:0 });
  const [monthlySavings, setMonthlySavings] = useState({});
  const [goals,          setGoals]          = useState([]);
  const [bills,          setBills]          = useState([]);
  const [debts,          setDebts]          = useState([]);
  const [netWorthLog,    setNetWorthLog]    = useState([]);  // [{ month, assets:{}, liabilities:{} }]
  const [taxItems,       setTaxItems]       = useState([]);
  const [loading,        setLoading]        = useState(true);
  const [syncing,        setSyncing]        = useState(false);
  const [lastSync,       setLastSync]       = useState(null);
  const channelRef = useRef(null);

  const loadData = useCallback(async () => {
    try {
      const { data, error } = await supabase.from("pennies_data").select("key,value");
      if (error) throw error;
      const map = Object.fromEntries((data||[]).map(r => [r.key, r.value]));
      if (map.expenses)       setExpenses(JSON.parse(map.expenses));
      if (map.budgets)        setBudgets(JSON.parse(map.budgets));
      if (map.categories)     setCategories(JSON.parse(map.categories));
      if (map.income)         setIncome(p => ({ ...p, ...JSON.parse(map.income) }));
      if (map.monthlySavings) setMonthlySavings(JSON.parse(map.monthlySavings));
      if (map.goals)          setGoals(JSON.parse(map.goals));
      if (map.bills)          setBills(JSON.parse(map.bills));
      if (map.debts)          setDebts(JSON.parse(map.debts));
      if (map.netWorthLog)    setNetWorthLog(JSON.parse(map.netWorthLog));
      if (map.taxItems)       setTaxItems(JSON.parse(map.taxItems));
      setLastSync(new Date());
    } catch(e) { console.error("Load error:", e); }
    finally { setLoading(false); }
  }, []);

  const persist = useCallback(async (key, value) => {
    setSyncing(true);
    try {
      const { error } = await supabase.from("pennies_data").upsert({ key, value: JSON.stringify(value) }, { onConflict:"key" });
      if (error) throw error;
      setLastSync(new Date());
    } catch(e) { console.error("Save error:", e); }
    finally { setSyncing(false); }
  }, []);

  useEffect(() => {
    loadData();
    channelRef.current = supabase.channel("pennies-sync")
      .on("postgres_changes", { event:"*", schema:"public", table:"pennies_data" }, () => loadData())
      .subscribe();
    return () => { if (channelRef.current) supabase.removeChannel(channelRef.current); };
  }, [loadData]);

  // Convenience setters that also persist
  const save = useCallback((key, setter) => async (value) => {
    setter(value);
    await persist(key, value);
  }, [persist]);

  return {
    // state
    categories, expenses, budgets, income, monthlySavings, goals,
    bills, debts, netWorthLog, taxItems, loading, syncing, lastSync,
    // raw setters + persist
    persist,
    setAndSaveCategories:     save("categories",     setCategories),
    setAndSaveExpenses:       save("expenses",       setExpenses),
    setAndSaveBudgets:        save("budgets",        setBudgets),
    setAndSaveIncome:         save("income",         setIncome),
    setAndSaveMonthlySavings: save("monthlySavings", setMonthlySavings),
    setAndSaveGoals:          save("goals",          setGoals),
    setAndSaveBills:          save("bills",          setBills),
    setAndSaveDebts:          save("debts",          setDebts),
    setAndSaveNetWorthLog:    save("netWorthLog",    setNetWorthLog),
    setAndSaveTaxItems:       save("taxItems",       setTaxItems),
  };
}
