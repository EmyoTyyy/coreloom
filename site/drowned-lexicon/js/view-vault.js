/* THE DROWNED LEXICON — view: the archive door */
"use strict";
/* ============================== VIEW: VAULT ============================= */
function viewVault(){
  const V=W.vault,t=V.tablet;
  if(!S.found.some(f=>f.uid==="VAULT")){
    S.found.push({uid:"VAULT",dmg:[]});
    if(!S.storyUnlocked.includes(STORY.length-1))S.storyUnlocked.push(STORY.length-1);
    log("Reached the archive door.","story");save();
  }
  t._dmg=[];
  const lines=t.lines.map((ln,li)=>`<div class="tline">${ln.tok.map((tok,ti)=>{
    const st=tokenState(tok.m);
    return `<div class="tok ${st}" data-g="${tok.m}"><div class="gl">${gl(tok.m,34)}</div>
      <div class="gloss">${esc(tokenText(tok.m))}</div></div>`;
  }).join("")}</div>`).join("");

  if(S.ended==="opened"||S.vault.solved)return endingHTML();

  return `<div class="split" style="grid-template-columns:minmax(0,1fr) 380px">
    <div class="panel" style="overflow:hidden">
      <div class="doorhero">
        <img src="assets/vault-door.webp" alt="A sealed basalt door in an underwater wall">
        <div class="cap"><h2>The Archive Door</h2><div class="sub">Sealed &middot; four metres below the waterline</div></div>
      </div>
      <div class="pb">
        <p class="dim serif" style="font-size:14.5px;margin-bottom:16px;line-height:1.75">
        Basalt, and dry behind &mdash; whatever they did to seal it, they did well.
        Six lines are cut into the lintel. There is no keyhole, no bar, no hinge you can reach.
        There is a counting-frame set into the stone and a row of eight signs beneath it, each on its own pivot.<br><br>
        They did not build a lock. They built an examination.</p>
        <div class="slab">${lines}<div class="caption">${esc(t.caption)}</div></div>
        <div class="readrow">
          <div class="label rlabel">Rendering</div>
          <div class="reading">${readingHTML(t)}</div>
        </div>
      </div>
    </div>
    <div class="panel">
      <div class="ph"><h3>The Examination</h3><span class="chip violet">two answers</span></div>
      <div class="pb">
        <div class="label" style="margin-bottom:5px">The counting-frame</div>
        <p class="dim" style="font-size:12.5px;margin-bottom:9px">Set the frame to the number the inscription asks for.</p>
        <input id="vcount" class="vinput" type="number" placeholder="…" aria-label="The counting frame"
          value="${S.vault.count!=null?S.vault.count:""}">
        <hr class="rule">
        <div class="label" style="margin-bottom:5px">The eight pivots</div>
        <p class="dim" style="font-size:12.5px;margin-bottom:10px">Turn up the sign the inscription tells you to speak.</p>
        <div class="pivots">
          ${V.choices.map(k=>`<button class="lexcard ${S.vault.word===k?"sel":""}" data-vw="${k}" style="padding:7px 3px 5px">
            <div class="glbox" style="margin-bottom:5px">${gl(k,34)}</div>
            <div class="nm" style="font-size:10px">${meaningOf(k)?esc(shortLabel(meaningOf(k))):"&mdash;"}</div></button>`).join("")}
        </div>
        <hr class="rule">
        <button class="btn primary block" id="vtry">Turn the frame</button>
        <div class="dimmer" style="font-size:11px;margin-top:9px;text-align:center">
          The mechanism accepts a wrong answer without complaint, and without opening.</div>
      </div>
    </div>
  </div>`;
}
function bindVault(root){
  const ci=$("#vcount",root);
  if(ci)ci.oninput=()=>{S.vault.count=ci.value===""?null:parseInt(ci.value,10);save();};
  root.querySelectorAll("[data-vw]").forEach(b=>b.onclick=()=>{S.vault.word=b.dataset.vw;save();render();});
  root.querySelectorAll("[data-g]").forEach(el=>el.onclick=()=>openGlyph(el.dataset.g));
  const vt=$("#vtry",root);
  if(vt)vt.onclick=()=>{
    const V=W.vault;
    const okC=S.vault.count===V.answerCount,okW=S.vault.word===V.answerWord;
    if(okC&&okW){
      S.vault.solved=true;endGame("opened");
      toast("Something very large moves behind the basalt.","good");
      render();
    }else{
      spendDay(1);
      toast("The frame turns, settles, and does nothing at all. A day gone.","bad");
      save();render();
    }
  };
}
