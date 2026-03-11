import { useState } from "react";

const COLORS = {
  bg: "#0D0F14", sidebar: "#111318", card: "#16191F", cardBorder: "#1E2230",
  accent: "#4F8EF7", accentGlow: "rgba(79,142,247,0.15)", text: "#E2E8F0",
  muted: "#6B7280", success: "#34D399", warning: "#FBBF24", danger: "#F87171", purple: "#A78BFA",
};

const NAV = [
  { id: "dashboard", label: "Dashboard", icon: "⊞", sub: [] },
  { id: "operations", label: "Operations", icon: "⚙", sub: [
    { id: "purchases", label: "Purchases", icon: "📦" },
    { id: "collections", label: "Collections", icon: "💰" },
    { id: "refunds", label: "Refunds", icon: "↩️" },
  ]},
  { id: "customers", label: "Customers", icon: "👥", sub: [
    { id: "all-customers", label: "All Customers", icon: "👤" },
    { id: "limits", label: "Purchase Limits", icon: "💳" },
  ]},
  { id: "merchants", label: "Merchants", icon: "🏪", sub: [
    { id: "partners", label: "Partners", icon: "🤝" },
    { id: "stores", label: "Stores", icon: "📍" },
  ]},
  { id: "risk", label: "Risk", icon: "🛡", sub: [
    { id: "overdue", label: "Overdue Payments", icon: "⚠️" },
    { id: "blocked", label: "Blocked", icon: "🚫" },
  ]},
  { id: "marketing", label: "Marketing", icon: "📣", sub: [
    { id: "promos", label: "Promos", icon: "🎁" },
  ]},
  { id: "integrations", label: "Integrations", icon: "🔗", sub: [
    { id: "api-keys", label: "API Keys", icon: "🔑" },
  ]},
  { id: "settings", label: "Settings", icon: "⚙️", sub: [
    { id: "team", label: "Team", icon: "👨‍💼" },
    { id: "cities", label: "Cities", icon: "🗺" },
    { id: "categories", label: "Categories", icon: "🏷" },
    { id: "rules", label: "Rules & Permissions", icon: "🔐" },
  ]},
];

const Badge = ({ color, children }) => (
  <span style={{ background: color+"22", color, border:`1px solid ${color}44`, borderRadius:6, padding:"2px 8px", fontSize:11, fontWeight:600 }}>{children}</span>
);

const Card = ({ title, children, accent, style={} }) => (
  <div style={{ background:COLORS.card, border:`1px solid ${accent?accent+"44":COLORS.cardBorder}`, borderRadius:12, padding:20, boxShadow:accent?`0 0 20px ${accent}18`:"none", ...style }}>
    {title && <div style={{ color:COLORS.muted, fontSize:11, fontWeight:700, letterSpacing:1.5, textTransform:"uppercase", marginBottom:12 }}>{title}</div>}
    {children}
  </div>
);

const StatPill = ({ label, value, color }) => (
  <div style={{ background:COLORS.card, border:`1px solid ${color}33`, borderRadius:10, padding:"10px 18px", display:"flex", gap:10, alignItems:"center" }}>
    <div style={{ color, fontSize:18, fontWeight:800, fontFamily:"monospace" }}>{value}</div>
    <div style={{ color:COLORS.muted, fontSize:11, fontWeight:600, textTransform:"uppercase", letterSpacing:0.8 }}>{label}</div>
  </div>
);

const KpiCard = ({ label, value, delta, color, icon }) => (
  <Card accent={color}>
    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start" }}>
      <div>
        <div style={{ color:COLORS.muted, fontSize:11, fontWeight:600, letterSpacing:1, textTransform:"uppercase", marginBottom:8 }}>{label}</div>
        <div style={{ color:COLORS.text, fontSize:28, fontWeight:800, fontFamily:"monospace" }}>{value}</div>
        {delta && <div style={{ color, fontSize:12, marginTop:4 }}>↑ {delta} vs last month</div>}
      </div>
      <div style={{ fontSize:28, opacity:0.6 }}>{icon}</div>
    </div>
  </Card>
);

const DataTable = ({ cols, rows }) => (
  <div style={{ overflowX:"auto" }}>
    <table style={{ width:"100%", borderCollapse:"collapse", fontSize:13 }}>
      <thead>
        <tr>
          {cols.map(c => (
            <th key={c} style={{ padding:"10px 16px", textAlign:"left", color:COLORS.muted, fontWeight:700, fontSize:11, letterSpacing:1.2, textTransform:"uppercase", borderBottom:`1px solid ${COLORS.cardBorder}`, background:COLORS.bg+"88" }}>{c}</th>
          ))}
        </tr>
      </thead>
      <tbody>
        {rows.map((row, i) => (
          <tr key={i} style={{ borderBottom:`1px solid ${COLORS.cardBorder}22`, cursor:"pointer" }}
            onMouseEnter={e => e.currentTarget.style.background=COLORS.accentGlow}
            onMouseLeave={e => e.currentTarget.style.background="transparent"}>
            {row.map((cell, j) => (
              <td key={j} style={{ padding:"13px 16px", color:COLORS.text, verticalAlign:"middle" }}>{cell}</td>
            ))}
          </tr>
        ))}
      </tbody>
    </table>
  </div>
);

// ── VIEWS ──────────────────────────────────────────────

