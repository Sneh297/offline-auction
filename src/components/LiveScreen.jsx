import React, { useState, useEffect, useRef } from "react";
import { fmt, getCategory, catColor, imgProps, LS, fireConfetti, playSound } from "./auctionUtils";

/* ─────────────────────────────────────────────────────────────────────────────
   LIVE SCREEN  —  open at /live on a projector / second monitor
   Polls localStorage every 500ms so it stays in sync with /auction
───────────────────────────────────────────────────────────────────────────── */

/* ── helpers ── */
const teamLogo = (team) =>
  team?.Logo || team?.logo || null;

function TeamAvatar({ team, size = 40 }) {
  const src = teamLogo(team);
  return (
    <div
      style={{ width: size, height: size, minWidth: size }}
      className="rounded-full overflow-hidden bg-[#1e2234] border border-white/10 flex items-center justify-center"
    >
      {src ? (
        <img src={src} alt={team.Name} className="w-full h-full object-cover" />
      ) : (
        <span className="text-white font-black" style={{ fontSize: size * 0.4 }}>
          {team?.Name?.[0]?.toUpperCase() ?? "?"}
        </span>
      )}
    </div>
  );
}

function PlayerPhoto({ src, alt, glow }) {
  const extra = imgProps(src);
  return (
    <div
      className="relative rounded-full overflow-hidden border-4 flex-shrink-0"
      style={{
        width: 220, height: 220,
        borderColor: glow === "sold" ? "#10b981" : glow === "unsold" ? "#ef4444" : glow === "bidding" ? "#6366f1" : "#2a2f42",
        boxShadow:
          glow === "sold"    ? "0 0 80px rgba(16,185,129,0.55), 0 0 160px rgba(16,185,129,0.2)" :
          glow === "unsold"  ? "0 0 60px rgba(239,68,68,0.4)" :
          glow === "bidding" ? "0 0 60px rgba(99,102,241,0.45), 0 0 120px rgba(99,102,241,0.15)" :
          "0 0 30px rgba(0,0,0,0.5)",
        transition: "box-shadow 0.5s ease, border-color 0.5s ease",
      }}
    >
      {src ? (
        <img src={src} alt={alt} className="w-full h-full object-cover" {...extra} />
      ) : (
        <div className="w-full h-full bg-[#1e2234] flex items-center justify-center">
          <span className="text-slate-400 font-black text-7xl">{alt?.[0]?.toUpperCase() ?? "?"}</span>
        </div>
      )}

      {/* pulse ring during bidding */}
      {glow === "bidding" && (
        <div
          className="absolute inset-0 rounded-full"
          style={{
            animation: "liveRing 2s ease-out infinite",
            border: "3px solid rgba(99,102,241,0.6)",
          }}
        />
      )}
    </div>
  );
}

