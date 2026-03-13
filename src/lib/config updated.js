import { createClient } from "@supabase/supabase-js";

// ── Supabase config ─────────────────────────────────────────
// Replace these two values with your own from supabase.com
export const SUPABASE_URL = "https://fgsqczpfrakcrlyerxay.supabase.co";
export const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnc3FjenBmcmFrY3JseWVyeGF5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzMyODM2NDIsImV4cCI6MjA4ODg1OTY0Mn0._lN2GxfMK8r_qD5nn4CsFmZ3Qenm3jXVmqPDsuroQhQ";
export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
// ────────────────────────────────────────────────────────────

export const DEFAULT_CATEGORIES = [
  { name: "Groceries",     icon: "🛒", color: "#4CAF50", budget: 600 },
  { name: "Dining Out",    icon: "🍽️", color: "#FF7043", budget: 300 },
  { name: "Transport",     icon: "🚗", color: "#42A5F5", budget: 200 },
  { name: "Entertainment", icon: "🎬", color: "#AB47BC", budget: 150 },
  { name: "Utilities",     icon: "💡", color: "#FFA726", budget: 250 },
  { name: "Shopping",      icon: "🛍️", color: "#EC407A", budget: 400 },
  { name: "Health",        icon: "❤️", color: "#26A69A", budget: 200 },
  { name: "Travel",        icon: "✈️", color: "#5C6BC0", budget: 500 },
  { name: "Skincare",      icon: "✨", color: "#F06292", budget: 150 },
];

export const USERS = ["You", "Wife"];
export const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
export const PALETTE = ["#4CAF50","#FF7043","#42A5F5","#AB47BC","#FFA726","#EC407A","#26A69A","#5C6BC0","#F06292","#00BCD4","#FF5722","#8BC34A","#9C27B0","#FF9800","#03A9F4"];
export const ICONS   = ["🏠","🐾","🎵","📚","💊","🍕","🚴","🧴","🎮","🌿","🧹","👶","🐶","🍷","☕","🏋️","🎁","✂️","🧺","🛠️"];
export const GOAL_ICONS = ["🎯","✈️","🏖️","🚗","🏠","💍","👶","🎓","💼","🏋️","🎸","📸","🌍","🏔️","⛵","🍾","💻","📱","🐕","🌴"];

export const ASSET_CATEGORIES  = ["Checking/Savings","Investment/401k","Home Value","Car Value","Other Asset"];
export const DEBT_CATEGORIES   = ["Mortgage","Car Loan","Student Loan","Credit Card","Other Debt"];
export const BILL_FREQUENCIES  = ["Monthly","Bi-weekly","Weekly","Quarterly","Annually"];
export const TAX_CATEGORIES    = ["Home Office","Medical","Charitable","Business Meals","Education","Childcare","Investment Loss","Other"];

export function getMYKey(date) {
  const d = new Date(date + "T12:00:00");
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}`;
}
export function getMYLabel(key) {
  const [y, m] = key.split("-");
  return `${MONTHS[parseInt(m)-1]} ${y}`;
}
export function today() { return new Date().toISOString().split("T")[0]; }
export function thisMonthKey() { return getMYKey(today()); }
export function thisYear() { return new Date().getFullYear().toString(); }

export async function aiCategorize(description, categoryNames) {
  try {
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST", headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        model: "claude-sonnet-4-20250514", max_tokens: 100,
        messages: [{ role: "user", content: `Categorize this expense into EXACTLY one of: ${categoryNames}. Expense: "${description}". Reply ONLY with the category name, nothing else.` }]
      })
    });
    const data = await res.json();
    return data.content?.[0]?.text?.trim() || null;
  } catch { return null; }
}

export async function aiParseNote(noteText, categoryNames) {
  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST", headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      model: "claude-sonnet-4-20250514", max_tokens: 1000,
      messages: [{ role: "user", content: `Extract all expenses from this note. Return a JSON array with fields: description (string), amount (number), category (one of: ${categoryNames}). Note:\n${noteText}\nReply ONLY with valid JSON array, no markdown, no explanation.` }]
    })
  });
  const data = await res.json();
  const raw = data.content?.[0]?.text?.trim().replace(/```json|```/g, "").trim();
  return JSON.parse(raw);
}

// Shared style tokens
export const S = {
  app:    { minHeight:"100vh", background:"#0d0f14", fontFamily:"'DM Sans',sans-serif", backgroundImage:"radial-gradient(ellipse at 15% 15%,#141926 0%,transparent 55%),radial-gradient(ellipse at 85% 85%,#12101c 0%,transparent 55%)", color:"#e8e0d5", paddingBottom:80 },
  card:   { background:"rgba(255,255,255,0.035)", border:"1px solid rgba(255,255,255,0.07)", borderRadius:16, padding:20 },
  input:  { width:"100%", background:"rgba(255,255,255,0.06)", border:"1px solid rgba(255,255,255,0.1)", borderRadius:10, padding:"10px 13px", color:"#e8e0d5", fontSize:14, fontFamily:"'DM Sans',sans-serif", outline:"none", boxSizing:"border-box" },
  label:  { fontSize:11, color:"#6b7280", marginBottom:5, display:"block", fontWeight:600, textTransform:"uppercase", letterSpacing:"0.6px" },
  btn:    (color="#6366f1") => ({ padding:"11px", background:`linear-gradient(135deg,${color},${color}cc)`, border:"none", borderRadius:12, color:"#fff", fontSize:14, fontWeight:600, cursor:"pointer", fontFamily:"'DM Sans',sans-serif", width:"100%", boxShadow:`0 4px 16px ${color}44` }),
  chip:   (active, color) => { const c=color||"#6366f1"; return { padding:"6px 14px", borderRadius:20, border:"1px solid", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:500, fontSize:13, transition:"all 0.15s", borderColor:active?c:"rgba(255,255,255,0.1)", background:active?`${c}22`:"transparent", color:active?c:"#6b7280" }; },
  navBtn: (active) => ({ padding:"8px 15px", borderRadius:9, border:"none", cursor:"pointer", fontSize:12.5, fontFamily:"'DM Sans',sans-serif", fontWeight:500, transition:"all 0.2s", background:active?"rgba(255,255,255,0.11)":"transparent", color:active?"#fff":"#6b7280", whiteSpace:"nowrap" }),
  userBtn:(active) => ({ flex:1, padding:"9px", borderRadius:10, border:"1px solid", borderColor:active?"#6366f1":"rgba(255,255,255,0.1)", background:active?"rgba(99,102,241,0.15)":"transparent", color:active?"#a5b4fc":"#6b7280", cursor:"pointer", fontFamily:"'DM Sans',sans-serif", fontWeight:600, fontSize:14 }),
  sectionTitle: { fontSize:11, fontWeight:600, color:"#9ca3af", textTransform:"uppercase", letterSpacing:"0.5px", marginBottom:14 },
  miniBar: (pct, color, over) => ({
    track: { height:6, background:"rgba(255,255,255,0.07)", borderRadius:99, overflow:"hidden", marginTop:4 },
    fill:  { height:"100%", width:`${Math.min(pct,100)}%`, borderRadius:99, transition:"width 0.5s ease", background: over?"linear-gradient(90deg,#ff6b6b,#ff4444)":`linear-gradient(90deg,${color}88,${color})` }
  }),
};
