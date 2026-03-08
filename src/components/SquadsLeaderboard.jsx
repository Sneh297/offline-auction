import React, { useState, useCallback } from "react";
import { fmt, getCategory, catColor } from "./auctionUtils";
import { Avatar } from "./AuctionComponents";

// ─── PDF Theme & Color Palette ────────────────────────────────────────────────
const DARK    = [13,  15,  20];
const CARD_BG = [26,  30,  44];  
const PANEL   = [19,  22,  30];
const BORDER  = [41,  45,  60];
const WHITE   = [255, 255, 255];
const SLATE   = [148, 163, 184];
const SLATE6  = [71,  85,  105];
const INDIG   = [99,  102, 241];
const EMERA   = [16,  185, 129];
const RED     = [239, 68,  68 ];
const GOLD    = [234, 179, 8  ];

const fmtNum = (n) => Number(n).toLocaleString("en-IN");

// ─── HIGH DEFINITION IMAGE LOADER (Fixes Pixelation & Google Drive) ───────────
async function loadImgBase64(rawUrl) {
  if (!rawUrl) return null;
  let targetUrl = rawUrl;

  // FIX: Convert Google Drive "view" links to direct High-Res download links
  const driveMatch = targetUrl.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (driveMatch) {
    targetUrl = `https://drive.google.com/uc?export=view&id=${driveMatch[1]}`;
  }

  const tryLoad = (url) => new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "Anonymous"; // Required for cross-origin canvas export
    img.onload = () => {
      try {
        const canvas = document.createElement("canvas");
        // FIX: Boosted resolution from 150 to 400 for crisp PDF printing
        const size = 400; 
        canvas.width = size; 
        canvas.height = size;
        const ctx = canvas.getContext("2d");
        
        // FIX: Force High-Quality Image Smoothing
        ctx.imageSmoothingEnabled = true;
        ctx.imageSmoothingQuality = "high";
        
        // Fill dark background for transparent PNGs
        ctx.fillStyle = "#1a1e2c";
        ctx.fillRect(0, 0, size, size);

        // Aspect-fill crop (prevents stretching)
        const scale = Math.max(size / img.width, size / img.height);
        const w = img.width * scale;
        const h = img.height * scale;
        const x = (size - w) / 2;
        const y = (size - h) / 2;

        ctx.drawImage(img, x, y, w, h);
        
        // Export at 100% quality (1.0)
        resolve(canvas.toDataURL("image/jpeg", 1.0));
      } catch (e) {
        reject(e); // Fails if server strictly taints canvas
      }
    };
    img.onerror = reject;
    img.src = url;
  });

  try {
    return await tryLoad(targetUrl); // Attempt direct load
  } catch (err) {
    try {
      // Proxy fallback if standard fetch is blocked by CORS
      const proxyUrl = `https://corsproxy.io/?${encodeURIComponent(targetUrl)}`;
      return await tryLoad(proxyUrl);
    } catch (proxyErr) {
      return null; // Both failed, trigger Initials Placeholder
    }
  }
}

function rl(doc, x, y, w, h, r, [R,G,B]) {
  doc.setFillColor(R,G,B);
  doc.roundedRect(x, y, w, h, r, r, 'F');
}

const CAT_COLORS = [
  [234,179,8],[99,102,241],[139,92,246],[16,185,129],[239,68,68],[249,115,22],[20,184,166]
];
const _catColorMap = {};
let _catIdx = 0;
function pdfCatColor(cat) {
  if (!_catColorMap[cat]) { _catColorMap[cat] = CAT_COLORS[_catIdx % CAT_COLORS.length]; _catIdx++; }
  return _catColorMap[cat];
}

