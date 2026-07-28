/* THE DROWNED LEXICON — endings and the full lexicon reveal */
"use strict";
function endingHTML(){
  const correct=correctCount();
  // Signs the season put in front of you, one way or another: those attested in a
  // dug tablet, plus any the drawing-board notes established without one.
  const encountered=seenGlyphs();
  for(const k in S.assign)encountered.add(k);
  const attested=Math.max(1,encountered.size);
  const full=S.storyUnlocked.length>=STORY.length;
  const opened=S.vault.solved;
  const trueEnd=opened&&full&&correct>=Math.floor(attested*0.92);
  let title,body;
  if(!opened){
    title="The Season Closes";
    body=[`The monsoon arrives on the seventy-second day, as it has arrived on the seventy-second day for three thousand years, and the trenches fill in under an hour.`,
      `You leave with ${S.found.length} tablets, ${correct} of the ${attested} attested signs correctly read, and a door you could not open. That is not nothing. Half of decipherment is done by people who never see the inside of the room.`,
      `Somebody will come back. They will have your notebooks, and they will be faster than you were, and they will be standing on your shoulders when they read the first line off that lintel.`];
  }else if(trueEnd){
    title="The Room Behind the Door";
    body=[`The counting-frame goes over with a sound like a dropped plate and the basalt swings inward on a pivot that has not moved since the water came.`,
      `The room is dry. It is dry because they packed it in bitumen and fired the walls, and they did that in a night, while the sea came through a gate they had opened themselves.`,
      `There are nine hundred tablets on the shelves and a tenth of them are lexical — sign lists, word lists, parallel columns of Old Vaskiri against the trade-tongue of the northern coast. A dictionary. They left a dictionary.`,
      `On the table nearest the door, laid out flat and alone, is a tablet with a single line on it. You have ${correct} of the ${attested} signs this site ever gave you by heart now, and you do not need the assistant, and you do not need the lamp. You read it standing up, on the first pass, the way you would read a shopping list.`,
      `It says: <i>the name of the city does not die.</i>`,
      `You are the first person in three thousand years to be told that, and the archivist who wrote it — whose name you have been transliterating all season without knowing whose it was — was correct.`];
  }else{
    title="The Door Opens";
    body=[`The frame goes over. The basalt swings inward, and the air that comes out is dry and three thousand years old.`,
      `The room is full of tablets, and a great many of them are lexical lists — a dictionary, left deliberately, by people who could not save their city and chose to save its language instead.`,
      `You read ${correct} of the ${attested} signs this site yielded, unaided. There is a great deal in that room you cannot read yet, and now you have all winter and a dictionary.`,
      full?`You recovered every account the site had to give. You know exactly why this city is under the water, and who decided it, and what it cost them.`
        :`${S.storyUnlocked.length} of the ${STORY.length} accounts came clear. There are still gaps in the story — tablets you dug up and never quite made speak.`];
  }
  const stats=[["Days used",Math.min(S.day,MAXDAY)],["Tablets recovered",S.found.length],
    ["Signs encountered",attested+" / "+totalGlyphs()],["Signs correctly read",correct+" / "+attested],
    ["Signs proven outright",confirmedCount()],["Accounts recovered",S.storyUnlocked.length+" / "+STORY.length]];
  const art=opened?"assets/end-archive.webp":"assets/end-monsoon.webp";
  return `<div style="max-width:820px;margin:12px auto 40px">
    <div class="panel" style="overflow:hidden">
      <div class="endhero">
        <img src="${art}" alt="">
        <div class="cap"><h2>${title}</h2>
          <span class="chip ${opened?(trueEnd?"violet":"green"):"grey"}">${trueEnd?"the true reading":opened?"opened":"sealed"}</span></div>
      </div>
      <div class="pb">
        ${body.map(p=>`<p style="font-family:var(--serif);font-size:15.5px;line-height:1.8;color:#c9c0ad;margin:0 0 14px">${p}</p>`).join("")}
        <hr class="rule">
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0 22px">
          ${stats.map(s=>`<div style="display:flex;justify-content:space-between;padding:5px 0;border-bottom:1px solid #1a1f28;font-size:13px">
            <span class="dim">${s[0]}</span><span style="color:#e0d5bb">${s[1]}</span></div>`).join("")}
        </div>
        <div style="margin-top:18px;display:flex;gap:8px">
          <button class="btn primary" onclick="revealAll()">Show me the whole lexicon</button>
          <button class="btn" onclick="location.reload()">A new season, a new language</button>
        </div>
      </div></div></div>`;
}
function revealAll(){
  const rows=L.keys.map(k=>{
    const mine=meaningOf(k),truth=L.meaningById[L.truth[k]];
    const ok=S.assign[k]===L.truth[k];
    return `<div style="display:flex;align-items:center;gap:10px;padding:5px 7px;border-bottom:1px solid #1a1f28">
      <div style="background:var(--clay);border-radius:4px;padding:3px 5px;display:flex">${gl(k,28)}</div>
      <div class="mono dim" style="width:80px;font-size:11px">/${esc(L.M[k].rom)}/</div>
      <div style="flex:1;color:${ok?"var(--green)":"#d8cdb4"};font-size:13px">${esc(shortLabel(truth))}</div>
      <div style="width:150px;text-align:right;font-size:12px;color:${ok?"var(--green)":mine?"var(--rose)":"var(--dimmer)"}">
        ${mine?esc(shortLabel(mine)):"— never named"}</div></div>`;
  }).join("");
  modal("Old Vaskiri — the complete sign list",
    `<p class="dim">Your reading on the right. ${correctCount()} of ${totalGlyphs()} correct.</p>
     <div style="max-height:60vh;overflow:auto">${rows}</div>`,true);
}
