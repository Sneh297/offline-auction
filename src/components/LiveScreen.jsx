import React, { useState, useEffect, useRef } from "react";
import { fmt, getCategory, catColor, imgProps, LS, fireConfetti, playSound } from "./auctionUtils";

const teamLogo = (t) => t?.Logo || t?.logo || null;

function TeamAv({ team, size = 36, border = "2px solid rgba(255,255,255,0.15)" }) {
  const src = teamLogo(team);
  return (
    <div style={{ width: size, height: size, minWidth: size, borderRadius: "50%", overflow: "hidden", background: "#1a1d28", border, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center" }}>
      {src
        ? <img src={src} alt={team?.Name} style={{ width: "100%", height: "100%", objectFit: "cover" }} />
        : <span style={{ color: "#fff", fontWeight: 900, fontSize: size * 0.38 }}>{team?.Name?.[0]?.toUpperCase() ?? "?"}</span>
      }
    </div>
  );
}

function PlayerPhoto({ src, alt, glow, soldTo }) {
  const extra = imgProps(src);
  const ringColor =
    glow === "sold"    ? "#10b981" :
    glow === "unsold"  ? "#ef4444" :
    glow === "bidding" ? "#6366f1" : "#2a2f42";
  const glowColor =
    glow === "sold"    ? "0 0 80px rgba(16,185,129,0.6), 0 0 200px rgba(16,185,129,0.2)" :
    glow === "unsold"  ? "0 0 60px rgba(239,68,68,0.5)" :
    glow === "bidding" ? "0 0 60px rgba(99,102,241,0.5), 0 0 150px rgba(99,102,241,0.15)" :
    "none";

  return (
    <div style={{ position: "relative", flexShrink: 0 }}>
      {/* Outer decorative ring */}
      <div style={{
        width: 300, height: 300, borderRadius: "50%",
        border: `5px solid ${ringColor}`,
        boxShadow: glowColor,
        transition: "border-color 0.5s, box-shadow 0.5s",
        overflow: "hidden",
        background: "#0d0f14",
      }}>
        {src
          ? <img src={src} alt={alt} style={{ width: "100%", height: "100%", objectFit: "cover" }} {...extra} />
          : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center" }}>
              <span style={{ fontSize: 100, fontWeight: 900, color: "#2a2f42" }}>{alt?.[0]?.toUpperCase() ?? "?"}</span>
            </div>
        }
      </div>

      {/* Pulse ring when bidding */}
      {glow === "bidding" && (
        <div style={{
          position: "absolute", inset: 0, borderRadius: "50%",
          border: "4px solid rgba(99,102,241,0.5)",
          animation: "liveRing 2s ease-out infinite",
          pointerEvents: "none",
        }} />
      )}

      {/* SOLD team badge overlay */}
      {glow === "sold" && soldTo && (
        <div style={{
          position: "absolute", bottom: -10, left: "50%", transform: "translateX(-50%)",
          display: "flex", alignItems: "center", gap: 8,
          background: "rgba(16,185,129,0.2)", border: "1.5px solid rgba(16,185,129,0.5)",
          borderRadius: 50, padding: "6px 16px 6px 8px",
          animation: "fadeSlideUp 0.4s ease",
        }}>
          <TeamAv team={soldTo} size={30} border="2px solid #10b981" />
          <span style={{ color: "#10b981", fontWeight: 900, fontSize: 13, whiteSpace: "nowrap" }}>{soldTo.Name}</span>
        </div>
      )}
    </div>
  );
}

/* ── Diagonal background slash decorations (matches reference) ── */
function BgSlashes() {
  return (
    <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.07 }} preserveAspectRatio="none">
      {[...Array(8)].map((_, i) => (
        <line key={i}
          x1={`${-20 + i * 18}%`} y1="0%" x2={`${10 + i * 18}%`} y2="100%"
          stroke="white" strokeWidth="40"
        />
      ))}
    </svg>
  );
}

