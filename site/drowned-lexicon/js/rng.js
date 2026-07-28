/* THE DROWNED LEXICON — seeded random number generation */
"use strict";
/* ------------------------------- RNG ------------------------------------ */
function hashStr(s){let h=2166136261>>>0;for(let i=0;i<s.length;i++){h^=s.charCodeAt(i);h=Math.imul(h,16777619)>>>0;}return h>>>0;}
function mulberry(a){return function(){a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296;};}
function RNG(seed){
  const r=mulberry(typeof seed==="string"?hashStr(seed):seed);
  const f=()=>r();
  f.int=(n)=>Math.floor(r()*n);
  f.range=(a,b)=>a+Math.floor(r()*(b-a+1));
  f.pick=(arr)=>arr[Math.floor(r()*arr.length)];
  f.chance=(p)=>r()<p;
  f.shuffle=(arr)=>{const a=arr.slice();for(let i=a.length-1;i>0;i--){const j=Math.floor(r()*(i+1));[a[i],a[j]]=[a[j],a[i]];}return a;};
  f.pickN=(arr,n)=>f.shuffle(arr).slice(0,n);
  f.weighted=(pairs)=>{let t=0;for(const p of pairs)t+=p[1];let x=r()*t;for(const p of pairs){x-=p[1];if(x<=0)return p[0];}return pairs[pairs.length-1][0];};
  return f;
}
