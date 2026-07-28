/* THE DROWNED LEXICON — render loop and boot */
"use strict";
/* ================================ RENDER ================================ */
function render(){
  renderHeader();renderTabs();
  const main=$("#main");
  let html;
  if(S.ended&&S.tab!=="lexicon"&&S.tab!=="journal"&&S.tab!=="finds")html=endingHTML();
  else if(S.tab==="site")html=viewSite();
  else if(S.tab==="finds")html=viewFinds();
  else if(S.tab==="lexicon")html=viewLexicon();
  else if(S.tab==="journal")html=viewJournal();
  else if(S.tab==="vault")html=viewVault();
  // The enter animation belongs to a tab change, not to every re-render —
  // otherwise the whole view flashes each time a sign is named.
  const changed=(render._lastTab!==S.tab);
  render._lastTab=S.tab;
  main.innerHTML=`<div class="view${changed?" enter":""}">${html}</div>`;
  const root=main;
  bindSite(root);bindFinds(root);bindLexicon(root);bindVault(root);
  if(S.ended&&!S.endToasted){S.endToasted=true;}
}

/* ================================= BOOT ================================= */
function randomSeed(){
  const a=["salt","tide","basalt","reed","brine","lagoon","ochre","silt","kiln","monsoon","cypress","obsidian"];
  const b=["gate","throat","archive","quay","shelf","column","seal","lamp","stylus","cistern"];
  const r=RNG(String(Date.now()+Math.random()));
  return r.pick(a)+"-"+r.pick(b)+"-"+r.range(100,999);
}
window.revealAll=revealAll;
document.addEventListener("DOMContentLoaded",()=>{
  $("#seedin").value=randomSeed();
  $("#reroll").onclick=()=>{$("#seedin").value=randomSeed();titleGlyphs();};
  $("#startbtn").onclick=()=>{
    const s=$("#seedin").value.trim()||randomSeed();
    if(hasSave()&&!confirm("Beginning a new season will discard the excavation in progress. Continue?"))return;
    try{localStorage.removeItem(SAVEKEY);}catch(e){}
    startGame(s);
  };
  const cb=$("#contbtn");
  if(!hasSave())cb.disabled=true;
  cb.onclick=()=>{if(!load())toast("No excavation in progress.","bad");};
  $("#manualbtn0").onclick=showManual;
  $("#manualbtn").onclick=showManual;
  $("#menubtn").onclick=showMenu;
  $("#seedin").oninput=titleGlyphs;
  titleGlyphs();
  document.addEventListener("keydown",e=>{
    if(e.key==="Escape")closeModal();
    if(!S||document.activeElement&&/INPUT|SELECT/.test(document.activeElement.tagName))return;
    const map={"1":"site","2":"finds","3":"lexicon","4":"journal","5":"vault"};
    if(map[e.key]){const t=map[e.key];if(t==="vault"&&!siteUnlocked(SITES[6]))return;S.tab=t;save();render();}
  });
});
function titleGlyphs(){
  const seed=($("#seedin").value||"x")+"::lang";
  const r=RNG(seed);
  const cats=["person","place","good","act","nature","numeral","idea","quality"];
  let h="";
  for(let i=0;i<8;i++)h+=glyphSVG(makeGlyph(r,cats[i%cats.length],true).strokes,46);
  $("#titleglyphs").innerHTML=h;
}
