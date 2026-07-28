/* THE DROWNED LEXICON — shared UI helpers, glyph rendering, translation rendering */
"use strict";
/* ============================== UI HELPERS ============================== */
const $=(s,r)=>(r||document).querySelector(s);
const esc=(s)=>String(s).replace(/[&<>"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;"}[c]));
let toastT=null;
function toast(msg,kind){
  const old=$(".toast");if(old)old.remove();
  const el=document.createElement("div");
  el.className="toast"+(kind?" "+kind:"");el.textContent=msg;
  document.body.appendChild(el);
  clearTimeout(toastT);toastT=setTimeout(()=>el.remove(),4200);
}
function modal(title,html,wide){
  closeModal();
  const s=document.createElement("div");s.className="scrim";
  s.innerHTML=`<div class="modal" ${wide?'style="max-width:1050px"':""}>
    <div class="mh"><h2>${title}</h2><button class="x" data-close>×</button></div>
    <div class="mb">${html}</div></div>`;
  s.addEventListener("click",e=>{if(e.target===s||e.target.hasAttribute("data-close"))closeModal();});
  document.body.appendChild(s);
  return s;
}
function closeModal(){const s=$(".scrim");if(s)s.remove();}
function gl(m,size){return glyphSVG(L.M[m].strokes,size||30);}

/* ------------------------- reading & rendering -------------------------- */
function tokenState(m){
  if(S.confirmed[m])return"conf";
  if(S.assign[m])return"named";
  return"unk";
}
function tokenText(m){
  if(!m||!L.M[m])return"";
  const mean=meaningOf(m);
  if(mean)return shortLabel(mean);
  return"[?]";
}
// Interlinear gloss: always available, always honest.
function interlinear(t,li){
  const ln=t.lines[li];
  return ln.tok.map((tok,ti)=>{
    if(tok.c)return`⟨${tok.c}⟩`;
    if(isDmg(t,li,ti))return"···";
    return tokenText(tok.m);
  }).join(" · ");
}
// Free rendering: assembles itself piecewise as grammar is understood.
function renderLine(t,li){
  const ln=t.lines[li];
  const cellOf=(ti)=>{
    const tok=ln.tok[ti];
    if(tok.c)return{kind:"cart",text:tok.c};
    if(!tok.m||!L.M[tok.m])return{kind:"skip",text:""};
    if(isDmg(t,li,ti))return{kind:"gap",text:"[…]"};
    const mean=meaningOf(tok.m);
    if(!mean)return{kind:"unk",text:"[?]"};
    return{kind:mean.kind==="gram"?"gram":mean.kind,text:shortLabel(mean),mean};
  };
  // Render one phrase: bucket into marker / determiner / numeral / quality / head,
  // then fold the affixes into the words they attach to.
  const seg=(a,b,role,subjPlural)=>{
    const cells=[];
    for(let i=a;i<b;i++)cells.push(cellOf(i));
    const isG=(c,id)=>c.kind==="gram"&&c.mean.id===id;
    // A genitive mark binds the content sign immediately before it to the rest.
    const gi=cells.findIndex(c=>isG(c,"g_GEN"));
    let possIdx=-1;
    if(gi>0)for(let j=gi-1;j>=0;j--){
      if(cells[j].kind!=="gram"&&cells[j].kind!=="skip"){possIdx=j;break;}
    }
    let marker="",det="",genOf=null,neg=false,past=false,q=false,pluralized=false;
    const numToks=[],quals=[],heads=[];
    cells.forEach((c,idx)=>{
      if(idx===gi)return;
      if(idx===possIdx){genOf=c.text;return;}
      if(c.kind==="skip")return;
      if(c.kind==="gram"){
        switch(c.mean.id){
          case "g_PL":if(heads.length){heads[heads.length-1]=enPlural(heads[heads.length-1]);pluralized=true;}break;
          case "g_PST":past=true;break;
          case "g_NEG":neg=true;break;
          case "g_DEF":det="the";break;
          case "g_DAT":marker="to";break;
          case "g_LOC":marker="in";break;
          case "g_AND":heads.push("and");break;
          case "g_Q":q=true;break;
          default:heads.push("["+c.text+"]");
        }
        return;
      }
      if(c.kind==="num"){numToks.push(ln.tok[a+idx]);return;}
      if(c.kind==="cart"){heads.push("⟨"+c.text+"⟩");return;}
      if(c.mean&&c.mean.cat==="quality"){quals.push(c.text);return;}
      heads.push(c.text);
    });
    if(role==="v"&&heads.length){
      const base=heads[heads.length-1];
      if(base!=="[?]"&&base!=="[…]"){
        if(neg)heads[heads.length-1]=(past?"did not ":subjPlural?"do not ":"does not ")+base;
        else if(past)heads[heads.length-1]=enPast(base);
        else if(!subjPlural)heads[heads.length-1]=(base+"s").replace(/ss$/,"ses");
      }else if(neg)heads[heads.length-1]="not "+base;
    }else if(neg)heads.unshift("not");
    let num=null;
    if(numToks.length){
      const v=parseNumRun(numToks,valueOfMorpheme);
      num=v==null?"[?]":String(v);
      if(v>1&&heads.length&&!pluralized){
        const last=heads[heads.length-1];
        if(last!=="[?]"&&last!=="[…]")heads[heads.length-1]=enPlural(last);
      }
    }
    const opens=heads[0];
    const broken=opens==="[?]"||opens==="[…]";
    let parts=[];
    if(marker)parts.push(marker);
    if(det)parts.push(det);
    else if(num==null&&heads.length&&role!=="v"&&!broken&&opens!=="and")parts.push("the");
    if(num!=null)parts.push(num);
    parts=parts.concat(quals,heads);
    if(genOf)parts.push(genOf.startsWith("⟨")?"of "+genOf:"of the "+genOf);
    if(q)parts.push("?");
    return{text:parts.filter(Boolean).join(" ").replace(/\s+\?/,"?").replace(/\s{2,}/g," ").trim(),
      plural:pluralized||(num!=null&&Number(num)>1)};
  };
  const flat=ln.flat;
  if(!ln.struct||(!S.gram.order&&!flat)){
    return ln.tok.map((tok,ti)=>{
      const c=cellOf(ti);
      return c.kind==="cart"?"⟨"+c.text+"⟩":c.text;
    }).filter(Boolean).join(" ");
  }
  const out=[];let subjPlural=false;
  for(const role of ["s","v","o","dat","loc","q"]){
    const rg=ln.struct[role];
    if(!rg)continue;
    const r=seg(rg[0],rg[1],role,subjPlural);
    if(role==="s")subjPlural=r.plural;
    if(r.text)out.push(r.text);
  }
  const s=out.join(" ").replace(/\s+\?/,"?").replace(/\s{2,}/g," ").trim();
  return s.charAt(0).toUpperCase()+s.slice(1);
}
function readingHTML(t){
  let h="";
  t.lines.forEach((ln,li)=>{
    if(ln.bilingual){
      h+=`<div style="margin-bottom:6px"><span class="known">${esc(ln.en)}</span> <span class="dimmer">— given by the trade-tongue</span></div>`;
      return;
    }
    if(ln.head){h+=`<div style="margin-bottom:6px" class="known">${esc(interlinear(t,li))}</div>`;return;}
    const txt=renderLine(t,li);
    const styled=esc(txt).replace(/\[\?\]/g,'<span class="u">[?]</span>').replace(/\[…\]/g,'<span class="u">[…]</span>');
    h+=`<div style="margin-bottom:6px">${styled||'<span class="u">—</span>'}</div>`;
  });
  return h;
}