function DashboardView() {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:24 }}>
      <div>
        <h1 style={{ color:COLORS.text, fontSize:24, fontWeight:800, margin:0 }}>Dashboard</h1>
        <p style={{ color:COLORS.muted, margin:"4px 0 0", fontSize:13 }}>Platform overview — today</p>
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"repeat(4,1fr)", gap:16 }}>
        <KpiCard label="Total GMV" value="$2.4M" delta="12%" color={COLORS.accent} icon="💹" />
        <KpiCard label="Active Customers" value="8,412" delta="5%" color={COLORS.success} icon="👥" />
        <KpiCard label="Overdue Payments" value="$34K" color={COLORS.danger} icon="⚠️" />
        <KpiCard label="Pending Refunds" value="23" color={COLORS.warning} icon="↩️" />
      </div>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <Card title="Top Merchants — By Amount">
          <DataTable cols={["Merchant","Volume","Orders","Status"]} rows={[
            ["Zara Morocco", <span style={{color:COLORS.accent,fontFamily:"monospace"}}>$184,200</span>, "412", <Badge color={COLORS.success}>Active</Badge>],
            ["Carrefour MA", <span style={{color:COLORS.accent,fontFamily:"monospace"}}>$152,800</span>, "389", <Badge color={COLORS.success}>Active</Badge>],
            ["BIM", <span style={{color:COLORS.accent,fontFamily:"monospace"}}>$98,400</span>, "210", <Badge color={COLORS.success}>Active</Badge>],
            ["Marjane", <span style={{color:COLORS.accent,fontFamily:"monospace"}}>$74,100</span>, "198", <Badge color={COLORS.warning}>Review</Badge>],
          ]} />
        </Card>
        <Card title="Top Merchants — By Frequency">
          <DataTable cols={["Merchant","Transactions","Avg Basket","Trend"]} rows={[
            ["Carrefour MA","1,204","$42",<Badge color={COLORS.success}>↑ 8%</Badge>],
            ["BIM","988","$28",<Badge color={COLORS.success}>↑ 3%</Badge>],
            ["Zara Morocco","854","$218",<Badge color={COLORS.accent}>↑ 14%</Badge>],
            ["Marjane","612","$121",<Badge color={COLORS.warning}>→ 0%</Badge>],
          ]} />
        </Card>
      </div>
    </div>
  );
}

function PurchasesView() {
  const [filter, setFilter] = useState("All");
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <h1 style={{ color:COLORS.text, fontSize:22, fontWeight:800, margin:0 }}>📦 Purchases</h1>
          <p style={{ color:COLORS.muted, margin:"4px 0 0", fontSize:13 }}>All purchase transactions</p>
        </div>
        <div style={{ display:"flex", gap:8 }}>
          <Badge color={COLORS.success}>● Approved (142)</Badge>
          <Badge color={COLORS.warning}>● Refund Requested (23)</Badge>
        </div>
      </div>
      <div style={{ display:"flex", gap:8, flexWrap:"wrap", alignItems:"center" }}>
        {["All","Approved","Pending","Refund Requested","Rejected"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ background:filter===f?COLORS.accent:COLORS.card, color:filter===f?"#fff":COLORS.muted, border:`1px solid ${filter===f?COLORS.accent:COLORS.cardBorder}`, borderRadius:8, padding:"6px 14px", fontSize:12, cursor:"pointer", fontWeight:filter===f?600:400 }}>{f}</button>
        ))}
        <input placeholder="🔍  Search customer / merchant..." style={{ marginLeft:"auto", background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:8, padding:"6px 14px", color:COLORS.text, fontSize:12, width:240, outline:"none" }} />
      </div>
      <Card>
        <DataTable cols={["ID","Customer","Merchant","Amount","Instalments","Status","Date","Actions"]} rows={[
          ["#PU-8812","Ayoub Benali","Zara Morocco","$340","3×",<Badge color={COLORS.success}>Approved</Badge>,"Mar 8, 2026",<span style={{color:COLORS.accent,cursor:"pointer",fontSize:12}}>View →</span>],
          ["#PU-8801","Sara Idrissi","Carrefour MA","$120","2×",<Badge color={COLORS.warning}>Refund Req.</Badge>,"Mar 7, 2026",<span style={{color:COLORS.accent,cursor:"pointer",fontSize:12}}>View →</span>],
          ["#PU-8799","Mohamed Haj","BIM","$58","1×",<Badge color={COLORS.success}>Approved</Badge>,"Mar 7, 2026",<span style={{color:COLORS.accent,cursor:"pointer",fontSize:12}}>View →</span>],
          ["#PU-8792","Fatima Zahra","Marjane","$210","4×",<Badge color={COLORS.danger}>Rejected</Badge>,"Mar 6, 2026",<span style={{color:COLORS.accent,cursor:"pointer",fontSize:12}}>View →</span>],
        ]} />
      </Card>
    </div>
  );
}

