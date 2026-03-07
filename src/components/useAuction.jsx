import { useState, useEffect, useRef, useCallback } from "react";
import Papa from "papaparse";
import { fmt, smartIncrement, playSound, fireConfetti, LS } from "./auctionUtils";
import { getCategoryBasePrice } from "./auctionUtils";

const TIMER_DURATION = 15;

export default function useAuction() {
  // ── raw data
  const [allPlayers, setAllPlayers]     = useState([]);
  const [teams, setTeams]               = useState([]);
  const [initialBalances, setInitialBalances] = useState({});

  // ── auction core
  const [auctionState, setAuctionState] = useState("idle"); // idle|bidding|sold|unsold
  const [currentPlayer, setCurrentPlayer] = useState(null);
  const [currentBid, setCurrentBid]     = useState(0);
  const [leadingTeam, setLeadingTeam]   = useState(null);
  const [soldPlayers, setSoldPlayers]   = useState([]);
  const [unsoldPlayers, setUnsoldPlayers] = useState([]);
  const [bidHistory, setBidHistory]     = useState([]);
  const [log, setLog]                   = useState([]);
  const [basePrice, setBasePrice]       = useState(500);

  // ── timer
  const [timer, setTimer]               = useState(TIMER_DURATION);
  const [timerActive, setTimerActive]   = useState(false);
  const [timerEnabled, setTimerEnabled] = useState(true);
  const [timerDuration, setTimerDuration] = useState(TIMER_DURATION);

  const timerRef = useRef(null);
  const autoRef  = useRef(null);

  // ─── Load ───────────────────────────────────────────────────────────────
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

          const saved      = localStorage.getItem(LS.TEAM_STATE);
          const savedSold  = localStorage.getItem(LS.SOLD);
          const savedUnsold= localStorage.getItem(LS.UNSOLD);
          const savedLog   = localStorage.getItem(LS.LOG);
          const savedCur   = localStorage.getItem(LS.CURRENT);
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
            balance: parseInt(t.balance) || 100000,
            maxPlayers: parseInt(t.maxPlayers) || 15,
            squadPlayers: [],
          })));
        },
      });
    }
  }, []);

  // ─── Persist ────────────────────────────────────────────────────────────
  useEffect(() => { if (teams.length)         localStorage.setItem(LS.TEAM_STATE, JSON.stringify(teams)); }, [teams]);
  useEffect(() => { if (soldPlayers.length)   localStorage.setItem(LS.SOLD,       JSON.stringify(soldPlayers)); }, [soldPlayers]);
  useEffect(() => { if (unsoldPlayers.length) localStorage.setItem(LS.UNSOLD,     JSON.stringify(unsoldPlayers)); }, [unsoldPlayers]);
  useEffect(() => { if (log.length)           localStorage.setItem(LS.LOG,        JSON.stringify(log.slice(-100))); }, [log]);
  useEffect(() => { localStorage.setItem(LS.CURRENT, JSON.stringify(currentPlayer)); }, [currentPlayer]);

  // ─── Timer ──────────────────────────────────────────────────────────────
  useEffect(() => {
    clearInterval(timerRef.current);
    if (!timerActive || !timerEnabled) return;
    if (timer <= 0) {
      setTimerActive(false);
      if (auctionState === "bidding") leadingTeam ? _sell() : _unsold();
      return;
    }
    timerRef.current = setInterval(() => setTimer(t => t - 1), 1000);
    return () => clearInterval(timerRef.current);
  }, [timerActive, timer, timerEnabled]);

  // ─── Helpers ────────────────────────────────────────────────────────────
  const addLog = (msg, type = "info") => {
    const time = new Date().toLocaleTimeString("en-IN", { hour: "2-digit", minute: "2-digit", second: "2-digit" });
    setLog(prev => [...prev.slice(-99), { msg, type, time }]);
  };

  const resetTimer = useCallback((dur) => {
    clearInterval(timerRef.current);
    const d = dur ?? timerDuration;
    setTimer(d);
    if (timerEnabled) setTimerActive(true);
  }, [timerEnabled, timerDuration]);

  // ─── Core bid ───────────────────────────────────────────────────────────
  const doPlaceBid = useCallback((team, amount) => {
    setCurrentBid(amount);
    setLeadingTeam(team);
    setCustomBid && setCustomBid("");
    setBidHistory(prev => [...prev, { team, amount }]);
    addLog(`🏷️ ${team.Name} bids ${fmt(amount)}`, "bid");
    playSound("bid");
    resetTimer();
  }, [resetTimer]);

  // ─── One-click team bid (smart increment) ───────────────────────────────
  // const onTeamClick = useCallback((team) => {
  //   if (auctionState !== "bidding") return;
  //   const canBid = team.balance > currentBid && team.squadPlayers.length < parseInt(team.maxPlayers);
  //   if (!canBid || leadingTeam?.No === team.No) return;
  //   const inc    = smartIncrement(currentBid);
  //   const newBid = currentBid + inc;
  //   if (newBid > team.balance) return;
  //   doPlaceBid(team, newBid);
  // }, [auctionState, currentBid, leadingTeam, doPlaceBid]);
  const onTeamClick = useCallback((team) => {
  if (auctionState !== "bidding") return;

  const canBid =
    team.balance >= currentBid &&
    team.squadPlayers.length < parseInt(team.maxPlayers);

  if (!canBid) return;

  // 🚨 FIRST BID (base price)
  if (!leadingTeam) {
    doPlaceBid(team, currentBid); // base price only
    return;
  }

  // same team cannot bid again
  if (leadingTeam?.No === team.No) return;

  const inc = smartIncrement(currentBid);
  const newBid = currentBid + inc;

  if (newBid > team.balance) return;

  doPlaceBid(team, newBid);

}, [auctionState, currentBid, leadingTeam, doPlaceBid]);

  // ─── Custom amount bid ───────────────────────────────────────────────────
  const onCustomBid = useCallback((amount, teamNo) => {
    const amt  = parseInt(amount);
    const team = teams.find(t => t.No === (teamNo ?? leadingTeam?.No));
    if (!team)         { return "Select a team first"; }
    if (!amt || amt <= currentBid) { return `Bid must exceed ${fmt(currentBid)}`; }
    if (amt > team.balance)        { return `${team.Name} only has ${fmt(team.balance)}`; }
    if (team.squadPlayers.length >= parseInt(team.maxPlayers)) { return `${team.Name} roster is full`; }
    doPlaceBid(team, amt);
    return null;
  }, [teams, leadingTeam, currentBid, doPlaceBid]);

  // ─── Select player ───────────────────────────────────────────────────────
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
      addLog(`👤 Up next: ${p.name ?? p.Name}`, "info");
  addLog(`🏷️ Category ${category} base price ${fmt(base)}`, "info");
  }, [timerDuration]);

  const startBidding = useCallback(() => {
    if (!currentPlayer) return;
    const bp = parseInt(basePrice) || 500;
    setCurrentBid(bp);
    setLeadingTeam(null);
    setBidHistory([]);
    setAuctionState("bidding");
    resetTimer(timerDuration);
    addLog(`🎯 Auction: ${currentPlayer.name ?? currentPlayer.Name}`, "start");
    addLog(`💰 Base: ${fmt(bp)}`, "info");
  }, [currentPlayer, basePrice, resetTimer, timerDuration]);

  // ─── Sell ────────────────────────────────────────────────────────────────
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
    setTimeout(() => { setCurrentPlayer(null); setAuctionState("idle"); }, 3000);
  }, [leadingTeam, currentPlayer, currentBid]);

  // ─── Unsold ──────────────────────────────────────────────────────────────
  const _unsold = useCallback(() => {
    if (!currentPlayer) return;
    clearInterval(timerRef.current);
    setTimerActive(false);
    setUnsoldPlayers(prev => [...prev, currentPlayer]);
    addLog(`❌ UNSOLD: ${currentPlayer.name ?? currentPlayer.Name}`, "unsold");
    playSound("unsold");
    setAuctionState("unsold");
    setTimeout(() => { setCurrentPlayer(null); setAuctionState("idle"); }, 2000);
  }, [currentPlayer]);

  // ─── Undo last bid ───────────────────────────────────────────────────────
  const undoLastBid = useCallback(() => {
    if (bidHistory.length < 2) {
      const bp = parseInt(basePrice) || 500;
      setCurrentBid(bp); setLeadingTeam(null); setBidHistory([]);
      addLog(`↩️ Undo — back to base ${fmt(bp)}`, "info");
      resetTimer();
      return;
    }
    const prev = bidHistory[bidHistory.length - 2];
    setBidHistory(h => h.slice(0, -1));
    setCurrentBid(prev.amount); setLeadingTeam(prev.team);
    addLog(`↩️ Undo — ${prev.team.Name} leads at ${fmt(prev.amount)}`, "info");
    resetTimer();
  }, [bidHistory, basePrice, resetTimer]);

  // ─── Admin fixes ─────────────────────────────────────────────────────────
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
      if (t.No === e.team.No)  return { ...t, balance: t.balance + e.price, squadPlayers: t.squadPlayers.filter(p => p.No !== e.player.No) };
      if (t.No === newTeamNo)  return { ...t, balance: t.balance - e.price, squadPlayers: [...t.squadPlayers, { ...e.player, soldFor: e.price }] };
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

  // ─── Full reset ──────────────────────────────────────────────────────────
  const resetAuction = useCallback(() => {
    if (!window.confirm("Full reset? All bids and squads will be cleared.")) return;
    clearInterval(timerRef.current); clearTimeout(autoRef.current);
    setSoldPlayers([]); setUnsoldPlayers([]); setCurrentPlayer(null);
    setCurrentBid(0); setLeadingTeam(null); setLog([]); setBidHistory([]);
    setAuctionState("idle"); setTimerActive(false);
    Object.values(LS).forEach(k => localStorage.removeItem(k));
    const teamCsv = localStorage.getItem(LS.TEAMS);
    if (teamCsv) Papa.parse(teamCsv, {
      header: true, skipEmptyLines: true,
      complete: r => setTeams(r.data.map(t => ({
        ...t, balance: parseInt(t.balance) || 100000,
        maxPlayers: parseInt(t.maxPlayers) || 15, squadPlayers: [],
      }))),
    });
  }, []);

  // ─── Derived ─────────────────────────────────────────────────────────────
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

  const uniqueCategories = ["All", ...new Set(allPlayers.map(p => (p.category || p.Category || "").toString().trim()).filter(Boolean))];

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