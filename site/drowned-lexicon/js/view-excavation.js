/* THE DROWNED LEXICON — view: the season and the trenches */
"use strict";
/* ============================ VIEW: EXCAVATION =========================== */
function siteCardHTML(s,i){
  const un=siteUnlocked(s);
  const drawn=S.siteDraw[i]||0;
  const spent=drawn>=s.digs;
  const strata=Array.from({length:s.digs},(_,k)=>`<i class="${k<drawn?"on":""}"></i>`).join("");
  const body=un
    ? `<div class="strata">${strata}</div>
       <div class="dimmer" style="font-size:11px">${spent
          ? "Exhausted — the cutting is backfilled."
          : `${s.digs-drawn} workable cutting${s.digs-drawn===1?"":"s"} remain`}</div>
       <div class="acts">
         <button class="btn sm" data-dig="${i}" data-mode="survey" ${spent?"disabled":""}>Survey &middot; 1d</button>
         <button class="btn sm" data-dig="${i}" data-mode="trench" ${spent?"disabled":""}>Trench &middot; 2d</button>
         <button class="btn sm primary" data-dig="${i}" data-mode="shaft" ${spent?"disabled":""}>Shaft &middot; 3d</button>
       </div>`
    : `<div class="lockrow"><span class="chip grey">sealed</span>
       <span class="dimmer" style="font-size:11.5px">${unlockText(s)}</span></div>`;
  return `<div class="sitecard ${un?"":"locked"}">
    <div class="banner"><img src="${s.img}" alt="" loading="lazy"><h4>${esc(s.name)}</h4></div>
    <div class="body">
      <div class="desc">${esc(s.desc)}</div>
      ${un&&s.yields?`<div class="label" style="margin-top:8px">${s.yields}</div>`:""}
      ${body}
    </div>
  </div>`;
}

function viewSite(){
  // buildWorld stamps each site with its own index; never re-derive it from a filtered list
  const cards=W.sites.filter(s=>!s.vault).map(s=>siteCardHTML(s,s.idx)).join("");

  const avail=NOTES.filter(n=>!S.notes.includes(n.key));
  const noteBtns=avail.map(n=>{
    const okT=S.found.length>=(n.req.tablets||0);
    const okN=!n.req.notes||n.req.notes.every(k=>S.notes.includes(k));
    const ok=okT&&okN;
    const cost=ok?n.cost+"d":(okT?"needs prior study":n.req.tablets+" tablets");
    return `<button class="noterow" data-note="${n.key}" ${ok?"":"disabled"}>
      <span>${esc(n.title)}</span><span class="cost">${cost}</span></button>`;
  }).join("")||`<div class="dim" style="font-size:12.5px">Every structural question you know how to ask has been answered.</div>`;

  const log=S.log.length
    ? S.log.map(l=>`<div class="logrow ${l.kind||""}"><span class="d">d${l.d}</span><span class="m">${esc(l.msg)}</span></div>`).join("")
    : `<div class="dimmer" style="font-size:12px">Nothing recorded yet.</div>`;

  return `<div class="split" style="grid-template-columns:minmax(0,1fr) 336px">
    <div>
      <h2 style="font-size:20px;color:#ecdfc3">The Season</h2>
      <p class="dim serif" style="margin:4px 0 20px;font-size:14px;max-width:740px">
        Seventy-two days. Deeper cuttings yield richer and rarer documents, but the clay comes up broken.
        A shallow survey brings back little of consequence, and brings it back whole.</p>
      <div class="sitegrid">${cards}</div>
    </div>
    <div class="stack">
      <div class="panel">
        <div class="ph"><h3>Days at the Drawing Board</h3></div>
        <div class="pb">
          <p class="dim" style="font-size:12.5px;margin-bottom:11px">Structure is not found in the ground.
            It is found by comparing what you already have.</p>
          ${noteBtns}
        </div>
      </div>
      <div class="panel">
        <div class="ph"><h3>Field Log</h3></div>
        <div class="pb" style="max-height:320px;overflow:auto">${log}</div>
      </div>
    </div>
  </div>`;
}

function bindSite(root){
  root.querySelectorAll("[data-dig]").forEach(b=>b.onclick=()=>excavate(+b.dataset.dig,b.dataset.mode));
  root.querySelectorAll("[data-note]").forEach(b=>b.onclick=()=>{
    const n=NOTES.find(x=>x.key===b.dataset.note);
    modal(n.title,`<p class="serif" style="font-size:15px;line-height:1.78;color:#c8c0ae">${esc(noteText(n,L))}</p>
      <p class="dimmer" style="font-size:12px;margin-top:12px">This will consume ${n.cost} day${n.cost>1?"s":""} of the season.</p>
      <button class="btn primary" id="donote" style="margin-top:4px">Spend the day</button>`);
    $("#donote").onclick=()=>{closeModal();collate(n.key);};
  });
}