function CollectionsView() {
  const [tab, setTab] = useState("list");
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <h1 style={{ color:COLORS.text, fontSize:22, fontWeight:800, margin:0 }}>💰 Collections</h1>
          <p style={{ color:COLORS.muted, margin:"4px 0 0", fontSize:13 }}>Instalment tracking</p>
        </div>
        <div style={{ display:"flex", gap:4, background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:10, padding:4 }}>
          {["list","calendar"].map(t => (
            <button key={t} onClick={() => setTab(t)} style={{ background:tab===t?COLORS.accent:"transparent", color:tab===t?"#fff":COLORS.muted, border:"none", borderRadius:7, padding:"6px 16px", cursor:"pointer", fontSize:12, fontWeight:600 }}>{t==="calendar"?"📅 Calendar":"☰ List"}</button>
          ))}
        </div>
      </div>
      {tab==="list" ? (
        <Card>
          <DataTable cols={["Transaction","Customer","Merchant","Amount","Instalment","Status","Due Date"]} rows={[
            ["#TX-4412","Ayoub B.","Zara","$113","2 of 3",<Badge color={COLORS.warning}>Overdue</Badge>,"Mar 1, 2026"],
            ["#TX-4401","Sara I.","Carrefour","$60","1 of 2",<Badge color={COLORS.success}>Completed</Badge>,"Mar 5, 2026"],
            ["#TX-4398","Karim M.","BIM","$29","1 of 1",<Badge color={COLORS.success}>Completed</Badge>,"Mar 8, 2026"],
            ["#TX-4391","Nadia F.","Marjane","$52","3 of 4",<Badge color={COLORS.accent}>Upcoming</Badge>,"Mar 15, 2026"],
          ]} />
        </Card>
      ) : (
        <Card title="March 2026 — Instalments Due">
          <div style={{ display:"grid", gridTemplateColumns:"repeat(7,1fr)", gap:6 }}>
            {["Mon","Tue","Wed","Thu","Fri","Sat","Sun"].map(d => (
              <div key={d} style={{ color:COLORS.muted, fontSize:10, fontWeight:700, textAlign:"center", padding:"4px 0", letterSpacing:1 }}>{d}</div>
            ))}
            {Array.from({length:31},(_,i)=>i+1).map(day => (
              <div key={day} style={{ background:[1,5,8,15,22].includes(day)?COLORS.accentGlow:"transparent", border:`1px solid ${[1,5,8,15,22].includes(day)?COLORS.accent+"55":COLORS.cardBorder}`, borderRadius:8, padding:"8px 4px", textAlign:"center", cursor:"pointer", color:[1].includes(day)?COLORS.danger:COLORS.text, fontSize:12, fontWeight:[1,5,8,15,22].includes(day)?700:400 }}>
                {day}
                {[1].includes(day) && <div style={{ width:6, height:6, background:COLORS.danger, borderRadius:"50%", margin:"2px auto 0" }} />}
                {[5,8,22].includes(day) && <div style={{ width:6, height:6, background:COLORS.success, borderRadius:"50%", margin:"2px auto 0" }} />}
                {[15].includes(day) && <div style={{ width:6, height:6, background:COLORS.accent, borderRadius:"50%", margin:"2px auto 0" }} />}
              </div>
            ))}
          </div>
        </Card>
      )}
    </div>
  );
}

