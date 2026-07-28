/* THE DROWNED LEXICON — game state, actions, economy, save/load */
"use strict";
/* =============================== GAME STATE ============================== */
const MAXDAY=72;
let L=null,W=null,S=null;

function newState(seed){
  return {
    seed,day:1,insight:20,
    assign:{},confirmed:{},
    found:[],            // {uid, dmg:[[line,tok],...]}
    graded:{},           // uid -> {n, correct, assigned, legible}
    notes:[],radicals:{},gram:{order:false,adjPos:false,numPos:false},
    storyFound:[],storyUnlocked:[],
    courierUsed:0,siteDraw:{},siteCursor:{},balanced:{},
    vault:{count:null,word:null,solved:false},
    ended:null,tab:"site",selTablet:null,selGlyph:null,log:[]
  };
}

/* ------------------------------ derived ------------------------------- */
function foundTablets(){
  const out=[];
  for(const f of S.found){
    const t=tabletByUid(f.uid);
    if(t){t._dmg=f.dmg;out.push(t);}
  }
  return out;
}
let UIDMAP=null;
function tabletByUid(uid){
  if(!UIDMAP){
    UIDMAP={};
    for(const s of W.sites)for(const t of s.pool)UIDMAP[t.uid]=t;
    for(const t of W.story)UIDMAP[t.uid]=t;
    for(const t of (W.extra||[]))UIDMAP[t.uid]=t;
    UIDMAP[W.vault.tablet.uid]=W.vault.tablet;
  }
  return UIDMAP[uid];
}
function isDmg(t,li,ti){
  if(!t._dmg)return false;
  for(const d of t._dmg)if(d[0]===li&&d[1]===ti)return true;
  return false;
}
function namedCount(){return Object.keys(S.assign).length;}
function correctCount(){let n=0;for(const k in S.assign)if(S.assign[k]===L.truth[k])n++;return n;}
function confirmedCount(){return Object.keys(S.confirmed).length;}
function totalGlyphs(){return L.keys.length;}
function seenGlyphs(){
  const set=new Set();
  for(const t of foundTablets())
    t.lines.forEach((ln,li)=>ln.tok.forEach((tok,ti)=>{if(tok.m&&!isDmg(t,li,ti))set.add(tok.m);}));
  return set;
}
function meaningOf(m){const id=S.assign[m];return id?L.meaningById[id]:null;}
function shortLabel(mean){
  if(!mean)return null;
  return mean.label.split(" — ")[0].split(" (")[0];
}
function valueOfMorpheme(m){
  const mean=meaningOf(m);
  if(!mean||mean.kind!=="num")return null;
  return mean.value;
}
function siteUnlocked(s){
  if(!s.unlock)return true;
  const u=s.unlock;
  if(u.named!=null&&namedCount()<u.named)return false;
  if(u.correct!=null&&correctCount()<u.correct)return false;
  if(u.story!=null&&S.storyUnlocked.length<u.story)return false;
  return true;
}
function unlockText(s){
  const u=s.unlock;if(!u)return"";
  const p=[];
  if(u.named!=null)p.push(`${u.named} signs named (${namedCount()})`);
  if(u.correct!=null)p.push(`${u.correct} signs correctly identified (${correctCount()})`);
  if(u.story!=null)p.push(`${u.story} accounts recovered (${S.storyUnlocked.length})`);
  return "Requires "+p.join(" · ");
}

/* --------------------------- actions & economy ------------------------- */
function spendDay(n){
  S.day+=n;
  if(S.day>MAXDAY&&!S.ended)endGame("sealed");
}
function log(msg,kind){S.log.unshift({d:S.day,msg,kind});if(S.log.length>60)S.log.pop();}

