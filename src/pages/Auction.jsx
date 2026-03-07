import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import useAuction from "../components/useAuction";
import { fmt, getCategory, catColor, smartIncrement, getCategoryBasePrice } from "../components/auctionUtils";
import { Avatar, PlayerCard, BidBar, TeamGrid, BiddingControls } from "../components/AuctionComponents";
import { SquadsTab, LeaderboardTab } from "../components/SquadsLeaderboard";
import AdminTab from "../components/AdminTab";

// ─── Auction Log sidebar ──────────────────────────────────────────────────────
function AuctionLog({ log, auctionState }) {
  const ref = React.useRef(null);
  React.useEffect(() => { if (ref.current) ref.current.scrollTop = ref.current.scrollHeight; }, [log]);
  return (
    <div className="w-60 bg-[#13161e] border-l border-[#1f2330] flex flex-col shrink-0">
      <div className="px-4 py-2.5 border-b border-[#1f2330] flex items-center gap-2">
        <span className={`w-1.5 h-1.5 rounded-full ${auctionState === "bidding" ? "bg-red-400 animate-pulse" : "bg-slate-600"}`} />
        <span className="text-[10px] font-mono uppercase tracking-widest text-slate-500">Live Log</span>
      </div>
      <div ref={ref} className="flex-1 overflow-y-auto p-2 flex flex-col gap-1">
        {!log.length && <p className="text-slate-700 text-xs italic text-center mt-6">No activity yet</p>}
        {log.map((e, i) => (
          <div key={i} className={`text-xs px-2 py-1.5 rounded-lg ${
            e.type === "sold"   ? "bg-emerald-500/10 text-emerald-400" :
            e.type === "unsold" ? "bg-red-500/10 text-red-400" :
            e.type === "bid"    ? "bg-indigo-500/10 text-indigo-300" :
            e.type === "start"  ? "bg-violet-500/10 text-violet-300" :
            e.type === "admin"  ? "bg-amber-500/10 text-amber-400" :
            "bg-[#1a1d28] text-slate-400"
          }`}>
            <span className="text-slate-600 mr-1 font-mono text-[9px]">{e.time}</span>
            {e.msg}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Sold history strip ───────────────────────────────────────────────────────
function SoldStrip({ soldPlayers }) {
  if (!soldPlayers.length) return null;
  return (
    <div className="bg-[#13161e] border border-[#1f2330] rounded-2xl p-4">
      <p className="text-[10px] font-mono uppercase tracking-widest text-slate-500 mb-2">Sold ({soldPlayers.length})</p>
      <div className="flex flex-col gap-1.5 max-h-44 overflow-y-auto">
        {[...soldPlayers].reverse().map((s, i) => (
          <div key={i} className="flex items-center justify-between px-3 py-2 bg-[#1a1d28] rounded-lg">
            <div className="flex items-center gap-2">
              <Avatar src={s.player.photourl || s.player.photoURL} alt={s.player.name ?? s.player.Name} size="h-6 w-6" />
              <span className="text-sm text-slate-300">{s.player.name ?? s.player.Name}</span>
              <span className={`text-[10px] px-1.5 py-0.5 rounded border ${catColor(getCategory(s.player))}`}>{getCategory(s.player)}</span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <Avatar src={s.team.Logo} alt={s.team.Name} size="h-5 w-5" />
              <span className="text-xs text-slate-500">{s.team.Name}</span>
              <span className="text-xs font-bold text-emerald-400 font-mono">{fmt(s.price)}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── Main ─────────────────────────────────────────────────────────────────────
export default function Auction() {
  const navigate = useNavigate();
  const [activeTab, setActiveTab]     = useState("auction");
  const [category, setCategory]       = useState("All");
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearch, setShowSearch]   = useState(false);

  const auction = useAuction();
  const {
    allPlayers, teams, initialBalances,
    auctionState, currentPlayer, currentBid, leadingTeam,
    soldPlayers, unsoldPlayers, log,
    basePrice, setBasePrice,
    timer, timerEnabled, setTimerEnabled, timerDuration, setTimerDuration,
    initPlayer, startBidding,
    onTeamClick, onCustomBid, undoLastBid,
    handleSell, handleUnsold,
    adminUndoSold, adminMoveToUnsold, adminReassign, adminReAuction, adminReAuctionAll,
    resetAuction, getAvailable, uniqueCategories,
  } = auction;

  const available = getAvailable(category, searchQuery);

  // Quick raise (for leading team)
  const onQuickBid = useCallback((inc) => {
    if (!leadingTeam) { alert("A team must be leading first!"); return; }
    onCustomBid(String(currentBid + inc), leadingTeam.No);
  }, [leadingTeam, currentBid, onCustomBid]);

  const selectRandom = () => {
    if (!available.length) { alert("No players available in this category!"); return; }
    initPlayer(available[Math.floor(Math.random() * available.length)]);
  };

  if (!allPlayers.length || !teams.length) return (
    <div className="min-h-screen bg-[#0d0f14] flex flex-col items-center justify-center gap-5 text-slate-400">
      <div className="text-5xl">🏏</div>
      <p className="text-lg font-semibold text-slate-200">No auction data found</p>
      <p className="text-sm">Upload player & team CSV files from the Dashboard first.</p>
      <button onClick={() => navigate("/")} className="px-5 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white rounded-xl font-medium transition-colors">← Dashboard</button>
    </div>
  );

  return (
    <div className="min-h-screen bg-[#0d0f14] text-slate-200 flex flex-col select-none">

      {/* ══ TOP BAR ══════════════════════════════════════════════════════════ */}
      <div className="w-full bg-[#13161e] border-b border-[#1f2330] px-4 py-2 flex items-center gap-3 sticky top-0 z-50 shrink-0">
        <button onClick={() => navigate("/")} className="text-slate-500 hover:text-slate-300 p-1 transition-colors">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M19 12H5M12 5l-7 7 7 7"/></svg>
        </button>
        <span className="text-sm font-black tracking-widest uppercase text-slate-300 font-mono">🏏 Auction</span>

        <div className="hidden md:flex items-center gap-3 ml-2 text-xs font-mono">
          <span className="text-slate-500">{allPlayers.length} players</span>
          <span className="text-slate-600">·</span>
          <span className="text-emerald-400">✅ {soldPlayers.length}</span>
          <span className="text-red-400">❌ {unsoldPlayers.length}</span>
          <span className="text-slate-400">⏳ {available.length} left</span>
        </div>

        <div className="flex-1" />

        {/* Live screen link */}
        <button onClick={() => navigate("/live")}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-red-500/10 text-red-400 hover:bg-red-500/20 border border-red-500/20 transition-colors">
          <span className="w-1.5 h-1.5 rounded-full bg-red-400 animate-pulse" />
          Live Screen
        </button>

        {/* Tabs */}
        <div className="flex items-center gap-1 bg-[#1a1d28] p-1 rounded-lg">
          {["auction","squads","leaderboard","admin"].map(tab => (
            <button key={tab} onClick={() => setActiveTab(tab)}
              className={`px-3 py-1 rounded-md text-xs font-semibold capitalize transition-colors ${
                activeTab === tab
                  ? tab === "admin" ? "bg-amber-500 text-white" : "bg-indigo-500 text-white"
                  : "text-slate-400 hover:text-slate-300"
              }`}>
              {tab === "admin" ? "🔧 Fix" : tab}
            </button>
          ))}
        </div>

        <button onClick={resetAuction} className="ml-2 px-3 py-1.5 rounded-lg text-xs font-semibold bg-red-500/10 text-red-400 hover:bg-red-500/20 transition-colors">Reset</button>
      </div>

      {/* ══ AUCTION TAB ══════════════════════════════════════════════════════ */}
      {activeTab === "auction" && (
        <div className="flex flex-1 overflow-hidden min-h-0">
          <div className="flex-1 flex flex-col overflow-y-auto p-4 gap-3 min-w-0">

            {/* Category filter row */}
            <div className="flex flex-wrap items-center gap-2">
              {uniqueCategories.map(cat => (
                <button key={cat} onClick={() => {
                  setCategory(cat)
                  if(cat=="All"){
                    setBasePrice("-")
                  }
                   else setBasePrice(getCategoryBasePrice(cat))
                }
                }
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-all ${
                    category === cat
                      ? "bg-indigo-500 border-indigo-500 text-white"
                      : `bg-[#1a1d28] text-slate-400 hover:text-slate-300 ${cat !== "All" ? `border-[#2a2f42]` : "border-[#2a2f42]"}`
                  }`}>
                  {cat}
                </button>
              ))}
              <div className="flex-1" />
              <button onClick={() => setShowSearch(s => !s)}
                className="px-3 py-1.5 rounded-lg text-xs font-semibold bg-[#1a1d28] border border-[#2a2f42] text-slate-400 hover:text-slate-300 transition-colors">
                🔍 Search
              </button>
              <button onClick={() => setTimerEnabled(t => !t)}
                className={`px-3 py-1.5 rounded-lg text-xs font-semibold border transition-colors ${
                  timerEnabled ? "bg-[#1a1d28] border-[#2a2f42] text-slate-400" : "bg-red-500/10 border-red-500/30 text-red-400"
                }`}>
                ⏱ Timer {timerEnabled ? "ON" : "OFF"}
              </button>
            </div>

            {/* Search panel */}
            {showSearch && (
              <div className="bg-[#13161e] border border-[#1f2330] rounded-xl p-3 flex flex-col gap-2">
                <input autoFocus value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Type player name…"
                  className="w-full bg-[#1a1d28] border border-[#2a2f42] rounded-lg px-3 py-2 text-sm text-slate-200 placeholder-slate-600 focus:outline-none focus:border-indigo-500" />
                {searchQuery && (
                  <div className="max-h-44 overflow-y-auto flex flex-col gap-1">
                    {available.slice(0, 15).map((p, i) => (
                      <button key={i} onClick={() => { initPlayer(p); setShowSearch(false); setSearchQuery(""); }}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg bg-[#1a1d28] hover:bg-[#252840] text-left transition-colors">
                        <Avatar src={p.photourl || p.photoURL} alt={p.name ?? p.Name} size="h-7 w-7" />
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-slate-200 truncate">{p.name ?? p.Name}</p>
                        </div>
                        <span className={`text-[10px] px-1.5 py-0.5 rounded border ${catColor(getCategory(p))}`}>{getCategory(p)}</span>
                      </button>
                    ))}
                    {!available.length && <p className="text-xs text-slate-600 text-center py-3">No results</p>}
                  </div>
                )}
              </div>
            )}

            {/* Random + base price */}
            <div className="flex flex-wrap items-center gap-3">
              <button onClick={selectRandom} disabled={auctionState === "bidding"}
                className="flex items-center gap-2 px-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 disabled:opacity-40 disabled:cursor-not-allowed text-white rounded-xl font-bold text-sm transition-colors shadow-[0_0_18px_rgba(99,102,241,0.3)]">
                🎲 Random Player
                <span className="text-indigo-300 text-xs font-mono">({available.length})</span>
              </button>
              <label className="flex items-center gap-2 bg-[#13161e] border border-[#1f2330] rounded-xl px-3 py-2 text-xs text-slate-500 cursor-pointer">
                Base ₹
                <input type="number" value={basePrice} onChange={e => setBasePrice(e.target.value)}
                  disabled={auctionState === "bidding"}
                  className="w-20 bg-transparent text-slate-200 text-sm focus:outline-none text-right disabled:opacity-40" />
              </label>
            </div>

            {/* Player card */}
            <PlayerCard player={currentPlayer} auctionState={auctionState} />

            {/* Bid bar */}
            {auctionState === "bidding" && (
              <BidBar currentBid={currentBid} leadingTeam={leadingTeam} timer={timer} timerEnabled={timerEnabled} />
            )}

            {/* Start button */}
            {currentPlayer && auctionState === "idle" && (
              <button onClick={startBidding}
                className="w-full py-4 bg-indigo-500 hover:bg-indigo-600 text-white rounded-2xl font-black text-xl transition-colors shadow-[0_0_28px_rgba(99,102,241,0.35)]">
                🎯 Start Bidding
              </button>
            )}

            {/* Team grid + bidding controls */}
            {auctionState === "bidding" && (
              <div className="bg-[#13161e] border border-[#1f2330] rounded-2xl p-4 flex flex-col gap-4">
                <TeamGrid
                  teams={teams}
                  currentBid={currentBid}
                  leadingTeam={leadingTeam}
                  auctionState={auctionState}
                  onTeamClick={onTeamClick}
                />
                <BiddingControls
                  currentBid={currentBid}
                  leadingTeam={leadingTeam}
                  teams={teams}
                  onCustomBid={onCustomBid}
                  onQuickBid={onQuickBid}
                  undoLastBid={undoLastBid}
                  handleSell={handleSell}
                  handleUnsold={handleUnsold}
                />
              </div>
            )}

            <SoldStrip soldPlayers={soldPlayers} />
          </div>

          <AuctionLog log={log} auctionState={auctionState} />
        </div>
      )}

      {/* ══ OTHER TABS ═══════════════════════════════════════════════════════ */}
      {activeTab === "squads" && <SquadsTab teams={teams} initialBalances={initialBalances} />}
      {activeTab === "leaderboard" && <LeaderboardTab teams={teams} />}
      {activeTab === "admin" && (
        <AdminTab
          soldPlayers={soldPlayers}
          unsoldPlayers={unsoldPlayers}
          teams={teams}
          basePrice={basePrice}
          setBasePrice={setBasePrice}
          timerEnabled={timerEnabled}
          setTimerEnabled={setTimerEnabled}
          timerDuration={timerDuration}
          setTimerDuration={setTimerDuration}
          adminUndoSold={adminUndoSold}
          adminMoveToUnsold={adminMoveToUnsold}
          adminReassign={adminReassign}
          adminReAuction={adminReAuction}
          adminReAuctionAll={adminReAuctionAll}
          setActiveTab={setActiveTab}
          initPlayer={initPlayer}
        />
      )}
    </div>
  );
}