function RefundsView() {
  const [view, setView] = useState("requests");
  const statusConfig = { pending:{color:COLORS.warning,label:"Pending"}, approved:{color:COLORS.success,label:"Approved"}, rejected:{color:COLORS.danger,label:"Rejected"} };
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <h1 style={{ color:COLORS.text, fontSize:22, fontWeight:800, margin:0 }}>↩️ Refunds</h1>
          <p style={{ color:COLORS.muted, margin:"4px 0 0", fontSize:13 }}>{view==="requests"?"Review and act on incoming refund requests":"History of all processed refunds"}</p>
        </div>
        <div style={{ display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ position:"relative" }}>
            <select value={view} onChange={e=>setView(e.target.value)} style={{ background:COLORS.card, color:COLORS.text, border:`1px solid ${COLORS.accent}66`, borderRadius:9, padding:"9px 36px 9px 14px", fontSize:13, fontWeight:600, cursor:"pointer", appearance:"none", outline:"none" }}>
              <option value="requests">📋 Refund Requests</option>
              <option value="refunded">✅ Refunded Purchases</option>
            </select>
            <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", color:COLORS.accent, fontSize:10, pointerEvents:"none" }}>▼</span>
          </div>
          <button style={{ background:COLORS.accent, color:"#fff", border:"none", borderRadius:9, padding:"9px 16px", fontSize:13, fontWeight:600, cursor:"pointer" }}>Export CSV</button>
        </div>
      </div>
      <div style={{ display:"flex", gap:12 }}>
        {view==="requests" ? <>
          <StatPill label="Total" value="23" color={COLORS.accent} />
          <StatPill label="Pending" value="14" color={COLORS.warning} />
          <StatPill label="Approved" value="7" color={COLORS.success} />
          <StatPill label="Rejected" value="2" color={COLORS.danger} />
        </> : <>
          <StatPill label="Total Refunded" value="$1,240" color={COLORS.success} />
          <StatPill label="This Month" value="$488" color={COLORS.accent} />
          <StatPill label="Transactions" value="18" color={COLORS.muted} />
        </>}
      </div>
      <Card>
        <div style={{ padding:"0 0 14px", borderBottom:`1px solid ${COLORS.cardBorder}`, marginBottom:4 }}>
          <input placeholder="🔍  Search by customer, ID..." style={{ background:COLORS.bg, border:`1px solid ${COLORS.cardBorder}`, borderRadius:8, padding:"7px 12px", color:COLORS.text, fontSize:12, outline:"none", width:280 }} />
        </div>
        {view==="requests" ? (
          <DataTable cols={["ID","Customer","Amount","Reason","Status","Actions"]} rows={[
            ["#RF-221",<AvatarCell name="Sara Idrissi" color={COLORS.accent}/>,"$120","Wrong item received",<Badge color={COLORS.warning}>Pending</Badge>,<ActionBtns/>],
            ["#RF-218",<AvatarCell name="Karim M." color={COLORS.success}/>,"$58","Item not delivered",<Badge color={COLORS.success}>Approved</Badge>,<span style={{color:COLORS.muted,fontSize:12}}>— Done</span>],
            ["#RF-215",<AvatarCell name="Nadia F." color={COLORS.accent}/>,"$88","Duplicate charge",<Badge color={COLORS.warning}>Pending</Badge>,<ActionBtns/>],
            ["#RF-210",<AvatarCell name="Youssef A." color={COLORS.purple}/>,"$200","Product defective",<Badge color={COLORS.danger}>Rejected</Badge>,<span style={{color:COLORS.danger+"88",fontSize:12}}>— Closed</span>],
          ]} />
        ) : (
          <DataTable cols={["Purchase","Customer","Merchant","Amount","Refunded On"]} rows={[
            ["#PU-8590",<AvatarCell name="Nadia F." color={COLORS.success}/>,"Zara Morocco",<span style={{color:COLORS.success,fontFamily:"monospace"}}>$88</span>,"Mar 5, 2026"],
            ["#PU-8512",<AvatarCell name="Youssef A." color={COLORS.success}/>,"Carrefour MA",<span style={{color:COLORS.success,fontFamily:"monospace"}}>$200</span>,"Feb 28, 2026"],
            ["#PU-8490",<AvatarCell name="Karim M." color={COLORS.success}/>,"BIM",<span style={{color:COLORS.success,fontFamily:"monospace"}}>$58</span>,"Feb 20, 2026"],
          ]} />
        )}
        <div style={{ padding:"12px 0 0", borderTop:`1px solid ${COLORS.cardBorder}`, display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
          <span style={{ color:COLORS.muted, fontSize:12 }}>Showing {view==="requests"?"4 of 23":"3 of 18"} entries</span>
          <div style={{ display:"flex", gap:6 }}>
            {["←","1","2","3","→"].map((p,i) => (
              <button key={i} style={{ background:i===1?COLORS.accent:COLORS.card, color:i===1?"#fff":COLORS.muted, border:`1px solid ${COLORS.cardBorder}`, borderRadius:6, width:28, height:28, cursor:"pointer", fontSize:12 }}>{p}</button>
            ))}
          </div>
        </div>
      </Card>
    </div>
  );
}

const AvatarCell = ({ name, color }) => (
  <div style={{ display:"flex", alignItems:"center", gap:8 }}>
    <div style={{ width:28, height:28, borderRadius:"50%", background:color+"33", display:"flex", alignItems:"center", justifyContent:"center", fontSize:11, fontWeight:700, color }}>{name[0]}</div>
    <span>{name}</span>
  </div>
);

const ActionBtns = () => (
  <div style={{ display:"flex", gap:6 }}>
    <button style={{ background:COLORS.success+"22", color:COLORS.success, border:`1px solid ${COLORS.success}44`, borderRadius:6, padding:"4px 10px", fontSize:11, cursor:"pointer", fontWeight:600 }}>✓ Approve</button>
    <button style={{ background:COLORS.danger+"22", color:COLORS.danger, border:`1px solid ${COLORS.danger}44`, borderRadius:6, padding:"4px 10px", fontSize:11, cursor:"pointer", fontWeight:600 }}>✗ Reject</button>
  </div>
);

function CustomersView() {
  const [filter, setFilter] = useState("All");
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <h1 style={{ color:COLORS.text, fontSize:22, fontWeight:800, margin:0 }}>👥 All Customers</h1>
          <p style={{ color:COLORS.muted, margin:"4px 0 0", fontSize:13 }}>Manage and monitor customer profiles</p>
        </div>
        <button style={{ background:COLORS.accent, color:"#fff", border:"none", borderRadius:8, padding:"8px 16px", cursor:"pointer", fontSize:13, fontWeight:600 }}>+ Add Customer</button>
      </div>
      <div style={{ display:"flex", gap:8, alignItems:"center" }}>
        {["All","Verified","Flagged","Blocked"].map(f => (
          <button key={f} onClick={() => setFilter(f)} style={{ background:filter===f?COLORS.accent:COLORS.card, color:filter===f?"#fff":COLORS.muted, border:`1px solid ${filter===f?COLORS.accent:COLORS.cardBorder}`, borderRadius:8, padding:"6px 14px", fontSize:12, cursor:"pointer", fontWeight:filter===f?600:400 }}>{f}</button>
        ))}
        <input placeholder="🔍  Search by name, phone, email..." style={{ marginLeft:"auto", flex:1, maxWidth:280, background:COLORS.card, border:`1px solid ${COLORS.cardBorder}`, borderRadius:8, padding:"6px 14px", color:COLORS.text, fontSize:12, outline:"none" }} />
      </div>
      <Card>
        <DataTable cols={["Customer","Verification","Purchases","Limit","Status","Flags","Actions"]} rows={[
          [<AvatarCell name="Ayoub Benali" color={COLORS.accent}/>,<Badge color={COLORS.success}>✓ Verified</Badge>,"14","$2,000",<Badge color={COLORS.success}>Active</Badge>,"—",<span style={{color:COLORS.accent,cursor:"pointer",fontSize:12}}>Manage →</span>],
          [<AvatarCell name="Sara Idrissi" color={COLORS.warning}/>,<Badge color={COLORS.success}>✓ Verified</Badge>,"6","$1,500",<Badge color={COLORS.warning}>Flagged</Badge>,"⚑ 1",<span style={{color:COLORS.accent,cursor:"pointer",fontSize:12}}>Manage →</span>],
          [<AvatarCell name="Karim M." color={COLORS.success}/>,<Badge color={COLORS.warning}>Pending</Badge>,"2","$500",<Badge color={COLORS.accent}>Active</Badge>,"—",<span style={{color:COLORS.accent,cursor:"pointer",fontSize:12}}>Manage →</span>],
        ]} />
      </Card>
      <Card title="Customer Profile — Control Panel" accent={COLORS.purple}>
        <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:12 }}>
          <div style={{ background:COLORS.bg, borderRadius:8, padding:14 }}>
            <div style={{ color:COLORS.muted, fontSize:11, marginBottom:6 }}>DOCUMENT VERIFICATION</div>
            <div style={{ display:"flex", gap:8 }}>
              <div style={{ flex:1, background:COLORS.cardBorder, borderRadius:6, height:60, display:"flex", alignItems:"center", justifyContent:"center", color:COLORS.muted, fontSize:11 }}>Front ID</div>
              <div style={{ flex:1, background:COLORS.cardBorder, borderRadius:6, height:60, display:"flex", alignItems:"center", justifyContent:"center", color:COLORS.muted, fontSize:11 }}>Back ID</div>
            </div>
          </div>
          <div style={{ background:COLORS.bg, borderRadius:8, padding:14 }}>
            <div style={{ color:COLORS.muted, fontSize:11, marginBottom:6 }}>PROFILE CONTROL</div>
            <div style={{ display:"flex", flexDirection:"column", gap:6 }}>
              <button style={{ background:COLORS.warning+"22", color:COLORS.warning, border:`1px solid ${COLORS.warning}44`, borderRadius:6, padding:"5px 10px", fontSize:11, cursor:"pointer" }}>⚑ Flag Customer</button>
              <button style={{ background:COLORS.danger+"22", color:COLORS.danger, border:`1px solid ${COLORS.danger}44`, borderRadius:6, padding:"5px 10px", fontSize:11, cursor:"pointer" }}>🚫 Set Purchase Limit</button>
            </div>
          </div>
          <div style={{ background:COLORS.bg, borderRadius:8, padding:14 }}>
            <div style={{ color:COLORS.muted, fontSize:11, marginBottom:6 }}>PURCHASE HISTORY</div>
            <div style={{ color:COLORS.text, fontSize:20, fontWeight:800 }}>14</div>
            <div style={{ color:COLORS.muted, fontSize:11 }}>Total purchases</div>
          </div>
        </div>
      </Card>
    </div>
  );
}