// Clay does not decay sign by sign — it breaks along an edge. A damaged tablet
// loses a contiguous run from the head or foot of one or two lines, which keeps
// the surviving text readable and keeps most ledgers usable.
function damageRoll(r,t,chance){
  const dmg=[];
  if(!r.chance(chance))return dmg;
  const nLines=Math.min(t.lines.length,r.chance(.35)?2:1);
  for(const li of r.pickN(t.lines.map((_,i)=>i),nLines)){
    const toks=t.lines[li].tok,n=toks.length;
    if(n<2)continue;
    const len=Math.max(1,Math.round(n*(0.25+r()*0.45)));
    const fromEnd=r.chance(.6);
    for(let k=0;k<len;k++){
      const ti=fromEnd?n-1-k:k;
      if(ti>=0&&ti<n&&toks[ti].m)dmg.push([li,ti]);
    }
  }
  return dmg;
}

function excavate(siteIdx,mode){
  const site=W.sites[siteIdx];
  const drawn=S.siteDraw[siteIdx]||0;
  const cfg={survey:{days:1,n:1,rate:.12},trench:{days:2,n:2,rate:.38},shaft:{days:3,n:3,rate:.60}}[mode];
  if(drawn>=site.digs){toast("This cutting is spent. Nothing remains but backfill.","bad");return;}
  spendDay(cfg.days);
  const r=RNG(S.seed+"::dig"+siteIdx+"_"+drawn+"_"+mode);
  const got=[];
  let cur=S.siteCursor[siteIdx]||0;
  for(let i=0;i<cfg.n&&cur<site.pool.length;i++){
    const t=site.pool[cur++];
    if(S.found.some(f=>f.uid===t.uid))continue;
    S.found.push({uid:t.uid,dmg:damageRoll(r,t,cfg.rate)});
    got.push(t);
  }
  S.siteCursor[siteIdx]=cur;
  S.siteDraw[siteIdx]=drawn+1;
  // Story tablets surface as the decipherment deepens
  const nextBeat=S.storyFound.length;
  if(nextBeat<W.story.length&&correctCount()>=STORY[nextBeat].req&&(mode!=="survey"||nextBeat===0)){
    const st=W.story[nextBeat];
    if(!S.found.some(f=>f.uid===st.uid)){
      S.found.push({uid:st.uid,dmg:damageRoll(r,st,cfg.rate*0.5)});
      S.storyFound.push(nextBeat);
      got.push(st);
      log("A tablet of unusual importance came up: "+st.title,"story");
    }
  }
  if(!got.length){toast("Nothing but potsherds and brick rubble.","bad");}
  else{
    autoConfirmBilinguals(got);
    checkAllStory();
    S.selTablet=got[got.length-1].uid;S.tab="finds";
    toast(`Day ${S.day}. Recovered ${got.length} tablet${got.length>1?"s":""}: ${got.map(t=>t.title).join(", ")}`,"good");
  }
  save();render();
}
function autoConfirmBilinguals(list){
  for(const t of list){
    if(t.type!=="bilingual"||!t.confirms)continue;
    for(const k of t.confirms){
      if(!S.confirmed[k]){
        S.confirmed[k]=true;S.assign[k]=L.truth[k];
        log(`The bilingual seal fixes one sign beyond doubt: “${G(L,k)}”.`,"good");
      }
    }
  }
}
function collate(noteKey){
  const n=NOTES.find(x=>x.key===noteKey);
  if(!n||S.notes.includes(noteKey))return;
  spendDay(n.cost);
  S.notes.push(noteKey);
  if(n.kind==="radical")S.radicals[n.arg]=true;
  if(n.kind==="order")S.gram.order=true;
  if(n.kind==="adjpos")S.gram.adjPos=true;
  if(n.kind==="numpos")S.gram.numPos=true;
  if(n.kind==="gram"){S.assign[n.arg]=L.truth[n.arg];S.confirmed[n.arg]=true;}
  if(n.kind==="gram2")for(const a of n.arg){S.assign[a]=L.truth[a];S.confirmed[a]=true;}
  checkAllStory();
  S.insight+=3;
  toast("Day "+S.day+". "+n.title+" — recorded in the journal.","good");
  S.tab="journal";
  save();render();
}
function courierCost(){return 15+5*S.courierUsed;}
function courier(m){
  const c=courierCost();
  if(S.insight<c){toast("Not enough insight to justify the letter.","bad");return;}
  S.insight-=c;S.courierUsed++;spendDay(2);
  S.assign[m]=L.truth[m];S.confirmed[m]=true;checkAllStory();
  toast(`Day ${S.day}. The Society replies: the sign reads “${G(L,m)}”.`,"good");
  save();render();
}
function gradeCost(uid){
  const g=S.graded[uid];
  if(!g)return 0;
  return [0,5,10,20,40,80][Math.min(5,g.n)];
}
function gradeTablet(uid){
  const t=tabletByUid(uid);
  const cost=gradeCost(uid);
  if(S.insight<cost){toast("Not enough insight for another full collation of this tablet.","bad");return;}
  S.insight-=cost;
  const legible=new Set(),assigned=new Set(),correct=new Set();
  t.lines.forEach((ln,li)=>ln.tok.forEach((tok,ti)=>{
    if(!tok.m||isDmg(t,li,ti))return;
    legible.add(tok.m);
    if(S.assign[tok.m]){assigned.add(tok.m);if(S.assign[tok.m]===L.truth[tok.m])correct.add(tok.m);}
  }));
  const prev=S.graded[uid];
  const first=!prev;
  S.graded[uid]={n:(prev?prev.n:0)+1,correct:correct.size,assigned:assigned.size,legible:legible.size};
  if(first){
    let gain=correct.size*2;
    if(assigned.size&&correct.size===assigned.size&&assigned.size>=Math.ceil(legible.size*0.6))gain+=10;
    S.insight+=gain;
    if(gain)toast(`Collation complete. +${gain} insight.`,"good");
  }
  checkStoryUnlock(t,correct.size,legible.size);
  save();render();
}
function tabletAccuracy(t){
  const legible=new Set(),correct=new Set();
  t.lines.forEach((ln,li)=>ln.tok.forEach((tok,ti)=>{
    if(!tok.m||!L.M[tok.m]||isDmg(t,li,ti))return;
    legible.add(tok.m);
    if(S.assign[tok.m]===L.truth[tok.m])correct.add(tok.m);
  }));
  return{legible:legible.size,correct:correct.size};
}
function checkAllStory(){
  for(const f of S.found){
    const t=tabletByUid(f.uid);
    if(!t||t.story==null||S.storyUnlocked.includes(t.story))continue;
    const a=tabletAccuracy(t);
    checkStoryUnlock(t,a.correct,a.legible);
  }
}
function checkStoryUnlock(t,correct,legible){
  if(t.story==null||S.storyUnlocked.includes(t.story))return;
  if(legible>0&&correct/legible>=0.62){
    S.storyUnlocked.push(t.story);
    S.insight+=12;
    log("Recovered account: "+STORY[t.story].title,"story");
    toast(`The sense of the tablet comes through. Account recovered: “${STORY[t.story].title}”. +12 insight.`,"good");
  }
}
function checkLedger(t){
  if(!t.arith)return null;
  const val=(m)=>valueOfMorpheme(m);
  let sum=0;
  for(const l of t.arith.lines){
    const seg=t.lines[l.line].tok.slice(l.idx[0],l.idx[1]);
    if(seg.some((tok,i)=>isDmg(t,l.line,l.idx[0]+i)))return{status:"damaged"};
    const v=parseNumRun(seg,val);
    if(v==null)return{status:"incomplete"};
    sum+=v;
  }
  const ts=t.lines[t.arith.total.line].tok.slice(t.arith.total.idx[0],t.arith.total.idx[1]);
  if(ts.some((tok,i)=>isDmg(t,t.arith.total.line,t.arith.total.idx[0]+i)))return{status:"damaged"};
  const tv=parseNumRun(ts,val);
  if(tv==null)return{status:"incomplete"};
  return{status:sum===tv?"balanced":"unbalanced",sum,total:tv};
}
function lockLedger(t){
  const res=checkLedger(t);
  if(!res||res.status!=="balanced")return;
  if(S.balanced[t.uid])return;
  S.balanced[t.uid]=true;
  const used=new Set();
  const collect=(ref)=>{for(const tok of t.lines[ref.line].tok.slice(ref.idx[0],ref.idx[1]))if(tok.m)used.add(tok.m);};
  t.arith.lines.forEach(collect);collect(t.arith.total);
  let allRight=true;
  for(const m of used)if(S.assign[m]!==L.truth[m])allRight=false;
  if(allRight){
    let n=0;
    for(const m of used)if(!S.confirmed[m]){S.confirmed[m]=true;n++;}
    checkAllStory();
    S.insight+=12;
    toast(`The accounts balance — ${res.sum} against ${res.total}. ${n} numeral${n===1?"":"s"} confirmed beyond doubt. +12 insight.`,"good");
    log("Ledger balanced: "+t.title,"good");
  }else{
    toast("The accounts balance, and yet the values cannot all be right. Somewhere two signs have swapped places.","bad");
  }
  save();render();
}
function endGame(kind){
  S.ended=kind;
  save();
}

