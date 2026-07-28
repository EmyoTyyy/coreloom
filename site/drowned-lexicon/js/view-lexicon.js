/* THE DROWNED LEXICON — view: the sign list, assignment panel and concordance */
"use strict";
/* ============================= VIEW: LEXICON ============================= */
let lexFilter={q:"",show:"seen",sort:"freq"};
function glyphFreq(){
  const f={};
  for(const t of foundTablets())
    t.lines.forEach((ln,li)=>ln.tok.forEach((tok,ti)=>{
      if(tok.m&&!isDmg(t,li,ti))f[tok.m]=(f[tok.m]||0)+1;
    }));
  return f;
}
function radicalOf(m){
  const mm=L.M[m];
  if(!mm.hasRad)return null;
  if(mm.cat==="numeral")return"numeral";
  if(mm.cat==="grammar")return"mark";
  return S.radicals[mm.cat]?mm.cat:null;
}
function viewLexicon(){
  const freq=glyphFreq();
  const seen=Object.keys(freq);
  let keys=lexFilter.show==="seen"?seen:L.keys.filter(k=>freq[k]||S.assign[k]);
  if(lexFilter.show==="unnamed")keys=seen.filter(k=>!S.assign[k]);
  if(lexFilter.show==="named")keys=seen.filter(k=>S.assign[k]&&!S.confirmed[k]);
  if(lexFilter.show==="confirmed")keys=seen.filter(k=>S.confirmed[k]);
  if(lexFilter.q){
    const q=lexFilter.q.toLowerCase();
    keys=keys.filter(k=>{
      const mean=meaningOf(k);
      return (mean&&mean.label.toLowerCase().includes(q))||L.M[k].rom.toLowerCase().includes(q);
    });
  }
  if(lexFilter.sort==="freq")keys.sort((a,b)=>(freq[b]||0)-(freq[a]||0));
  else keys.sort((a,b)=>{
    const ra=radicalOf(a)||"zzz",rb=radicalOf(b)||"zzz";
    return ra===rb?(freq[b]||0)-(freq[a]||0):ra.localeCompare(rb);
  });

  const cards=keys.map(k=>{
    const mean=meaningOf(k),rad=radicalOf(k);
    const cls=S.confirmed[k]?"confirmed":(mean?"named":"");
    return `<div class="lexcard ${cls} ${S.selGlyph===k?"sel":""}" data-g="${k}">
      <div class="ct">${freq[k]||0}</div>
      ${rad?`<div class="rad">${rad==="numeral"?"№":rad==="mark"?"·":RADICALS[rad]?RADICALS[rad].label.slice(0,4):""}</div>`:""}
      <div class="glbox">${gl(k,40)}</div>
      <div class="nm">${mean?esc(shortLabel(mean)):"—"}</div>
    </div>`;
  }).join("")||`<div class="dim" style="grid-column:1/-1;padding:24px;text-align:center">No signs match.</div>`;

  const counts=`${seen.length} distinct signs attested · ${namedCount()} named · ${confirmedCount()} confirmed`;
  return `<div class="split" style="grid-template-columns:1fr 400px">
    <div class="panel">
      <div class="ph"><h3>Sign List</h3>
        <div class="lexbar">
          <input id="lexq" placeholder="search…" value="${esc(lexFilter.q)}" aria-label="Search signs">
          <select id="lexshow" aria-label="Filter signs">
            <option value="seen" ${lexFilter.show==="seen"?"selected":""}>all attested</option>
            <option value="unnamed" ${lexFilter.show==="unnamed"?"selected":""}>unnamed</option>
            <option value="named" ${lexFilter.show==="named"?"selected":""}>named, unproven</option>
            <option value="confirmed" ${lexFilter.show==="confirmed"?"selected":""}>confirmed</option>
          </select>
          <select id="lexsort" aria-label="Sort signs">
            <option value="freq" ${lexFilter.sort==="freq"?"selected":""}>by frequency</option>
            <option value="rad" ${lexFilter.sort==="rad"?"selected":""}>by family</option>
          </select>
        </div></div>
      <div class="pb"><div class="dimmer" style="font-size:11px;margin-bottom:10px">${counts}</div>
        <div class="lexgrid">${cards}</div></div>
    </div>
    <div id="glyphpanel">${S.selGlyph?glyphPanelHTML(S.selGlyph):
      `<div class="panel"><div class="ph"><h3>The Sign</h3></div><div class="pb dim" style="font-size:13px;font-family:var(--serif)">
      Choose a sign to give it a meaning, and to see every place it occurs in the corpus.<br><br>
      A sign is worth naming when you can say <i>why</i>. Frequency, position, the company it keeps, the numbers beside it —
      these are the evidence. Guessing is permitted, but the clay does not care what you hope.</div></div>`}</div>
  </div>`;
}
function concordance(m,limit){
  const out=[];
  for(const t of foundTablets()){
    t.lines.forEach((ln,li)=>{
      ln.tok.forEach((tok,ti)=>{
        if(tok.m!==m||isDmg(t,li,ti))return;
        const cell=(j)=>{
          const x=ln.tok[j];if(!x)return"";
          if(x.c)return"⟨"+x.c+"⟩";
          if(isDmg(t,li,j))return"···";
          return tokenText(x.m);
        };
        const left=[],right=[];
        for(let j=Math.max(0,ti-4);j<ti;j++)left.push(cell(j));
        for(let j=ti+1;j<Math.min(ln.tok.length,ti+5);j++)right.push(cell(j));
        out.push({l:left.join(" · "),r:right.join(" · "),src:t.title,pos:ti===0?"initial":ti===ln.tok.length-1?"final":""});
      });
    });
  }
  return limit?out.slice(0,limit):out;
}
function glyphPanelHTML(m){
  const mm=L.M[m],freq=glyphFreq()[m]||0;
  const mean=meaningOf(m),conf=S.confirmed[m];
  const kw=concordance(m,40);
  const initial=kw.filter(k=>k.pos==="initial").length,final=kw.filter(k=>k.pos==="final").length;
  const rad=radicalOf(m);
  const used={};for(const k in S.assign)if(k!==m)used[S.assign[k]]=k;

  // candidate meanings, narrowed by whatever families the player has established
  let cands=L.meanings.slice();
  if(rad==="numeral")cands=cands.filter(c=>c.cat==="numeral");
  else if(mm.cat==="grammar"&&mm.hasRad)cands=cands.filter(c=>c.cat==="grammar");
  else if(rad&&RADICALS[rad])cands=cands.filter(c=>c.cat===rad);
  else cands=cands.filter(c=>c.cat!=="numeral");
  const groups={};
  for(const c of cands)(groups[c.cat]=groups[c.cat]||[]).push(c);
  const listHTML=CAT_ORDER.filter(c=>groups[c]).map(c=>
    `<div class="grp">${CAT_LABEL[c]}</div>`+groups[c].map(x=>
      `<button class="m ${used[x.id]?"taken":""} ${mean&&mean.id===x.id?"cur":""}" data-mean="${x.id}">
        <span>${esc(x.label)}</span>${used[x.id]?`<span class="dimmer" style="font-size:10.5px">used</span>`:""}</button>`).join("")
  ).join("");

  return `<div class="panel" style="position:sticky;top:0">
    <div class="ph"><h3>The Sign</h3>${conf?'<span class="chip green">confirmed</span>':mean?'<span class="chip amber">named</span>':'<span class="chip grey">unnamed</span>'}</div>
    <div class="pb">
      <div class="signhead">
        <div class="chip-clay">${gl(m,64)}</div>
        <div style="flex:1;min-width:0">
          <div class="name">${mean?esc(shortLabel(mean)):"unnamed"}</div>
          <div class="mono dim" style="font-size:12px">/${esc(mm.rom)}/ <span class="dimmer">— conjectural reading</span></div>
          <div class="dimmer" style="font-size:11.5px;margin-top:4px">${freq} occurrence${freq===1?"":"s"}
            ${initial?` · ${initial} clause-initial`:""}${final?` · ${final} clause-final`:""}</div>
          ${rad?`<div class="chip teal" style="margin-top:6px">${rad==="numeral"?"bracketed numeral":rad==="mark"?"grammatical mark":CAT_LABEL[rad]+" family"}</div>`:""}
        </div>
      </div>
      ${conf?`<div class="chip green" style="margin-bottom:12px">This reading is proven. It cannot be changed.</div>`:`
      <div class="sc dim" style="font-size:11px;margin-bottom:5px">Assign a meaning</div>
      <div class="meanlist">${listHTML}</div>
      <div style="display:flex;gap:7px;margin-top:9px">
        ${mean?`<button class="btn sm" id="clearmean">Withdraw reading</button>`:""}
        <button class="btn sm" id="courierbtn" ${S.insight<courierCost()?"disabled":""}>Write to the Society · ☉${courierCost()} · 2d</button>
      </div>
      <div class="dimmer" style="font-size:11px;margin-top:6px">The Society will read one sign for you outright. They are slow and they are expensive.</div>`}
      <hr class="rule">
      <div class="sc dim" style="font-size:11px;margin-bottom:6px">Concordance — ${kw.length} context${kw.length===1?"":"s"}</div>
      <div class="kwic">
        ${kw.length?kw.map(k=>`<div class="row"><div class="l">${esc(k.l)}</div>
          <div class="c">${esc(mean?shortLabel(mean):"[?]")}</div>
          <div class="r">${esc(k.r)}</div><div class="src">${esc(k.src)}</div></div>`).join("")
          :'<div class="dimmer">No attestations.</div>'}
      </div>
    </div></div>`;
}
function openGlyph(m){S.selGlyph=m;S.tab="lexicon";save();render();}
function bindLexicon(root){
  root.querySelectorAll("[data-g]").forEach(el=>el.onclick=()=>{S.selGlyph=el.dataset.g;save();render();});
  const q=$("#lexq",root);
  if(q)q.oninput=()=>{lexFilter.q=q.value;const p=$("#main");render();
    const nq=$("#lexq");if(nq){nq.focus();nq.setSelectionRange(nq.value.length,nq.value.length);}};
  const sh=$("#lexshow",root);if(sh)sh.onchange=()=>{lexFilter.show=sh.value;render();};
  const so=$("#lexsort",root);if(so)so.onchange=()=>{lexFilter.sort=so.value;render();};
  root.querySelectorAll("[data-mean]").forEach(b=>b.onclick=()=>{
    const id=b.dataset.mean;
    for(const k in S.assign){
      if(S.assign[k]!==id||k===S.selGlyph)continue;
      if(S.confirmed[k]){
        toast(`That reading is already proven for another sign. Two signs cannot share one meaning.`,"bad");
        return;
      }
      delete S.assign[k];
    }
    S.assign[S.selGlyph]=id;checkAllStory();save();render();
  });
  const cm=$("#clearmean",root);if(cm)cm.onclick=()=>{delete S.assign[S.selGlyph];save();render();};
  const cb=$("#courierbtn",root);if(cb)cb.onclick=()=>courier(S.selGlyph);
}