/* ============================== HEADER =============================== */
// Four groups rather than eight loose numbers: the clock, the currency,
// the decipherment itself (as a segmented meter), and the corpus.
function renderHeader(){
  const day=Math.min(S.day,MAXDAY);
  const daysLeft=Math.max(0,MAXDAY-S.day+1);
  const total=totalGlyphs();
  const seen=seenGlyphs().size;
  const conf=confirmedCount();
  const named=Math.max(0,namedCount()-conf);
  const pct=(n)=>(n/total*100).toFixed(2)+"%";

  $("#stats").innerHTML=`
    <div class="hgroup season ${daysLeft<=10?"warn":""}">
      <div class="label">The season</div>
      <div class="val">Day ${day}<small> / ${MAXDAY}</small></div>
      <div class="bar" style="margin-top:3px"><i style="width:${(day/MAXDAY*100).toFixed(1)}%"></i></div>
    </div>
    <div class="hgroup">
      <div class="label">Insight</div>
      <div class="val">&#9737; ${S.insight}</div>
    </div>
    <div class="hgroup deciph">
      <div class="label">Decipherment</div>
      <div class="meter" title="${conf} proven, ${named} named, ${seen} signs attested of ${total}">
        <i class="c" style="width:${pct(conf)}"></i>
        <i class="n" style="width:${pct(named)}"></i>
        <i class="s" style="width:${pct(Math.max(0,seen-conf-named))}"></i>
      </div>
      <div class="legend">
        <span><b class="c">${conf}</b> proven</span>
        <span><b class="n">${named}</b> named</span>
        <span><b>${seen}</b>/${total} attested</span>
      </div>
    </div>
    <div class="hgroup corpus">
      <div class="label">Tablets</div>
      <div class="val">${S.found.length}</div>
    </div>
    <div class="hgroup corpus">
      <div class="label">Accounts</div>
      <div class="val">${S.storyUnlocked.length}<small> / ${STORY.length}</small></div>
    </div>`;
}
const TABS=[["site","Excavation"],["finds","Finds"],["lexicon","Lexicon"],["journal","Journal"],["vault","The Door"]];
function renderTabs(){
  const vaultOk=siteUnlocked(SITES[6]);
  $("#tabs").innerHTML=TABS.map(([k,label])=>{
    const locked=k==="vault"&&!vaultOk;
    let badge="";
    if(k==="finds")badge=`<span class="badge">${S.found.length}</span>`;
    if(k==="journal"&&S.storyUnlocked.length)badge=`<span class="badge">${S.storyUnlocked.length}</span>`;
    return `<button data-tab="${k}" class="${S.tab===k?"on":""} ${locked?"locked":""}">${label}${badge}</button>`;
  }).join("");
  $("#tabs").querySelectorAll("button").forEach(b=>b.onclick=()=>{
    if(b.classList.contains("locked")){toast("The door is still buried. It will not open to you yet.","bad");return;}
    S.tab=b.dataset.tab;save();render();
  });
}