/* ============================== SAVE / LOAD ============================== */
const SAVEKEY="drowned_lexicon_save_v1";
function save(){
  try{
    const d={v:1,seed:S.seed,day:S.day,insight:S.insight,assign:S.assign,confirmed:S.confirmed,
      found:S.found,graded:S.graded,notes:S.notes,radicals:S.radicals,gram:S.gram,
      storyFound:S.storyFound,storyUnlocked:S.storyUnlocked,courierUsed:S.courierUsed,
      siteDraw:S.siteDraw,siteCursor:S.siteCursor,balanced:S.balanced,vault:S.vault,ended:S.ended,tab:S.tab,
      selTablet:S.selTablet,log:S.log};
    localStorage.setItem(SAVEKEY,JSON.stringify(d));
  }catch(e){}
}
function hasSave(){try{return !!localStorage.getItem(SAVEKEY);}catch(e){return false;}}
function load(){
  try{
    const d=JSON.parse(localStorage.getItem(SAVEKEY));
    if(!d||!d.seed)return false;
    startGame(d.seed,d);
    return true;
  }catch(e){return false;}
}
function startGame(seed,saved){
  TID=0;UIDMAP=null;
  L=buildLanguage(seed);
  W=buildWorld(L,seed);
  S=newState(seed);
  if(saved)Object.assign(S,{day:saved.day,insight:saved.insight,assign:saved.assign||{},
    confirmed:saved.confirmed||{},found:saved.found||[],graded:saved.graded||{},notes:saved.notes||[],
    radicals:saved.radicals||{},gram:saved.gram||{order:false,adjPos:false,numPos:false},
    storyFound:saved.storyFound||[],storyUnlocked:saved.storyUnlocked||[],
    courierUsed:saved.courierUsed||0,siteDraw:saved.siteDraw||{},siteCursor:saved.siteCursor||{},balanced:saved.balanced||{},
    vault:saved.vault||{count:null,word:null,solved:false},ended:saved.ended||null,
    tab:saved.tab||"site",log:saved.log||[]});
  // The Lantern Society's primer: four signs given free, to start the wedge.
  (function(){
    const r=RNG(seed+"::primer");
    const gifts=r.pickN(["sea","king","grain","give","water","city","boat","temple"],4);
    const primer=genBilingual(L,r,gifts);
    primer.uid="PRIMER";primer.title="The Lantern Society Primer";
    primer.caption="Prepared for you before you sailed. Four signs read from a looted seal now in a northern museum — the only four words of Old Vaskiri that anyone alive can be said to know.";
    W.extra.push(primer);UIDMAP=null;
    if(!saved){
      S.found.push({uid:"PRIMER",dmg:[]});
      autoConfirmBilinguals([primer]);
      S.selTablet="PRIMER";
      log("Arrived at Tel Vaskir. The season begins.","story");
    }
  })();
  if(saved)checkAllStory();
  if(saved)S.selTablet=saved.selTablet||(S.found.length?S.found[S.found.length-1].uid:null);
  document.getElementById("title").classList.add("hide");
  document.getElementById("app").classList.remove("hide");
  render();
}