/* ── Bid Flash — the big center number that animates on each new bid ── */
function BidDisplay({ bid, state, leadingTeam, flash }) {
  return (
    <div className="flex flex-col items-center gap-2">
      <p className="text-xs font-mono uppercase tracking-[0.25em] text-slate-500">
        {state === "sold" ? "Sold For" : state === "unsold" ? "Base Price" : "Current Bid"}
      </p>

      <div
        key={bid} /* re-mounts on bid change → triggers animation */
        className="font-black tabular-nums"
        style={{
          fontSize: "clamp(3rem, 8vw, 6rem)",
          lineHeight: 1,
          color:
            state === "sold"    ? "#10b981" :
            state === "unsold"  ? "#ef4444" :
            "#818cf8",
          textShadow:
            state === "sold"    ? "0 0 60px rgba(16,185,129,0.7)" :
            state === "unsold"  ? "0 0 40px rgba(239,68,68,0.5)" :
            "0 0 40px rgba(99,102,241,0.6)",
          animation: flash ? "bidPop 0.35s cubic-bezier(0.34,1.56,0.64,1)" : "none",
        }}
      >
        {fmt(bid)}
      </div>

      {/* Leading team chip */}
      {leadingTeam && state === "bidding" && (
        <div
          className="flex items-center gap-2 px-4 py-2 rounded-full border mt-1"
          style={{
            background: "rgba(99,102,241,0.12)",
            borderColor: "rgba(99,102,241,0.35)",
            animation: "fadeSlideUp 0.3s ease",
          }}
        >
          <TeamAvatar team={leadingTeam} size={28} />
          <span className="text-sm font-black text-white">{leadingTeam.Name}</span>
          <span className="text-xs text-indigo-400 font-mono">leading</span>
        </div>
      )}

      {/* Sold chip */}
      {state === "sold" && leadingTeam && (
        <div
          className="flex items-center gap-3 px-5 py-2.5 rounded-full mt-2"
          style={{
            background: "rgba(16,185,129,0.15)",
            border: "1.5px solid rgba(16,185,129,0.4)",
            animation: "fadeSlideUp 0.4s ease",
          }}
        >
          <TeamAvatar team={leadingTeam} size={34} />
          <div>
            <p className="text-xs text-emerald-500 font-mono uppercase tracking-wider">Sold to</p>
            <p className="text-xl font-black text-white">{leadingTeam.Name}</p>
          </div>
          <span className="text-2xl ml-1">🔨</span>
        </div>
      )}

      {/* Unsold chip */}
      {state === "unsold" && (
        <div
          className="px-6 py-2.5 rounded-full text-xl font-black text-red-400 mt-2"
          style={{
            background: "rgba(239,68,68,0.12)",
            border: "1.5px solid rgba(239,68,68,0.35)",
            animation: "fadeSlideUp 0.4s ease",
          }}
        >
          😔 UNSOLD
        </div>
      )}
    </div>
  );
}

/* ── Recent Bids feed ── */
function BidFeed({ bids }) {
  return (
    <div className="flex flex-col gap-1.5 w-full">
      {bids.length === 0 && (
        <p className="text-slate-700 text-xs italic text-center py-3">No bids yet</p>
      )}
      {bids.map((b, i) => (
        <div
          key={i}
          className="flex items-center justify-between px-3 py-2 rounded-xl"
          style={{
            background: i === 0 ? "rgba(99,102,241,0.15)" : "rgba(255,255,255,0.03)",
            border: i === 0 ? "1px solid rgba(99,102,241,0.3)" : "1px solid rgba(255,255,255,0.05)",
            animation: i === 0 ? "fadeSlideUp 0.3s ease" : "none",
          }}
        >
          <div className="flex items-center gap-2 min-w-0">
            <TeamAvatar team={b.team} size={24} />
            <span className={`text-sm font-semibold truncate ${i === 0 ? "text-white" : "text-slate-400"}`}>
              {b.team?.Name ?? "—"}
            </span>
          </div>
          <span className={`font-mono text-sm font-bold shrink-0 ml-3 ${i === 0 ? "text-indigo-300" : "text-slate-600"}`}>
            {fmt(b.amount)}
          </span>
        </div>
      ))}
    </div>
  );
}

