/* THE DROWNED LEXICON — view: recovered accounts and structural findings */
"use strict";
/* ============================= VIEW: JOURNAL ============================= */
function viewJournal(){
  const entries=STORY.map((b,i)=>{
    const un=S.storyUnlocked.includes(i);
    const found=S.storyFound.includes(i)||i===STORY.length-1;
    return `<div class="entry ${un?"":"locked"}">
      <h4>${un?esc(b.title):"— — —"}</h4>
      <div class="meta">Account ${i+1} of ${STORY.length} · Act ${b.act}${un?"":found?" · tablet recovered, not yet read":" · not recovered"}</div>
      ${un?b.prose.map(p=>`<p>${esc(p)}</p>`).join("")
        :`<p>${found?"The tablet is on your table. Your reading of it does not yet carry enough sense to be worth writing down. Name more of its signs and collate it again.":"Nothing has come out of the ground that bears on this."}</p>`}
    </div>`;
  }).join("");
  const notes=S.notes.map(k=>{
    const n=NOTES.find(x=>x.key===k);
    return `<div class="note"><div class="ic">&sect;</div><div class="tx"><b style="color:#dccfae">${esc(n.title)}.</b> ${esc(noteText(n,L))}</div></div>`;
  }).join("")||`<div class="dimmer" style="font-size:12.5px">No structural findings recorded. Spend a day at the drawing board.</div>`;

  const g=[];
  if(S.gram.order)g.push(["Word order",{SOV:"Subject – Object – Verb",SVO:"Subject – Verb – Object",VSO:"Verb – Subject – Object"}[L.order]]);
  if(S.gram.adjPos)g.push(["Qualities",L.adjPos==="pre"?"stand before the noun":"stand after the noun"]);
  if(S.gram.numPos)g.push(["Numerals",L.numPos==="pre"?"stand before the noun":"stand after the noun"]);
  for(const [k,label] of GRAMS)if(S.confirmed[k])g.push([label.split(" — ")[0],"sign established"]);

  return `<div class="split" style="grid-template-columns:minmax(0,1fr) 380px">
    <div>
      <h2 style="font-size:20px;color:#ecdfc3">What the Tablets Say</h2>
      <p class="dim" style="margin:0 0 20px;font-size:13px;max-width:640px">An account is written up only when your own translation of the tablet carries enough of its sense — roughly two readings in three must hold.</p>
      ${entries}
    </div>
    <div>
      <div class="panel" style="margin-bottom:16px">
        <div class="ph"><h3>Grammar Established</h3></div>
        <div class="pb">${g.length?g.map(x=>`<div class="kv"><span class="k">${esc(x[0])}</span><span class="v">${esc(x[1])}</span></div>`).join("")
          :'<div class="dimmer" style="font-size:12.5px">Nothing yet. The sentences remain heaps.</div>'}</div>
      </div>
      <div class="panel">
        <div class="ph"><h3>Structural Findings</h3></div>
        <div class="pb">${notes}</div>
      </div>
    </div>
  </div>`;
}
