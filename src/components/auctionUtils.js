// ─── Image helpers ────────────────────────────────────────────────────────────
export const imgProps = (url) => {
  if (url?.includes("googleusercontent.com") || url?.includes("drive.google.com"))
    return { referrerPolicy: "no-referrer", crossOrigin: "anonymous" };
  return {};
};

// ─── Currency format ─────────────────────────────────────────────────────────
export const fmt = (n) => `₹${Number(n).toLocaleString("en-IN")}`;

// ─── Smart bid increment (reads custom rules from localStorage) ───────────────
export const smartIncrement = (currentBid) => {
  const defaultRules = [
    { max: 2000,  increment: 500 },
    { max: 5000,  increment: 1000 },
    { max: 10000, increment: 2000 },
    { max: 20000, increment: 5000 },
    { max: 50000, increment: 10000 },
    { max: null,  increment: 25000 },
  ];

  const stored = localStorage.getItem("auction_bid_rules");
  const rules = stored ? JSON.parse(stored) : defaultRules;

  for (const rule of rules) {
    if (rule.max === null || currentBid < rule.max) return rule.increment;
  }
  return 1000;
};

// ─── Category base price ──────────────────────────────────────────────────────
export const getCategoryBasePrice = (category) => {
  const stored = localStorage.getItem("auction_category_base_prices");
  const defaults = { A: 1000, B: 500, C: 300, D: 200 };
  const map = stored ? JSON.parse(stored) : defaults;
  return map[category] ?? 500;
};

// ─── Category from CSV's category column (A/B/C or any string) ───────────────
export const getCategory = (player) =>
  (player.category || player.Category || "—").toString().trim();

// Category badge colours
const CAT_PALETTE = [
  "bg-yellow-500/15 text-yellow-400 border-yellow-500/30",
  "bg-blue-500/15 text-blue-400 border-blue-500/30",
  "bg-purple-500/15 text-purple-400 border-purple-500/30",
  "bg-emerald-500/15 text-emerald-400 border-emerald-500/30",
  "bg-rose-500/15 text-rose-400 border-rose-500/30",
  "bg-orange-500/15 text-orange-400 border-orange-500/30",
  "bg-teal-500/15 text-teal-400 border-teal-500/30",
];
const _catMap = {};
let _idx = 0;
export const catColor = (cat) => {
  if (!_catMap[cat]) { _catMap[cat] = CAT_PALETTE[_idx % CAT_PALETTE.length]; _idx++; }
  return _catMap[cat];
};

// ─── Audio ────────────────────────────────────────────────────────────────────
export const playSound = (type) => {
  try {
    const ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (type === "bid") {
      const osc = ctx.createOscillator(); const g = ctx.createGain();
      osc.connect(g); g.connect(ctx.destination);
      osc.frequency.value = 880; g.gain.value = 0.08;
      osc.start(); setTimeout(() => osc.stop(), 80);
    }
    if (type === "sold") {
      [523, 659, 784, 1047].forEach((f, i) => {
        const osc = ctx.createOscillator(); const g = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.frequency.value = f; g.gain.value = 0.12;
        osc.start(ctx.currentTime + i * 0.12);
        osc.stop(ctx.currentTime + i * 0.12 + 0.15);
      });
    }
    if (type === "unsold") {
      [300, 220, 180].forEach((f, i) => {
        const osc = ctx.createOscillator(); const g = ctx.createGain();
        osc.connect(g); g.connect(ctx.destination);
        osc.frequency.value = f; g.gain.value = 0.07;
        osc.start(ctx.currentTime + i * 0.15);
        osc.stop(ctx.currentTime + i * 0.15 + 0.18);
      });
    }
  } catch (_) {}
};

// ─── Confetti burst ───────────────────────────────────────────────────────────
export const fireConfetti = () => {
  const canvas = document.createElement("canvas");
  canvas.style.cssText = "position:fixed;top:0;left:0;width:100%;height:100%;pointer-events:none;z-index:9999;";
  document.body.appendChild(canvas);
  const ctx2 = canvas.getContext("2d");
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;

  const particles = Array.from({ length: 160 }, () => ({
    x: Math.random() * canvas.width,
    y: -10 - Math.random() * 100,
    r: 6 + Math.random() * 8,
    d: 4 + Math.random() * 6,
    color: `hsl(${Math.random() * 360},90%,60%)`,
    tilt: Math.random() * 10 - 5,
    tiltAngle: 0,
    tiltSpeed: 0.1 + Math.random() * 0.2,
    vx: Math.random() * 4 - 2,
  }));

  let frame = 0;
  const draw = () => {
    ctx2.clearRect(0, 0, canvas.width, canvas.height);
    particles.forEach(p => {
      ctx2.beginPath();
      ctx2.lineWidth = p.r / 2;
      ctx2.strokeStyle = p.color;
      ctx2.moveTo(p.x + p.tilt + p.r / 4, p.y);
      ctx2.lineTo(p.x + p.tilt, p.y + p.tilt + p.r / 2);
      ctx2.stroke();
      p.tiltAngle += p.tiltSpeed;
      p.y += p.d;
      p.x += p.vx;
      p.tilt = Math.sin(p.tiltAngle) * 12;
    });
    frame++;
    if (frame < 180) requestAnimationFrame(draw);
    else canvas.remove();
  };
  requestAnimationFrame(draw);
};

// ─── localStorage keys ────────────────────────────────────────────────────────
export const LS = {
  PLAYERS:    "playerDetails",
  TEAMS:      "teamDetails",
  TEAM_STATE: "auctionTeamState",
  SOLD:       "auctionSold",
  UNSOLD:     "auctionUnsold",
  LOG:        "auctionLog",
  CURRENT:    "auctionCurrent",
  // ✅ Single source of truth for LiveScreen — written directly by useAuction
  LIVE_STATE: "auctionLiveState",
};