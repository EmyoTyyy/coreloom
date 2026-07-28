/* THE DROWNED LEXICON — tablet generators, one per document genre */
"use strict";
/* ============================ TABLET FACTORY ============================= */
let TID=0;
// Excavated objects are shown as catalogue photographs; the sign incised on them
// is pictorial evidence, so the picture is doing real work in the puzzle.
const OBJ_IMAGES={
  jar:"assets/obj-jar.webp",       boat:"assets/obj-boat.webp",
  goat:"assets/obj-goat.webp",     ox:"assets/obj-ox.webp",
  bird:"assets/obj-bird.webp",     fish:"assets/obj-fish.webp",
  bread:"assets/obj-bread.webp",   tablet:"assets/obj-tablet.webp"
};
const LABELABLE=[["jar","jar"],["boat","boat"],["goat","goat"],["ox","ox"],["bird","bird"],
  ["fish","fish"],["bread","bread"],["oil","jar"],["wine","jar"],["grain","jar"],
  ["copper","tablet"],["salt","jar"],["law","tablet"],["stone","tablet"]];

function newTablet(o){return Object.assign({id:"t"+(++TID),lines:[],arith:null,story:null,object:null,
  condition:100,caption:"",type:"tablet",title:"Tablet"},o);}

const GOODS=ROOTS.filter(x=>x[2]==="good").map(x=>x[0]);
const ANIMALS=ROOTS.filter(x=>x[2]==="animal").map(x=>x[0]);
const PERSONS=ROOTS.filter(x=>x[2]==="person").map(x=>x[0]);
const PLACES=ROOTS.filter(x=>x[2]==="place").map(x=>x[0]);
const ACTS=ROOTS.filter(x=>x[2]==="act").map(x=>x[0]);
const QUALS=ROOTS.filter(x=>x[2]==="quality").map(x=>x[0]);
const NATURE=ROOTS.filter(x=>x[2]==="nature").map(x=>x[0]);
const IDEAS=ROOTS.filter(x=>x[2]==="idea").map(x=>x[0]);

/* --- Ledger: the arithmetic backbone of the decipherment ----------------- */
function genLedger(L,r,opts={}){
  const item=r.pick(opts.items||GOODS.concat(ANIMALS));
  const nLines=r.range(3,5);
  const recips=r.pickN(PERSONS.concat(PLACES),nLines);
  const lines=[],arithLines=[];
  // header — "reckoning of X"
  const h=NP(L,["count",{bare:true}]),ig=NP(L,[item,{bare:true}]);
  const ht=L.genPos==="pre"?[...ig.tok,tk("GEN"),...h.tok]:[...h.tok,...ig.tok,tk("GEN")];
  lines.push({tok:ht,en:`Reckoning of ${G(L,item)}`,flat:true,struct:{s:[0,ht.length]}});

  let total=0;
  for(let i=0;i<nLines;i++){
    const n=r.weighted([[r.range(1,9),5],[r.range(10,40),4],[r.range(41,180),2]]);
    total+=n;
    const nt=numTok(n),it=[tk(item)];
    let phrase,ni;
    if(L.numPos==="pre"){phrase=[...nt,...it];ni=[0,nt.length];}
    else{phrase=[...it,...nt];ni=[it.length,it.length+nt.length];}
    const rec=NP(L,[recips[i],{}]);
    const tok=[...phrase,...rec.tok,tk("DAT")];
    lines.push({tok,en:`${n} ${n===1?G(L,item):enPlural(G(L,item))} — to ${rec.en}`,flat:true,
      struct:{o:[0,phrase.length],dat:[phrase.length,tok.length]}});
    arithLines.push({line:lines.length-1,idx:ni});
  }
  const nt=numTok(total),it=[tk(item)];
  let phrase,ni;
  if(L.numPos==="pre"){phrase=[...nt,...it];ni=[1,1+nt.length];}
  else{phrase=[...it,...nt];ni=[1+it.length,1+it.length+nt.length];}
  lines.push({tok:[tk("count"),...phrase],en:`Total: ${total} ${enPlural(G(L,item))}`,total:true,flat:true,
    struct:{s:[0,1],o:[1,1+phrase.length]}});
  const totalRef={line:lines.length-1,idx:ni};

  return newTablet({type:"ledger",title:`Ledger of ${G(L,item)}`,lines,
    arith:{lines:arithLines,total:totalRef,value:total},
    caption:"A ruled accounting tablet. The scribe's hand is quick and careless."});
}

/* --- Label on an excavated object: pictorial evidence -------------------- */
function genLabel(L,r){
  const [word,icon]=r.pick(LABELABLE);
  const style=r.int(3);
  let lines;
  if(style===0){
    lines=[{tok:[tk(word)],en:G(L,word),flat:true,struct:{s:[0,1]}}];
  }else if(style===1){
    const owner=r.pick(PERSONS.concat(["temple","city"]));
    const np=NP(L,[word,{bare:true,gen:[owner,{}]}]);
    lines=[{tok:np.tok,en:np.en,flat:true,struct:{s:[0,np.tok.length]}}];
  }else{
    const n=r.range(2,9);
    const np=NP(L,[word,{num:n,pl:n>1}]);
    lines=[{tok:np.tok,en:np.en,flat:true,struct:{s:[0,np.tok.length]}}];
  }
  return newTablet({type:"label",title:`Inscribed ${G(L,word)}`,lines,object:icon,
    caption:`Found intact. The mark is incised on the shoulder of the object.`});
}