// ─── Core PDF Generator (Landscape Broadcast Layout) ──────────────────────────
async function generateAuctionPDF(teams, soldPlayers, initialBalances, downloadAllAsZip = false) {
  if (!window.jspdf) {
    alert("jsPDF library not loaded. Add CDN to index.html"); return;
  }
  if (downloadAllAsZip && !window.JSZip) {
    alert("JSZip library not loaded. Add CDN to index.html"); return;
  }

  const { jsPDF } = window.jspdf;
  const pageW = 297; // Landscape A4
  const pageH = 210;
  const M = 15;

  // 1. Pre-fetch ALL images
  const imageCache = {};
  const urls = new Set();
  teams.forEach(t => { if(t.Logo || t.logo) urls.add(t.Logo || t.logo); });
  teams.forEach(t => t.squadPlayers.forEach(p => { 
    if(p.photourl || p.photoURL) urls.add(p.photourl || p.photoURL); 
  }));

  await Promise.all(Array.from(urls).map(async (url) => {
    const b64 = await loadImgBase64(url);
    if (b64) imageCache[url] = b64;
  }));

  function drawTeamPage(doc, team) {
    doc.setFillColor(...DARK);
    doc.rect(0, 0, pageW, pageH, 'F');

    // Top Header Banner
    rl(doc, 0, 0, pageW, 35, 0, PANEL);
    doc.setFillColor(...INDIG);
    doc.rect(0, 35, pageW, 1.5, 'F');

    const logo = imageCache[team.Logo || team.logo];
    if (logo) {
      doc.addImage(logo, "JPEG", M, 4, 26, 26);
    }

    doc.setFont("helvetica", "bold");
    doc.setFontSize(26);
    doc.setTextColor(...WHITE);
    doc.text(team.Name.toUpperCase(), 48, 20);

    const spent = team.squadPlayers.reduce((s, p) => s + (parseInt(p.soldFor) || 0), 0);
    doc.setFontSize(10);
    
    doc.setTextColor(...SLATE);
    doc.text(`SQUAD:`, 48, 28);
    doc.setTextColor(...WHITE);
    doc.text(`${team.squadPlayers.length}`, 65, 28);
    
    doc.setTextColor(...SLATE);
    doc.text(`SPENT:`, 90, 28);
    doc.setTextColor(...RED);
    doc.text(`Rs. ${fmtNum(spent)}`, 108, 28); 
    
    doc.setTextColor(...SLATE);
    doc.text(`BALANCE:`, 150, 28);
    doc.setTextColor(...EMERA);
    doc.text(`Rs. ${fmtNum(team.balance)}`, 172, 28);

    // Player Cards Grid (3 Columns)
    let px = M;
    let py = 45;
    const cardW = 86; 
    const cardH = 38;

    team.squadPlayers.forEach((p, i) => {
      rl(doc, px, py, cardW, cardH, 3, CARD_BG);
      doc.setDrawColor(...BORDER);
      doc.setLineWidth(0.4);
      doc.roundedRect(px, py, cardW, cardH, 3, 3, 'S');

      const photo = imageCache[p.photourl || p.photoURL];
      let nameStr = (p.name || p.Name || "Unknown").toUpperCase();

      if (photo) {
        // FIX: Removed 'FAST' compression parameter so jsPDF retains High Definition
        doc.addImage(photo, "JPEG", px + 3, py + 3, 32, 32);
      } else {
        // FIX: Fallback to a clear, bold Initial if photo fails (Fixes empty boxes)
        const cCol = pdfCatColor(getCategory(p));
        rl(doc, px + 3, py + 3, 32, 32, 2, [cCol[0]*0.2 + 20, cCol[1]*0.2 + 20, cCol[2]*0.2 + 25]); 
        doc.setFontSize(20);
        doc.setTextColor(...cCol);
        doc.text(nameStr.charAt(0), px + 19, py + 23, { align: "center" });
      }

      // Details (Right Side)
      doc.setFontSize(10);
      doc.setTextColor(...WHITE);
      doc.setFont("helvetica", "bold");
      if(nameStr.length > 17) nameStr = nameStr.substring(0, 15) + '..';
      doc.text(nameStr, px + 39, py + 12);

      // Category Tag
      const cat = getCategory(p);
      const cCol = pdfCatColor(cat);
      doc.setFontSize(8);
      doc.setTextColor(...cCol);
      doc.text(cat.toUpperCase(), px + 39, py + 21);

      // Price Tag
      doc.setFontSize(12);
      doc.setTextColor(...EMERA);
      doc.text(`Rs. ${fmtNum(p.soldFor)}`, px + 39, py + 31);

      // Math for 3-column Grid
      px += cardW + 5;
      if (px + cardW > pageW) { 
        px = M;
        py += cardH + 5;
      }

      // Page Overflow Math
      if (py + cardH > pageH - 10 && i < team.squadPlayers.length - 1) { 
        doc.addPage();
        doc.setFillColor(...DARK);
        doc.rect(0, 0, pageW, pageH, 'F');
        py = M;
        px = M;
      }
    });
  }

  // 3. Execution
  if (downloadAllAsZip) {
    const zip = new window.JSZip();
    for (const team of teams) {
      const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
      drawTeamPage(doc, team);
      const pdfBlob = doc.output('blob');
      zip.file(`${team.Name.replace(/\s/g, '_')}_Squad.pdf`, pdfBlob);
    }
    const content = await zip.generateAsync({ type: "blob" });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(content);
    link.download = `Auction_Squads.zip`;
    link.click();
  } else {
    const doc = new jsPDF({ orientation: 'landscape', unit: 'mm', format: 'a4' });
    teams.forEach((team, index) => {
      if (index > 0) doc.addPage();
      drawTeamPage(doc, team);
    });
    doc.save(`Complete_Report.pdf`);
  }
}

