/* THE DROWNED LEXICON — language generation, morphology and syntax builders */
"use strict";
/* ======================= LANGUAGE GENERATION ============================= */
const ONSETS=["k","kh","t","th","p","b","d","g","m","n","s","sh","z","v","r","l","y","w","ts","kr","tr","sk","vr","ml","'"];
const NUCLEI=["a","a","a","e","e","i","i","o","u","ae","ei","au","ii","uu"];
const CODAS=["","","","n","m","r","l","s","sh","k","t","th","kh","rn","st"];

function buildLanguage(seed){
  const r=RNG(seed+"::lang");
  const L={seed};
  L.order=r.weighted([["SOV",4],["SVO",3],["VSO",2]]);
  L.adjPos=r.chance(.55)?"post":"pre";
  L.numPos=r.chance(.6)?"pre":"post";
  L.genPos=r.chance(.5)?"post":"pre";   // position of the possessor phrase relative to the head
  L.radicalRate=0.78;

  // phonology: a restricted syllable inventory gives the language a consistent "sound"
  const onsets=r.pickN(ONSETS,r.range(11,15));
  const nuclei=r.pickN(NUCLEI,r.range(6,9));
  const codas=r.pickN(CODAS,r.range(6,9));
  const syl=()=>r.pick(onsets)+r.pick(nuclei)+r.pick(codas);
  const usedRom=new Set(), usedSig=new Set();
  function word(nsyl){
    for(let i=0;i<60;i++){
      let w="";for(let j=0;j<nsyl;j++)w+=syl();
      w=w.replace(/''/g,"'").replace(/^'/,"");
      if(w.length>=2&&!usedRom.has(w)){usedRom.add(w);return w;}
    }
    return syl()+syl()+r.int(99);
  }
  function glyphFor(cat,withRad){
    for(let i=0;i<200;i++){
      const g=makeGlyph(r,cat,withRad);
      const bodySig=glyphSig(g.body);
      if(!usedSig.has(bodySig)){usedSig.add(bodySig);return g.strokes;}
    }
    return makeGlyph(r,cat,withRad).strokes;
  }

  L.M={};L.keys=[];
  for(const [key,gloss,cat] of ROOTS){
    const withRad=r.chance(L.radicalRate);
    L.M[key]={key,gloss,cat,kind:"root",rom:word(r.weighted([[1,3],[2,5],[3,2]])),
      strokes:glyphFor(cat,withRad),hasRad:withRad};
    L.keys.push(key);
  }
  for(const [key,label,value] of NUMERALS){
    L.M[key]={key,gloss:label,cat:"numeral",kind:"num",value,rom:word(r.chance(.7)?1:2),
      strokes:glyphFor("numeral",true),hasRad:true};
    L.keys.push(key);
  }
  for(const [key,label] of GRAMS){
    L.M[key]={key,gloss:label,cat:"grammar",kind:"gram",rom:word(1),
      strokes:glyphFor("grammar",true),hasRad:true};
    L.keys.push(key);
  }

  // Proper names for the correspondence — kept short and sayable
  const softOn=onsets.filter(o=>o.length<=2&&o!=="'");
  const softCo=codas.filter(c=>c.length<=1);
  const nameWord=()=>{
    for(let i=0;i<40;i++){
      let w=r.pick(softOn)+r.pick(nuclei)+r.pick(softCo)+r.pick(softOn)+r.pick(nuclei)+
        (r.chance(.5)?r.pick(softCo):"");
      if(w.length>=4&&w.length<=8&&!usedRom.has(w)){usedRom.add(w);return w;}
    }
    return r.pick(softOn)+r.pick(nuclei)+r.pick(softOn)+r.pick(nuclei);
  };
  L.names={};
  for(const role of ["scribe","brother","queen","priest","harbormaster","merchant"]){
    const n=nameWord();
    L.names[role]=n.charAt(0).toUpperCase()+n.slice(1);
  }
  L.cityName=(()=>{const n=nameWord();return n.charAt(0).toUpperCase()+n.slice(1);})();

  // The candidate meanings offered to the player
  L.meanings=[];const push=(m)=>L.meanings.push(m);
  for(const [key,gloss,cat] of ROOTS)push({id:"r_"+key,label:gloss,cat,kind:"root"});
  for(const [label,cat] of DECOYS)push({id:"d_"+label,label,cat,kind:"root"});
  for(const [key,label,value] of NUMERALS)push({id:"num_"+key,label,cat:"numeral",kind:"num",value});
  for(const [label,value] of DECOY_NUM)push({id:"dnum_"+label.replace(/\W/g,""),label,cat:"numeral",kind:"num",value});
  for(const [key,label] of GRAMS)push({id:"g_"+key,label,cat:"grammar",kind:"gram"});
  for(const label of DECOY_GRAM)push({id:"dg_"+label.replace(/\W/g,""),label,cat:"grammar",kind:"gram"});
  L.meaningById={};for(const m of L.meanings)L.meaningById[m.id]=m;

  L.truth={};
  for(const [key] of ROOTS)L.truth[key]="r_"+key;
  for(const [key] of NUMERALS)L.truth[key]="num_"+key;
  for(const [key] of GRAMS)L.truth[key]="g_"+key;
  return L;
}

/* ===================== MORPHOLOGY & SYNTAX BUILDERS ====================== */
const tk=(m)=>({m});
const cart=(name)=>({c:name});
function G(L,key){return L.M[key].gloss;}

function numTok(n){
  const out=[];
  const h=Math.floor(n/100), t=Math.floor((n%100)/10), o=n%10;
  if(h){if(h>1)out.push(tk("n"+h));out.push(tk("nHUN"));}
  if(t){if(t>1)out.push(tk("n"+t));out.push(tk("nTEN"));}
  if(o)out.push(tk("n"+o));
  if(!out.length)out.push(tk("n1"));
  return out;
}
function parseNumRun(toks,valOf){
  let total=0,cur=0;
  for(const t of toks){
    if(!t.m)return null;
    const v=valOf(t.m);
    if(v==null)return null;
    if(v>=10){total+=(cur||1)*v;cur=0;}
    else cur=v;
  }
  return total+cur;
}

// NP(L, [headKey, opts]) -> {tok, en}
function NP(L,spec){
  if(!spec)return null;
  const [head,o={}]=spec;
  let tok=[tk(head)];
  let noun=G(L,head);
  let en=o.pl?enPlural(noun):noun;
  if(o.pl)tok.push(tk("PL"));
  if(o.adj){
    tok=L.adjPos==="pre"?[tk(o.adj),...tok]:[...tok,tk(o.adj)];
    en=G(L,o.adj)+" "+en;
  }
  if(o.gen){
    const g=NP(L,o.gen);
    const gt=[...g.tok,tk("GEN")];
    tok=L.genPos==="pre"?[...gt,...tok]:[...tok,...gt];
    en=en+" of "+g.en;
  }
  if(o.num!=null){
    const nt=numTok(o.num);
    tok=L.numPos==="pre"?[...nt,...tok]:[...tok,...nt];
    en=o.num+" "+en;
  }else{
    if(o.def)tok=[tk("DEF"),...tok];
    if(!o.bare)en="the "+en;
  }
  return {tok,en};
}
// CL(L,{s,v,o,pst,neg,dat,loc}) -> {tok, en}
function CL(L,spec){
  const s=NP(L,spec.s),ob=spec.o?NP(L,spec.o):null;
  const dat=spec.dat?NP(L,spec.dat):null,loc=spec.loc?NP(L,spec.loc):null;
  let vt=[tk(spec.v)];
  if(spec.pst)vt.push(tk("PST"));
  if(spec.neg)vt=[tk("NEG"),...vt];
  let parts;
  if(L.order==="SOV")parts=[["s",s.tok],ob&&["o",ob.tok],["v",vt]];
  else if(L.order==="SVO")parts=[["s",s.tok],["v",vt],ob&&["o",ob.tok]];
  else parts=[["v",vt],["s",s.tok],ob&&["o",ob.tok]];
  parts=parts.filter(Boolean);
  if(dat)parts.push(["dat",[...dat.tok,tk("DAT")]]);
  if(loc)parts.push(["loc",[...loc.tok,tk("LOC")]]);
  if(spec.q)parts.push(["q",[tk("Q")]]);
  // record index ranges so that, once word order is understood, the reading can be re-ordered
  const struct={};let off=0,tok=[];
  for(const [role,arr] of parts){struct[role]=[off,off+arr.length];off+=arr.length;tok=tok.concat(arr);}
  const plSubj=!!(spec.s[1]&&spec.s[1].pl);
  let verb=G(L,spec.v);
  verb=spec.pst?enPast(verb):(plSubj?verb:(verb+"s").replace(/ss$/,"ses"));
  let en=s.en+" "+(spec.neg?"does not "+G(L,spec.v)+" ":verb+" ");
  if(ob)en+=ob.en+" ";
  if(dat)en+="to "+dat.en+" ";
  if(loc)en+="in "+loc.en+" ";
  en=en.trim();
  if(spec.q)en+="?";
  return {tok,struct,en:en.charAt(0).toUpperCase()+en.slice(1)};
}
