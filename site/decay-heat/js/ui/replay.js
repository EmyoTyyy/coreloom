(function () {
  const DH = (globalThis.DH = globalThis.DH || {});
  const L = DH.L;

  const TRACES = [
    { i: 1, name: () => L('rt.power'), min: 0, max: 110, col: 0 },
    { i: 2, name: () => L('rt.tavg'), min: 280, max: 340, col: 1 },
    { i: 3, name: () => L('ch.rcsMpa'), min: 0, max: 18, col: 2 },
    { i: 5, name: () => L('ch.subC'), min: -40, max: 90, col: 3 },
    { i: 4, name: () => L('rt.level'), min: 0, max: 100, col: 0 },
    { i: 7, name: () => L('ch.cetC'), min: 250, max: 1400, col: 1 }
  ];

  const S = { el: null, cv: null, ctx: null, p: null, pos: 1, onDone: null };

  const cs0 = () => getComputedStyle(document.documentElement);
  const v = (n) => cs0().getPropertyValue('--dh-' + n).trim();

  function score(p) {
    const s = p.score, par = p.scen.par || {};
    const notes = [];
    let safety = 100;
    const hit = (pts, label, value, cls) => { safety -= pts; notes.push([label, value, cls]); };

    if (s.peakClad > 1204) hit(42 * Math.min(1, (s.peakClad - 1204) / 300), L('rp.peakClad'), L('rp.cladLimit', s.peakClad.toFixed(0)), 'bad');
    else notes.push([L('rp.peakClad'), s.peakClad.toFixed(0) + ' C', 'ok']);

    notes.push([L('rp.peakFuel'), L('rp.fuelMelt', s.peakFuel.toFixed(0)), s.peakFuel > 2200 ? 'warn' : 'ok']);

    if (s.uncoveredTime > 0) hit(26 * Math.min(1, s.uncoveredTime / 600), L('rp.uncovered'), fmtT(s.uncoveredTime), 'bad');
    else notes.push([L('rp.covered'), L('rp.yes'), 'ok']);

    if (s.satTime > 1) hit(14 * Math.min(1, s.satTime / 900), L('rp.satTime'), fmtT(s.satTime), s.satTime > 120 ? 'bad' : 'warn');
    notes.push([L('rp.minSub'), (s.minSubcool < 999 ? s.minSubcool.toFixed(1) : '0.0') + ' C',
      s.minSubcool < 0 ? 'bad' : s.minSubcool < 15 ? 'warn' : 'ok']);

    if (s.released > 0.05) hit(30 * Math.min(1, s.released / 400), L('rp.released'), L('rp.releasedV', s.released.toFixed(1)), 'bad');
    else notes.push([L('rp.released'), L('rp.none'), 'ok']);

    if (s.peakCntP > 0.117) hit(16 * Math.min(1, (s.peakCntP - 0.117) / 0.303), L('rp.cntP'), L('rp.cntPv', s.peakCntP.toFixed(3)), s.peakCntP > 0.30 ? 'bad' : 'warn');
    else notes.push([L('rp.cntP'), s.peakCntP.toFixed(3) + ' MPa', 'ok']);

    if (s.coolantLost > 2000) hit(14 * Math.min(1, s.coolantLost / 400000), L('rp.coolantLost'), L('rp.tonnes', (s.coolantLost / 1000).toFixed(1)), s.coolantLost > 120000 ? 'bad' : 'warn');
    else notes.push([L('rp.retained'), L('rp.yes'), 'ok']);

    if (s.techSpecTime > 1) hit(14 * Math.min(1, s.techSpecTime / 1800), L('rp.techSpec'), fmtT(s.techSpecTime), s.techSpecTime > 300 ? 'bad' : 'warn');
    else notes.push([L('rp.techSpec'), L('rp.none'), 'ok']);

    if (s.coreDamage) { safety = 0; notes.unshift([L('rp.melt'), L('rp.coreDamage'), 'bad']); }
    safety = Math.max(0, Math.min(100, safety));

    // Economics: short of what this shift could have delivered, and over what the
    // grid actually asked for, are both misses.
    const target = par.mwh || 0;
    let econ = 100;
    if (target > 0) {
      const short = Math.max(0, target - p.mwhDelivered) / target;
      // dispatch is a contract: power the grid did not ask for is a miss, not a bonus
      const over = p.mwhDemand > 1 ? (1.6 * Math.max(0, p.mwhDelivered - p.mwhDemand)) / p.mwhDemand : 0;
      econ = 100 * Math.max(0, 1 - short - over);
      notes.push([L('rp.energy'), L('rp.energyV', p.mwhDelivered.toFixed(0), target),
        short < 0.05 ? 'ok' : short < 0.3 ? 'warn' : 'bad']);
      if (over > 0.02) notes.push([L('rp.overDispatch'), L('rp.overV', (over * 100).toFixed(0)), 'warn']);
      if (par.dispatch) notes.push([L('rp.gridAsked'), L('rp.gridAskedV', p.mwhDemand.toFixed(0)), '']);
    } else {
      notes.push([L('rp.energy'), L('rp.notGenerating'), '']);
    }
    if (par.noTrip && p.trip.tripped) { econ = Math.max(0, econ - 45); notes.push([L('rp.avoidTrip'), p.trip.first ? L('trip.' + p.trip.first) : L('rp.tripped'), 'bad']); }
    else if (p.trip.tripped) notes.push([L('rp.trip'), L('trip.' + p.trip.first), 'warn']);
    if (par.maxSur !== undefined) {
      const over = (s.peakSur || 0) > par.maxSur;
      notes.push([L('rp.peakSur'), L('rp.surV', (s.peakSur || 0).toFixed(2), par.maxSur.toFixed(1)),
        over ? 'bad' : 'ok']);
      if (over) safety = Math.max(0, safety - 18);
      const crit = s.peakPower > 1e-3;
      notes.push([L('rp.critical'), crit ? L('rp.yes') : L('rp.no'), crit ? 'ok' : 'warn']);
      if (!crit) econ = Math.max(0, econ - 55);
    }
    if (par.noCritical) {
      const crit = s.peakPower > 1e-3;
      notes.push([L('rp.criticalXe'), crit ? L('rp.yes') : L('rp.no'), crit ? 'bad' : 'ok']);
      if (crit) safety = Math.max(0, safety - 40);
      const looked = p.ctl.bankD > 40;
      notes.push([L('rp.looked'), looked ? L('rp.yes') : L('rp.no'), looked ? 'ok' : 'warn']);
      if (!looked) econ = Math.max(0, econ - 40);
    }
    econ = Math.max(0, Math.min(100, econ));

    const total = s.coreDamage ? 0 : 0.65 * safety + 0.35 * econ;
    const grade = total >= 90 ? 'A' : total >= 78 ? 'B' : total >= 62 ? 'C' : total >= 45 ? 'D' : 'F';
    return { safety, econ, total, grade, notes };
  }

  function fmtT(s) {
    const m = Math.floor(s / 60), ss = Math.floor(s % 60);
    return L('rp.min', m, String(ss).padStart(2, '0'));
  }

  function build(root, onDone) {
    S.el = root;
    S.onDone = onDone;
    root.innerHTML =
      '<div class="wrap">' +
      '<h2>' + L('rp.title') + '</h2><div class="title"></div>' +
      '<div class="grade"></div><div class="gsub"></div>' +
      '<table></table>' +
      '<h2>' + L('rp.timeline') + '</h2>' +
      '<canvas></canvas><input class="scrub" type="range" min="0" max="1000" value="1000">' +
      '<div class="marks"></div>' +
      '<div style="margin-top:22px"><button class="go">' + L('rp.shelf') + '</button>' +
      '<button class="alt">' + L('rp.again') + '</button></div></div>';
    S.cv = root.querySelector('canvas');
    S.ctx = S.cv.getContext('2d');
    root.querySelector('.scrub').addEventListener('input', (e) => {
      S.pos = e.target.value / 1000;
      paint();
    });
    root.querySelector('.go').addEventListener('click', () => S.onDone('menu'));
    root.querySelector('.alt').addEventListener('click', () => S.onDone('again'));
  }

  function show(p) {
    S.p = p;
    S.pos = 1;
    const sc = score(p);
    S.el.querySelector('.title').textContent = p.scen.n + '.  ' + L('s.' + p.scen.id + '.title');
    const g = S.el.querySelector('.grade');
    g.textContent = sc.grade;
    g.className = 'grade ' + (sc.grade === 'A' || sc.grade === 'B' ? 'ok' : sc.grade === 'F' ? 'bad' : 'warn');
    S.el.querySelector('.gsub').textContent =
      L('rp.gsub', sc.safety.toFixed(0), sc.econ.toFixed(0)) + (p.over ? '      ' + L(p.over) : '');
    let h = '';
    for (const [k, v, cls] of sc.notes) h += '<tr><td>' + k + '</td><td class="' + cls + '">' + v + '</td></tr>';
    S.el.querySelector('table').innerHTML = h;
    S.el.querySelector('.scrub').value = 1000;
    S.el.classList.add('open');
    requestAnimationFrame(paint);
    return sc;
  }

  function paint() {
    const p = S.p;
    if (!p || !S.el.classList.contains('open')) return;
    const cv = S.cv, c = S.ctx;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const w = cv.clientWidth, h = cv.clientHeight;
    if (cv.width !== Math.round(w * dpr)) { cv.width = Math.round(w * dpr); cv.height = Math.round(h * dpr); }
    c.setTransform(dpr, 0, 0, dpr, 0, 0);
    c.clearRect(0, 0, w, h);
    c.fillStyle = cs0().getPropertyValue('--dh-plot-bg').trim();
    c.fillRect(0, 0, w, h);

    const tr = p.trace;
    if (!tr.length) return;
    const T = tr[tr.length - 1][0] || 1;
    const cs = getComputedStyle(document.documentElement);
    const cols = [1, 2, 3, 4].map((i) => cs.getPropertyValue('--dh-trace-' + i).trim());

    c.strokeStyle = 'rgba(255,255,255,0.06)';
    for (let i = 0; i <= 8; i++) {
      const x = (w * i) / 8;
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke();
    }

    TRACES.forEach((t, k) => {
      c.beginPath();
      for (let i = 0; i < tr.length; i++) {
        const x = (w * tr[i][0]) / T;
        const v = Math.min(1, Math.max(0, (tr[i][t.i] - t.min) / (t.max - t.min)));
        const y = h - 14 - v * (h - 24);
        if (i === 0) c.moveTo(x, y); else c.lineTo(x, y);
      }
      c.strokeStyle = cols[t.col];
      c.globalAlpha = k < 4 ? 0.95 : 0.5;
      c.lineWidth = 1.4;
      c.stroke();
      c.globalAlpha = 1;
    });

    for (const e of p.events) {
      if (e.k !== 'act' && e.k !== 'trip' && e.k !== 'fault' && e.k !== 'si') continue;
      const x = (w * e.t) / T;
      c.strokeStyle = e.k === 'trip' ? v('lamp-red') : e.k === 'fault' ? v('lamp-amber') : e.k === 'si' ? v('lamp-blue') : 'rgba(255,255,255,0.16)';
      c.lineWidth = e.k === 'act' ? 0.7 : 1.6;
      c.beginPath(); c.moveTo(x, 0); c.lineTo(x, h); c.stroke();
    }

    const px = w * S.pos;
    c.strokeStyle = v('lamp-amber'); c.lineWidth = 1.4;
    c.beginPath(); c.moveTo(px, 0); c.lineTo(px, h); c.stroke();

    c.font = '10px ' + (DH.UI_MONO || 'monospace');
    c.textAlign = 'left';
    TRACES.forEach((t, k) => {
      c.fillStyle = cols[t.col];
      c.globalAlpha = k < 4 ? 1 : 0.55;
      c.fillText(t.name(), 8 + (k % 3) * 128, 12 + Math.floor(k / 3) * 12);
      c.globalAlpha = 1;
    });

    const tSel = T * S.pos;
    let row = tr[0];
    for (const r of tr) if (r[0] <= tSel) row = r; else break;
    const near = p.events.filter((e) => Math.abs(e.t - tSel) < Math.max(12, T / 90)).slice(-6);
    const cl = Math.floor((p.scen.startClock === undefined ? 79200 : p.scen.startClock) + tSel);
    const hh = String(Math.floor(cl / 3600) % 24).padStart(2, '0');
    const mm = String(Math.floor(cl / 60) % 60).padStart(2, '0');
    const ss = String(cl % 60).padStart(2, '0');
    let txt = hh + ':' + mm + ':' + ss + '   T+' + fmtT(tSel) +
      '   ' + L('rp.mark', row[1].toFixed(1), row[2].toFixed(1), row[3].toFixed(2),
        row[4].toFixed(0), row[5].toFixed(1), row[7].toFixed(0));
    if (near.length) {
      txt += '<br>' + near.map((e) => {
        if (e.k === 'trip') return '<span class="bad">REACTOR TRIP &mdash; ' + e.v + '</span>';
        if (e.k === 'fault') return '<span class="warn">plant fault: ' + e.v + '</span>';
        if (e.k === 'si') return '<span style="color:var(--dh-lamp-blue)">SAFETY INJECTION &mdash; ' + e.v + '</span>';
        if (e.k === 'alarm') return 'alarm ' + e.v;
        if (e.k === 'call') return 'phone: ' + e.v;
        return 'you: ' + e.v + (e.a !== undefined && typeof e.a !== 'object' ? ' ' + e.a : '') + (e.i !== undefined ? ' #' + (e.i + 1) : '');
      }).join(' &nbsp;/&nbsp; ');
    }
    S.el.querySelector('.marks').innerHTML = txt;
  }

  function hide() { S.el.classList.remove('open'); }

  DH.Replay = { build, show, hide, score, paint };
})();