// ─── Download Button Component ────────────────────────────────────────────────
function DownloadButton({ teams, soldPlayers, initialBalances }) {
  const [status, setStatus] = useState("idle");

  const handleDownload = useCallback(async (isZip) => {
    setStatus(isZip ? "zipping" : "pdfing");
    try {
      await generateAuctionPDF(teams, soldPlayers, initialBalances, isZip);
      setStatus("done");
      setTimeout(() => setStatus("idle"), 3000);
    } catch (e) {
      console.error(e);
      setStatus("error");
      setTimeout(() => setStatus("idle"), 3000);
    }
  }, [teams, soldPlayers, initialBalances]);

  const isWorking = status === "zipping" || status === "pdfing";

  return (
    <div className="flex gap-2">
      <button
        onClick={() => handleDownload(false)}
        disabled={isWorking || !teams.length}
        className="flex items-center gap-2 px-4 py-2 bg-slate-800 text-white rounded-xl text-xs font-bold hover:bg-slate-700 transition-all border border-slate-700 disabled:opacity-40"
      >
        {status === "pdfing" ? "Generating..." : "📄 Full Report"}
      </button>
      
      <button
        onClick={() => handleDownload(true)}
        disabled={isWorking || !teams.length}
        className="flex items-center gap-2 px-4 py-2 bg-indigo-600 text-white rounded-xl text-xs font-bold hover:bg-indigo-500 shadow-lg shadow-indigo-500/20 transition-all disabled:opacity-40"
      >
        {status === "zipping" ? "Zipping..." : "📦 Download All (.ZIP)"}
      </button>
    </div>
  );
}

// ─── Squads Tab ───────────────────────────────────────────────────────────────
export function SquadsTab({ teams, initialBalances, soldPlayers = [] }) {
  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-100">Squad Overview</h2>
          <p className="text-xs text-slate-600 font-mono mt-0.5">
            {teams.length} teams · {teams.reduce((s,t)=>s+t.squadPlayers.length,0)} players acquired
          </p>
        </div>
        <DownloadButton teams={teams} soldPlayers={soldPlayers} initialBalances={initialBalances} />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
        {teams.map(team => {
          const spent    = team.squadPlayers.reduce((s, p) => s + (parseInt(p.soldFor) || 0), 0);
          const startBal = initialBalances[team.No] || parseInt(team.balance) || 100000;
          const pctLeft  = Math.max(0, Math.min(100, (team.balance / startBal) * 100));
          
          return (
            <div key={team.No} className="bg-[#13161e] border border-[#1f2330] rounded-2xl p-4 flex flex-col gap-3">
              <div className="flex items-center gap-3">
                <Avatar src={team.Logo} alt={team.Name} size="h-11 w-11" />
                <div className="flex-1 min-w-0">
                  <p className="font-black text-slate-100 truncate">{team.Name}</p>
                  <p className="text-xs text-slate-500 mt-0.5">
                    <span className="text-emerald-400 font-mono">₹{fmtNum(team.balance)}</span>
                    {" "}left · {team.squadPlayers.length}/{team.maxPlayers} players
                  </p>
                </div>
              </div>

              <div className="h-1.5 bg-[#1a1d28] rounded-full overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all ${pctLeft > 60 ? "bg-gradient-to-r from-indigo-500 to-violet-500" : pctLeft > 30 ? "bg-amber-500" : "bg-red-500"}`}
                  style={{ width: `${pctLeft}%` }}
                />
              </div>

              <div className="flex flex-col gap-1 max-h-52 overflow-y-auto">
                {!team.squadPlayers.length && (
                  <p className="text-xs text-slate-700 italic">No players yet</p>
                )}
                {team.squadPlayers.map((p, i) => (
                  <div key={i} className="flex items-center justify-between px-2 py-1.5 bg-[#1a1d28] rounded-lg">
                    <div className="flex items-center gap-2 min-w-0">
                      <Avatar src={p.photourl || p.photoURL} alt={p.name ?? p.Name} size="h-5 w-5" />
                      <span className="text-xs text-slate-300 truncate">{p.name ?? p.Name}</span>
                    </div>
                    <span className="text-[11px] text-emerald-400 font-mono shrink-0 ml-2">₹{fmtNum(p.soldFor)}</span>
                  </div>
                ))}
              </div>

              {team.squadPlayers.length > 0 && (
                <div className="mt-1 pt-2 border-t border-[#1f2330] flex justify-between text-xs text-slate-600">
                  <span>Total spent</span>
                  <span className="text-red-400 font-mono">₹{fmtNum(spent)}</span>
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
export function LeaderboardTab({ teams, initialBalances = {}, soldPlayers = [] }) {
  const sorted = [...teams].sort((a, b) => b.squadPlayers.length - a.squadPlayers.length);
  return (
    <div className="flex-1 overflow-y-auto p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-black text-slate-100">Leaderboard</h2>
          <p className="text-xs text-slate-600 font-mono mt-0.5">Ranked by squad size</p>
        </div>
        <DownloadButton teams={teams} soldPlayers={soldPlayers} initialBalances={initialBalances} />
      </div>

      <div className="max-w-3xl mx-auto w-full flex flex-col gap-3">
        {sorted.map((team, rank) => {
          const spent = team.squadPlayers.reduce((s, p) => s + (parseInt(p.soldFor) || 0), 0);
          return (
            <div key={team.No} className={`bg-[#13161e] border rounded-2xl p-4 flex items-center gap-4 transition-all ${
              rank === 0 ? "border-yellow-500/40 shadow-[0_0_20px_rgba(234,179,8,0.1)]" :
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
                  <p className="text-sm font-bold text-emerald-400 font-mono">₹{fmtNum(team.balance)}</p>
                </div>
                <div>
                  <p className="text-[10px] text-slate-600 mb-0.5">Spent</p>
                  <p className="text-sm font-bold text-red-400 font-mono">₹{fmtNum(spent)}</p>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}