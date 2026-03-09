const { jsPDF } = window.jspdf;


// Player List PDF — dark card-grid, 3 cols × 4 rows, landscape A4
// Requires: <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>

// Player List PDF — dark card-grid, 3 cols × 4 rows, landscape A4
// Requires: <script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>

const C = {
  BG:[10,14,31], CARD2:[17,23,47], CARD3:[11,17,38], BORD:[30,50,130],
  BLUE:[30,120,230], LBLUE:[64,153,255], GOLD:[234,179,8], EME:[16,185,129],
  ORG:[249,115,22], VIOL:[139,92,246], WHT:[255,255,255],
  SL3:[204,222,242], SL5:[89,110,143],
};
const CAT = {A:C.GOLD,B:C.LBLUE,C:C.EME,D:C.ORG,E:C.VIOL};
const catcol = c => CAT[String(c||"").trim().toUpperCase()]||C.VIOL;

function rr(doc,x,y,w,h,r,fill,stroke,lw=0.5){
  if(fill)   doc.setFillColor(...fill);
  if(stroke){ doc.setDrawColor(...stroke); doc.setLineWidth(lw); }
  doc.roundedRect(x,y,w,h,r,r,fill&&stroke?'FD':fill?'F':'D');
}

function trunc(doc,s,maxW,sz){
  doc.setFontSize(sz); s=String(s||"");
  while(s.length>3&&doc.getTextWidth(s)>maxW) s=s.slice(0,-2)+"\u2026";
  return s;
}

function pageBg(doc,W,H){
  doc.setFillColor(...C.BG); doc.rect(0,0,W,H,'F');
  doc.setDrawColor(25,43,102); doc.setLineWidth(0.15);
  for(let x=0;x<W;x+=8) doc.line(x,0,x,H);
  for(let y=0;y<H;y+=8) doc.line(0,y,W,y);
  doc.setFillColor(...C.BLUE); doc.rect(0,H-1.5,W,1.5,'F');
  doc.setFillColor(6,9,20); doc.rect(0,0,W,6,'F');
  doc.setDrawColor(...C.BLUE); doc.setLineWidth(0.4); doc.line(0,6,W,6);
}

function drawHeader(doc,total,W,H){
  doc.setFillColor(8,11,26); doc.rect(0,H-15,W,14,'F');
  doc.setDrawColor(...C.BORD); doc.setLineWidth(0.35); doc.line(0,H-15,W,H-15);
  doc.setFont("helvetica","bold"); doc.setFontSize(15);
  doc.setTextColor(...C.WHT); doc.text("PLAYER LIST",5,H-6);
  const tw=doc.getTextWidth("PLAYER LIST");
  rr(doc,5+tw+2,H-12.5,21,6,2.5,C.BLUE);
  doc.setFontSize(6); doc.setTextColor(...C.WHT);
  doc.text(`${total} PLAYERS`,5+tw+12.5,H-8.5,{align:"center"});
  doc.setFont("helvetica","normal"); doc.setFontSize(6); doc.setTextColor(...C.SL5);
  doc.text("OFFICIAL PLAYER CARD \u2022 CRICKET AUCTION PLATFORM",W-5,H-8,{align:"right"});
}

function drawFooter(doc,pg,tot,W){
  doc.setFont("helvetica","normal"); doc.setFontSize(5); doc.setTextColor(...C.SL5);
  doc.text("CRICKET AUCTION PLATFORM \u2022 PLAYER REGISTER",5,4);
  doc.text(`Page ${pg} of ${tot}`,W/2,4,{align:"center"});
  doc.text("OFFICIAL DOCUMENT",W-5,4,{align:"right"});
}

