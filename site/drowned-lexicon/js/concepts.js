/* THE DROWNED LEXICON — the concept inventory and English morphology */
"use strict";
/* ---------------------------- CONCEPT DATA ------------------------------ */
// Each root concept: [key, english gloss, category]
const ROOTS=[
  // people (9)
  ["king","king","person"],["queen","queen","person"],["priest","priest","person"],["scribe","scribe","person"],
  ["mother","mother","person"],["child","child","person"],["soldier","soldier","person"],["merchant","merchant","person"],
  ["god","god","person"],
  // places (10)
  ["city","city","place"],["temple","temple","place"],["river","river","place"],["sea","sea","place"],
  ["house","house","place"],["field","field","place"],["road","road","place"],["mountain","mountain","place"],
  ["gate","gate","place"],["tomb","tomb","place"],
  // goods (12)
  ["grain","grain","good"],["oil","oil","good"],["fish","fish","good"],["salt","salt","good"],
  ["copper","copper","good"],["stone","stone","good"],["boat","boat","good"],["jar","jar","good"],
  ["cloth","cloth","good"],["bread","bread","good"],["wine","wine","good"],["gold","gold","good"],
  // animals (4)
  ["goat","goat","animal"],["ox","ox","animal"],["bird","bird","animal"],["serpent","serpent","animal"],
  // acts (14)
  ["give","give","act"],["take","take","act"],["build","build","act"],["destroy","destroy","act"],
  ["sail","sail","act"],["die","die","act"],["speak","speak","act"],["fear","fear","act"],
  ["carry","carry","act"],["count","count","act"],["seal","seal","act"],["drown","drown","act"],
  ["rise","rise","act"],["command","command","act"],
  // qualities (8)
  ["great","great","quality"],["small","small","quality"],["holy","holy","quality"],["dark","dark","quality"],
  ["dead","dead","quality"],["first","first","quality"],["true","true","quality"],["bitter","bitter","quality"],
  // nature (7)
  ["year","year","nature"],["day","day","nature"],["night","night","nature"],["water","water","nature"],
  ["fire","fire","nature"],["wind","wind","nature"],["star","star","nature"],
  // ideas (6)
  ["name","name","idea"],["law","law","idea"],["oath","oath","idea"],["curse","curse","idea"],
  ["dream","dream","idea"],["blood","blood","idea"]
];
const NUMERALS=[
  ["n1","one",1],["n2","two",2],["n3","three",3],["n4","four",4],["n5","five",5],
  ["n6","six",6],["n7","seven",7],["n8","eight",8],["n9","nine",9],
  ["nTEN","ten (×10)",10],["nHUN","hundred (×100)",100]
];
const GRAMS=[
  ["PL","PLURAL — more than one"],["PST","PAST — completed action"],["GEN","OF — possession"],
  ["NEG","NOT — negation"],["DAT","TO — recipient"],["LOC","IN — location"],
  ["AND","AND — conjunction"],["DEF","THE — definite"],["Q","QUESTION — interrogative"]
];
// Decoy meanings offered alongside the true ones, so the puzzle isn't pure elimination.
const DECOYS=[
  ["brother","person"],["sister","person"],["slave","person"],["stranger","person"],["hunter","person"],["judge","person"],
  ["island","place"],["marsh","place"],["well","place"],["garden","place"],["market","place"],["bridge","place"],["desert","place"],
  ["wool","good"],["silver","good"],["honey","good"],["reed","good"],["knife","good"],["basket","good"],["rope","good"],["beer","good"],
  ["lion","animal"],["dog","animal"],["horse","animal"],["bee","animal"],["donkey","animal"],
  ["burn","act"],["swear","act"],["hear","act"],["walk","act"],["buy","act"],["cut","act"],["wash","act"],["sing","act"],
  ["sleep","act"],["forget","act"],["open","act"],["weigh","act"],["send","act"],["return","act"],
  ["cold","quality"],["heavy","quality"],["new","quality"],["broken","quality"],["red","quality"],["last","quality"],
  ["hidden","quality"],["wide","quality"],["sweet","quality"],
  ["moon","nature"],["sun","nature"],["rain","nature"],["earth","nature"],["shadow","nature"],["month","nature"],["ice","nature"],
  ["debt","idea"],["gift","idea"],["war","idea"],["silence","idea"],["truth","idea"],["fate","idea"],["song","idea"],["memory","idea"]
];
const DECOY_NUM=[["zero",0],["half",0],["twelve (×12)",12],["twenty (×20)",20],["sixty (×60)",60],["thousand (×1000)",1000]];
const DECOY_GRAM=["FUTURE — action to come","FROM — origin","WITH — accompaniment","IF — condition",
  "BECAUSE — cause","DIMINUTIVE — little","HONORIFIC — respect","VOCATIVE — address",
  "DUAL — exactly two","CAUSATIVE — made to happen"];

const CAT_LABEL={person:"Persons",place:"Places",good:"Goods",animal:"Beasts",act:"Actions",
  quality:"Qualities",nature:"World",idea:"Abstractions",numeral:"Numerals",grammar:"Grammatical Marks"};
const CAT_ORDER=["person","place","good","animal","act","quality","nature","idea","numeral","grammar"];

// English morphology for readable renderings
const PLURAL_IRR={ox:"oxen",fish:"fish",child:"children",man:"men",foot:"feet",tooth:"teeth",goose:"geese"};
const MASS=new Set(["grain","oil","salt","copper","gold","water","fire","wind","blood","bread","wine","cloth","silver",
  "honey","wool","beer","rain","earth","ice","silence","truth","war","memory","song","fate"]);
function enPlural(w){
  if(PLURAL_IRR[w])return PLURAL_IRR[w];
  if(MASS.has(w))return w;
  if(/(s|sh|ch|x|z)$/.test(w))return w+"es";
  if(/[^aeiou]y$/.test(w))return w.slice(0,-1)+"ies";
  return w+"s";
}
const PAST_IRR={give:"gave",take:"took",build:"built",speak:"spoke",rise:"rose",die:"died",carry:"carried",
  hear:"heard",buy:"bought",cut:"cut",sing:"sang",sleep:"slept",forget:"forgot",send:"sent",swear:"swore",
  walk:"walked",burn:"burned",weigh:"weighed",wash:"washed",open:"opened",return:"returned"};
function enPast(w){
  if(PAST_IRR[w])return PAST_IRR[w];
  if(/e$/.test(w))return w+"d";
  if(/[^aeiou]y$/.test(w))return w.slice(0,-1)+"ied";
  return w+"ed";
}
