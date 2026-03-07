import React from "react";
import { fmt, getCategory, catColor } from "./auctionUtils";
import { Avatar } from "./AuctionComponents";

// ─── Squads Tab ───────────────────────────────────────────────────────────────
export function SquadsTab({ teams, initialBalances }) {
  return (
    <div className="flex-1 overflow-y-auto p-6">
      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {teams.map(team => {
          const spent    = team.squadPlayers.reduce((s, p) => s + (parseInt(p.soldFor) || 0), 0);
          const startBal = initialBalances[team.No] || parseInt(team.balance) || 100000;
          const pctLeft  = Math.max(0, Math.min(100, (team.balance / startBal) * 100));

          // category breakdown
          const catBreak = team.squadPlayers.reduce((acc, p) => {
            const c = getCategory(p); acc[c] = (acc[c] || 0) + 1; return acc;
          }, {});

          return (
            <div key={team.No} className="bg-[#13161e] border border-[#1f2330] rounded-2xl p-4">
              <div className="flex items-center gap-3 mb-3">
                <Avatar src={team.Logo} alt={team.Name} size="h-11 w-11" />
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-100 truncate">{team.Name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    <span className="text-emerald-400 font-mono">{fmt(team.balance)}</span>
                    {" "}left · {team.squadPlayers.length}/{team.maxPlayers} players
                  </p>
                </div>
              </div>

              {/* Budget bar */}
              <div className="h-1.5 bg-[#1a1d28] rounded-full mb-3 overflow-hidden">
                <div className="h-full bg-gradient-to-r from-indigo-500 to-violet-500 rounded-full transition-all"
                  style={{ width: `${pctLeft}%` }} />
              </div>

              {/* Category breakdown */}
              {Object.keys(catBreak).length > 0 && (
                <div className="flex flex-wrap gap-1 mb-3">
                  {Object.entries(catBreak).map(([c, n]) => (
                    <span key={c} className={`text-[10px] px-1.5 py-0.5 rounded font-semibold border ${catColor(c)}`}>
                      {c}: {n}
                    </span>
                  ))}
                </div>
              )}

              {/* Player list */}
              <div className="flex flex-col gap-1 max-h-52 overflow-y-auto">
                {!team.squadPlayers.length && <p className="text-xs text-slate-700 italic">No players yet</p>}
                {team.squadPlayers.map((p, i) => (
                  <div key={i} className="flex items-center justify-between px-2 py-1.5 bg-[#1a1d28] rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar src={p.photourl || p.photoURL} alt={p.name ?? p.Name} size="h-5 w-5" />
                      <span className="text-xs text-slate-300 truncate">{p.name ?? p.Name}</span>
                      <span className={`text-[10px] px-1 py-0.5 rounded border ${catColor(getCategory(p))}`}>{getCategory(p)}</span>
                    </div>
                    <span className="text-[11px] text-indigo-400 font-mono shrink-0 ml-2">{fmt(p.soldFor)}</span>
                  </div>
                ))}
              </div>

              {team.squadPlayers.length > 0 && (
                <div className="mt-2 pt-2 border-t border-[#1f2330] flex justify-between text-xs text-slate-600">
                  <span>Total spent</span>
                  <span className="text-red-400 font-mono">{fmt(spent)}</span>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

// ─── Leaderboard Tab ──────────────────────────────────────────────────────────
export function LeaderboardTab({ teams }) {
  const sorted = [...teams].sort((a, b) => b.squadPlayers.length - a.squadPlayers.length);
  return (
    <div className="flex-1 overflow-y-auto p-6 max-w-3xl mx-auto w-full">
      <div className="flex flex-col gap-3">
        {sorted.map((team, rank) => {
          const spent = team.squadPlayers.reduce((s, p) => s + (parseInt(p.soldFor) || 0), 0);
          return (
            <div key={team.No} className={`bg-[#13161e] border rounded-2xl p-4 flex items-center gap-4 transition-all ${
              rank === 0 ? "border-yellow-500/40 shadow-[0_0_18px_rgba(234,179,8,0.1)]" :
              rank === 1 ? "border-slate-400/25" :
              rank === 2 ? "border-orange-700/30" : "border-[#1f2330]"
            }`}>
              <span className={`text-2xl font-black w-8 text-center ${
                rank === 0 ? "text-yellow-400" : rank === 1 ? "text-slate-300" : rank === 2 ? "text-orange-400" : "text-slate-600"
              }`}>
                {rank === 0 ? "🥇" : rank === 1 ? "🥈" : rank === 2 ? "🥉" : `#${rank+1}`}
              </span>
              <Avatar src={team.Logo} alt={team.Name} size="h-12 w-12" />
              <div className="flex-1 min-w-0">
                <p className="font-black text-slate-200">{team.Name}</p>
                <p className="text-xs text-slate-500">{team.squadPlayers.length} players acquired</p>
              </div>
              <div className="flex gap-5 text-right shrink-0">
                <div>
                  <p className="text-[10px] text-slate-600 mb-0.5">Balance</p>
                  <p className="text-sm font-bold text-emerald-400 font-mono">{fmt(team.balance)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-600 mb-0.5">Spent</p>
                  <p className="text-sm font-bold text-red-400 font-mono">{fmt(spent)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-600 mb-0.5">Squad</p>
                  <p className="text-sm font-bold text-slate-300">{team.squadPlayers.length}/{team.maxPlayers}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}