// ── Card renderer
// IMPORTANT: jsPDF y=0 is TOP of page, y increases DOWNWARD
// px,py = TOP-LEFT corner of card
function drawPlayerCard(doc,px,py,pw,ph,player,photoB64){
  const PAD=2, PHW=26;
  const PHH=ph-2*PAD, PHX=px+PAD, PHY=py+PAD;
  const TX=PHX+PHW+3.5, TW=pw-(TX-px)-PAD;

  // Shadow (offset down-right)
  doc.setFillColor(4,5,14);
  doc.rect(px+0.6,py+0.6,pw,ph,'F');

  // Card body
  rr(doc,px,py,pw,ph,2,C.CARD2,C.BORD,0.55);

  // Top blue stripe
  doc.setFillColor(...C.BLUE);
  doc.rect(px,py,pw,1.2,'F');
  rr(doc,px,py,pw,2.6,1.5,C.BLUE);

  // Photo background
  doc.setFillColor(...C.CARD3);
  doc.rect(PHX,PHY,PHW,PHH,'F');

  // Photo
  if(photoB64){
    try{ doc.addImage(photoB64,"JPEG",PHX,PHY,PHW,PHH); }catch(e){}
  } else {
    const initial=(player.name||player.Name||"?")[0].toUpperCase();
    const fsz=Math.max(13,Math.min(20,PHH*0.36));
    doc.setFont("helvetica","bold"); doc.setFontSize(fsz);
    doc.setTextColor(...C.BLUE);
    doc.text(initial,PHX+PHW/2,PHY+PHH/2+fsz*0.13,{align:"center"});
  }

  // Photo border
  doc.setDrawColor(...C.BLUE); doc.setLineWidth(0.7);
  doc.rect(PHX,PHY,PHW,PHH,'D');

  // Divider
  doc.setDrawColor(...C.BORD); doc.setLineWidth(0.28);
  doc.line(PHX+PHW+1.8,PHY,PHX+PHW+1.8,PHY+PHH);

  // # badge — bottom-left of photo
  const br=3.2;
  doc.setFillColor(...C.BLUE);
  doc.circle(PHX+br,PHY+PHH-br,br,'F');
  doc.setFont("helvetica","bold"); doc.setFontSize(5.5);
  doc.setTextColor(...C.WHT);
  doc.text(String(player.No||""),PHX+br,PHY+PHH-br+1.2,{align:"center"});

  // ── TEXT: top-down from just below the stripe
  const ROW=4.2;
  let ty=py+4.0;   // starts just below the top stripe

  // 1. Name
  doc.setFont("helvetica","bold"); doc.setFontSize(8.5);
  doc.setTextColor(...C.WHT);
  doc.text(trunc(doc,(player.name||player.Name||"?").toUpperCase(),TW,8.5),TX,ty+ 3);
  ty+=ROW*1.15;

  // 2. Pool badge
  const cat=String(player.category||"—").trim();
  const col=catcol(cat);
  const pillW=15,pillH=3.6;
  const bg2=[Math.round(col[0]*0.08+C.BG[0]),Math.round(col[1]*0.08+C.BG[1]),Math.round(col[2]*0.08+C.BG[2])];
  rr(doc,TX,ty,pillW,pillH,1.8,bg2,col,0.4);
  doc.setFont("helvetica","bold"); doc.setFontSize(6);
  doc.setTextColor(...col);
  doc.text(`POOL ${cat}`,TX+pillW/2,ty+pillH*0.68,{align:"center"});
  ty+=pillH+ROW*0.55;

  // 3. Extra fields (style, age…) — deduplicated values
  const skip=new Set(["No","no","name","Name","photourl","photoURL","photo","category","Category","soldFor"]);
  const seen=new Set(); const extras=[];
  for(const [k,v] of Object.entries(player)){
    if(skip.has(k)||!v) continue;
    const vs=String(v).trim().toLowerCase();
    if(!vs||seen.has(vs)) continue;
    seen.add(vs);
    extras.push([k.replace(/playingStyle/i,"STYLE").toUpperCase(),String(v).trim()]);
  }
  for(const [lbl,val] of extras.slice(0,3)){
    const lstr=lbl+": ";
    doc.setFont("helvetica","normal"); doc.setFontSize(10);
    doc.setTextColor(...C.SL5);
   
    doc.text(lstr,TX,ty+2);
    const lw2=doc.getTextWidth(lstr);
    doc.setFontSize(7); doc.setTextColor(...C.SL3);

    doc.text(trunc(doc,val,TW-lw2,10),TX+lw2,ty + 2);
    ty+=ROW*0.9;
  }
}

function parseCSV(csv){
  const lines=csv.trim().split("\n").map(l=>l.trim()).filter(Boolean);
  if(lines.length<2) return [];
  const hdrs=lines[0].split(",").map(h=>h.trim().toLowerCase());
  const find=(kws)=>hdrs.findIndex(h=>kws.some(k=>h.includes(k)));
  const iNo   =find(["no"]);
  const iName =find(["name"]);
  const iPhoto=find(["photo","url"]);
  const iCat  =find(["cat"]);
  const iStyle=find(["style","playing"]);
  return lines.slice(1).map(line=>{
    const v=line.split(",");
    const obj={}; hdrs.forEach((h,i)=>{obj[h]=(v[i]||"").trim();});
    const p={...obj};
    if(iNo>=0)    p.No          =v[iNo]?.trim()||"";
    if(iName>=0)  p.name        =v[iName]?.trim()||"";
    if(iPhoto>=0) p.photourl    =v[iPhoto]?.trim()||"";
    if(iCat>=0)   p.category    =v[iCat]?.trim()||"";
    if(iStyle>=0) p.playingStyle=v[iStyle]?.trim()||"";
    return p;
  });
}