/* ── Team standings column ── */
function TeamStandings({ teams, soldPlayers }) {
  const sorted = [...teams].sort((a, b) => b.squadPlayers.length - a.squadPlayers.length);
  return (
    <div className="flex flex-col gap-2">
      {sorted.map((team, i) => {
        const spent = team.squadPlayers.reduce((s, p) => s + (parseInt(p.soldFor) || 0), 0);
        return (
          <div
            key={team.No}
            className="flex items-center gap-3 px-3 py-2.5 rounded-xl"
            style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.05)" }}
          >
            <span className="text-[11px] text-slate-600 font-mono w-4 shrink-0">#{i + 1}</span>
            <TeamAvatar team={team} size={28} />
            <div className="flex-1 min-w-0">
              <p className="text-xs text-slate-300 font-semibold truncate">{team.Name}</p>
              <p className="text-[10px] text-slate-600">{team.squadPlayers.length}/{team.maxPlayers} players</p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-[10px] text-emerald-400 font-mono">{fmt(team.balance)}</p>
              {spent > 0 && <p className="text-[10px] text-slate-700 font-mono">-{fmt(spent)}</p>}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ── Recently sold strip ── */
function RecentlySold({ soldPlayers }) {
  const last5 = [...soldPlayers].reverse().slice(0, 5);
  if (!last5.length) return null;
  return (
    <div className="flex flex-col gap-1.5">
      {last5.map((s, i) => (
        <div key={i} className="flex items-center justify-between text-xs px-2 py-1 rounded-lg"
          style={{ background: "rgba(16,185,129,0.05)" }}>
          <div className="flex items-center gap-2 min-w-0">
            <div className="w-5 h-5 rounded-full overflow-hidden bg-[#1e2234] shrink-0">
              {(s.player.photourl || s.player.photoURL)
                ? <img src={s.player.photourl || s.player.photoURL} alt="" className="w-full h-full object-cover" {...imgProps(s.player.photourl || s.player.photoURL)} />
                : <span className="text-[8px] flex items-center justify-center h-full text-slate-500">{(s.player.name ?? s.player.Name)?.[0]}</span>
              }
            </div>
            <span className="text-slate-400 truncate">{s.player.name ?? s.player.Name}</span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <span className="text-slate-600">{s.team.Name}</span>
            <span className="text-emerald-400 font-mono font-bold">{fmt(s.price)}</span>
          </div>
        </div>
      ))}
    </div>
  );
}

/* ─── MAIN ─────────────────────────────────────────────────────────────────── */
export default function LiveScreen() {
  const [player, setPlayer]           = useState(null);
  const [bid, setBid]                 = useState(0);
  const [leadingTeam, setLeadingTeam] = useState(null);
  const [auctionState, setAuctionState] = useState("idle");
  const [bidFeed, setBidFeed]         = useState([]); // [{team, amount}]
  const [teams, setTeams]             = useState([]);
  const [soldPlayers, setSoldPlayers] = useState([]);
  const [view, setView]               = useState("live");
  const [flash, setFlash]             = useState(false);

  // track last log length to detect new entries
  const lastLogLen  = useRef(0);
  const prevState   = useRef("idle");
  const prevBid     = useRef(0);
  const flashTimer  = useRef(null);

  const triggerFlash = () => {
    setFlash(true);
    clearTimeout(flashTimer.current);
    flashTimer.current = setTimeout(() => setFlash(false), 400);
  };

  const poll = () => {
    try {
      /* ── teams ── */
      const rawTeams = localStorage.getItem(LS.TEAM_STATE);
      const parsedTeams = rawTeams ? JSON.parse(rawTeams) : [];
      if (rawTeams) setTeams(parsedTeams);

      /* ── sold list ── */
      const rawSold = localStorage.getItem(LS.SOLD);
      const parsedSold = rawSold ? JSON.parse(rawSold) : [];
      if (rawSold) setSoldPlayers(parsedSold);

      /* ── current player ── */
      const rawCur = localStorage.getItem(LS.CURRENT);
      const parsedPlayer = rawCur ? JSON.parse(rawCur) : null;
      setPlayer(parsedPlayer);

      /* ── log — derive full state ── */
      const rawLog = localStorage.getItem(LS.LOG);
      if (!rawLog) return;
      const entries = JSON.parse(rawLog);

      // Find most recent event of each type by scanning from end
      let latestBid = null, latestStart = null, latestSold = null, latestUnsold = null;
      let latestBidIdx = -1, latestStartIdx = -1, latestSoldIdx = -1, latestUnsoldIdx = -1;

      entries.forEach((e, i) => {
        if (e.type === "bid")    { latestBid    = e; latestBidIdx    = i; }
        if (e.type === "start")  { latestStart  = e; latestStartIdx  = i; }
        if (e.type === "sold")   { latestSold   = e; latestSoldIdx   = i; }
        if (e.type === "unsold") { latestUnsold = e; latestUnsoldIdx = i; }
      });

      // The most recent "terminal" event (sold/unsold) wins if it's after the last start
      const lastTerminal = Math.max(latestSoldIdx, latestUnsoldIdx);
      const isBidding    = latestBidIdx > lastTerminal && latestBidIdx > latestStartIdx - 1;
      const isSold       = latestSoldIdx  > latestStartIdx && latestSoldIdx  >= latestBidIdx;
      const isUnsold     = latestUnsoldIdx > latestStartIdx && latestUnsoldIdx > latestSoldIdx;

      let newState = "idle";
      if (latestStart && isBidding) newState = "bidding";
      if (latestStart && isSold)    newState = "sold";
      if (latestStart && isUnsold)  newState = "unsold";

      // Extract current bid from latest bid entry
      let newBid = 0;
      let newLeadingTeam = null;
      if (latestBid && isBidding) {
        const match = latestBid.msg.match(/₹([\d,]+)/);
        if (match) newBid = parseInt(match[1].replace(/,/g, ""));
        const teamName = latestBid.msg.replace("🏷️ ", "").split(" bids")[0].trim();
        newLeadingTeam = parsedTeams.find(t => t.Name === teamName) || null;
      }

      // For sold state, get price and team from sold entry
      if (isSold && latestSold) {
        const match = latestSold.msg.match(/₹([\d,]+)/);
        if (match) newBid = parseInt(match[1].replace(/,/g, ""));
        // Get team from sold message: "✅ SOLD! Name → TeamName for ₹XXX"
        const teamMatch = latestSold.msg.match(/→ (.+?) for/);
        if (teamMatch) {
          newLeadingTeam = parsedTeams.find(t => t.Name === teamMatch[1].trim()) || null;
        }
        // fallback: use last known leading team from last bid
        if (!newLeadingTeam && latestBid) {
          const tName = latestBid.msg.replace("🏷️ ", "").split(" bids")[0].trim();
          newLeadingTeam = parsedTeams.find(t => t.Name === tName) || null;
        }
      }

      // Build bid feed from ALL bid entries since last start
      const feedEntries = entries
        .slice(latestStartIdx >= 0 ? latestStartIdx : 0)
        .filter(e => e.type === "bid")
        .reverse()
        .slice(0, 8)
        .map(e => {
          const m = e.msg.match(/₹([\d,]+)/);
          const amount = m ? parseInt(m[1].replace(/,/g, "")) : 0;
          const tName  = e.msg.replace("🏷️ ", "").split(" bids")[0].trim();
          const team   = parsedTeams.find(t => t.Name === tName) || { Name: tName };
          return { team, amount, time: e.time };
        });

      /* ── Fire effects on transitions ── */
      if (prevBid.current !== newBid && newState === "bidding" && newBid > 0) {
        triggerFlash();
        playSound("bid");
      }
      if (prevState.current !== "sold" && newState === "sold") {
        playSound("sold");
        fireConfetti();
      }
      if (prevState.current !== "unsold" && newState === "unsold") {
        playSound("unsold");
      }

      prevState.current = newState;
      prevBid.current   = newBid;

      setBid(newBid);
      setLeadingTeam(newLeadingTeam);
      setAuctionState(newState);
      setBidFeed(feedEntries);

    } catch (_) {}
  };

  useEffect(() => {
    poll();
    const id = setInterval(poll, 500);
    // also react instantly to storage events (same-device tab)
    const onStorage = (e) => {
      if ([LS.LOG, LS.TEAM_STATE, LS.CURRENT, LS.SOLD].includes(e.key)) poll();
    };
    window.addEventListener("storage", onStorage);
    return () => { clearInterval(id); window.removeEventListener("storage", onStorage); };
  }, []);

  const cat = player ? getCategory(player) : null;
  const cc  = cat ? catColor(cat) : "";

  return (
    <>
      {/* ── CSS keyframes ── */}
      <style>{`
        @keyframes liveRing {
          0%   { transform: scale(1);   opacity: 0.7; }
          100% { transform: scale(1.5); opacity: 0; }
        }
        @keyframes bidPop {
          0%   { transform: scale(0.85); opacity: 0.5; }
          60%  { transform: scale(1.06); opacity: 1; }
          100% { transform: scale(1);   opacity: 1; }
        }
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(10px); }
          to   { opacity: 1; transform: translateY(0); }
        }
        @keyframes soldBounce {
          0%,100% { transform: scale(1); }
          25%      { transform: scale(1.12); }
          50%      { transform: scale(0.96); }
          75%      { transform: scale(1.05); }
        }
        @keyframes unsoldFade {
          from { opacity:0; filter: grayscale(0); }
          to   { opacity:0.65; filter: grayscale(1); }
        }
        @keyframes pulse2 {
          0%,100% { opacity:1; }
          50%     { opacity:0.4; }
        }
      `}</style>

      <div
        className="h-screen text-white flex flex-col overflow-hidden"
        style={{ background: "linear-gradient(135deg, #070910 0%, #0c0f1a 50%, #070910 100%)" }}
      >

        {/* ══ HEADER ══════════════════════════════════════════════════════ */}
        <div
          className="w-full flex items-center justify-between px-6 py-3 shrink-0"
          style={{ background: "rgba(7,9,16,0.9)", borderBottom: "1px solid rgba(255,255,255,0.06)", backdropFilter: "blur(12px)" }}
        >
          <div className="flex items-center gap-3">
            <span className="text-xl">🏏</span>
            <span className="font-black text-lg tracking-[0.15em] uppercase text-slate-200">Live Auction</span>
          </div>

          <div className="flex items-center gap-5 text-xs font-mono">
            <span className="text-slate-500">
              ✅ <span className="text-emerald-400 font-bold">{soldPlayers.length}</span> sold
            </span>
            <span className="text-slate-500">
              🏆 <span className="text-slate-300 font-bold">{teams.length}</span> teams
            </span>
            <div className={`flex items-center gap-1.5 px-3 py-1 rounded-full ${auctionState === "bidding" ? "bg-red-500/15 text-red-400" : "bg-slate-800 text-slate-600"}`}
              style={{ border: auctionState === "bidding" ? "1px solid rgba(239,68,68,0.35)" : "1px solid rgba(255,255,255,0.06)" }}>
              <span className={`w-1.5 h-1.5 rounded-full ${auctionState === "bidding" ? "bg-red-400" : "bg-slate-600"}`}
                style={auctionState === "bidding" ? { animation: "pulse2 1.2s ease infinite" } : {}} />
              <span className="uppercase tracking-widest text-[10px] font-black">
                {auctionState === "bidding" ? "LIVE" : auctionState === "idle" ? "WAITING" : auctionState.toUpperCase()}
              </span>
            </div>
          </div>

          <div className="flex gap-1.5 bg-[#13161e] p-1 rounded-lg" style={{ border: "1px solid rgba(255,255,255,0.06)" }}>
            {["live", "squads"].map(v => (
              <button key={v} onClick={() => setView(v)}
                className={`px-3 py-1 rounded-md text-xs font-bold capitalize transition-colors ${view === v ? "bg-indigo-500 text-white" : "text-slate-500 hover:text-slate-300"}`}>
                {v}
              </button>
            ))}
          </div>
        </div>

        {/* ══ LIVE VIEW ═══════════════════════════════════════════════════ */}
        {view === "live" && (
          <div className="flex flex-1 overflow-hidden min-h-0">

            {/* ── Centre spotlight ── */}
            <div className="flex-1 flex flex-col items-center justify-center gap-6 px-8 py-6 relative">

              {/* background glow blob */}
              <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                <div style={{
                  width: 500, height: 500, borderRadius: "50%",
                  background:
                    auctionState === "sold"    ? "radial-gradient(circle, rgba(16,185,129,0.08) 0%, transparent 70%)" :
                    auctionState === "unsold"  ? "radial-gradient(circle, rgba(239,68,68,0.07) 0%, transparent 70%)" :
                    auctionState === "bidding" ? "radial-gradient(circle, rgba(99,102,241,0.1) 0%, transparent 70%)" :
                    "none",
                  transition: "background 0.8s ease",
                }} />
              </div>

              {!player ? (
                <div className="flex flex-col items-center gap-4 text-slate-700 relative z-10">
                  <span className="text-6xl">🏏</span>
                  <p className="text-2xl font-black tracking-widest uppercase">Waiting for next player…</p>
                  <p className="text-sm text-slate-600">The auctioneer is selecting a player</p>
                </div>
              ) : (
                <div className="flex flex-col items-center gap-5 relative z-10"
                  style={auctionState === "unsold" ? { animation: "unsoldFade 1s ease forwards 0.5s" } : {}}>

                  {/* Player photo */}
                  <div style={auctionState === "sold" ? { animation: "soldBounce 0.6s ease 0.1s" } : {}}>
                    <PlayerPhoto
                      src={player.photourl || player.photoURL}
                      alt={player.name ?? player.Name}
                      glow={auctionState}
                    />
                  </div>

                  {/* Name + badges */}
                  <div className="text-center">
                    <div className="flex items-center justify-center gap-2 mb-2 flex-wrap">
                      <span className="text-xs font-mono text-slate-500 bg-[#1e2234] px-2 py-0.5 rounded">
                        #{player.No}
                      </span>
                      {cat && (
                        <span className={`text-xs font-black px-2.5 py-0.5 rounded-full border ${cc}`}>
                          {cat}
                        </span>
                      )}
                    </div>

                    <h1
                      className="font-black text-white tracking-tight"
                      style={{
                        fontSize: "clamp(2rem, 5vw, 4rem)",
                        textShadow:
                          auctionState === "sold"    ? "0 0 40px rgba(16,185,129,0.5)" :
                          auctionState === "bidding" ? "0 0 30px rgba(99,102,241,0.5)" :
                          "none",
                      }}
                    >
                      {player.name ?? player.Name}
                    </h1>

                    {/* Extra fields */}
                    <div className="flex items-center justify-center gap-4 mt-2 flex-wrap">
                      {Object.entries(player)
                        .filter(([k]) => !["photourl","photoURL","No","Name","name","category","Category"].includes(k))
                        .map(([k, v]) => v ? (
                          <span key={k} className="text-sm text-slate-400">
                            <span className="text-slate-600 capitalize">{k}: </span>{v}
                          </span>
                        ) : null)}
                    </div>
                  </div>

                  {/* Bid amount */}
                  {(auctionState === "bidding" || auctionState === "sold" || auctionState === "unsold") && bid > 0 && (
                    <BidDisplay bid={bid} state={auctionState} leadingTeam={leadingTeam} flash={flash} />
                  )}
                  {auctionState === "bidding" && bid === 0 && (
                    <p className="text-slate-600 italic text-sm">No bids yet…</p>
                  )}

                </div>
              )}
            </div>

        

      

          </div>
        )}

        {/* ══ SQUADS VIEW ═════════════════════════════════════════════════ */}
        {view === "squads" && (
          <div className="flex-1 overflow-y-auto p-6">
            <div className="grid grid-cols-2 md:grid-cols-3 xl:grid-cols-4 gap-4">
              {teams.map(team => {
                const spent = team.squadPlayers.reduce((s, p) => s + (parseInt(p.soldFor) || 0), 0);
                return (
                  <div key={team.No}
                    className="rounded-2xl p-4 flex flex-col gap-3"
                    style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}>
                    <div className="flex items-center gap-3">
                      <TeamAvatar team={team} size={38} />
                      <div className="flex-1 min-w-0">
                        <p className="font-black text-slate-200 truncate text-sm">{team.Name}</p>
                        <p className="text-[10px] text-emerald-400 font-mono">{fmt(team.balance)}</p>
                      </div>
                    </div>
                    <div className="flex flex-col gap-1 max-h-48 overflow-y-auto">
                      {!team.squadPlayers.length && <p className="text-slate-700 text-xs italic">No players</p>}
                      {team.squadPlayers.map((p, i) => (
                        <div key={i} className="flex items-center justify-between text-xs">
                          <span className="text-slate-400 truncate">{p.name ?? p.Name}</span>
                          <span className="text-indigo-400 font-mono shrink-0 ml-2">{fmt(p.soldFor)}</span>
                        </div>
                      ))}
                    </div>
                    {team.squadPlayers.length > 0 && (
                      <div className="flex justify-between text-xs pt-1" style={{ borderTop: "1px solid rgba(255,255,255,0.06)" }}>
                        <span className="text-slate-600">{team.squadPlayers.length} players · spent</span>
                        <span className="text-red-400 font-mono">{fmt(spent)}</span>
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