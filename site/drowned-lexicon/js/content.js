/* THE DROWNED LEXICON — authored content: the story, the sites, the collation notes */
"use strict";
/* =============================== THE STORY =============================== */
// Thirteen tablets carry the account of the city's last year. Each is unlocked
// only when the player's own translation of it is good enough to carry the sense.
const STORY=[
 {act:1,title:"The Bitter Water",tabletTitle:"Report of the Harbour",type:"letter",
  to:"scribe",from:"harbormaster",req:0,
  caption:"Found face-down in silt at the foot of the quay wall. Water-stained but firm.",
  clauses:[
    {s:["water",{}],v:"rise",pst:true,loc:["field",{}]},
    {s:["water",{}],v:"carry",o:["salt",{}],pst:true},
    {s:["grain",{}],v:"rise",neg:true,pst:true}],
  prose:["The first tablet I can read with any confidence is an administrative report, and it is about salt.",
   "Water rose into the fields. The water carried salt. The grain did not come up. Three flat sentences, written by a harbour official to someone in the archive, and behind them a whole year of a city going quietly wrong.",
   "I have been assuming Tel Vaskir drowned in an afternoon. This says otherwise. This says it was drowning for a long time, from underneath, through the soil."]},

 {act:1,title:"The Boats That Did Not Sail",tabletTitle:"Letter of the Merchants",type:"letter",
  to:"queen",from:"merchant",req:3,
  caption:"A thin oblong tablet with a broken corner. Written in a commercial hand.",
  clauses:[
    {s:["merchant",{pl:true}],v:"sail",neg:true,pst:true,loc:["sea",{}]},
    {s:["boat",{pl:true}],v:"carry",o:["grain",{}],neg:true,pst:true},
    {s:["city",{}],v:"fear",o:["night",{}]}],
  prose:["A merchants' complaint, addressed upward. They did not sail. The boats did not carry grain.",
   "And then a line that is not administrative at all, dropped in at the end where a total should be: the city fears the night.",
   "I have read a great many ancient complaints. They do not usually end like that."]},

 {act:1,title:"The Throat",tabletTitle:"Decree Concerning the Gate",type:"decree",
  req:7,caption:"Heavy official clay, sealed twice. Recovered from the temple precinct.",
  clauses:[
    {s:["queen",{adj:"great"}],v:"command",pst:true},
    {s:["soldier",{pl:true}],v:"build",o:["gate",{adj:"great"}],pst:true},
    {s:["gate",{adj:"great"}],v:"take",o:["sea",{def:true}],pst:true}],
  prose:["The gate. Every survey of this site has noted the enormous masonry choking the lagoon mouth and nobody has known what it was for.",
   "It was a sea-gate. The queen ordered it; soldiers built it; and the third line says the great gate *took* the sea — held it, I think, the way a throat holds a breath.",
   "They built a wall against the water and lived behind it. That is not a city. That is a held breath, three generations long."]},

 {act:1,title:"The Measuring of the Water",tabletTitle:"Temple Record",type:"decree",
  req:11,caption:"A columnar record tablet from a temple storeroom. Ruled with great care.",
  clauses:[
    {s:["priest",{pl:true}],v:"count",o:["water",{def:true}],pst:true},
    {s:["priest",{pl:true}],v:"speak",o:["law",{}],pst:true},
    {s:["water",{}],v:"rise",pst:true,loc:["gate",{}]}],
  prose:["The priests measured the water. That was their office: to count the sea against the gate and declare the law from it.",
   "The last line of this tablet is the one that matters. The water rose at the gate. Not in the fields, not in the wells — at the gate itself.",
   "Somebody wrote that down, in a temple, in a ruled column, and then filed it."]},

 {act:2,title:"The False Count",tabletTitle:"Letter of the Archivist",type:"letter",
  to:"brother",from:"scribe",req:16,
  caption:"Small, private, unsealed. Never sent — found still in the archivist's own room.",
  clauses:[
    {s:["scribe",{}],v:"count",o:["water",{def:true}],pst:true},
    {s:["priest",{pl:true}],v:"speak",o:["law",{adj:"true"}],neg:true,pst:true},
    {s:["water",{adj:"dark"}],v:"rise",pst:true,loc:["city",{}]}],
  prose:["Here is where this stops being a site report and starts being something I do not enjoy reading.",
   "The archivist counted the water herself. Then: the priests did not speak the true law. She is accusing them, on clay, in her own house, in a letter to her brother that she never sent.",
   "The measurements in the temple record were false. Somebody was writing down a lower sea than the sea that was actually there."]},

 {act:2,title:"The Harbourmaster's Warning",tabletTitle:"Reply from the Quay",type:"letter",
  to:"scribe",from:"brother",req:21,
  caption:"Struck through twice with a stylus, as if the writer changed his mind and sent it anyway.",
  clauses:[
    {s:["boat",{pl:true}],v:"sail",neg:true,pst:true,loc:["gate",{}]},
    {s:["water",{}],v:"take",o:["gate",{def:true}],pst:true},
    {s:["merchant",{pl:true}],v:"fear",o:["law",{}]}],
  prose:["Her brother is the harbourmaster, and he answers her.",
   "Boats no longer pass at the gate — the channel has closed up or the level has changed. The water has *taken* the gate; the same verb the decree used for what the gate did to the sea, now reversed.",
   "And then a closing line with no administrative purpose whatsoever: the merchants are afraid of the law. Not of the water. Of the law."]},

 {act:2,title:"The Silence",tabletTitle:"Decree of Silence",type:"decree",
  req:26,caption:"Public clay, made to be displayed. Recovered smashed into nine pieces and reassembled.",
  clauses:[
    {s:["scribe",{pl:true}],v:"speak",o:["water",{def:true}],neg:true},
    {s:["scribe",{pl:true}],v:"count",o:["sea",{def:true}],neg:true},
    {s:["law",{adj:"true"}],v:"seal",pst:true,loc:["temple",{}]}],
  prose:["A public decree forbidding scribes to speak of the water or to count the sea.",
   "The final line is the coldest thing on this site: the true law was sealed in the temple. They did not destroy the real measurements. They filed them. They put the truth in a box and made it illegal to say aloud.",
   "Somewhere under this mud there is a room with the correct numbers in it."]},

 {act:2,title:"What the Queen Was Told",tabletTitle:"Report to the Palace",type:"decree",
  req:31,caption:"Fine clay, palace quality. The lower third is abraded to nothing.",
  clauses:[
    {s:["priest",{adj:"great"}],v:"speak",o:["queen",{def:true}],pst:true},
    {s:["gate",{}],v:"take",o:["sea",{def:true}]},
    {s:["city",{}],v:"fear",neg:true}],
  prose:["The high priest reported to the queen: the gate holds the sea; the city has nothing to fear.",
   "Both statements were false at the time of writing, and the man who wrote them had the correct figures sealed in a room forty paces away.",
   "I keep wanting the ancient world to be foreign. It refuses."]},

 {act:2,title:"The Bitter Kings",tabletTitle:"Dispatch from the Coast",type:"letter",
  to:"queen",from:"harbormaster",req:36,
  caption:"Hurried, deeply gouged, the clay barely smoothed before writing.",
  clauses:[
    {s:["soldier",{pl:true,adj:"bitter"}],v:"sail",pst:true,loc:["sea",{}]},
    {s:["soldier",{pl:true}],v:"take",o:["city",{adj:"small"}],pst:true},
    {s:["soldier",{pl:true}],v:"fear",o:["water",{def:true}],neg:true}],
  prose:["Soldiers off the bitter sea — a fleet, from salt water, from outside. They have taken a smaller city already.",
   "The last clause is written by a man who has understood something before anyone else: they do not fear the water.",
   "Of course they do not. They are not standing behind the gate. They are on the other side of it."]},

 {act:3,title:"The Choice",tabletTitle:"The Queen's Last Decree",type:"decree",
  req:42,caption:"The finest clay on the site, and the worst handwriting. Written fast, by someone important.",
  clauses:[
    {s:["queen",{}],v:"command",pst:true},
    {s:["soldier",{pl:true}],v:"destroy",o:["gate",{adj:"great"}],pst:true},
    {s:["sea",{adj:"bitter"}],v:"take",o:["city",{def:true}],pst:true}],
  prose:["The queen ordered her own soldiers to break the gate.",
   "I have read this line eleven times looking for another reading and there is not one. She opened the throat. She let the bitter sea take Tel Vaskir rather than let the fleet have it.",
   "Everything I have excavated in six weeks — the quay, the jars, the accounts of goats — was drowned on purpose, by its own government, in a single decision that took one line of clay to record."]},

 {act:3,title:"The Sealing of the House",tabletTitle:"Order to the Archive",type:"decree",
  req:47,caption:"Found wedged in the doorway of the archive itself, as if dropped while running.",
  clauses:[
    {s:["scribe",{pl:true}],v:"seal",o:["law",{}],pst:true,loc:["house",{}]},
    {s:["water",{}],v:"destroy",o:["law",{}],neg:true},
    {s:["name",{gen:["city",{}]}],v:"die",neg:true}],
  prose:["The scribes sealed the records in the house. The water will not destroy the law. The name of the city will not die.",
   "That third line is not administration. That is a purpose. They knew the water was coming and they spent their last hours making a box that language could survive inside.",
   "They were writing to me. Not to me personally — to whoever eventually came down here with a trowel and enough patience. That is what an archive *is*, and I have never once felt it before today."]},

 {act:3,title:"The Last Night",tabletTitle:"The Archivist's Last Tablet",type:"letter",
  to:"brother",from:"scribe",req:52,
  caption:"Unfired. The clay was still soft when the water reached it; the last three signs are smeared by a thumb.",
  clauses:[
    {s:["water",{adj:"dark"}],v:"rise",loc:["house",{}]},
    {s:["scribe",{}],v:"fear",neg:true},
    {s:["scribe",{}],v:"seal",o:["name",{gen:["city",{}]}],pst:true}],
  prose:["The dark water is rising in the house. I am not afraid. I have sealed the name of the city.",
   "She was in the room. The water was in the room. She stopped to write three sentences, and the second one is a lie told kindly to her brother, and the third one is the reason I have a job.",
   "Her name, as far as I can reconstruct the phonology, was something close to what I have been transliterating all season without knowing whose it was."]},

 {act:3,title:"The Door",tabletTitle:"Inscription of the Archive Door",type:"vault",
  req:58,caption:"Cut into the lintel of a sealed basalt door, four metres below the waterline.",
  clauses:[],
  prose:["The door is real. It is basalt, it is sealed, and it has four lines cut into the lintel above it.",
   "The lines are an instruction. Whoever built this door did not want it opened by force and did not want it opened by accident. They wanted it opened by someone who could read.",
   "That is the whole examination, then. Three thousand years of it, in four lines."]}
];

