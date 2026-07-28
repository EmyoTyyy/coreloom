/* THE DROWNED LEXICON — view: the finds list and the tablet reader */
"use strict";
/* ============================== VIEW: FINDS ============================== */
function tabletTypeLabel(t){
  return{ledger:"Ledger",label:"Object label",bilingual:"Bilingual",hymn:"Hymn",decree:"Decree",
    curse:"Curse",kinglist:"King-list",letter:"Letter",vault:"Inscription"}[t.type]||"Tablet";
}
function viewFinds(){
  const list=foundTablets();
  if(!list.length)return `<div class="dim" style="padding:40px;text-align:center;font-family:var(--serif);font-size:15px">
    Nothing has come out of the ground yet. Go and dig.</div>`;
  const sel=list.find(t=>t.uid===S.selTablet)||list[list.length-1];
  S.selTablet=sel.uid;
  const rows=list.slice().reverse().map(t=>{
    const g=S.graded[t.uid];
    const done=g&&g.assigned===g.legible&&g.correct===g.legible;
    return `<div class="tabrow ${t.uid===sel.uid?"on":""}" data-sel="${t.uid}">
      <div class="ti"><div class="tn">${esc(t.title)}</div>
      <div class="tm">${tabletTypeLabel(t)}${t.story!=null?" · account":""}${g?` · read ${g.correct}/${g.legible}`:""}</div></div>
      ${done?'<span class="chip green">read</span>':t.story!=null&&!S.storyUnlocked.includes(t.story)?'<span class="chip amber">!</span>':""}
    </div>`;
  }).join("");
  return `<div class="split" style="grid-template-columns:280px 1fr">
    <div class="panel" style="align-self:start;max-height:calc(100vh - 160px);display:flex;flex-direction:column">
      <div class="ph"><h3>Finds</h3><span class="dimmer" style="font-size:11px">${list.length}</span></div>
      <div class="pb" style="overflow:auto;padding:7px">${rows}</div>
    </div>
    <div id="reader">${readerHTML(sel)}</div>
  </div>`;
}
function readerHTML(t){
  const g=S.graded[t.uid];
  const cost=gradeCost(t.uid);
  const led=t.arith?checkLedger(t):null;
  let ledBox="";
  if(led){
    const msg={damaged:"Some figures in this account are lost. It cannot be balanced.",
      incomplete:"Assign a value to every bracketed sign in this account, and it can be balanced against its own total.",
      balanced:"The entries sum exactly to the stated total.",
      unbalanced:"The entries do not sum to the stated total. One of your values is wrong."}[led.status];
    const c={damaged:"grey",incomplete:"grey",balanced:"green",unbalanced:"rose"}[led.status];
    ledBox=`<div class="panel" style="margin-top:14px"><div class="ph"><h3>The Accounts</h3>
      <span class="chip ${c}">${led.status}</span></div>
      <div class="pb"><p class="dim" style="margin:0 0 8px;font-size:13px">${msg}</p>
      ${led.status==="balanced"||led.status==="unbalanced"?`<div class="mono" style="font-size:12.5px;color:#c9c2b2">
        entries total <b class="amber">${led.sum}</b> · tablet states <b class="amber">${led.total}</b></div>`:""}
      ${led.status==="balanced"&&!S.balanced[t.uid]?`<button class="btn primary sm" id="lockled" style="margin-top:10px">Accept the reckoning</button>`:""}
      ${S.balanced[t.uid]?`<div class="chip green" style="margin-top:8px">reckoning accepted</div>`:""}
      </div></div>`;
  }
  const obj=t.object&&OBJ_IMAGES[t.object]?`<figure class="artefact">
    <img src="${OBJ_IMAGES[t.object]}" alt="The excavated object" loading="lazy">
    <figcaption>The object as recovered</figcaption>
  </figure>`:"";
  const lines=t.lines.map((ln,li)=>`<div class="tline">${ln.tok.map((tok,ti)=>{
    if(tok.c)return`<div class="cart">⟨${esc(tok.c)}⟩</div>`;
    if(!tok.m||!L.M[tok.m])return"";
    if(isDmg(t,li,ti))return`<div class="tok dmg"><div class="brk"></div><div class="gloss">lost</div></div>`;
    const st=tokenState(tok.m);
    return `<div class="tok ${st} ${S.selGlyph===tok.m?"sel":""}" data-g="${tok.m}" title="${esc(L.M[tok.m].rom)}">
      <div class="gl">${gl(tok.m,32)}</div><div class="gloss">${esc(tokenText(tok.m))}</div></div>`;
  }).join("")}</div>`).join("");

  const bi=t.type==="bilingual";
  const gradeBox=`<div class="panel" style="margin-top:14px"><div class="ph"><h3>Collation</h3>
    ${g?`<span class="chip ${g.correct===g.legible?"green":"amber"}">${g.correct} of ${g.assigned} named signs correct</span>`:""}</div>
    <div class="pb">
    <p class="dim" style="margin:0 0 10px;font-size:13px">Read the tablet aloud to your assistant and have him check the sense against every other tablet in the hut. He will tell you <b>how many</b> of your readings hold — never <b>which</b>.</p>
    ${g?`<div class="mono" style="font-size:12.5px;margin-bottom:10px">
      legible signs <b>${g.legible}</b> · named by you <b>${g.assigned}</b> · <b class="amber">correct ${g.correct}</b>
      ${g.assigned>g.correct?`<span class="dimmer"> · ${g.assigned-g.correct} of your namings are wrong</span>`:""}</div>`:""}
    <button class="btn ${g?"":"primary"} sm" id="gradebtn">${g?`Collate again · ☉${cost}`:"Collate this tablet · free"}</button>
    ${t.story!=null&&S.storyUnlocked.includes(t.story)?`<span class="chip green" style="margin-left:9px">account recovered</span>`:""}
    </div></div>`;

  return `<div class="panel">
    <div class="ph"><div><h3>${esc(t.title)}</h3>
      <div class="dimmer" style="font-size:10.5px;font-variant:small-caps;letter-spacing:.1em">${tabletTypeLabel(t)}</div></div>
      <span class="dimmer" style="font-size:11px">${t._dmg&&t._dmg.length?t._dmg.length+" signs lost":"complete"}</span></div>
    <div class="pb">
      ${obj}
      <div class="slab${t.type==="label"?" compact":""}">${lines}${t.caption?`<div class="caption">${esc(t.caption)}</div>`:""}</div>
      <div class="readrow">
        <div class="label rlabel">Rendering</div>
        <div class="reading">${bi
          ?t.lines.map(l=>`<div><span class="known">${esc(l.en)}</span> <span class="dimmer">&mdash; given</span></div>`).join("")
          :readingHTML(t)}</div>
      </div>
      ${!S.gram.order&&!bi?`<div class="hint">Signs stand in the order the scribe wrote them.
        Until you establish where the verb falls, no better rendering is possible.</div>`:""}
      ${ledBox}
      ${bi?"":gradeBox}
    </div></div>`;
}
function bindFinds(root){
  root.querySelectorAll("[data-sel]").forEach(el=>el.onclick=()=>{S.selTablet=el.dataset.sel;save();render();});
  root.querySelectorAll("[data-g]").forEach(el=>el.onclick=()=>openGlyph(el.dataset.g));
  const gb=$("#gradebtn",root);if(gb)gb.onclick=()=>gradeTablet(S.selTablet);
  const lk=$("#lockled",root);if(lk)lk.onclick=()=>lockLedger(tabletByUid(S.selTablet));
}