function LimitsView() {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <h1 style={{ color:COLORS.text, fontSize:22, fontWeight:800, margin:0 }}>💳 Purchase Limits</h1>
      <Card>
        <DataTable cols={["Customer","Default Limit","Custom Limit","Set By","Last Modified","Actions"]} rows={[
          [<AvatarCell name="Ayoub Benali" color={COLORS.accent}/>,"$2,000","$2,000","—","—",<span style={{color:COLORS.accent,cursor:"pointer",fontSize:12}}>Edit</span>],
          [<AvatarCell name="Sara Idrissi" color={COLORS.warning}/>,"$2,000","$800","Admin","Mar 2, 2026",<span style={{color:COLORS.accent,cursor:"pointer",fontSize:12}}>Edit</span>],
          [<AvatarCell name="Karim M." color={COLORS.success}/>,"$2,000","$500","Manager","Feb 20, 2026",<span style={{color:COLORS.accent,cursor:"pointer",fontSize:12}}>Edit</span>],
        ]} />
      </Card>
    </div>
  );
}

function MerchantsView() {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <h1 style={{ color:COLORS.text, fontSize:22, fontWeight:800, margin:0 }}>🏪 Partners</h1>
        <button style={{ background:COLORS.accent, color:"#fff", border:"none", borderRadius:8, padding:"8px 16px", cursor:"pointer", fontSize:13, fontWeight:600 }}>+ Add Partner</button>
      </div>
      <Card>
        <DataTable cols={["Merchant","Stores","Default Plan","Fees","Status","Actions"]} rows={[
          ["Zara Morocco","4","3×30 days","2.5%",<Badge color={COLORS.success}>Active</Badge>,<span style={{color:COLORS.accent,fontSize:12,cursor:"pointer"}}>Manage →</span>],
          ["Carrefour MA","8","2×45 days","2.0%",<Badge color={COLORS.success}>Active</Badge>,<span style={{color:COLORS.accent,fontSize:12,cursor:"pointer"}}>Manage →</span>],
          ["Marjane","3","4×21 days","3.0%",<Badge color={COLORS.warning}>Review</Badge>,<span style={{color:COLORS.accent,fontSize:12,cursor:"pointer"}}>Manage →</span>],
        ]} />
      </Card>
    </div>
  );
}