async function loadPhoto(url){
  if(!url||!url.startsWith("http")) return null;
  try{
    const res=await fetch(url,{referrerPolicy:"no-referrer",mode:"cors"});
    const blob=await res.blob();
    return new Promise(resolve=>{
      const fr=new FileReader();
      fr.onload=()=>resolve(fr.result);
      fr.onerror=()=>resolve(null);
      fr.readAsDataURL(blob);
    });
  }catch{ return null; }
}

export const handlePlayerSheetDownload=async(sortType,setStatus=null )=>{
  if(typeof setStatus!=="function") setStatus=null;
  if(!window.jspdf){
    alert('jsPDF not loaded. Add to index.html:\n<script src="https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.1/jspdf.umd.min.js"></script>');
    return;
  }
  const csv=localStorage.getItem("playerDetails");
  if(!csv){ alert("No player data found."); return; }
  const players=parseCSV(csv);
  console.log(sortType)
if (sortType === "name") {
  players.sort((a, b) =>
    (a.name || a.Name || "").localeCompare(b.name || b.Name || "")
  );
}

if (sortType === "category") {
  players.sort((a, b) =>
    (a.category || "").localeCompare(b.category || "")
  );
}

if (sortType === "playingstyle") {
  players.sort((a, b) =>
    (a.playingStyle || "").localeCompare(b.playingStyle || "")
  );
}
  if(!players.length){ alert("Could not parse player CSV."); return; }
  if(setStatus) setStatus("loading");

  const {jsPDF}=window.jspdf;
  const doc=new jsPDF({orientation:"landscape",unit:"mm",format:"a4"});
  const W=doc.internal.pageSize.getWidth();
  const H=doc.internal.pageSize.getHeight();

  // Layout — jsPDF y=0 TOP, increases downward
  const COLS=3,PAD=3.5,GAP=2,HDR=16,FTR=8,ROWS=4;
  const CONTENT_TOP=HDR;          // cards start below header
  const CONTENT_BOT=H-FTR;       // cards end above footer
  const avail=CONTENT_BOT-CONTENT_TOP;
  const cw=(W-2*PAD-(COLS-1)*GAP)/COLS;
  // ch is FIXED — never changes per page, so last page looks identical to others
  const ch=Math.min(37,(avail-(ROWS-1)*GAP)/ROWS);
  const perPage=COLS*ROWS;
  const totalPages=Math.ceil(players.length/perPage);

  // Load all photos in parallel with 4s timeout
  const photos=await Promise.all(players.map(p=>
    Promise.race([
      loadPhoto(p.photourl||p.photoURL||p.photo),
      new Promise(r=>setTimeout(()=>r(null),4000))
    ])
  ));

  for(let pg=0;pg<totalPages;pg++){
    if(pg>0) doc.addPage();
    pageBg(doc,W,H);
    drawHeader(doc,players.length,W,H);

    const batch=players.slice(pg*perPage,(pg+1)*perPage);
    for(let i=0;i<batch.length;i++){
      const row=Math.floor(i/COLS);
      const col=i%COLS;
      // top-left of card in top-down coords
      const cx=PAD+col*(cw+GAP);
      const cy=CONTENT_TOP+PAD+row*(ch+GAP);
      drawPlayerCard(doc,cx,cy,cw,ch,batch[i],photos[pg*perPage+i]);
    }

    drawFooter(doc,pg+1,totalPages,W);
  }

  doc.save(`Player_List_${new Date().toISOString().slice(0,10)}.pdf`);
  if(setStatus) setStatus("done");
};

// export const handlePlayerSheetDownload = async () => {

//   const csv = localStorage.getItem("playerDetails");

//   if (!csv) {
//     alert("No player data available.");
//     return;
//   }

//   const rows = csv.split("\n").map(row => row.split(","));

//   const headers = ["No", "Photo", "Name", "Category", "Playing Style"];

//   const doc = new jsPDF();

//   const data = rows.slice(1).map(row => ({
//     no: row[0],
//     photo: row[2], // keep url internally
//     name: row[1],
//     category: row[3],
//     style: row[4]
//   }));

//   doc.text("Player List", 14, 15);

//   doc.autoTable({
//     startY: 25,
//     head: [headers],
//     body: data.map(p => [
//       p.no,
//       "", // keep photo cell empty (no URL text)
//       p.name,
//       p.category,
//       p.style
//     ]),

//     didDrawCell: function (dataCell) {

//       if (dataCell.column.index === 1 && dataCell.cell.section === "body") {

//         const player = data[dataCell.row.index];
//         const img = new Image();
//         img.src = player.photo;

//         const x = dataCell.cell.x + 2;
//         const y = dataCell.cell.y + 2;

//         doc.addImage(img, "JPEG", x, y, 10, 10);
//       }

//     }
//   });

//   doc.save("players.pdf");
// };