/* ============================== THE SITES ================================ */
const SITES=[
 {key:"quay",img:"assets/site-quay.webp",yields:"Ledgers · object labels",name:"The Quay Steps",
  desc:"Silted stairs at the old waterfront. Rubbish, breakage, and the daily accounts of a working harbour.",
  unlock:null,digs:10,bi:1,
  mix:[["label",4],["ledger",5],["letter",2],["kinglist",0.4]]},
 {key:"row",img:"assets/site-row.webp",yields:"Ledgers · correspondence",name:"Merchant's Row",
  desc:"Collapsed storefronts along a buried street. Warehouse tallies and querulous correspondence.",
  unlock:null,digs:10,bi:2,
  mix:[["ledger",5],["letter",3],["label",2],["decree",1]]},
 {key:"scribal",img:"assets/site-scribal.webp",yields:"Correspondence · seals · king-lists",name:"The Scribal House",
  desc:"Where the copyists worked. Practice tablets, seal impressions, and the tools of the trade.",
  unlock:{named:8},digs:9,bi:3,
  mix:[["letter",4],["ledger",3],["label",1.5],["kinglist",1.5],["decree",1]]},
 {key:"temple",img:"assets/site-temple.webp",yields:"Hymns · decrees",name:"Temple of the Throat",
  desc:"A precinct built into the lagoon wall. Liturgy, proclamation, and a great deal of formal repetition.",
  unlock:{correct:16},digs:9,bi:1,
  mix:[["hymn",4],["decree",4],["ledger",2],["kinglist",1]]},
 {key:"necro",img:"assets/site-necro.webp",yields:"Curses · king-lists",name:"The Sunken Necropolis",
  desc:"Shaft graves in the old marsh. Basalt curses and dynastic lists, remarkably well preserved.",
  unlock:{correct:28},digs:8,bi:1,
  mix:[["curse",4],["kinglist",4],["decree",2],["label",1]]},
 {key:"wells",img:"assets/site-wells.webp",yields:"Correspondence · decrees",name:"The Salt Wells",
  desc:"Wellheads at the city's edge, choked with brine-crust. The private letters of frightened people.",
  unlock:{story:5},digs:8,bi:1,
  mix:[["letter",5],["decree",3],["curse",1.5],["ledger",1]]},
 {key:"vault",img:"assets/vault-door.webp",yields:"",name:"The Archive Vault",
  desc:"A sealed basalt door below the waterline. Nothing here can be dug. It can only be read.",
  unlock:{story:12,correct:52},digs:0,bi:0,mix:[],vault:true}
];

