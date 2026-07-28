/* THE DROWNED LEXICON — deterministic world build from a seed */
"use strict";
/* ============================ WORLD GENERATION =========================== */
const GENS={ledger:genLedger,label:genLabel,hymn:genHymn,decree:genDecree,curse:genCurse,
  kinglist:genKinglist,letter:genLetter};

function makeStoryTablet(L,r,beat,i){
  const lines=[];
  if(beat.to)lines.push({tok:[tk("name"),cart(L.names[beat.to])],en:`To ${L.names[beat.to]}:`,head:true});
  for(const c of beat.clauses)lines.push(CL(L,c));
  if(beat.from)lines.push({tok:[tk("name"),cart(L.names[beat.from])],en:`— ${L.names[beat.from]}`,head:true});
  const t=newTablet({type:beat.type,title:beat.tabletTitle,lines,story:i,caption:beat.caption});
  t.uid="S"+i;
  return t;
}

function buildVault(L,seed){
  const r=RNG(seed+"::vault");
  const sealed=r.range(3,9)*100+r.range(1,9)*10+r.range(1,9);
  const lost=r.range(1,3)*100+r.range(0,9)*10+r.range(1,9);
  const kept=sealed-lost;
  const wordKey=r.pick(["queen","oath","name","law","city","scribe"]);
  const lines=[];
  lines.push(CL(L,{s:["sea",{adj:"bitter"}],v:"take",o:["city",{def:true}],pst:true,loc:["night",{adj:"dark"}]}));
  lines.push(CL(L,{s:["scribe",{pl:true}],v:"seal",o:["law",{num:sealed,pl:true}],pst:true,loc:["house",{}]}));
  lines.push(CL(L,{s:["water",{adj:"bitter"}],v:"destroy",o:["law",{num:lost,pl:true}],pst:true}));
  lines.push(CL(L,{s:["gate",{def:true}],v:"rise",dat:["scribe",{}]}));
  lines.push(CL(L,{s:["scribe",{}],v:"count",o:["law",{}],q:true}));
  lines.push(CL(L,{s:["scribe",{}],v:"speak",o:["name",{gen:[wordKey,{}]}],q:true}));
  const t=newTablet({type:"vault",title:"Inscription of the Archive Door",lines,
    caption:"Cut into the basalt lintel above the sealed door. Six lines, deeply and patiently made."});
  t.uid="VAULT";
  const choices=RNG(seed+"::vc").shuffle(
    [wordKey].concat(RNG(seed+"::vc2").pickN(ROOTS.map(x=>x[0]).filter(k=>k!==wordKey),7)));
  return {tablet:t,answerCount:kept,answerWord:wordKey,choices,sealed,lost};
}

function buildWorld(L,seed){
  const biPool=RNG(seed+"::bi").shuffle(ROOTS.map(x=>x[0]));
  let biAt=0;
  const sites=SITES.map((s,si)=>{
    const r=RNG(seed+"::site"+si);
    const pool=[];
    if(!s.vault){
      const types=[];
      for(let i=0;i<s.digs*3+4;i++)types.push(r.weighted(s.mix));
      for(let i=0;i<s.bi;i++)types[r.range(1,types.length-1)]="bilingual";
      for(let i=0;i<types.length;i++){
        let t;
        if(types[i]==="bilingual"){
          const keys=[];
          for(let k=0;k<3;k++){keys.push(biPool[biAt%biPool.length]);biAt++;}
          t=genBilingual(L,r,keys);
        }else t=GENS[types[i]](L,r);
        t.uid="s"+si+"_"+i;t.site=si;
        pool.push(t);
      }
    }
    return {...s,idx:si,pool};
  });
  // The final beat is the door itself — it is not dug up, it is walked to.
  const story=STORY.slice(0,STORY.length-1).map((b,i)=>makeStoryTablet(L,RNG(seed+"::story"+i),b,i));
  const vault=buildVault(L,seed);
  return {sites,story,vault,extra:[]};
}
