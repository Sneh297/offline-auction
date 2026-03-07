import React, { useState } from "react";
import { fmt } from "./auctionUtils";
import { Avatar } from "./AuctionComponents";

export default function AdminTab({
  soldPlayers, unsoldPlayers, teams,
  basePrice, setBasePrice,
  timerEnabled, setTimerEnabled,
  timerDuration, setTimerDuration,
  adminUndoSold, adminMoveToUnsold, adminReassign, adminReAuction, adminReAuctionAll,
  setActiveTab, initPlayer,
}) {
  const [openIdx, setOpenIdx] = useState(null);

  const doReAuction = (no) => {
    const p = adminReAuction(no);
    if (p) { setActiveTab("auction"); }
  };

  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-6 max-w-4xl mx-auto w-full">

      {/* Banner */}
      <div className="bg-amber-500/10 border border-amber-500/30 rounded-2xl px-5 py-3 text-amber-400 text-sm font-bold">
        🔧 Admin Fix Panel — correct any mistake made during the auction
      </div>

      {/* ── Fix sold players ── */}
      <div className="bg-[#13161e] border border-[#1f2330] rounded-2xl p-5">
        <p className="font-black text-slate-200 mb-0.5">Fix Sold Players</p>
        <p className="text-xs text-slate-500 mb-4">Reverse a sale, reassign to another team, or move to unsold pool.</p>

        {!soldPlayers.length && <p className="text-slate-700 text-sm italic">No sold players yet.</p>}

        <div className="flex flex-col gap-2">
          {soldPlayers.map((s, idx) => (
            <div key={idx} className="bg-[#1a1d28] rounded-xl p-3 flex flex-col gap-2">
              {/* Row */}
              <div className="flex items-center justify-between gap-3 flex-wrap">
                <div className="flex items-center gap-3">
                  <Avatar src={s.player.photourl || s.player.photoURL} alt={s.player.name ?? s.player.Name} size="h-9 w-9" />
                  <div>
                    <p className="font-bold text-slate-200 text-sm">{s.player.name ?? s.player.Name}</p>
                    <p className="text-xs text-slate-500">
                      {s.team.Name} · <span className="text-emerald-400 font-mono">{fmt(s.price)}</span>
                    </p>
                  </div>
                </div>
                <button onClick={() => setOpenIdx(openIdx === idx ? null : idx)}
                  className="px-3 py-1.5 text-xs font-bold rounded-lg bg-amber-500/10 text-amber-400 hover:bg-amber-500/20 border border-amber-500/20 transition-colors">
                  {openIdx === idx ? "Close" : "Fix"}
                </button>
              </div>

              {/* Fix panel */}
              {openIdx === idx && (
                <div className="flex flex-col gap-3 pt-2 border-t border-[#2a2f42]">
                  <div className="flex gap-2 flex-wrap">
                    <button onClick={() => { adminUndoSold(idx); setOpenIdx(null); }}
                      className="px-4 py-2 text-xs font-bold rounded-lg bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors">
                      ↩ Return to Available Pool
                    </button>
                    <button onClick={() => { adminMoveToUnsold(idx); setOpenIdx(null); }}
                      className="px-4 py-2 text-xs font-bold rounded-lg bg-slate-500/10 text-slate-400 hover:bg-slate-500/20 border border-slate-500/20 transition-colors">
                      Mark as Unsold
                    </button>
                  </div>
                  <div>
                    <p className="text-xs text-slate-500 mb-1.5">Reassign to a different team:</p>
                    <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 gap-2">
                      {teams.filter(t => t.No !== s.team.No).map(team => (
                        <button key={team.No} onClick={() => { const err = adminReassign(idx, team.No); if (err) alert(err); else setOpenIdx(null); }}
                          className="flex flex-col items-center gap-1 px-2 py-2 rounded-xl border border-[#2a2f42] bg-[#13161e] text-slate-400 hover:border-indigo-500 hover:text-white text-xs font-semibold transition-all">
                          <Avatar src={team.Logo} alt={team.Name} size="h-7 w-7" />
                          <span className="truncate w-full text-center text-[10px]">{team.Name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── Re-auction unsold ── */}
      <div className="bg-[#13161e] border border-[#1f2330] rounded-2xl p-5">
        <div className="flex items-center justify-between mb-1">
          <p className="font-black text-slate-200">Re-Auction Unsold Players</p>
          {unsoldPlayers.length > 0 && (
            <button onClick={adminReAuctionAll}
              className="px-3 py-1.5 text-xs font-bold rounded-lg bg-indigo-500/10 text-indigo-400 hover:bg-indigo-500/20 border border-indigo-500/20 transition-colors">
              Return All to Pool
            </button>
          )}
        </div>
        <p className="text-xs text-slate-500 mb-4">Click a player to put them back on the block immediately.</p>
        {!unsoldPlayers.length && <p className="text-slate-700 text-sm italic">No unsold players.</p>}
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
          {unsoldPlayers.map((p, i) => (
            <button key={i} onClick={() => doReAuction(p.No)}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-[#1a1d28] hover:bg-indigo-500/10 border border-[#2a2f42] hover:border-indigo-500/40 text-left transition-all">
              <Avatar src={p.photourl || p.photoURL} alt={p.name ?? p.Name} size="h-8 w-8" />
              <div className="flex-1 min-w-0">
                <p className="text-xs text-slate-300 font-semibold truncate">{p.name ?? p.Name}</p>
                <p className="text-[10px] text-indigo-400">Re-auction →</p>
              </div>
            </button>
          ))}
        </div>
      </div>

      {/* ── Settings ── */}
      <div className="bg-[#13161e] border border-[#1f2330] rounded-2xl p-5">
        <p className="font-black text-slate-200 mb-0.5">Auction Settings</p>
        <p className="text-xs text-slate-500 mb-4">Adjust at any time — takes effect on next player.</p>
        <div className="flex flex-wrap gap-5">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-slate-500">Default Base Price (₹)</span>
            <input type="number" value={basePrice} onChange={e => setBasePrice(e.target.value)}
              className="bg-[#1a1d28] border border-[#2a2f42] rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 w-40" />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-slate-500">Timer Duration (sec)</span>
            <select value={timerDuration} onChange={e => setTimerDuration(Number(e.target.value))}
              className="bg-[#1a1d28] border border-[#2a2f42] rounded-lg px-3 py-2 text-slate-200 text-sm focus:outline-none focus:border-indigo-500 w-40">
              {[10,15,20,30,45,60].map(v => <option key={v} value={v} className="bg-[#1a1d28]">{v}s</option>)}
            </select>
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs text-slate-500">Timer</span>
            <button onClick={() => setTimerEnabled(t => !t)}
              className={`px-4 py-2 rounded-lg text-sm font-bold border transition-colors w-40 ${
                timerEnabled ? "bg-emerald-500/10 text-emerald-400 border-emerald-500/20" : "bg-red-500/10 text-red-400 border-red-500/20"
              }`}>
              {timerEnabled ? "⏱ Timer ON" : "⏱ Timer OFF"}
            </button>
          </label>
        </div>
      </div>
    </div>
  );
}
