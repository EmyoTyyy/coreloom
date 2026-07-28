/* THE DROWNED LEXICON — procedural sign shapes: family radicals + body strokes */
"use strict";
/* --------------------------- GLYPH GENERATION --------------------------- */
// Glyphs are drawn in a 0..100 box. Each carries a category "radical" (a shared
// motif) plus 2-4 unique body strokes. Numerals are bracketed — visually obvious
// as numbers, but their values must be worked out from arithmetic.
const RADICALS={
  person:{label:"person",make:()=>[{d:"M20 30 L20 86",w:5},{c:{x:20,y:19,r:7.5,f:false},w:4}]},
  place:{label:"place",make:()=>[{d:"M8 90 L92 90",w:5},{d:"M14 90 L14 82",w:4},{d:"M86 90 L86 82",w:4}]},
  good:{label:"goods",make:()=>[{d:"M62 66 L92 66 L92 92 L62 92 Z",w:4}]},
  animal:{label:"beast",make:()=>[{d:"M30 74 L28 93",w:4.5},{d:"M46 74 L48 93",w:4.5},{d:"M26 74 L52 74",w:4}]},
  act:{label:"action",make:()=>[{d:"M74 18 L93 50 L74 82",w:5}]},
  quality:{label:"quality",make:()=>[{d:"M26 9 L74 9",w:4.5},{d:"M30 19 L70 19",w:4.5}]},
  nature:{label:"world",make:()=>[{d:"M10 22 Q22 8 34 22 Q46 36 58 22 Q70 8 82 22",w:4.5}]},
  idea:{label:"abstract",make:()=>[{c:{x:13,y:13,r:3.4,f:true},w:0},{c:{x:27,y:13,r:3.4,f:true},w:0},{c:{x:20,y:26,r:3.4,f:true},w:0}]},
  numeral:{label:"numeral",make:()=>[{d:"M20 6 L7 6 L7 94 L20 94",w:4.5},{d:"M80 6 L93 6 L93 94 L80 94",w:4.5}]},
  grammar:{label:"mark",make:()=>[{d:"M50 88 L50 96",w:4}]}
};
const GX=[30,44,58,72], GY=[30,44,58,72];
function bodyStroke(r,zone){
  const x=(i)=>GX[i], y=(i)=>GY[i];
  const t=r.weighted([["line",26],["diag",18],["arc",13],["hook",11],["dot",8],["cross",7],["zig",7],["tri",5],["comb",5]]);
  const p=()=>[r.int(4),r.int(4)];
  switch(t){
    case "line":{
      const horiz=r.chance(.5);
      if(horiz){const yy=y(r.int(4)),a=r.int(3),b=a+1+r.int(4-a-1+1);return[{d:`M${x(a)} ${yy} L${x(Math.min(3,b))} ${yy}`,w:5}];}
      const xx=x(r.int(4)),a=r.int(3),b=Math.min(3,a+1+r.int(3));
      return[{d:`M${xx} ${y(a)} L${xx} ${y(b)}`,w:5}];
    }
    case "diag":{
      const [a,b]=p(),[c,d]=p();
      if(a===c&&b===d)return bodyStroke(r,zone);
      return[{d:`M${x(a)} ${y(b)} L${x(c)} ${y(d)}`,w:5}];
    }
    case "arc":{
      const cx=x(r.range(1,2)),cy=y(r.range(1,2)),rr=r.pick([13,17,21]);
      const dir=r.pick([[0,1],[1,0],[0,-1],[-1,0]]);
      return[{d:`M${cx-rr*dir[1]} ${cy-rr*dir[0]} A${rr} ${rr} 0 0 1 ${cx+rr*dir[1]} ${cy+rr*dir[0]}`,w:5}];
    }
    case "hook":{
      const [a,b]=p();const sx=x(a),sy=y(b);
      const ex=sx+r.pick([-20,20]),ey=sy+r.pick([-18,18]);
      return[{d:`M${sx} ${sy} Q${sx+r.pick([-16,16])} ${(sy+ey)/2} ${ex} ${ey}`,w:5}];
    }
    case "dot":{const [a,b]=p();return[{c:{x:x(a),y:y(b),r:5,f:true},w:0}];}
    case "cross":{const [a,b]=p();const cx=x(a),cy=y(b),s=r.pick([9,13]);
      return[{d:`M${cx-s} ${cy} L${cx+s} ${cy}`,w:5},{d:`M${cx} ${cy-s} L${cx} ${cy+s}`,w:5}];}
    case "zig":{const sx=x(r.int(2)),sy=y(r.int(3)),s=r.pick([11,15]);
      return[{d:`M${sx} ${sy} L${sx+s} ${sy+s} L${sx+2*s} ${sy} L${sx+3*s} ${sy+s}`,w:4.5}];}
    case "tri":{const [a,b]=p();const cx=x(a),cy=y(b),s=r.pick([11,15]);
      return[{d:`M${cx} ${cy-s} L${cx+s} ${cy+s} L${cx-s} ${cy+s} Z`,w:4.5}];}
    case "comb":{const n=r.range(2,3),sx=x(r.int(2)),sy=y(r.int(2)),gap=r.pick([9,12]);
      const out=[];for(let i=0;i<n;i++)out.push({d:`M${sx+i*gap} ${sy} L${sx+i*gap} ${sy+18}`,w:4.5});
      out.push({d:`M${sx} ${sy} L${sx+(n-1)*gap} ${sy}`,w:4.5});return out;}
  }
}
function makeGlyph(r,category,withRadical){
  const body=[];
  const n=category==="grammar"?r.range(2,3):r.range(2,4);
  for(let i=0;i<n;i++)body.push(...bodyStroke(r,category));
  const strokes=[];
  if(withRadical&&RADICALS[category])strokes.push(...RADICALS[category].make());
  strokes.push(...body);
  return{strokes,body};
}
function glyphSig(st){
  return st.map(s=>s.c?`c${Math.round(s.c.x)},${Math.round(s.c.y)},${s.c.r},${s.c.f?1:0}`:`p${s.d}`).sort().join("|");
}
function glyphSVG(strokes,size,cls){
  let inner="";
  for(const s of strokes){
    if(s.c)inner+=`<circle cx="${s.c.x}" cy="${s.c.y}" r="${s.c.r}"${s.c.f?' class="f"':` stroke-width="${s.w}"`}/>`;
    else inner+=`<path d="${s.d}" stroke-width="${s.w}"/>`;
  }
  return `<span class="g ${cls||""}"><svg viewBox="-6 -6 112 112" width="${size}" height="${size}">${inner}</svg></span>`;
}