function StoresView() {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <h1 style={{ color:COLORS.text, fontSize:22, fontWeight:800, margin:0 }}>📍 Stores</h1>
        <button style={{ background:COLORS.accent, color:"#fff", border:"none", borderRadius:8, padding:"8px 16px", cursor:"pointer", fontSize:13, fontWeight:600 }}>+ Add Store</button>
      </div>
      <Card title="Zara Morocco — Stores" accent={COLORS.accent}>
        <div style={{ display:"flex", gap:12, flexWrap:"wrap" }}>
          {["Twin Center","Morocco Mall","Anfa Place","Megarama"].map((s,i) => (
            <div key={i} style={{ background:COLORS.bg, borderRadius:10, padding:14, flex:"1 1 160px" }}>
              <div style={{ color:COLORS.text, fontWeight:600, fontSize:13, marginBottom:4 }}>📍 Zara {s}</div>
              <div style={{ color:COLORS.muted, fontSize:11, marginBottom:8 }}>Casablanca</div>
              <div style={{ display:"flex", gap:6 }}>
                <button style={{ background:COLORS.accent+"22", color:COLORS.accent, border:`1px solid ${COLORS.accent}44`, borderRadius:5, padding:"3px 8px", fontSize:10, cursor:"pointer" }}>Edit</button>
                <button style={{ background:COLORS.danger+"22", color:COLORS.danger, border:`1px solid ${COLORS.danger}44`, borderRadius:5, padding:"3px 8px", fontSize:10, cursor:"pointer" }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

function RiskView() {
  const [view, setView] = useState("overdue");
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <h1 style={{ color:COLORS.text, fontSize:22, fontWeight:800, margin:0 }}>🛡 Risk Management</h1>
          <p style={{ color:COLORS.muted, margin:"4px 0 0", fontSize:13 }}>{view==="overdue"?"Overdue payment tracking":"Blocked & flagged customers"}</p>
        </div>
        <div style={{ position:"relative" }}>
          <select value={view} onChange={e=>setView(e.target.value)} style={{ background:COLORS.card, color:COLORS.text, border:`1px solid ${COLORS.danger}66`, borderRadius:9, padding:"9px 36px 9px 14px", fontSize:13, fontWeight:600, cursor:"pointer", appearance:"none", outline:"none" }}>
            <option value="overdue">⚠️ Overdue Payments</option>
            <option value="blocked">🚫 Blocked Customers</option>
          </select>
          <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", color:COLORS.danger, fontSize:10, pointerEvents:"none" }}>▼</span>
        </div>
      </div>
      <div style={{ display:"flex", gap:12 }}>
        {view==="overdue" ? <>
          <StatPill label="Total Overdue" value="$34,200" color={COLORS.danger} />
          <StatPill label="Customers Affected" value="18" color={COLORS.warning} />
        </> : <>
          <StatPill label="Blocked" value="12" color={COLORS.danger} />
          <StatPill label="Flagged" value="7" color={COLORS.warning} />
        </>}
      </div>
      <Card accent={view==="overdue"?COLORS.danger:COLORS.warning}>
        {view==="overdue" ? (
          <DataTable cols={["Purchase","Customer","Merchant","Amount","Overdue By","Actions"]} rows={[
            ["#PU-8712",<AvatarCell name="Ayoub Benali" color={COLORS.danger}/>,"Zara","$113",<Badge color={COLORS.danger}>8 days</Badge>,<span style={{color:COLORS.accent,fontSize:12,cursor:"pointer"}}>View →</span>],
            ["#PU-8698",<AvatarCell name="Khalid Samir" color={COLORS.danger}/>,"Marjane","$210",<Badge color={COLORS.danger}>3 days</Badge>,<span style={{color:COLORS.accent,fontSize:12,cursor:"pointer"}}>View →</span>],
          ]} />
        ) : (
          <DataTable cols={["Customer","Blocked On","Reason","History","Actions"]} rows={[
            [<AvatarCell name="Sara Idrissi" color={COLORS.warning}/>,"Mar 2, 2026","Repeated non-payment",<span style={{color:COLORS.accent,textDecoration:"underline",cursor:"pointer",fontSize:12}}>View</span>,<span style={{color:COLORS.success,cursor:"pointer",fontSize:12}}>Unblock</span>],
            [<AvatarCell name="Nabil Chaoui" color={COLORS.danger}/>,"Feb 18, 2026","Fraud suspicion",<span style={{color:COLORS.accent,textDecoration:"underline",cursor:"pointer",fontSize:12}}>View</span>,<span style={{color:COLORS.success,cursor:"pointer",fontSize:12}}>Review</span>],
          ]} />
        )}
      </Card>
    </div>
  );
}

function PromosView() {
  const [view, setView] = useState("customer");
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <div>
          <h1 style={{ color:COLORS.text, fontSize:22, fontWeight:800, margin:0 }}>🎁 Promos</h1>
          <p style={{ color:COLORS.muted, margin:"4px 0 0", fontSize:13 }}>{view==="customer"?"Customer-targeted promotions":"Merchant-wide campaigns"}</p>
        </div>
        <div style={{ display:"flex", gap:10, alignItems:"center" }}>
          <div style={{ position:"relative" }}>
            <select value={view} onChange={e=>setView(e.target.value)} style={{ background:COLORS.card, color:COLORS.text, border:`1px solid ${COLORS.purple}66`, borderRadius:9, padding:"9px 36px 9px 14px", fontSize:13, fontWeight:600, cursor:"pointer", appearance:"none", outline:"none" }}>
              <option value="customer">👤 By Customer</option>
              <option value="merchant">🏪 By Merchant</option>
            </select>
            <span style={{ position:"absolute", right:12, top:"50%", transform:"translateY(-50%)", color:COLORS.purple, fontSize:10, pointerEvents:"none" }}>▼</span>
          </div>
          <button style={{ background:COLORS.accent, color:"#fff", border:"none", borderRadius:9, padding:"9px 16px", fontSize:13, fontWeight:600, cursor:"pointer" }}>+ New Promo</button>
        </div>
      </div>
      <Card accent={COLORS.purple}>
        {view==="customer" ? (
          <DataTable cols={["Promo Code","Customer","Discount","Valid Until","Status","Actions"]} rows={[
            ["VIP10",<AvatarCell name="Ayoub Benali" color={COLORS.purple}/>,"10%","Apr 1, 2026",<Badge color={COLORS.success}>Active</Badge>,<span style={{color:COLORS.accent,fontSize:12,cursor:"pointer"}}>Edit</span>],
            ["LOYAL5",<AvatarCell name="Sara Idrissi" color={COLORS.purple}/>,"5%","Mar 31, 2026",<Badge color={COLORS.warning}>Pending</Badge>,<span style={{color:COLORS.accent,fontSize:12,cursor:"pointer"}}>Edit</span>],
          ]} />
        ) : (
          <DataTable cols={["Promo Code","Merchant","Discount","Valid Until","Status","Actions"]} rows={[
            ["SPRING24","Zara Morocco","15%","Apr 15, 2026",<Badge color={COLORS.success}>Active</Badge>,<span style={{color:COLORS.accent,fontSize:12,cursor:"pointer"}}>Edit</span>],
            ["RAMADAN","Carrefour MA","8%","Apr 10, 2026",<Badge color={COLORS.accent}>Scheduled</Badge>,<span style={{color:COLORS.accent,fontSize:12,cursor:"pointer"}}>Edit</span>],
          ]} />
        )}
      </Card>
    </div>
  );
}

function ApiKeysView() {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
        <h1 style={{ color:COLORS.text, fontSize:22, fontWeight:800, margin:0 }}>🔑 API Keys</h1>
        <button style={{ background:COLORS.accent, color:"#fff", border:"none", borderRadius:8, padding:"8px 16px", cursor:"pointer", fontSize:13, fontWeight:600 }}>+ Generate Key</button>
      </div>
      <Card>
        <DataTable cols={["Name","Key","Created","Last Used","Status","Actions"]} rows={[
          ["Production Key",<span style={{fontFamily:"monospace",color:COLORS.muted}}>sk_live_••••••4f2a</span>,"Jan 1, 2026","Mar 8, 2026",<Badge color={COLORS.success}>Active</Badge>,<span style={{color:COLORS.danger,fontSize:12,cursor:"pointer"}}>Revoke</span>],
          ["Staging Key",<span style={{fontFamily:"monospace",color:COLORS.muted}}>sk_test_••••••9b1c</span>,"Feb 12, 2026","Mar 7, 2026",<Badge color={COLORS.warning}>Test</Badge>,<span style={{color:COLORS.danger,fontSize:12,cursor:"pointer"}}>Revoke</span>],
        ]} />
      </Card>
    </div>
  );
}

function SettingsView() {
  return (
    <div style={{ display:"flex", flexDirection:"column", gap:20 }}>
      <h1 style={{ color:COLORS.text, fontSize:22, fontWeight:800, margin:0 }}>⚙️ Settings</h1>
      <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr", gap:16 }}>
        <Card title="👨‍💼 Team — Backoffice Users" accent={COLORS.accent}>
          <DataTable cols={["Name","Role","Status","Actions"]} rows={[
            ["Admin User",<Badge color={COLORS.danger}>SuperAdmin</Badge>,<Badge color={COLORS.success}>Active</Badge>,<span style={{color:COLORS.accent,fontSize:12,cursor:"pointer"}}>Edit</span>],
            ["Ops Manager",<Badge color={COLORS.accent}>Manager</Badge>,<Badge color={COLORS.success}>Active</Badge>,<span style={{color:COLORS.accent,fontSize:12,cursor:"pointer"}}>Edit</span>],
            ["Agent 01",<Badge color={COLORS.muted}>Agent</Badge>,<Badge color={COLORS.warning}>Inactive</Badge>,<span style={{color:COLORS.accent,fontSize:12,cursor:"pointer"}}>Edit</span>],
          ]} />
        </Card>
        <div style={{ display:"flex", flexDirection:"column", gap:16 }}>
          <Card title="🗺 Cities — Coverage Areas">
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {["Casablanca","Rabat","Marrakech","Fes","Tanger"].map((city,i) => (
                <span key={i} style={{ background:COLORS.bg, color:COLORS.text, border:`1px solid ${COLORS.cardBorder}`, borderRadius:20, padding:"4px 12px", fontSize:12 }}>{city}</span>
              ))}
              <span style={{ background:COLORS.accent, color:"#fff", borderRadius:20, padding:"4px 12px", fontSize:12, cursor:"pointer" }}>+ Add City</span>
            </div>
          </Card>
          <Card title="🏷 Product Categories">
            <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
              {["Fashion","Electronics","Food & Grocery","Home","Beauty"].map((cat,i) => (
                <span key={i} style={{ background:COLORS.bg, color:COLORS.text, border:`1px solid ${COLORS.cardBorder}`, borderRadius:20, padding:"4px 12px", fontSize:12 }}>{cat}</span>
              ))}
              <span style={{ background:COLORS.accent, color:"#fff", borderRadius:20, padding:"4px 12px", fontSize:12, cursor:"pointer" }}>+ Add</span>
            </div>
          </Card>
        </div>
      </div>
      <Card title="🔐 Rules & Permissions — SuperAdmin Only" accent={COLORS.danger}>
        <div style={{ display:"grid", gridTemplateColumns:"repeat(3,1fr)", gap:12 }}>
          {[
            {role:"SuperAdmin",color:COLORS.danger,perms:["All Access","User Management","Rules Editor","API Keys"]},
            {role:"Manager",color:COLORS.accent,perms:["Operations","Customers","Merchants","Risk","Marketing"]},
            {role:"Agent",color:COLORS.muted,perms:["Operations View","Customer View","Risk View"]},
          ].map((r,i) => (
            <div key={i} style={{ background:COLORS.bg, borderRadius:10, padding:14 }}>
              <div style={{ color:r.color, fontWeight:700, marginBottom:8, fontSize:13 }}>{r.role}</div>
              {r.perms.map(p => (
                <div key={p} style={{ display:"flex", alignItems:"center", gap:6, marginBottom:4 }}>
                  <div style={{ width:6, height:6, borderRadius:"50%", background:COLORS.success }} />
                  <span style={{ color:COLORS.muted, fontSize:12 }}>{p}</span>
                </div>
              ))}
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}

// ── VIEWS MAP ──
const VIEWS_MAP = {
  dashboard: DashboardView, purchases: PurchasesView, collections: CollectionsView,
  refunds: RefundsView, "all-customers": CustomersView, limits: LimitsView,
  partners: MerchantsView, stores: StoresView, overdue: RiskView, blocked: RiskView,
  promos: PromosView, "api-keys": ApiKeysView,
  team: SettingsView, cities: SettingsView, categories: SettingsView, rules: SettingsView,
};

// ── MAIN APP ──
export default function App() {
  const [active, setActive] = useState("dashboard");
  const [expanded, setExpanded] = useState({ operations:true, customers:true, merchants:false, risk:true, marketing:false, integrations:false, settings:false });
  const ViewComponent = VIEWS_MAP[active] || DashboardView;

  const activeSection = NAV.find(n => n.id===active || n.sub?.find(s=>s.id===active));
  const activeSubItem = NAV.flatMap(n=>n.sub).find(s=>s?.id===active);

  return (
    <div style={{ display:"flex", height:"100vh", background:COLORS.bg, fontFamily:"'Segoe UI', system-ui, sans-serif", overflow:"hidden" }}>
      {/* ── SIDEBAR ── */}
      <div style={{ width:220, background:COLORS.sidebar, borderRight:`1px solid ${COLORS.cardBorder}`, display:"flex", flexDirection:"column", overflowY:"auto", flexShrink:0 }}>
        {/* Logo */}
        <div style={{ padding:"20px 20px 16px", borderBottom:`1px solid ${COLORS.cardBorder}` }}>
          <div style={{ color:COLORS.accent, fontWeight:900, fontSize:16, letterSpacing:-0.5 }}>◈ BACKOFFICE</div>
          <div style={{ color:COLORS.muted, fontSize:10, marginTop:2, letterSpacing:2 }}>PLATFORM v1.0</div>
        </div>
        {/* Nav */}
        <nav style={{ padding:"12px 8px", flex:1 }}>
          {NAV.map(section => (
            <div key={section.id}>
              {section.sub.length===0 ? (
                <button onClick={()=>setActive(section.id)} style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"8px 12px", background:active===section.id?COLORS.accent:"transparent", color:active===section.id?"#fff":COLORS.muted, border:"none", borderRadius:8, cursor:"pointer", fontSize:13, fontWeight:600, marginBottom:2, textAlign:"left" }}>
                  <span>{section.icon}</span>{section.label}
                </button>
              ) : (
                <>
                  <button onClick={()=>setExpanded(p=>({...p,[section.id]:!p[section.id]}))} style={{ width:"100%", display:"flex", alignItems:"center", justifyContent:"space-between", padding:"8px 12px", background:"transparent", color:COLORS.muted, border:"none", borderRadius:8, cursor:"pointer", fontSize:11, fontWeight:700, letterSpacing:1.2, textTransform:"uppercase", marginBottom:2, textAlign:"left" }}>
                    <span style={{ display:"flex", alignItems:"center", gap:8 }}><span>{section.icon}</span>{section.label}</span>
                    <span style={{ fontSize:9, transition:"transform .2s", display:"inline-block", transform:expanded[section.id]?"rotate(90deg)":"rotate(0deg)" }}>▶</span>
                  </button>
                  {expanded[section.id] && section.sub.map(item => (
                    <button key={item.id} onClick={()=>setActive(item.id)} style={{ width:"100%", display:"flex", alignItems:"center", gap:8, padding:"7px 12px 7px 28px", background:active===item.id?COLORS.accentGlow:"transparent", color:active===item.id?COLORS.accent:COLORS.muted, border:`1px solid ${active===item.id?COLORS.accent+"44":"transparent"}`, borderRadius:7, cursor:"pointer", fontSize:12, fontWeight:active===item.id?600:400, marginBottom:1, textAlign:"left" }}>
                      <span style={{ fontSize:12 }}>{item.icon}</span>{item.label}
                    </button>
                  ))}
                </>
              )}
            </div>
          ))}
        </nav>
        {/* User */}
        <div style={{ padding:12, borderTop:`1px solid ${COLORS.cardBorder}`, display:"flex", alignItems:"center", gap:10 }}>
          <div style={{ width:32, height:32, borderRadius:"50%", background:COLORS.accent, display:"flex", alignItems:"center", justifyContent:"center", color:"#fff", fontWeight:700, fontSize:13 }}>SA</div>
          <div><div style={{ color:COLORS.text, fontSize:12, fontWeight:600 }}>Super Admin</div><div style={{ color:COLORS.muted, fontSize:10 }}>admin@platform.ma</div></div>
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{ flex:1, display:"flex", flexDirection:"column", overflow:"hidden" }}>
        {/* Topbar */}
        <div style={{ padding:"14px 28px", borderBottom:`1px solid ${COLORS.cardBorder}`, display:"flex", alignItems:"center", justifyContent:"space-between", background:COLORS.sidebar }}>
          <div style={{ color:COLORS.muted, fontSize:12 }}>
            {activeSection?.label}
            {activeSubItem && <> / <span style={{ color:COLORS.text }}>{activeSubItem.label}</span></>}
          </div>
          <div style={{ display:"flex", gap:12, alignItems:"center" }}>
            <div style={{ position:"relative" }}>
              <span style={{ color:COLORS.muted, fontSize:18, cursor:"pointer" }}>🔔</span>
              <span style={{ position:"absolute", top:-2, right:-4, width:14, height:14, background:COLORS.danger, borderRadius:"50%", fontSize:9, color:"#fff", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>5</span>
            </div>
            <span style={{ color:COLORS.muted, fontSize:12 }}>Mon, Mar 9, 2026</span>
          </div>
        </div>
        {/* Content */}
        <div style={{ flex:1, overflowY:"auto", padding:28 }}>
          <ViewComponent />
        </div>
      </div>
    </div>
  );
}