/* ============================ COLLATION NOTES ============================ */
// A day spent at the drawing-board rather than in the trench. Structure, not vocabulary.
const NOTES=[
 {key:"rad_person",title:"The Standing Stroke",cost:1,req:{tablets:3},kind:"radical",arg:"person",
  text:"A vertical stem topped with a filled head recurs on a closed set of signs, and those signs stand in the positions I would expect of people — before verbs, receiving goods, giving orders. It is a class marker. This family denotes PERSONS."},
 {key:"rad_nature",title:"The Wave",cost:1,req:{tablets:4},kind:"radical",arg:"nature",
  text:"A doubled wave sits across the top of another family of signs. They appear where I would expect times, weathers and elements. This family denotes THE WORLD — sky, water, fire, the divisions of time."},
 {key:"rad_good",title:"The Box",cost:1,req:{tablets:5},kind:"radical",arg:"good",
  text:"A small closed square in the lower right corner. It appears almost exclusively on signs that are counted, stored, and shipped. This family denotes GOODS — commodities and containers."},
 {key:"rad_act",title:"The Chevron",cost:1,req:{tablets:6},kind:"radical",arg:"act",
  text:"An arrowhead on the right flank. These signs cluster at one fixed position in every clause, and never take numerals. This family denotes ACTIONS."},
 {key:"rad_place",title:"The Ground Line",cost:1,req:{tablets:7},kind:"radical",arg:"place",
  text:"A base rule with two short uprights, like a wall on a foundation. These signs take the locative mark far more often than any other class. This family denotes PLACES."},
 {key:"rad_quality",title:"The Double Bar",cost:1,req:{tablets:8},kind:"radical",arg:"quality",
  text:"Two short parallel strokes across the head of the sign. These never stand alone; they always lean on a neighbouring noun. This family denotes QUALITIES."},
 {key:"rad_animal",title:"The Two Legs",cost:1,req:{tablets:9},kind:"radical",arg:"animal",
  text:"A pair of descending strokes beneath a rule. Found overwhelmingly in tallies alongside goods, but inflecting like persons. This family denotes BEASTS."},
 {key:"rad_idea",title:"The Triad",cost:1,req:{tablets:11},kind:"radical",arg:"idea",
  text:"Three dots in a triangle at the upper left. This family attaches to nothing you can weigh or herd. It denotes ABSTRACTIONS — things spoken, sworn, feared and remembered."},
 {key:"order",title:"The Position of the Verb",cost:1,req:{tablets:7},kind:"order",
  text:null},
 {key:"adjpos",title:"The Position of Qualities",cost:1,req:{tablets:9,notes:["rad_quality"]},kind:"adjpos",text:null},
 {key:"numpos",title:"The Position of Numerals",cost:1,req:{tablets:6},kind:"numpos",text:null},
 {key:"genpos",title:"The Genitive Construction",cost:1,req:{tablets:11},kind:"gram",arg:"GEN",
  text:"In every tally, a sign of goods is followed or preceded by a person, and one small mark always closes the pair. Jars of the temple; goats of the king. The mark is a GENITIVE — it binds a possessor to a possessed."},
 {key:"plural",title:"The Mark of Number",cost:1,req:{tablets:9},kind:"gram",arg:"PL",
  text:"One small mark attaches to nouns and never to verbs, and it is absent whenever the numeral 'one' is present. It is a PLURAL."},
 {key:"past",title:"The Mark of Completed Time",cost:1,req:{tablets:12},kind:"gram",arg:"PST",
  text:"A mark that attaches only to the action-class, and only in reports of things concluded — never in liturgy, never in law. It is a PAST TENSE."},
 {key:"neg",title:"The Negative",cost:1,req:{tablets:12},kind:"gram",arg:"NEG",
  text:"A mark bound to the action-class in clauses whose sense must be reversed — the ledgers that record a shortfall, the decrees that forbid. It is a NEGATION."},
 {key:"oblique",title:"The Oblique Marks",cost:2,req:{tablets:15},kind:"gram2",arg:["DAT","LOC"],
  text:"Two marks close two kinds of phrase. One closes phrases naming a recipient in every disbursement tally: a DATIVE, 'to'. The other closes phrases naming a place, and never a person: a LOCATIVE, 'in'."},
 {key:"det",title:"The Determinative",cost:1,req:{tablets:13},kind:"gram",arg:"DEF",
  text:"A mark that opens a noun phrase, is incompatible with numerals, and is commonest on nouns already mentioned. It is a DEFINITE ARTICLE — 'the', 'this'."},
 {key:"quest",title:"The Interrogative",cost:1,req:{tablets:16},kind:"gram",arg:"Q",
  text:"A mark that occurs only at the end of a clause, and only in private correspondence. It is an INTERROGATIVE — it turns a statement into a question."}
];
function noteText(n,L){
  if(n.kind==="order"){
    const d={SOV:"The verb stands LAST. Subject, then object, then action.",
      SVO:"The verb stands SECOND, between its subject and its object.",
      VSO:"The verb stands FIRST, before the subject and object alike."}[L.order];
    return "I have charted the action-class sign across two hundred clauses and its position is fixed. "+d+
      " With this, whole sentences begin to fall into shape rather than lying in a heap.";
  }
  if(n.kind==="adjpos")return "Quality-signs are not free. They stand "+(L.adjPos==="pre"?"BEFORE":"AFTER")+
    " the noun they qualify, without exception in my corpus.";
  if(n.kind==="numpos")return "Bracketed numerals stand "+(L.numPos==="pre"?"BEFORE":"AFTER")+
    " the thing counted. This holds in every tally I have, which is a great deal of evidence for so small a fact.";
  return n.text;
}