/* ── Digital-style countdown timer ── */
function Timer({ value, enabled }) {
  if (!enabled) return null;
  const danger = value <= 5;
  const warn   = value <= 10;
  return (
    <div style={{
      display: "flex", flexDirection: "column", alignItems: "center", gap: 2,
      animation: danger ? "pulse2 0.8s ease infinite" : "none",
    }}>
      <span style={{
        fontFamily: "'Courier New', monospace",
        fontSize: "clamp(3rem, 7vw, 5.5rem)",
        fontWeight: 900,
        lineHeight: 1,
        color: danger ? "#ef4444" : warn ? "#f59e0b" : "#e2e8f0",
        textShadow: danger ? "0 0 30px rgba(239,68,68,0.8)" : warn ? "0 0 20px rgba(245,158,11,0.6)" : "0 0 15px rgba(255,255,255,0.2)",
        letterSpacing: "-0.02em",
      }}>{String(value).padStart(2, "0")}</span>
      <span style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", letterSpacing: "0.2em" }}>SEC</span>
    </div>
  );
}

/* ── Giant bid display (top right, yellow like reference) ── */
function BidAmount({ bid, state }) {
  const color =
    state === "sold"   ? "#10b981" :
    state === "unsold" ? "#ef4444" : "#facc15";
  const shadow =
    state === "sold"   ? "0 0 60px rgba(16,185,129,0.8)" :
    state === "unsold" ? "0 0 40px rgba(239,68,68,0.6)"  :
    "0 0 50px rgba(250,204,21,0.7), 0 0 100px rgba(250,204,21,0.2)";

  return (
    <div key={`${bid}-${state}`} style={{ textAlign: "right" }}>
      <div style={{ fontSize: 11, color: "rgba(255,255,255,0.4)", fontFamily: "monospace", letterSpacing: "0.2em", marginBottom: 4 }}>
        {state === "sold" ? "SOLD FOR" : state === "unsold" ? "UNSOLD" : "CURRENT BID"}
      </div>
      <div style={{
        fontSize: "clamp(3.5rem, 9vw, 7rem)",
        fontWeight: 900,
        lineHeight: 1,
        color,
        textShadow: shadow,
        fontFamily: "'Courier New', monospace",
        letterSpacing: "-0.02em",
        animation: "bidPop 0.4s cubic-bezier(0.34,1.56,0.64,1)",
      }}>
        {fmt(bid)}
      </div>
    </div>
  );
}

/* ── Player name + attributes in wide dark banner pills (like reference) ── */
function PlayerBanners({ player, cat, cc }) {
  if (!player) return null;
  const name = player.name ?? player.Name ?? "";
  // Extra fields except photo/no/name/category
  const extras = Object.entries(player)
    .filter(([k, v]) => v && !["photourl","photoURL","No","Name","name","category","Category"].includes(k))
    .slice(0, 3); // max 3 extra rows

  return (
    <div style={{ display: "flex", flexDirection: "column", gap: 10, flex: 1 }}>
      {/* Player # + category */}
      <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{
          width: 44, height: 44, borderRadius: "50%",
          background: "rgba(99,102,241,0.25)", border: "2px solid rgba(99,102,241,0.6)",
          display: "flex", alignItems: "center", justifyContent: "center",
          fontSize: 16, fontWeight: 900, color: "#a5b4fc",
        }}>#{player.No}</div>
        {cat && (
          <span style={{
            padding: "4px 14px", borderRadius: 20, fontSize: 12, fontWeight: 900,
            border: "1.5px solid",
          }} className={cc}>{cat}</span>
        )}
      </div>

      {/* Name banner — wide dark pill */}
      <div style={{
        background: "rgba(0,0,0,0.55)",
        border: "1px solid rgba(255,255,255,0.08)",
        borderLeft: "4px solid #6366f1",
        borderRadius: "0 12px 12px 0",
        padding: "14px 28px",
        backdropFilter: "blur(8px)",
      }}>
        <span style={{
          fontSize: "clamp(1.6rem, 4vw, 2.8rem)",
          fontWeight: 900,
          color: "#fff",
          letterSpacing: "0.04em",
          textTransform: "uppercase",
          textShadow: "0 2px 20px rgba(99,102,241,0.4)",
        }}>{name}</span>
      </div>

      {/* Extra field banners */}
      {extras.map(([k, v], i) => (
        <div key={k} style={{
          background: "rgba(0,0,0,0.45)",
          border: "1px solid rgba(255,255,255,0.06)",
          borderLeft: `4px solid ${i === 0 ? "#f59e0b" : i === 1 ? "#10b981" : "#8b5cf6"}`,
          borderRadius: "0 10px 10px 0",
          padding: "10px 24px",
          backdropFilter: "blur(6px)",
          display: "flex", alignItems: "center", gap: 10,
        }}>
          <span style={{ fontSize: 10, color: "rgba(255,255,255,0.35)", fontFamily: "monospace", letterSpacing: "0.15em", textTransform: "uppercase", minWidth: 60 }}>{k}</span>
          <span style={{ fontSize: "clamp(1rem, 2.5vw, 1.4rem)", fontWeight: 800, color: "#e2e8f0", textTransform: "uppercase", letterSpacing: "0.05em" }}>{v}</span>
        </div>
      ))}
    </div>
  );
}

