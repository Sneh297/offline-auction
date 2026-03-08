import { useState, useEffect, useRef, useCallback } from "react";
import Papa from "papaparse";
import { fmt, smartIncrement, playSound, fireConfetti, LS, getCategoryBasePrice } from "./auctionUtils";

const TIMER_DURATION = 15;

export default function useAuction() {
  // ── raw data
  const [allPlayers, setAllPlayers]       = useState([]);
  const [teams, setTeams]                 = useState([]);
  const [initialBalances, setInitialBalances] = useState({});

  // ── auction core
  const [auctionState, setAuctionState]   = useState("idle"); // idle|bidding|sold|unsold
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [currentBid, setCurrentBid]       = useState(0);
  const [leadingTeam, setLeadingTeam]     = useState(null);
  const [soldPlayers, setSoldPlayers]     = useState([]);
  const [unsoldPlayers, setUnsoldPlayers] = useState([]);
  const [bidHistory, setBidHistory]       = useState([]);
  const [log, setLog]                     = useState([]);
  const [basePrice, setBasePrice]         = useState(500);

  // ── timer
  const [timer, setTimer]                 = useState(TIMER_DURATION);
  const [timerActive, setTimerActive]     = useState(false);
  const [timerEnabled, setTimerEnabled]   = useState(true);
  const [timerDuration, setTimerDuration] = useState(TIMER_DURATION);

  const timerRef = useRef(null);
  const autoRef  = useRef(null);

  // ─── LIVE STATE WRITER ───────────────────────────────────────────────────────
  // ✅ FIX: Write a single clean object to localStorage at every state transition.
  // LiveScreen reads ONLY this key — no log parsing, no race conditions.
  //
  // Called synchronously (not in a useEffect) so the value is available to
  // LiveScreen's 400ms poll BEFORE React has even committed the state update.
  const writeLive = (state, player, bid, leading, feed, timerVal, timerEn) => {
    localStorage.setItem(LS.LIVE_STATE, JSON.stringify({
      auctionState: state,
      player:       player,
      bid:          bid,
      leadingTeam:  leading,
      bidFeed:      feed || [],
      timer:        timerVal ?? timer,
      timerEnabled: timerEn  ?? timerEnabled,
      ts:           Date.now(),
    }));
  };

  // ─── Load ────────────────────────────────────────────────────────────────────
  useEffect(() => {
    const playerCsv = localStorage.getItem(LS.PLAYERS);
    const teamCsv   = localStorage.getItem(LS.TEAMS);
    if (playerCsv) Papa.parse(playerCsv, { header: true, skipEmptyLines: true, complete: r => setAllPlayers(r.data) });
    if (teamCsv) {
      Papa.parse(teamCsv, {
        header: true, skipEmptyLines: true,
        complete: r => {
          const balances = {};
          r.data.forEach(t => { balances[t.No] = parseInt(t.balance) || 100000; });
          setInitialBalances(balances);

          const saved       = localStorage.getItem(LS.TEAM_STATE);
          const savedSold   = localStorage.getItem(LS.SOLD);
          const savedUnsold = localStorage.getItem(LS.UNSOLD);
          const savedLog    = localStorage.getItem(LS.LOG);
          const savedCur    = localStorage.getItem(LS.CURRENT);
          if (saved) {
            try {
              setTeams(JSON.parse(saved));
              if (savedSold)   setSoldPlayers(JSON.parse(savedSold));
              if (savedUnsold) setUnsoldPlayers(JSON.parse(savedUnsold));
              if (savedLog)    setLog(JSON.parse(savedLog));
              if (savedCur)    { const c = JSON.parse(savedCur); if (c) setCurrentPlayer(c); }
              return;
            } catch (_) {}
          }
          setTeams(r.data.map(t => ({
            ...t,
            balance:    parseInt(t.balance) || 100000,
            maxPlayers: parseInt(t.maxPlayers) || 15,
            squadPlayers: [],
          })));
        },
      });
    }
  }, []);

  // ─── Persist ─────────────────────────────────────────────────────────────────
  useEffect(() => { if (teams.length)         localStorage.setItem(LS.TEAM_STATE, JSON.stringify(teams)); }, [teams]);
  useEffect(() => { if (soldPlayers.length)   localStorage.setItem(LS.SOLD,       JSON.stringify(soldPlayers)); }, [soldPlayers]);
  useEffect(() => { if (unsoldPlayers.length) localStorage.setItem(LS.UNSOLD,     JSON.stringify(unsoldPlayers)); }, [unsoldPlayers]);
  useEffect(() => { if (log.length)           localStorage.setItem(LS.LOG,        JSON.stringify(log.slice(-100))); }, [log]);
  useEffect(() => { localStorage.setItem(LS.CURRENT, JSON.stringify(currentPlayer)); }, [currentPlayer]);

  // ─── Sync timer tick to LiveScreen (patches ts so poll fires, but doesn't
  // re-trigger bid/sold effects since auctionState/bid haven't changed) ────────
  useEffect(() => {
    if (auctionState !== "bidding") return;
    try {
      const raw = localStorage.getItem(LS.LIVE_STATE);
      if (!raw) return;
      const cur = JSON.parse(raw);
      cur.timer        = timer;
      cur.timerEnabled = timerEnabled;
      cur.ts           = Date.now();
      localStorage.setItem(LS.LIVE_STATE, JSON.stringify(cur));
    } catch (_) {}
  }, [timer]);


  // ─── Timer ───────────────────────────────────────────────────────────────────
  // Refs always hold latest values so the interval callback never closes over stale state
  const timerEnabledRef = useRef(timerEnabled);
  const auctionStateRef = useRef(auctionState);
  const leadingTeamRef  = useRef(leadingTeam);
  const sellRef         = useRef(null);
  const unsoldRef       = useRef(null);

  useEffect(() => {
    timerEnabledRef.current = timerEnabled;
    // If timer is turned OFF mid-auction, kill the running interval
    if (!timerEnabled) {
      clearInterval(timerRef.current);
      setTimerActive(false);
    }
  }, [timerEnabled]);
  useEffect(() => { auctionStateRef.current = auctionState; }, [auctionState]);
  useEffect(() => { leadingTeamRef.current  = leadingTeam;  }, [leadingTeam]);

  // ─── Helpers ─────────────────────────────────────────────────────────────────
  const addLog = (msg, type = "info") => {
    const time = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLog(prev => [...prev.slice(-99), { msg, type, time }]);
  };

  // resetTimer: always imperatively clears + restarts the interval.
  // Works even when timerActive was already true — no React state diffing needed.
  // This is the fix: previously, if timerActive was already true, calling
  // setTimerActive(true) was a no-op, so the useEffect didn't re-run, and the
  // timer never actually reset after the first bid.
  const resetTimer = useCallback((dur) => {
    if (!timerEnabledRef.current) return;
    clearInterval(timerRef.current);
    const d = dur ?? timerDuration;
    setTimer(d);
    setTimerActive(true);

    let remaining = d;
    timerRef.current = setInterval(() => {
      remaining -= 1;
      setTimer(remaining);
      if (remaining <= 0) {
        clearInterval(timerRef.current);
        setTimerActive(false);
        if (auctionStateRef.current === "bidding") {
          if (leadingTeamRef.current) sellRef.current?.();
          else unsoldRef.current?.();
        }
      }
    }, 1000);
  }, [timerDuration]);

  // ─── Core bid ─────────────────────────────────────────────────────────────────
  // ✅ FIX: Uses functional updater for bidHistory so writeLive receives the
  // latest feed synchronously — React state batching cannot delay it.
  const doPlaceBid = useCallback((team, amount) => {
    setBidHistory(prev => {
      const newFeed = [{ team, amount }, ...prev].slice(0, 8);
      // Write to localStorage immediately inside the updater — guaranteed fresh
      writeLive("bidding", currentPlayer, amount, team, newFeed);
      return [{ team, amount }, ...prev];
    });
    setCurrentBid(amount);
    setLeadingTeam(team);
    addLog(`🏷️ ${team.Name} bids ${fmt(amount)}`, "bid");
    playSound("bid");
    resetTimer();
  }, [currentPlayer, resetTimer]);

  // ─── One-click team bid ───────────────────────────────────────────────────────
  const onTeamClick = useCallback((team) => {
    if (auctionState !== "bidding") return;

    const canBid =
      team.balance >= currentBid &&
      team.squadPlayers.length < parseInt(team.maxPlayers);

    if (!canBid) return;

    // First bid — place at base price (no increment yet)
    if (!leadingTeam) {
      doPlaceBid(team, currentBid);
      return;
    }

    // Same team cannot outbid themselves
    if (leadingTeam?.No === team.No) return;

    const inc    = smartIncrement(currentBid);
    const newBid = currentBid + inc;
    if (newBid > team.balance) return;
    doPlaceBid(team, newBid);
  }, [auctionState, currentBid, leadingTeam, doPlaceBid]);

  // ─── Custom amount bid ────────────────────────────────────────────────────────
  const onCustomBid = useCallback((amount, teamNo) => {
    const amt  = parseInt(amount);
    const team = teams.find(t => t.No === (teamNo ?? leadingTeam?.No));
    if (!team)                                                 return "Select a team first";
    if (!amt || amt <= currentBid)                             return `Bid must exceed ${fmt(currentBid)}`;
    if (amt > team.balance)                                    return `${team.Name} only has ${fmt(team.balance)}`;
    if (team.squadPlayers.length >= parseInt(team.maxPlayers)) return `${team.Name} roster is full`;
    doPlaceBid(team, amt);
    return null;
  }, [teams, leadingTeam, currentBid, doPlaceBid]);

  // ─── Select player ────────────────────────────────────────────────────────────
  const initPlayer = useCallback((p) => {
    const category = (p.category || p.Category || "").toString().trim();
    const base = getCategoryBasePrice(category);
    setBasePrice(base);

    clearInterval(timerRef.current);
    clearTimeout(autoRef.current);
    setCurrentPlayer(p);
    setAuctionState("idle");
    setCurrentBid(0);
    setLeadingTeam(null);
    setBidHistory([]);
    setTimerActive(false);
    setTimer(timerDuration);

    // ✅ FIX: Write immediately — clears previous sold/bid/team so LiveScreen
    // never shows the new player as "sold to previous team"
    writeLive("idle", p, 0, null, []);

    addLog(`👤 Up next: ${p.name ?? p.Name}`, "info");
    addLog(`🏷️ Category ${category} base price ${fmt(base)}`, "info");
  }, [timerDuration]);

  // ─── Start bidding ────────────────────────────────────────────────────────────
  const startBidding = useCallback(() => {
    if (!currentPlayer) return;
    const bp = parseInt(basePrice) || 500;
    setCurrentBid(bp);
    setLeadingTeam(null);
    setBidHistory([]);
    setAuctionState("bidding");
    resetTimer(timerDuration);

    // ✅ FIX: LiveScreen sees "bidding" + base price instantly
    writeLive("bidding", currentPlayer, bp, null, []);

    addLog(`🎯 Auction: ${currentPlayer.name ?? currentPlayer.Name}`, "start");
    addLog(`💰 Base: ${fmt(bp)}`, "info");
  }, [currentPlayer, basePrice, resetTimer, timerDuration]);

  // ─── Sell ─────────────────────────────────────────────────────────────────────
  const _sell = useCallback(() => {
    if (!leadingTeam || !currentPlayer) return;
    clearInterval(timerRef.current);
    setTimerActive(false);
    const price = currentBid; const team = leadingTeam; const player = currentPlayer;
    setTeams(prev => prev.map(t =>
      t.No === team.No
        ? { ...t, balance: t.balance - price, squadPlayers: [...t.squadPlayers, { ...player, soldFor: price }] }
        : t
    ));
    setSoldPlayers(prev => [...prev, { player, team, price }]);
    addLog(`✅ SOLD! ${player.name ?? player.Name} → ${team.Name} for ${fmt(price)}`, "sold");
    playSound("sold");
    fireConfetti();
    setAuctionState("sold");

    // ✅ FIX: Write correct player + team + price — LiveScreen shows the right data
    writeLive("sold", player, price, team, []);

    setTimeout(() => {
      setCurrentPlayer(null);
      setAuctionState("idle");
      // ✅ FIX: Clear to idle so next player select starts clean
      writeLive("idle", null, 0, null, []);
    }, 3000);
  }, [leadingTeam, currentPlayer, currentBid]);

  // ─── Unsold ───────────────────────────────────────────────────────────────────
  const _unsold = useCallback(() => {
    if (!currentPlayer) return;
    clearInterval(timerRef.current);
    setTimerActive(false);
    const player = currentPlayer;
    setUnsoldPlayers(prev => [...prev, player]);
    addLog(`❌ UNSOLD: ${player.name ?? player.Name}`, "unsold");
    playSound("unsold");
    setAuctionState("unsold");

    // ✅ FIX: Write unsold state with correct player
    writeLive("unsold", player, currentBid, null, []);

    setTimeout(() => {
      setCurrentPlayer(null);
      setAuctionState("idle");
      writeLive("idle", null, 0, null, []);
    }, 2000);
  }, [currentPlayer, currentBid]);

  // Wire refs so the timer interval can call _sell/_unsold without stale closures
  sellRef.current   = _sell;
  unsoldRef.current = _unsold;

  // ─── Undo last bid ────────────────────────────────────────────────────────────
  const undoLastBid = useCallback(() => {
    if (bidHistory.length < 2) {
      const bp = parseInt(basePrice) || 500;
      setCurrentBid(bp); setLeadingTeam(null); setBidHistory([]);
      writeLive("bidding", currentPlayer, bp, null, []);
      addLog(`↩️ Undo — back to base ${fmt(bp)}`, "info");
      resetTimer();
      return;
    }
    const prev       = bidHistory[bidHistory.length - 2];
    const newHistory = bidHistory.slice(0, -1);
    setBidHistory(newHistory);
    setCurrentBid(prev.amount);
    setLeadingTeam(prev.team);
    writeLive("bidding", currentPlayer, prev.amount, prev.team, newHistory.slice(0, 8));
    addLog(`↩️ Undo — ${prev.team.Name} leads at ${fmt(prev.amount)}`, "info");
    resetTimer();
  }, [bidHistory, basePrice, currentPlayer, resetTimer]);

  // ─── Admin fixes ──────────────────────────────────────────────────────────────
  const adminUndoSold = useCallback((idx) => {
    const e = soldPlayers[idx]; if (!e) return;
    setTeams(prev => prev.map(t => t.No === e.team.No
      ? { ...t, balance: t.balance + e.price, squadPlayers: t.squadPlayers.filter(p => p.No !== e.player.No) }
      : t
    ));
    setSoldPlayers(prev => prev.filter((_, i) => i !== idx));
    addLog(`🔧 Reversed: ${e.player.name ?? e.player.Name} back to pool`, "admin");
  }, [soldPlayers]);

  const adminMoveToUnsold = useCallback((idx) => {
    const e = soldPlayers[idx]; if (!e) return;
    setTeams(prev => prev.map(t => t.No === e.team.No
      ? { ...t, balance: t.balance + e.price, squadPlayers: t.squadPlayers.filter(p => p.No !== e.player.No) }
      : t
    ));
    setSoldPlayers(prev => prev.filter((_, i) => i !== idx));
    setUnsoldPlayers(prev => [...prev, e.player]);
    addLog(`🔧 Moved to unsold: ${e.player.name ?? e.player.Name}`, "admin");
  }, [soldPlayers]);

  const adminReassign = useCallback((soldIdx, newTeamNo) => {
    const e = soldPlayers[soldIdx]; const newTeam = teams.find(t => t.No === newTeamNo);
    if (!e || !newTeam) return null;
    if (newTeam.balance < e.price) return `${newTeam.Name} can't afford ${fmt(e.price)}`;
    setTeams(prev => prev.map(t => {
      if (t.No === e.team.No) return { ...t, balance: t.balance + e.price, squadPlayers: t.squadPlayers.filter(p => p.No !== e.player.No) };
      if (t.No === newTeamNo) return { ...t, balance: t.balance - e.price, squadPlayers: [...t.squadPlayers, { ...e.player, soldFor: e.price }] };
      return t;
    }));
    setSoldPlayers(prev => prev.map((x, i) => i === soldIdx ? { ...x, team: newTeam } : x));
    addLog(`🔧 Reassigned: ${e.player.name ?? e.player.Name} → ${newTeam.Name}`, "admin");
    return null;
  }, [soldPlayers, teams]);

  const adminReAuction = useCallback((playerNo) => {
    const p = unsoldPlayers.find(u => u.No === playerNo); if (!p) return;
    setUnsoldPlayers(prev => prev.filter(u => u.No !== playerNo));
    addLog(`🔄 Re-auctioning: ${p.name ?? p.Name}`, "info");
    initPlayer(p);
    return p;
  }, [unsoldPlayers, initPlayer]);

  const adminReAuctionAll = useCallback(() => {
    addLog(`🔄 All ${unsoldPlayers.length} unsold returned to pool`, "info");
    setUnsoldPlayers([]);
  }, [unsoldPlayers]);

  // ─── Full reset ───────────────────────────────────────────────────────────────
  const resetAuction = useCallback(() => {
    if (!window.confirm("Full reset? All bids and squads will be cleared.")) return;
    clearInterval(timerRef.current); clearTimeout(autoRef.current);
    setSoldPlayers([]); setUnsoldPlayers([]); setCurrentPlayer(null);
    setCurrentBid(0); setLeadingTeam(null); setLog([]); setBidHistory([]);
    setAuctionState("idle"); setTimerActive(false);
    Object.values(LS).forEach(k => localStorage.removeItem(k));
    writeLive("idle", null, 0, null, []);
    const teamCsv = localStorage.getItem(LS.TEAMS);
    if (teamCsv) Papa.parse(teamCsv, {
      header: true, skipEmptyLines: true,
      complete: r => setTeams(r.data.map(t => ({
        ...t, balance: parseInt(t.balance) || 100000,
        maxPlayers: parseInt(t.maxPlayers) || 15, squadPlayers: [],
      }))),
    });
  }, []);

  // ─── Derived ──────────────────────────────────────────────────────────────────
  const soldNos   = new Set(soldPlayers.map(s => s.player.No));
  const unsoldNos = new Set(unsoldPlayers.map(u => u.No));
  const getAvailable = (category, search) => allPlayers.filter(p => {
    if (soldNos.has(p.No) || unsoldNos.has(p.No)) return false;
    if (currentPlayer && p.No === currentPlayer.No) return false;
    const cat = (p.category || p.Category || "").toString().trim();
    if (category && category !== "All" && cat !== category) return false;
    if (search && !(p.name ?? p.Name ?? "").toLowerCase().includes(search.toLowerCase())) return false;
    return true;
  });

  const uniqueCategories = ["All", ...new Set(
    allPlayers.map(p => (p.category || p.Category || "").toString().trim()).filter(Boolean)
  )];

  return {
    // data
    allPlayers, teams, initialBalances,
    // state
    auctionState, currentPlayer, currentBid, leadingTeam,
    soldPlayers, unsoldPlayers, bidHistory, log,
    basePrice, setBasePrice,
    timer, timerEnabled, setTimerEnabled, timerDuration, setTimerDuration,
    // actions
    initPlayer, startBidding,
    onTeamClick, onCustomBid, undoLastBid,
    handleSell: _sell, handleUnsold: _unsold,
    adminUndoSold, adminMoveToUnsold, adminReassign, adminReAuction, adminReAuctionAll,
    resetAuction,
    // derived
    getAvailable, uniqueCategories,
  };
}