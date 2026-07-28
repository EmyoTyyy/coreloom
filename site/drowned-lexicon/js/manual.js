/* THE DROWNED LEXICON — field manual and season menu */
"use strict";
/* =============================== MANUAL ================================= */
function showManual(){
  modal("Field Manual",`
  <h3>What this is</h3>
  <p>Tel Vaskir left roughly ninety distinct signs and no dictionary. Your job is to work out what each sign means, using nothing but the tablets themselves. <b>The language is generated fresh for every excavation seed</b> — nobody has solved this particular language before, including the person who wrote the game.</p>
  <h3>The clock</h3>
  <p>Seventy-two days. Digging costs days. Structural analysis costs days. Writing to the Society costs days. <b>Thinking costs nothing</b> — you can name and re-name signs all you like without spending anything.</p>
  <h3>How the script works</h3>
  <ul>
    <li>One sign is one <b>morpheme</b> — a word, or a grammatical mark like a plural or a past tense.</li>
    <li>Signs of the same kind share a <b>family motif</b>: a standing stroke for persons, a wave for the natural world, a box for goods, and so on. A day at the drawing board tells you what a family <i>means</i>, which then narrows every sign in it.</li>
    <li><b>Numerals are bracketed</b> — you can see at a glance that a sign is a number. Which number is another matter.</li>
    <li>Numbers are written large-to-small: a digit, then the ten-mark or the hundred-mark. Three-hundred-forty-two is <i>3 · HUNDRED · 4 · TEN · 2</i>.</li>
  </ul>
  <h3>Five ways to prove a sign</h3>
  <ul>
    <li><b>Bilingual seals.</b> Rarely dug up, absolutely decisive. Free confirmations.</li>
    <li><b>Object labels.</b> A jar with one sign on it is probably labelled "jar", or "oil", or somebody's name. Pictorial evidence.</li>
    <li><b>Arithmetic.</b> This is the big one. Ledgers list quantities and then state their own total. Guess the numerals, and if the column adds up, your numerals are right — and a ledger that balances <b>confirms them outright</b>. Crack the numbers first; they are the only part of the language that cannot lie.</li>
    <li><b>Collation.</b> Read a tablet to your assistant and he tells you how many of your named signs are correct — never which ones. Change one sign, collate again, watch the number move. The first collation of each tablet is free; further ones cost insight.</li>
    <li><b>The Society.</b> Pay insight and two days, and a colleague in the north will read one sign for you. Expensive, and it gets more expensive each time.</li>
  </ul>
  <h3>The concordance</h3>
  <p>Click any sign to see <b>every place it occurs</b>, with the four signs on either side. This is the real instrument. A sign that only ever appears after numerals is a commodity. A sign that appears at the same position in every clause is a verb. A sign that appears in every single tablet, everywhere, is grammar.</p>
  <h3>Reading the tablets</h3>
  <p>Until you establish where the verb stands, the "rendering" is just your glosses in the order the scribe wrote them. Once you know the word order, and once you have identified the plural, the past, the genitive and the rest, sentences begin to assemble themselves into English. That transformation is the main pleasure of the job.</p>
  <h3>The story</h3>
  <p>Thirteen tablets carry an account of the city's last year. They surface as your decipherment deepens. An account is written up in your journal only when <b>your own translation of it is about two-thirds correct</b> — so the story is not a reward for digging, it is a reward for reading.</p>
  <h3>The door</h3>
  <p>There is a sealed archive at the bottom of the site. It opens to two answers: a <b>number</b> that must be worked out arithmetically from its inscription, and a <b>sign</b> that the inscription tells you to speak. Wrong answers cost you a day and nothing else.</p>
  <h3>Advice</h3>
  <ul>
    <li>Go to the Quay Steps first and dig ledgers until the numbers fall.</li>
    <li>Spend early days on family motifs — each one cuts the candidate list for a dozen signs at once.</li>
    <li>The most frequent sign in the corpus is almost never a word. It is grammar.</li>
    <li>When a collation says 6 of 7, do not re-collate. Change one sign and think about which one.</li>
  </ul>`,true);
}
function showMenu(){
  modal("Season",`
    <p class="dim">Excavation seed: <b class="mono">${esc(S.seed)}</b> — share it and another scholar gets the same language.</p>
    <div style="display:flex;gap:8px;flex-wrap:wrap">
      <button class="btn" id="mman">Field Manual</button>
      <button class="btn" id="mrev">Abandon and reveal the lexicon</button>
      <button class="btn danger" id="mnew">Abandon the season</button>
    </div>`);
  $("#mman").onclick=()=>{closeModal();showManual();};
  $("#mrev").onclick=()=>{closeModal();revealAll();};
  $("#mnew").onclick=()=>{
    if(confirm("Abandon this season? The tablets, the notes and the lexicon are lost."))
      {try{localStorage.removeItem(SAVEKEY);}catch(e){}location.reload();}
  };
}