/* ── Bottom team bar ── */
function TeamBar({ teams, leadingTeam, auctionState }) {
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 6,
      background: "rgba(0,0,0,0.7)", borderTop: "1px solid rgba(255,255,255,0.08)",
      backdropFilter: "blur(12px)", padding: "8px 20px", flexWrap: "wrap",
    }}>
      {teams.map(team => {
        const isLeading = leadingTeam?.No === team.No && auctionState === "bidding";
        const isSold    = leadingTeam?.No === team.No && auctionState === "sold";
        return (
          <div key={team.No} style={{
            display: "flex", flexDirection: "column", alignItems: "center", gap: 3,
            padding: "4px 10px", borderRadius: 8, minWidth: 52,
            background: isLeading ? "rgba(99,102,241,0.25)" : isSold ? "rgba(16,185,129,0.2)" : "rgba(255,255,255,0.03)",
            border: isLeading ? "1.5px solid rgba(99,102,241,0.6)" : isSold ? "1.5px solid rgba(16,185,129,0.5)" : "1px solid rgba(255,255,255,0.07)",
            transition: "all 0.3s ease",
            boxShadow: isLeading ? "0 0 16px rgba(99,102,241,0.4)" : "none",
          }}>
            <TeamAv team={team} size={28} border={isLeading ? "2px solid #6366f1" : isSold ? "2px solid #10b981" : "1px solid rgba(255,255,255,0.15)"} />
            <span style={{
              fontSize: 9, fontWeight: 900, color: isLeading ? "#a5b4fc" : isSold ? "#6ee7b7" : "rgba(255,255,255,0.5)",
              fontFamily: "monospace", letterSpacing: "0.05em", textTransform: "uppercase",
            }}>
              {(team.Name ?? "").slice(0, 4)}
            </span>
            <span style={{ fontSize: 8, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>
              {fmt(team.balance).replace("₹","").replace(",000","K")}
            </span>
          </div>
        );
      })}
    </div>
  );
}