/* --- Bilingual seal: hard truth, rationed ------------------------------- */
function genBilingual(L,r,keys){
  const lines=keys.map(k=>({tok:[tk(k)],en:G(L,k),bilingual:true}));
  return newTablet({type:"bilingual",title:"Bilingual Seal Impression",lines,confirms:keys.slice(),
    caption:"A merchant's seal, cut in two scripts — Old Vaskiri above, the trade-tongue of the northern coast below. The northern script is well understood."});
}

/* --- Hymn: heavy parallelism, good for spotting formulae ---------------- */
function genHymn(L,r){
  const subj=r.pick(["sea","god","fire","star","wind","night","king","queen"]);
  const adjs=r.pickN(QUALS,3);
  const lines=[];
  lines.push((()=>{const c=CL(L,{s:[subj,{}],v:"rise",pst:false});return c;})());
  for(const a of adjs){
    const np=NP(L,[subj,{adj:a}]);
    const c=CL(L,{s:[subj,{adj:a}],v:r.pick(["speak","rise","command","carry"]),o:[r.pick(NATURE.concat(IDEAS)),{}]});
    lines.push(c);
  }
  const c=CL(L,{s:[r.pick(PERSONS),{pl:true}],v:"fear",o:[subj,{}],pst:false});
  lines.push(c);
  return newTablet({type:"hymn",title:`Hymn to the ${G(L,subj)}`,lines,
    caption:"Formal script, deeply cut, evenly spaced. Meant to be read aloud."});
}

/* --- Decree ------------------------------------------------------------- */
function genDecree(L,r){
  const ruler=r.pick(["king","queen","priest"]);
  const lines=[];
  lines.push(CL(L,{s:[ruler,{adj:"great"}],v:"command",pst:true}));
  const n=r.range(2,3);
  for(let i=0;i<n;i++){
    lines.push(CL(L,{
      s:[r.pick(PERSONS),{pl:r.chance(.5)}],
      v:r.pick(ACTS),
      o:[r.pick(GOODS.concat(PLACES)),{def:true}],
      neg:r.chance(.45),
      loc:r.chance(.4)?[r.pick(PLACES),{}]:null
    }));
  }
  lines.push(CL(L,{s:["law",{adj:"true"}],v:"seal",pst:true,loc:["temple",{}]}));
  return newTablet({type:"decree",title:`Decree of the ${G(L,ruler)}`,lines,
    caption:"Official clay, stamped twice at the foot with a cylinder seal."});
}

/* --- Curse / boundary stone -------------------------------------------- */
function genCurse(L,r){
  const lines=[];
  lines.push(CL(L,{s:[r.pick(PERSONS),{}],v:"destroy",o:["tomb",{def:true}],neg:true}));
  lines.push(CL(L,{s:["god",{pl:true,adj:"dark"}],v:r.pick(["take","destroy","drown"]),
    o:[r.pick(["name","blood","child","house"]),{}]}));
  lines.push(CL(L,{s:["curse",{}],v:"rise",loc:[r.pick(PLACES),{}]}));
  return newTablet({type:"curse",title:"Grave Curse",lines,
    caption:"Cut into a slab of dark basalt set upright at the head of a shaft grave."});
}

/* --- Kinglist ----------------------------------------------------------- */
function genKinglist(L,r){
  const lines=[];const roles=["king","queen"];
  let prev=null;
  for(let i=0;i<r.range(3,5);i++){
    const role=r.pick(roles),yrs=r.range(3,45);
    const np=NP(L,[role,{adj:i===0?"first":r.pick(["great","holy","true","dark"])}]);
    const yn=NP(L,["year",{num:yrs,pl:true}]);
    const tok=[...np.tok,...yn.tok,tk("count")];
    lines.push({tok,en:`${np.en}: ${yrs} years`,flat:true,
      struct:{s:[0,np.tok.length],o:[np.tok.length,tok.length]}});
  }
  lines.push(CL(L,{s:["king",{adj:"dead",pl:true}],v:"speak",neg:true}));
  return newTablet({type:"kinglist",title:"List of Reigns",lines,
    caption:"A dynastic list. The left column gives titles; the right, lengths of reign."});
}

/* --- Letter (generic, non-story) ---------------------------------------- */
function genLetter(L,r){
  const to=r.pick(Object.keys(L.names)),from=r.pick(Object.keys(L.names).filter(k=>k!==to));
  const lines=[{tok:[tk("name"),cart(L.names[to])],en:`To ${L.names[to]}:`,head:true}];
  for(let i=0;i<r.range(3,5);i++){
    lines.push(CL(L,{
      s:[r.pick(PERSONS.concat(["boat","water","wind"])),{pl:r.chance(.3)}],
      v:r.pick(ACTS),
      o:r.chance(.8)?[r.pick(GOODS.concat(NATURE,IDEAS)),{num:r.chance(.35)?r.range(2,30):null,def:true}]:null,
      pst:r.chance(.55),neg:r.chance(.2),
      dat:r.chance(.3)?[r.pick(PERSONS.concat(PLACES)),{}]:null,
      loc:r.chance(.3)?[r.pick(PLACES),{}]:null
    }));
  }
  lines.push({tok:[tk("name"),cart(L.names[from])],en:`— ${L.names[from]}`,head:true});
  return newTablet({type:"letter",title:`Letter to ${L.names[to]}`,lines,
    caption:"A small oblong tablet, still bearing the fingerprints of its envelope."});
}
