import { S } from "../lib/config.js";

export function MiniBar({ pct, color, over }) {
  const t = S.miniBar(pct, color, over);
  return <div style={t.track}><div style={t.fill} /></div>;
}

export function StatCard({ label, value, sub, color }) {
  return (
    <div style={{ ...S.card, textAlign:"center" }}>
      <div style={{ fontSize:10, color:"#6b7280", textTransform:"uppercase", letterSpacing:"0.8px", marginBottom:5 }}>{label}</div>
      <div style={{ fontSize:24, fontWeight:700, color, letterSpacing:"-1px" }}>{value}</div>
      {sub && <div style={{ fontSize:11, color:"#4b5563", marginTop:2 }}>{sub}</div>}
    </div>
  );
}

export function SectionTitle({ children }) {
  return <div style={S.sectionTitle}>{children}</div>;
}

export function EmptyState({ icon, title, body }) {
  return (
    <div style={{ ...S.card, textAlign:"center", padding:48 }}>
      <div style={{ fontSize:40, marginBottom:12 }}>{icon}</div>
      <div style={{ fontSize:16, fontWeight:600, marginBottom:6 }}>{title}</div>
      <div style={{ fontSize:13, color:"#6b7280" }}>{body}</div>
    </div>
  );
}

export function Row({ label, value, color="#e8e0d5", size=14 }) {
  return (
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:9 }}>
      <span style={{ fontSize:13, color:"#9ca3af" }}>{label}</span>
      <span style={{ fontSize:size, fontWeight:700, fontFamily:"monospace", color }}>{value}</span>
    </div>
  );
}

export function ProgressBar({ pct, color="#10b981", height=8 }) {
  return (
    <div style={{ height, background:"rgba(255,255,255,0.07)", borderRadius:99, overflow:"hidden" }}>
      <div style={{ height:"100%", width:`${Math.min(pct,100)}%`, borderRadius:99, background:`linear-gradient(90deg,${color}88,${color})`, transition:"width 0.5s" }} />
    </div>
  );
}

export function IconPicker({ icons, value, onChange }) {
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
      {icons.map(ic => (
        <button key={ic} onClick={() => onChange(ic)} style={{ width:36, height:36, borderRadius:8, border:`2px solid ${value===ic?"#6366f1":"rgba(255,255,255,0.1)"}`, background:value===ic?"rgba(99,102,241,0.2)":"rgba(255,255,255,0.04)", cursor:"pointer", fontSize:16 }}>{ic}</button>
      ))}
    </div>
  );
}

export function ColorPicker({ palette, value, onChange }) {
  return (
    <div style={{ display:"flex", flexWrap:"wrap", gap:6 }}>
      {palette.map(col => (
        <button key={col} onClick={() => onChange(col)} style={{ width:26, height:26, borderRadius:"50%", background:col, border:`3px solid ${value===col?"#fff":"transparent"}`, cursor:"pointer" }} />
      ))}
    </div>
  );
}

export function UserToggle({ value, onChange }) {
  return (
    <div style={{ display:"flex", gap:8 }}>
      {["You","Wife"].map(u => (
        <button key={u} onClick={() => onChange(u)} style={S.userBtn(value===u)}>{u==="You"?"👤 You":"💝 Wife"}</button>
      ))}
    </div>
  );
}

export function Alert({ type="warning", children }) {
  const colors = { warning:["#FFA726","rgba(255,167,38,0.1)"], danger:["#ff6b6b","rgba(255,107,107,0.1)"], success:["#34d399","rgba(52,211,153,0.1)"] };
  const [c, bg] = colors[type];
  return (
    <div style={{ padding:"10px 14px", background:bg, border:`1px solid ${c}44`, borderRadius:10, display:"flex", alignItems:"center", gap:10, marginBottom:10 }}>
      <span style={{ fontSize:16 }}>{type==="warning"?"⚠️":type==="danger"?"🚨":"✅"}</span>
      <span style={{ fontSize:13, color:c }}>{children}</span>
    </div>
  );
}