/* ── Bid feed — compact horizontal chips ── */
function BidChips({ bidFeed }) {
  if (!bidFeed?.length) return null;
  return (
    <div style={{ display: "flex", alignItems: "center", gap: 6, flexWrap: "wrap" }}>
      {bidFeed.slice(0, 6).map((b, i) => (
        <div key={i} style={{
          display: "flex", alignItems: "center", gap: 6,
          padding: "4px 10px 4px 6px", borderRadius: 20,
          background: i === 0 ? "rgba(99,102,241,0.2)" : "rgba(255,255,255,0.04)",
          border: i === 0 ? "1px solid rgba(99,102,241,0.4)" : "1px solid rgba(255,255,255,0.06)",
          animation: i === 0 ? "fadeSlideUp 0.3s ease" : "none",
        }}>
          <TeamAv team={b.team} size={20} border="none" />
          <span style={{ fontSize: 11, fontWeight: 700, color: i === 0 ? "#a5b4fc" : "rgba(255,255,255,0.4)", fontFamily: "monospace" }}>
            {fmt(b.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ─── MAIN ─────────────────────────────────────────────────────────────────── */
export default function LiveScreen() {
  const [live, setLive] = useState({ auctionState: "idle", player: null, bid: 0, leadingTeam: null, bidFeed: [], timer: 15, timerEnabled: true });
  const [teams, setTeams]             = useState([]);
  const [soldPlayers, setSoldPlayers] = useState([]);
  const [view, setView]               = useState("live");

  const prevState = useRef("idle");
  const prevBid   = useRef(0);
  const prevTs    = useRef(0);

  const poll = () => {
    try {
      const rawTeams = localStorage.getItem(LS.TEAM_STATE);
      const rawSold  = localStorage.getItem(LS.SOLD);
      if (rawTeams) setTeams(JSON.parse(rawTeams));
      if (rawSold)  setSoldPlayers(JSON.parse(rawSold));

      const raw = localStorage.getItem(LS.LIVE_STATE);
      if (!raw) return;
      const next = JSON.parse(raw);
      if (next.ts === prevTs.current) return;
      prevTs.current = next.ts;

      const { auctionState: ns, bid: nb } = next;
      if (ns === "bidding" && nb !== prevBid.current && nb > 0) playSound("bid");
      if (prevState.current !== "sold"   && ns === "sold")   { playSound("sold");   fireConfetti(); }
      if (prevState.current !== "unsold" && ns === "unsold") { playSound("unsold"); }
      prevState.current = ns;
      prevBid.current   = nb;
      setLive(next);
    } catch (_) {}
  };

  useEffect(() => {
    poll();
    const id = setInterval(poll, 400);
    const onStorage = (e) => { if ([LS.LIVE_STATE, LS.TEAM_STATE, LS.SOLD].includes(e.key)) poll(); };
    window.addEventListener("storage", onStorage);
    return () => { clearInterval(id); window.removeEventListener("storage", onStorage); };
  }, []);

  const { auctionState, player, bid, leadingTeam, bidFeed, timer, timerEnabled } = live;
  const cat = player ? getCategory(player) : null;
  const cc  = cat ? catColor(cat) : "";

  return (
    <>
      <style>{`
        @keyframes liveRing    { 0%{transform:scale(1);opacity:.6} 100%{transform:scale(1.6);opacity:0} }
        @keyframes bidPop      { 0%{transform:scale(.8);opacity:.4} 65%{transform:scale(1.05);opacity:1} 100%{transform:scale(1);opacity:1} }
        @keyframes fadeSlideUp { from{opacity:0;transform:translateY(8px)} to{opacity:1;transform:translateY(0)} }
        @keyframes soldBounce  { 0%,100%{transform:scale(1)} 30%{transform:scale(1.08)} 60%{transform:scale(.97)} 80%{transform:scale(1.03)} }
        @keyframes unsoldGrey  { to{filter:grayscale(1);opacity:.5} }
        @keyframes pulse2      { 0%,100%{opacity:1} 50%{opacity:.3} }
        @keyframes shimmer     { 0%{opacity:.4} 50%{opacity:.8} 100%{opacity:.4} }
      `}</style>

      <div style={{
        height: "100vh", display: "flex", flexDirection: "column", overflow: "hidden",
        background: "linear-gradient(135deg, #0d0f14 0%, #0f1117 50%, #0d0f14 100%)",
        color: "#fff", fontFamily: "system-ui, sans-serif", position: "relative",
      }}>

        {/* ── Diagonal slash bg decorations ── */}
        <svg style={{ position: "absolute", inset: 0, width: "100%", height: "100%", pointerEvents: "none", opacity: 0.04 }} preserveAspectRatio="none">
          {[...Array(10)].map((_, i) => (
            <line key={i} x1={`${-10 + i * 14}%`} y1="0%" x2={`${15 + i * 14}%`} y2="100%" stroke="white" strokeWidth="60" />
          ))}
        </svg>

        {/* ══ HEADER BAR ════════════════════════════════════════════════════ */}
        <div style={{
          display: "flex", alignItems: "center", justifyContent: "space-between",
          padding: "10px 24px", borderBottom: "1px solid rgba(255,255,255,0.07)",
          background: "rgba(7,9,16,0.85)", backdropFilter: "blur(12px)",
          position: "relative", zIndex: 10, flexShrink: 0,
        }}>
          {/* Left: league branding */}
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <div style={{ width: 38, height: 38, borderRadius: 8, background: "rgba(99,102,241,0.2)", border: "1.5px solid rgba(99,102,241,0.4)", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🏏</div>
            <div>
              <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.2em", color: "#a5b4fc", textTransform: "uppercase" }}>Players Auction</div>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", letterSpacing: "0.1em" }}>LIVE BROADCAST</div>
            </div>
          </div>

          {/* Center: status pill */}
          <div style={{
            display: "flex", alignItems: "center", gap: 8, padding: "6px 18px", borderRadius: 50,
            background: auctionState === "bidding" ? "rgba(239,68,68,0.15)" : "rgba(255,255,255,0.04)",
            border: auctionState === "bidding" ? "1.5px solid rgba(239,68,68,0.4)" : "1px solid rgba(255,255,255,0.08)",
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: "50%",
              background: auctionState === "bidding" ? "#ef4444" : "#374151",
              animation: auctionState === "bidding" ? "pulse2 1s ease infinite" : "none",
            }} />
            <span style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.2em", color: auctionState === "bidding" ? "#fca5a5" : "rgba(255,255,255,0.3)" }}>
              {auctionState === "bidding" ? "LIVE" : auctionState === "idle" ? "WAITING" : auctionState.toUpperCase()}
            </span>
          </div>

          {/* Right: stats + view toggle */}
          <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
            <div style={{ textAlign: "right" }}>
              <div style={{ fontSize: 9, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", letterSpacing: "0.1em" }}>SOLD / TEAMS</div>
              <div style={{ fontSize: 13, fontWeight: 900, color: "#e2e8f0" }}>
                <span style={{ color: "#10b981" }}>{soldPlayers.length}</span>
                <span style={{ color: "rgba(255,255,255,0.2)", margin: "0 4px" }}>/</span>
                {teams.length}
              </div>
            </div>
            <div style={{ display: "flex", gap: 4, background: "rgba(255,255,255,0.05)", padding: 4, borderRadius: 8 }}>
              {["live","squads"].map(v => (
                <button key={v} onClick={() => setView(v)} style={{
                  padding: "4px 12px", borderRadius: 6, border: "none", cursor: "pointer",
                  background: view === v ? "#6366f1" : "transparent",
                  color: view === v ? "#fff" : "rgba(255,255,255,0.4)",
                  fontSize: 11, fontWeight: 700, textTransform: "capitalize", letterSpacing: "0.05em",
                }}>{v}</button>
              ))}
            </div>
          </div>
        </div>

        {/* ══ LIVE VIEW ═════════════════════════════════════════════════════ */}
        {view === "live" && (
          <div style={{ flex: 1, minHeight: 0, display: "flex", flexDirection: "column", overflow: "hidden", position: "relative", zIndex: 1 }}>

            {/* Main content area */}
            <div style={{ flex: 1, minHeight: 0, display: "flex", alignItems: "stretch", gap: 0, padding: player ? "24px 32px" : "16px 24px", overflow: "hidden" }}>

              {/* ── LEFT: Player photo with # badge — hidden when no player ── */}
              <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "center", gap: 16, marginRight: player ? 36 : 0, width: player ? undefined : 0, overflow: "hidden", transition: "width 0.3s" }}>
                {/* Player number — top of photo like reference */}
                {player && (
                  <div style={{
                    width: 52, height: 52, borderRadius: "50%",
                    background: "rgba(99,102,241,0.25)", border: "2.5px solid rgba(99,102,241,0.7)",
                    display: "flex", alignItems: "center", justifyContent: "center",
                    fontSize: 20, fontWeight: 900, color: "#c7d2fe",
                    boxShadow: "0 0 20px rgba(99,102,241,0.4)",
                  }}>{player.No}</div>
                )}

                <div style={{ animation: auctionState === "sold" ? "soldBounce .7s ease .1s" : auctionState === "unsold" ? "unsoldGrey .8s ease forwards .3s" : "none" }}>
                  <PlayerPhoto
                    src={player?.photourl || player?.photoURL}
                    alt={player?.name ?? player?.Name ?? "?"}
                    glow={auctionState}
                    soldTo={auctionState === "sold" ? leadingTeam : null}
                  />
                </div>

                {/* Category badge under photo */}
                {cat && player && (
                  <span style={{
                    padding: "5px 18px", borderRadius: 20, fontSize: 11, fontWeight: 900,
                    letterSpacing: "0.12em", textTransform: "uppercase",
                  }} className={cc}>{cat}</span>
                )}
              </div>

              {/* ── CENTER: Name banners + bid feed ── */}
              <div style={{ flex: 1, minHeight: 0, minWidth: 0, display: "flex", flexDirection: "column", gap: 16, overflow: "hidden" }}>

                {!player ? (
                  <div style={{ width: "100%", flex: 1, minHeight: 0, display: "flex", flexDirection: "column", gap: 12, overflow: "hidden" }}>
                    {/* Waiting header */}
                    <div style={{ display: "flex", alignItems: "center", gap: 10, paddingBottom: 10, borderBottom: "1px solid rgba(255,255,255,0.06)", flexShrink: 0 }}>
                      <div style={{ fontSize: 18 }}>🏏</div>
                      <div>
                        <div style={{ fontSize: 11, fontWeight: 900, letterSpacing: "0.18em", textTransform: "uppercase", color: "rgba(255,255,255,0.2)" }}>Waiting for next player</div>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.1)", fontFamily: "monospace", letterSpacing: "0.1em" }}>TEAM BALANCES</div>
                      </div>
                    </div>
                    {/* Team balance grid — fills all available space, no scroll */}
                    <div style={{
                      flex: 1,
                      minHeight: 0,
                      display: "grid",
                      gridTemplateColumns: `repeat(${Math.max(1, Math.ceil(Math.sqrt(teams.length || 1)) + 1)}, 1fr)`,
                      gridTemplateRows: `repeat(${Math.ceil((teams.length || 1) / Math.max(1, Math.ceil(Math.sqrt(teams.length || 1)) + 1))}, 1fr)`,
                      gap: 10,
                      overflow: "hidden",
                    }}>
                      {teams.map(team => {
                        const maxBal = Math.max(...teams.map(t => parseInt(t.balance) || 0), 1);
                        const bal = parseInt(team.balance) || 0;
                        const pct = Math.round((bal / maxBal) * 100);
                        const spent = team.squadPlayers?.reduce((s, p) => s + (parseInt(p.soldFor) || 0), 0) || 0;
                        return (
                          <div key={team.No} style={{
                            background: "rgba(255,255,255,0.04)",
                            border: "1px solid rgba(255,255,255,0.09)",
                            borderRadius: 14,
                            padding: "14px 18px",
                            display: "flex",
                            flexDirection: "column",
                            gap: 10,
                            overflow: "hidden",
                            minHeight: 0,
                          }}>
                            {/* Row 1: logo + name */}
                            <div style={{ display: "flex", alignItems: "center", gap: 12, minWidth: 0 }}>
                              <TeamAv team={team} size={41} />
                              <div style={{ fontSize: 16, fontWeight: 900, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{team.Name}</div>
                            </div>
                            {/* Row 2: players + balance — never overlapping */}
                            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 10 }}>
                              <div style={{ fontSize: 12, color: "rgba(255,255,255,0.3)", fontFamily: "monospace", flexShrink: 0 }}>{team.squadPlayers?.length || 0} players</div>
                              <div style={{ fontSize: 23, fontWeight: 900, color: "#facc15", fontFamily: "'Courier New', monospace", lineHeight: 1, textShadow: "0 0 18px rgba(250,204,21,0.5)", textAlign: "right", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{fmt(bal)}</div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                ) : (
                  <>
                    <PlayerBanners player={player} cat={cat} cc={cc} />

                    {/* Bid feed chips */}
                    {bidFeed?.length > 0 && (
                      <div style={{ marginTop: 8 }}>
                        <div style={{ fontSize: 9, color: "rgba(255,255,255,0.25)", fontFamily: "monospace", letterSpacing: "0.15em", marginBottom: 6 }}>
                          {auctionState === "bidding" ? "🔴 LIVE BIDS" : "RECENT BIDS"}
                        </div>
                        <BidChips bidFeed={bidFeed} />
                      </div>
                    )}

                    {/* No bids yet message */}
                    {auctionState === "bidding" && bid === 0 && (
                      <p style={{ fontSize: 13, color: "rgba(255,255,255,0.2)", fontStyle: "italic" }}>No bids yet…</p>
                    )}

                    {/* UNSOLD banner */}
                    {auctionState === "unsold" && (
                      <div style={{
                        display: "inline-flex", alignItems: "center", gap: 10,
                        padding: "12px 28px", borderRadius: 8,
                        background: "rgba(239,68,68,0.12)", border: "1.5px solid rgba(239,68,68,0.35)",
                        animation: "fadeSlideUp .4s ease",
                      }}>
                        <span style={{ fontSize: 22 }}>😔</span>
                        <span style={{ fontSize: 24, fontWeight: 900, color: "#f87171", letterSpacing: "0.1em" }}>UNSOLD</span>
                      </div>
                    )}
                  </>
                )}
              </div>

              {/* ── RIGHT: Timer (top) + Bid amount (big, yellow) + Leading team — hidden when no player ── */}
              {player && <div style={{ flexShrink: 0, display: "flex", flexDirection: "column", alignItems: "flex-end", justifyContent: "center", gap: 20, marginLeft: 36, minWidth: 220 }}>

                {/* Timer */}
                {auctionState === "bidding" && (
                  <Timer value={timer ?? 15} enabled={timerEnabled ?? true} />
                )}

                {/* Big bid amount */}
                {(auctionState === "bidding" || auctionState === "sold") && bid > 0 && (
                  <BidAmount bid={bid} state={auctionState} />
                )}

                {/* Leading team card */}
                {leadingTeam && auctionState === "bidding" && (
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                    padding: "12px 18px", borderRadius: 14,
                    background: "rgba(99,102,241,0.12)", border: "1.5px solid rgba(99,102,241,0.35)",
                    animation: "fadeSlideUp .3s ease",
                  }}>
                    <TeamAv team={leadingTeam} size={56} border="2.5px solid #6366f1" />
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: "rgba(165,180,252,0.7)", fontFamily: "monospace", letterSpacing: "0.15em" }}>LEADING</div>
                      <div style={{ fontSize: 13, fontWeight: 900, color: "#c7d2fe" }}>{leadingTeam.Name}</div>
                      <div style={{ fontSize: 10, color: "rgba(255,255,255,0.3)", fontFamily: "monospace" }}>{fmt(leadingTeam.balance - bid)} left</div>
                    </div>
                  </div>
                )}

                {/* Sold to card */}
                {leadingTeam && auctionState === "sold" && (
                  <div style={{
                    display: "flex", flexDirection: "column", alignItems: "center", gap: 8,
                    padding: "12px 20px", borderRadius: 14,
                    background: "rgba(16,185,129,0.15)", border: "1.5px solid rgba(16,185,129,0.45)",
                    animation: "fadeSlideUp .4s ease",
                  }}>
                    <TeamAv team={leadingTeam} size={60} border="2.5px solid #10b981" />
                    <div style={{ textAlign: "center" }}>
                      <div style={{ fontSize: 9, color: "rgba(110,231,183,0.8)", fontFamily: "monospace", letterSpacing: "0.15em" }}>SOLD TO</div>
                      <div style={{ fontSize: 14, fontWeight: 900, color: "#6ee7b7" }}>{leadingTeam.Name}</div>
                    </div>
                    <div style={{ fontSize: 22 }}>🔨</div>
                  </div>
                )}
              </div>}
            </div>

            {/* ══ BOTTOM TEAM BAR — removed ══════════════════════════════ */}
          </div>
        )}

        {/* ══ SQUADS VIEW ═══════════════════════════════════════════════════ */}
        {view === "squads" && (
          <div style={{ flex: 1, overflowY: "auto", padding: 24, position: "relative", zIndex: 1 }}>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(200px, 1fr))", gap: 16 }}>
              {teams.map(team => {
                const spent = team.squadPlayers.reduce((s, p) => s + (parseInt(p.soldFor) || 0), 0);
                return (
                  <div key={team.No} style={{
                    background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)",
                    borderRadius: 16, padding: 16, display: "flex", flexDirection: "column", gap: 12,
                  }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                      <TeamAv team={team} size={38} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: 13, fontWeight: 900, color: "#e2e8f0", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{team.Name}</div>
                        <div style={{ fontSize: 10, color: "#10b981", fontFamily: "monospace" }}>{fmt(team.balance)}</div>
                      </div>
                    </div>
                    <div style={{ display: "flex", flexDirection: "column", gap: 4, maxHeight: 160, overflowY: "auto" }}>
                      {!team.squadPlayers.length && <div style={{ fontSize: 11, color: "rgba(255,255,255,0.2)", fontStyle: "italic" }}>No players yet</div>}
                      {team.squadPlayers.map((p, i) => (
                        <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 11 }}>
                          <span style={{ color: "rgba(255,255,255,0.5)", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{p.name ?? p.Name}</span>
                          <span style={{ color: "#818cf8", fontFamily: "monospace", flexShrink: 0, marginLeft: 8 }}>{fmt(p.soldFor)}</span>
                        </div>
                      ))}
                    </div>
                    {team.squadPlayers.length > 0 && (
                      <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, paddingTop: 8, borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <span style={{ color: "rgba(255,255,255,0.3)" }}>{team.squadPlayers.length} players</span>
                        <span style={{ color: "#f87171", fontFamily: "monospace" }}>-{fmt(spent)}</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        )}
      </div>
    </>
  );
}