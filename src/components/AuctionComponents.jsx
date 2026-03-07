import React from "react";
import { imgProps, fmt, getCategory, catColor, smartIncrement } from "./auctionUtils";

// ─── Avatar ───────────────────────────────────────────────────────────────────
export function Avatar({ src, alt, size = "h-12 w-12" }) {
  return (
    <div className={`rounded-full overflow-hidden ${size} bg-[#1e2130] flex items-center justify-center shrink-0 border border-[#2a2f42]`}>
      {src
        ? <img src={src} alt={alt} className="w-full h-full object-cover" {...imgProps(src)} />
        : <span className="text-slate-400 font-bold text-sm">{alt?.[0]?.toUpperCase() ?? "?"}</span>
      }
    </div>
  );
}

// ─── PlayerCard ───────────────────────────────────────────────────────────────
export function PlayerCard({ player, auctionState, large = false }) {
  if (!player) {
    return (
      <div className="bg-[#13161e] border border-dashed border-[#2a2f42] rounded-2xl p-12 flex flex-col items-center gap-3 text-slate-600">
        <span className="text-4xl">🏏</span>
        <p className="text-sm">Select a player to begin</p>
      </div>
    );
  }

  const cat = getCategory(player);
  const cc  = catColor(cat);

  const borderClass =
    auctionState === "sold"     ? "border-emerald-500/70 shadow-[0_0_40px_rgba(16,185,129,0.25)]" :
    auctionState === "unsold"   ? "border-red-500/50 shadow-[0_0_30px_rgba(239,68,68,0.15)]" :
    auctionState === "bidding"  ? "border-indigo-500/50 shadow-[0_0_30px_rgba(99,102,241,0.2)]" :
    "border-[#1f2330]";

  const imgSize = large ? "h-32 w-32" : "h-24 w-24";

  return (
    <div className={`bg-[#13161e] border rounded-2xl p-5 flex gap-5 items-center transition-all duration-300 ${borderClass}`}>
      {/* Photo */}
      <div className="relative shrink-0">
        <Avatar src={player.photourl || player.photoURL} alt={player.name ?? player.Name} size={imgSize} />
        <span className={`absolute -bottom-1 -right-1 text-[11px] font-black px-1.5 py-0.5 rounded-full border ${cc}`}>
          {cat}
        </span>
      </div>

      {/* Info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="text-xs font-mono text-slate-500 bg-[#1e2130] px-2 py-0.5 rounded">#{player.No}</span>
          {auctionState === "sold"    && <span className="text-xs font-black text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded animate-pulse">✅ SOLD</span>}
          {auctionState === "unsold"  && <span className="text-xs font-black text-red-400 bg-red-500/10 px-2 py-0.5 rounded">❌ UNSOLD</span>}
          {auctionState === "bidding" && <span className="text-xs font-black text-indigo-300 bg-indigo-500/10 px-2 py-0.5 rounded animate-pulse">🔴 LIVE</span>}
        </div>
        <h2 className={`font-black text-white truncate ${large ? "text-3xl" : "text-2xl"}`}>
          {player.name ?? player.Name}
        </h2>
        <div className="flex flex-wrap gap-x-4 gap-y-0.5 mt-1.5">
          {Object.entries(player)
            .filter(([k]) => !["photourl","photoURL","No","Name","name"].includes(k))
            .map(([k, v]) => v ? (
              <span key={k} className="text-xs">
                <span className="text-slate-600 capitalize">{k}: </span>
                <span className="text-slate-300">{v}</span>
              </span>
            ) : null)}
        </div>
      </div>
    </div>
  );
}

// ─── BidBar ───────────────────────────────────────────────────────────────────
export function BidBar({ currentBid, leadingTeam, timer, timerEnabled }) {
  const nextInc = smartIncrement(currentBid);
  return (
    <div className="bg-[#13161e] border border-[#1f2330] rounded-2xl px-5 py-4 flex items-center gap-6">
      <div>
        <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mb-0.5">Current Bid</p>
        <p className="text-3xl font-black text-indigo-400 font-mono">{fmt(currentBid)}</p>
        <p className="text-[10px] text-slate-600 mt-0.5 font-mono">next +{fmt(nextInc)}</p>
      </div>

      {timerEnabled && (
        <div className={`flex flex-col items-center min-w-[44px] transition-colors ${
          timer <= 5 ? "text-red-400" : timer <= 10 ? "text-yellow-400" : "text-slate-400"
        }`}>
          <span className={`text-3xl font-black font-mono leading-none ${timer <= 5 ? "animate-pulse" : ""}`}>{timer}</span>
          <span className="text-[10px] text-slate-600">sec</span>
        </div>
      )}

      {leadingTeam ? (
        <div className="flex items-center gap-3 ml-auto">
          <div className="text-right">
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-mono">Leading</p>
            <p className="font-black text-emerald-400 text-lg">{leadingTeam.Name}</p>
            <p className="text-xs text-slate-500">Balance left: {fmt(leadingTeam.balance - currentBid)}</p>
          </div>
          <Avatar src={leadingTeam.Logo} alt={leadingTeam.Name} size="h-12 w-12" />
        </div>
      ) : (
        <p className="text-slate-600 text-sm italic ml-auto">No bids yet — click a team ↓</p>
      )}
    </div>
  );
}

// ─── TeamGrid ─────────────────────────────────────────────────────────────────
// One click = instant smart-increment bid
export function TeamGrid({ teams, currentBid, leadingTeam, auctionState, onTeamClick }) {
  const nextInc = smartIncrement(currentBid);
  return (
    <div>
      <p className="text-[10px] text-slate-500 uppercase tracking-widest font-mono mb-2">
        Click team to bid {fmt(currentBid + nextInc)} &nbsp;·&nbsp; smart step: +{fmt(nextInc)}
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-5 xl:grid-cols-6 gap-2">
        {teams.map(team => {
          const canBid    = team.balance > currentBid && team.squadPlayers.length < parseInt(team.maxPlayers);
          const isLeading = leadingTeam?.No === team.No;
          const disabled  = auctionState !== "bidding" || !canBid || isLeading;
          return (
            <button key={team.No}
              onClick={() => onTeamClick(team)}
              disabled={disabled}
              title={
                auctionState !== "bidding" ? "Bidding not started" :
                isLeading   ? "Currently leading" :
                !canBid     ? (team.balance <= currentBid ? "Insufficient balance" : "Roster full") :
                `Bid ${fmt(currentBid + nextInc)}`
              }
              className={`flex flex-col items-center gap-1 px-2 py-3 rounded-xl border text-xs font-semibold transition-all active:scale-95 ${
                isLeading
                  ? "border-emerald-500 bg-emerald-500/15 text-emerald-300 cursor-default"
                  : canBid && auctionState === "bidding"
                    ? "border-[#2a2f42] bg-[#1a1d28] text-slate-300 hover:border-indigo-500 hover:bg-indigo-500/10 hover:text-white cursor-pointer"
                    : "border-[#1a1d24] bg-[#111318] text-slate-700 opacity-40 cursor-not-allowed"
              }`}
            >
              <Avatar src={team.Logo} alt={team.Name} size="h-9 w-9" />
              <span className="truncate w-full text-center leading-tight">{team.Name}</span>
              <span className={`font-mono text-[10px] ${isLeading ? "text-emerald-500 font-black" : "text-slate-600"}`}>
                {isLeading ? "LEADING" : fmt(team.balance)}
              </span>
            </button>
          );
        })}
      </div>
    </div>
  );
}

// ─── BiddingControls ─────────────────────────────────────────────────────────
export function BiddingControls({ currentBid, leadingTeam, teams, onCustomBid, onQuickBid, undoLastBid, handleSell, handleUnsold }) {
  const [customVal, setCustomVal] = React.useState("");
  const [customTeam, setCustomTeam] = React.useState("");
  const [err, setErr] = React.useState("");

  const submitCustom = () => {
    const teamNo = customTeam || leadingTeam?.No;
    const errMsg = onCustomBid(customVal, teamNo);
    if (errMsg) { setErr(errMsg); setTimeout(() => setErr(""), 3000); return; }
    setCustomVal(""); setErr("");
  };

  const QUICK = [500, 1000, 2500, 5000, 10000, 25000];

  return (
    <div className="bg-[#13161e] border border-[#1f2330] rounded-2xl p-4 flex flex-col gap-4">
      {/* Quick raise */}
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-[10px] text-slate-500 font-mono uppercase shrink-0">Raise by:</span>
        {QUICK.map(inc => (
          <button key={inc} onClick={() => onQuickBid(inc)} disabled={!leadingTeam}
            className="px-3 py-1.5 bg-[#1e2130] hover:bg-indigo-500/20 disabled:opacity-30 border border-[#2a2f42] hover:border-indigo-500/40 text-slate-400 hover:text-indigo-300 rounded-lg text-xs font-mono transition-all">
            +{inc.toLocaleString("en-IN")}
          </button>
        ))}
      </div>

      {/* Custom bid */}
      <div className="flex flex-col gap-1.5">
        <div className="flex items-center gap-2">
          {/* Optional: pick which team for custom bid */}
          <select value={customTeam} onChange={e => setCustomTeam(e.target.value)}
            className="bg-[#1a1d28] border border-[#2a2f42] rounded-xl px-2 py-2.5 text-slate-300 text-xs focus:outline-none focus:border-indigo-500 w-36">
            <option value="" className="bg-[#1a1d28]">— Auto team —</option>
            {teams.map(t => <option key={t.No} value={t.No} className="bg-[#1a1d28]">{t.Name}</option>)}
          </select>
          <div className="flex items-center gap-1 flex-1 bg-[#1a1d28] border border-[#2a2f42] rounded-xl px-3 py-2.5 focus-within:border-indigo-500 transition-colors">
            <span className="text-slate-500 text-sm">₹</span>
            <input type="number" value={customVal} onChange={e => setCustomVal(e.target.value)}
              onKeyDown={e => e.key === "Enter" && submitCustom()}
              placeholder={`Custom (>${fmt(currentBid)})`}
              className="flex-1 bg-transparent text-slate-200 text-sm focus:outline-none placeholder-slate-600 min-w-0" />
          </div>
          <button onClick={submitCustom}
            className="px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl text-sm font-bold transition-colors shrink-0">
            Bid
          </button>
          <button onClick={undoLastBid} title="Undo last bid"
            className="px-3.5 py-2.5 bg-[#1a1d28] hover:bg-amber-500/10 border border-[#2a2f42] hover:border-amber-500/40 text-slate-400 hover:text-amber-400 rounded-xl text-sm font-bold transition-colors shrink-0">
            ↩
          </button>
        </div>
        {err && <p className="text-xs text-red-400 px-1">{err}</p>}
      </div>

      {/* SOLD / UNSOLD */}
      <div className="flex gap-3 pt-2 border-t border-[#1f2330]">
        <button onClick={handleSell} disabled={!leadingTeam}
          className="flex-1 py-3.5 bg-emerald-500 hover:bg-emerald-600 disabled:opacity-25 disabled:cursor-not-allowed text-white rounded-xl font-black text-lg transition-colors shadow-[0_0_20px_rgba(16,185,129,0.3)]">
          🔨 SOLD — {fmt(currentBid)}
        </button>
        <button onClick={handleUnsold}
          className="flex-1 py-3.5 bg-red-500/10 hover:bg-red-500/20 border border-red-500/30 text-red-400 hover:text-red-300 rounded-xl font-black text-lg transition-colors">
          ❌ Unsold
        </button>
      </div>
    </div>
  );
}
