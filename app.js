/* Civic Engagement Analysis: charts and interactions. Fully offline (Chart.js vendored). */
(function () {
  'use strict';
  const D = window.CEV;
  const YEARS = D.years;
  const SHORTLBL = { formal: 'Volunteer through an organization', member: 'Belong to an organization', giving: 'Give $25+ to charity', informal: 'Help neighbors informally',
    talkFF: 'Talk with friends & family', talkNb: 'Talk with neighbors', news: 'Follow news on issues', discussFF: 'Discuss issues with friends & family', discussNb: 'Discuss issues with neighbors',
    post: 'Post views online', vote: 'Vote in local elections', contact: 'Contact public officials', polDonate: 'Donate to a political cause', meetings: 'Attend public meetings',
    action: 'Take action with neighbors', buycott: 'Buycott or boycott a company', employer: 'Employer encourages service' };
  const TYPE_FALLBACK = { formal: 'formal', member: 'formal', giving: 'formal', informal: 'informal', talkNb: 'informal', discussNb: 'informal', action: 'informal' };
  const TYPE_ORDER = ['formal', 'informal', 'other'];
  const TYPE_GROUP = { formal: 'Formal (through an organization)', informal: 'Informal (helping neighbors)', other: 'Other civic' };
  D.measures.forEach(m => { m.short = SHORTLBL[m.key] || m.label; m.type = m.type || TYPE_FALLBACK[m.key] || 'other'; });
  const M = Object.fromEntries(D.measures.map(m => [m.key, m]));
  function measureOptions(selected) {
    return TYPE_ORDER.map(t => {
      const ms = D.measures.filter(m => m.type === t);
      return `<optgroup label="${TYPE_GROUP[t]}">${ms.map(m => `<option value="${m.key}"${m.key === selected ? ' selected' : ''}>${m.label}</option>`).join('')}</optgroup>`;
    }).join('');
  }
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const pct = (v, d = 1) => v == null ? '–' : (v * 100).toFixed(d) + '%';
  const pts = v => (v > 0 ? '+' : '') + (v * 100).toFixed(1) + ' pts';
  const nat = (k, y) => D.national[k][y];
  const charts = {};
  const AREA_COLORS = () => { const t = theme(); return { 'Organizational engagement': t.accent, 'Engaging with neighbors': t.accent2, 'Political engagement': t.accent3, 'Economic engagement': t.pos, 'Friends, family & issues': t.neutral }; };

  function theme() {
    return { text: css('--text'), muted: css('--muted'), line: css('--line'), accent: css('--accent'), accent2: css('--accent-2'),
      accent3: css('--accent-3'), pos: css('--pos'), neg: css('--neg'), neutral: css('--neutral'), surface: css('--surface') };
  }
  function alpha(hex, a) { const h = hex.replace('#', ''); const n = parseInt(h.length === 3 ? h.split('').map(c => c + c).join('') : h, 16); return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${a})`; }
  function mk(id, cfg) { const el = document.getElementById(id); if (!el) return; if (charts[id]) charts[id].destroy(); charts[id] = new Chart(el.getContext('2d'), cfg); }
  function baseOpts(extra) {
    const t = theme();
    Chart.defaults.font.family = css('--font') || 'system-ui'; Chart.defaults.font.size = 13; Chart.defaults.color = t.muted; Chart.defaults.borderColor = t.line;
    return Object.assign({ responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false },
      plugins: { legend: { labels: { usePointStyle: true, boxWidth: 8 } }, tooltip: { backgroundColor: t.surface, titleColor: t.text, bodyColor: t.text, borderColor: t.line, borderWidth: 1 } } }, extra || {});
  }
  const pctAxis = (max) => ({ ticks: { callback: v => Math.round(v * 100) + '%' }, min: 0, max, grid: { color: css('--line') } });
  const pctTip = { callbacks: { label: c => c.raw == null ? null : ` ${c.dataset.label}: ${pct(c.raw)}` } };
  /* draws the value at the end of each horizontal bar */
  const barLabels = { id: 'barLabels', afterDatasetsDraw(ch, _a, o) { const { ctx } = ch; ctx.save(); ctx.font = '600 11px ' + Chart.defaults.font.family; ctx.fillStyle = theme().text; ctx.textBaseline = 'middle';
    ch.data.datasets.forEach((ds, i) => { if (!ch.isDatasetVisible(i) || (o.only != null && i !== o.only)) return; ch.getDatasetMeta(i).data.forEach((b, j) => { const v = ds.data[j]; if (v == null) return; const s = o.fmt(v);
      if (o.horizontal) { const w = ctx.measureText(s).width; const x = v >= 0 ? b.x + 4 : b.x - 4 - w; ctx.textAlign = 'left'; ctx.fillText(s, Math.max(ch.chartArea.left + 2, x), b.y); }
      else { ctx.textAlign = 'center'; ctx.fillText(s, b.x, b.y - 8); } }); }); ctx.restore(); } };

  /* ---------- Tiles ---------- */
  function tile(v, l, d, cls) { return `<div class="tile"><div class="v">${v}</div><div class="l">${l}</div>${d ? `<div class="d ${cls || ''}">${d}</div>` : ''}</div>`; }
  function renderTiles() {
    const f = D.national.formal, i = D.national.informal, g = D.national.giving, e = D.national.employer;
    document.getElementById('heroTiles').innerHTML =
      tile(pct(f[2023]), 'volunteer through an organization', pts(f[2023] - f[2021]) + ' since the 2021 low', 'up') +
      tile(pct(i[2023]), 'help neighbors informally', 'record high · ' + pts(i[2023] - i[2021]), 'up') +
      tile(pct(g[2023]), 'give $25+ to charity', pts(g[2023] - g[2017]) + ' since 2017', 'down') +
      tile(pct(e[2023]), 'workers encouraged by employer', pts(e[2023] - e[2021]) + ' since 2021', 'up') +
      tile('$' + (D.economic[2023].value / 1e9).toFixed(0) + 'B', 'value of volunteer hours, 2023', '4.99 billion hours × $33.49');
    const e23 = D.economic[2023];
    document.getElementById('valueTiles').innerHTML =
      tile((e23.volunteers / 1e6).toFixed(1) + 'M', 'formal volunteers, 2023', '77.9M in 2019', 'down') +
      tile((e23.hours / 1e9).toFixed(2) + 'B', 'hours served', '5.8B in 2019', 'down') +
      tile('$' + e23.valuePerHour.toFixed(2), 'per volunteer hour (2023)', '$27.20 in 2019', 'up') +
      tile('$' + (e23.value / 1e9).toFixed(1) + 'B', 'total economic value', '$147B in 2019', 'up') +
      tile('13.4M', 'volunteer at least partly online', '18% of all formal volunteers');
  }

  /* ---------- 1 Big picture ---------- */
  function chPicture() {
    const AC = AREA_COLORS();
    const rows = D.measures.filter(m => m.key !== 'employer').map(m => ({ label: m.short, v: nat(m.key, 2023), area: m.area })).sort((a, b) => b.v - a.v);
    const areas = [...new Set(rows.map(r => r.area))];
    mk('chPicture', { type: 'bar', data: { labels: rows.map(r => r.label), datasets: areas.map(a => ({ label: a, data: rows.map(r => r.area === a ? r.v : null), backgroundColor: AC[a], borderRadius: 4, barPercentage: .8, categoryPercentage: .95, stack: 's' })) },
      options: baseOpts({ indexAxis: 'y', scales: { x: { ...pctAxis(1), stacked: true }, y: { stacked: true, grid: { display: false }, ticks: { autoSkip: false, font: { size: 12 } } } },
        plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => c.raw == null ? null : ` ${pct(c.raw)} · ${c.dataset.label}` } }, barLabels: { fmt: v => pct(v, 0), horizontal: true } } }), plugins: [barLabels] });
  }

  /* ---------- 2 What changed ---------- */
  let chgMode = 'dip';
  function chChanged() {
    const t = theme();
    let rows, datasets;
    if (chgMode === 'dip') {
      rows = D.measures.map(m => ({ label: m.short, a: m.key === 'employer' ? null : nat(m.key, 2021) - nat(m.key, 2019), b: nat(m.key, 2023) - nat(m.key, 2021) })).sort((x, y) => y.b - x.b);
      datasets = [{ label: '2019 → 2021 (pandemic)', data: rows.map(r => r.a), backgroundColor: alpha(t.neg, .7), borderRadius: 3 }, { label: '2021 → 2023 (recovery)', data: rows.map(r => r.b), backgroundColor: t.accent, borderRadius: 3 }];
    } else {
      rows = D.measures.map(m => ({ label: m.short, a: m.key === 'employer' ? nat(m.key, 2023) - nat(m.key, 2021) : nat(m.key, 2023) - nat(m.key, 2017) })).sort((x, y) => y.a - x.a);
      datasets = [{ label: 'Net change 2017 → 2023 (employer: 2021 → 2023)', data: rows.map(r => r.a), backgroundColor: rows.map(r => r.a >= 0 ? t.pos : t.neg), borderRadius: 3 }];
    }
    mk('chChanged', { type: 'bar', data: { labels: rows.map(r => r.label), datasets }, options: baseOpts({ indexAxis: 'y',
      scales: { x: { ticks: { callback: v => (v > 0 ? '+' : '') + Math.round(v * 100) }, title: { display: true, text: 'percentage points' }, grid: { color: css('--line') } }, y: { grid: { display: false }, ticks: { autoSkip: false, font: { size: 12 } } } },
      plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => c.raw == null ? null : ` ${c.dataset.label}: ${pts(c.raw)}` } }, barLabels: { fmt: v => (v > 0 ? '+' : '') + (v * 100).toFixed(1), horizontal: true, only: chgMode === 'dip' ? 1 : null } } }), plugins: [barLabels] });
  }
  document.getElementById('chgMode').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; chgMode = b.dataset.m; [...e.currentTarget.children].forEach(x => x.classList.toggle('on', x === b)); chChanged(); });

  /* ---------- 3 Long view ---------- */
  function chLong() {
    const t = theme(); const labels = []; for (let y = 2003; y <= 2023; y++) labels.push(String(y));
    const hist = Object.fromEntries(D.historical.map(h => [h.year, h.rate]));
    mk('chLong', { type: 'line', data: { labels, datasets: [
      { label: 'CPS Volunteer Supplement 2003–2015', data: labels.map(y => hist[y] ?? null), borderColor: t.neutral, backgroundColor: t.neutral, tension: .25, pointRadius: 3, borderWidth: 2 },
      { label: '2017 redesign (not comparable)', data: labels.map(y => (y === '2015' ? hist[2015] : y === '2017' ? nat('formal', 2017) : null)), borderColor: t.neutral, borderDash: [4, 5], pointRadius: 0, spanGaps: true, borderWidth: 1.5 },
      { label: 'CEV 2017–2023', data: labels.map(y => D.national.formal[y] ?? null), borderColor: t.accent, backgroundColor: t.accent, tension: .25, pointRadius: 6, spanGaps: true, borderWidth: 3.5 } ] },
      options: baseOpts({ scales: { y: pctAxis(0.35), x: { grid: { display: false } } }, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => c.raw == null ? null : ` ${pct(c.raw)}` } } } }) });
  }

  /* ---------- 4 Demographics ---------- */
  const demoYears = new Set([2017, 2023]);
  function initDemo() {
    const cats = [...new Set(D.demographics.map(d => d.category))];
    const cs = document.getElementById('demoCat'); cs.innerHTML = cats.map(c => `<option>${c}</option>`).join(''); cs.value = 'Family income';
    const ms = document.getElementById('demoMeasure'); ms.innerHTML = measureOptions('formal'); ms.value = 'formal';
    const ys = document.getElementById('demoYears'); ys.innerHTML = YEARS.map(y => `<button data-y="${y}" class="${demoYears.has(y) ? 'on' : ''}">${y}</button>`).join('');
    ys.addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; const y = +b.dataset.y; if (demoYears.has(y)) { if (demoYears.size > 1) demoYears.delete(y); } else demoYears.add(y); b.classList.toggle('on', demoYears.has(y)); chDemo(); });
    cs.addEventListener('change', chDemo); ms.addEventListener('change', chDemo);
  }
  function chDemo() {
    const t = theme(); const yc = { 2017: t.neutral, 2019: t.accent3, 2021: t.neg, 2023: t.accent };
    const cat = document.getElementById('demoCat').value, key = document.getElementById('demoMeasure').value;
    const rows = D.demographics.filter(d => d.category === cat); const ys = YEARS.filter(y => demoYears.has(y) && !(key === 'employer' && y < 2021));
    mk('chDemo', { type: 'bar', data: { labels: rows.map(r => r.group), datasets: ys.map(y => ({ label: String(y), data: rows.map(r => r.rates[key][y] ?? null), backgroundColor: yc[y], borderRadius: 3 })) },
      options: baseOpts({ scales: { y: pctAxis(undefined), x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 30, font: { size: 11 } } } },
        plugins: { title: { display: true, text: `${M[key].label} by ${cat.toLowerCase()}`, color: t.text, font: { weight: '700', size: 15 } }, tooltip: pctTip, barLabels: { fmt: v => pct(v, 0), horizontal: false } } }), plugins: [barLabels] });
  }

  /* ---------- 5 Tile map ---------- */
  const GRID = { AK: [0, 0], ME: [10, 0], WA: [0, 1], ID: [1, 1], MT: [2, 1], ND: [3, 1], MN: [4, 1], WI: [5, 1], MI: [6, 1], NY: [8, 1], VT: [9, 1], NH: [10, 1],
    OR: [0, 2], NV: [1, 2], WY: [2, 2], SD: [3, 2], IA: [4, 2], IL: [5, 2], IN: [6, 2], OH: [7, 2], PA: [8, 2], NJ: [9, 2], MA: [10, 2],
    CA: [0, 3], UT: [1, 3], CO: [2, 3], NE: [3, 3], MO: [4, 3], KY: [5, 3], WV: [6, 3], VA: [7, 3], MD: [8, 3], DE: [9, 3], CT: [10, 3],
    AZ: [1, 4], NM: [2, 4], KS: [3, 4], AR: [4, 4], TN: [5, 4], NC: [6, 4], SC: [7, 4], DC: [8, 4], RI: [10, 4], OK: [3, 5], LA: [4, 5], MS: [5, 5], AL: [6, 5], GA: [7, 5], HI: [0, 6], TX: [3, 6], FL: [7, 6] };
  const map = { measure: 'formal', year: 2023, mode: 'change', sel: 'FL' };
  function hexToRgb(h) { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }
  function mix(c1, c2, u) { const a = hexToRgb(c1), b = hexToRgb(c2); return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * u)).join(',')})`; }
  function stateVal(s) { const r = D.states[s].rates[map.measure]; return map.mode === 'level' ? (r[map.year] ?? null) : (r[2023] != null && r[2019] != null ? r[2023] - r[2019] : null); }
  function initMap() {
    const ms = document.getElementById('mapMeasure'); ms.innerHTML = measureOptions('formal');
    const ys = document.getElementById('mapYear'); ys.innerHTML = YEARS.map(y => `<option>${y}</option>`).join(''); ys.value = '2023'; ys.disabled = true;
    ms.addEventListener('change', () => { map.measure = ms.value; renderMap(); });
    ys.addEventListener('change', () => { map.year = +ys.value; renderMap(); });
    document.getElementById('mapMode').addEventListener('click', e => { const b = e.target.closest('button'); if (!b) return; map.mode = b.dataset.mode; [...e.currentTarget.children].forEach(x => x.classList.toggle('on', x === b)); ys.disabled = map.mode === 'change'; renderMap(); });
    const grid = document.getElementById('tilemap');
    grid.innerHTML = Object.keys(GRID).map(s => `<div class="t" data-s="${s}" style="grid-column:${GRID[s][0] + 1};grid-row:${GRID[s][1] + 1}">${s}</div>`).join('');
    grid.addEventListener('click', e => { const el = e.target.closest('.t'); if (!el) return; map.sel = el.dataset.s; renderMap(); });
  }
  function renderMap() {
    const t = theme(); const vals = Object.keys(GRID).map(s => [s, stateVal(s)]).filter(x => x[1] != null);
    const nums = vals.map(x => x[1]); const lo = Math.min(...nums), hi = Math.max(...nums); let color, legend;
    if (map.mode === 'level') { color = v => mix('#cfe9ee', '#0b4f5c', (v - lo) / (hi - lo || 1)); legend = `<span>${pct(lo)}</span><div class="bar" style="background:linear-gradient(90deg,#cfe9ee,#0b4f5c)"></div><span>${pct(hi)}</span>`; }
    else { const m = Math.max(Math.abs(lo), Math.abs(hi)); color = v => v < 0 ? mix('#e9e9e9', t.neg, Math.min(1, -v / m)) : mix('#e9e9e9', t.pos, Math.min(1, v / m)); legend = `<span>${pts(-m)}</span><div class="bar" style="background:linear-gradient(90deg,${t.neg},#e9e9e9,${t.pos})"></div><span>${pts(m)}</span>`; }
    document.querySelectorAll('#tilemap .t').forEach(el => { const v = stateVal(el.dataset.s); el.style.background = v == null ? css('--surface-2') : color(v); el.style.color = v == null ? t.muted : '#fff';
      el.title = `${D.states[el.dataset.s].name || el.dataset.s}: ${v == null ? 'n/a' : map.mode === 'level' ? pct(v) : pts(v)}`; el.classList.toggle('sel', el.dataset.s === map.sel); });
    document.getElementById('mapLegend').innerHTML = legend + `<span class="muted">· ${M[map.measure].label}${map.mode === 'level' ? ', ' + map.year : ', 2023 vs 2019'}</span>`;
    const sorted = vals.slice().sort((a, b) => b[1] - a[1]); const fmt = map.mode === 'level' ? pct : pts;
    document.getElementById('rankList').innerHTML = [...sorted.slice(0, 5), ['…', null], ...sorted.slice(-5)].map(([s, v]) => v == null ? '<li class="muted">…</li>' : `<li><span>${D.states[s].name || s}</span><b>${fmt(v)}</b></li>`).join('');
    const s = map.sel, st = D.states[s], r = st.rates[map.measure], tp = D.toplines.states[s]; const rank = sorted.findIndex(x => x[0] === s) + 1; const chg = r[2023] != null && r[2019] != null ? r[2023] - r[2019] : null;
    document.getElementById('stateDetail').innerHTML = `<div class="kicker" style="margin-bottom:.2rem">${st.name || s}</div><div class="big">${pct(r[2023])}</div>
      <div class="small muted">${M[map.measure].label}, 2023 · rank ${rank || '–'} of ${sorted.length}</div>
      <div class="small" style="margin:.4rem 0">${YEARS.map(y => `${y}: <b>${pct(r[y])}</b>`).join(' · ')}</div>
      <div class="small">vs 2019: <b class="${chg >= 0 ? 'up' : 'down'}">${chg == null ? '–' : pts(chg)}</b></div>
      ${tp ? `<div class="small muted" style="margin-top:.5rem">${(tp.volunteers / 1e6).toFixed(2)}M volunteers · ${(tp.hours / 1e6).toFixed(0)}M hours · $${(tp.value / 1e9).toFixed(2)}B value · employer encouragement ${pct(st.rates.employer[2023])}</div>` : ''}`;
  }

  /* ---------- 6 Workplace ---------- */
  function chWork() {
    const t = theme(); const groups = D.demographics.filter(d => d.category === 'Generation' || d.category === 'Family income');
    const SHORT = { 'Baby Boomers': 'Boomers', 'Silent Generation or older': 'Silent+', '$24,999 or less': '<$25k', '$25,000 to $39,999': '$25–40k', '$40,000 to $59,999': '$40–60k', '$60,000 to $74,999': '$60–75k', '$75,000 to $99,999': '$75–100k', '$100,000 to $149,999': '$100–150k', '$150,000 or more': '$150k+' };
    mk('chWork', { type: 'bar', data: { labels: groups.map(g => SHORT[g.group] || g.group), datasets: [
      { label: '2021', data: groups.map(g => g.rates.employer[2021]), backgroundColor: t.neutral, borderRadius: 3 }, { label: '2023', data: groups.map(g => g.rates.employer[2023]), backgroundColor: t.accent2, borderRadius: 3 } ] },
      options: baseOpts({ scales: { y: pctAxis(0.6), x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 40, font: { size: 11 } } } }, plugins: { legend: { position: 'bottom' }, tooltip: pctTip } }) });
  }
  function chScatter() {
    const t = theme(); const p = Object.keys(D.states).map(s => ({ x: D.states[s].rates.employer[2023], y: D.states[s].rates.formal[2023], s })).filter(q => q.x != null && q.y != null);
    const n = p.length, mx = p.reduce((a, q) => a + q.x, 0) / n, my = p.reduce((a, q) => a + q.y, 0) / n;
    const sxy = p.reduce((a, q) => a + (q.x - mx) * (q.y - my), 0), sxx = p.reduce((a, q) => a + (q.x - mx) ** 2, 0), syy = p.reduce((a, q) => a + (q.y - my) ** 2, 0);
    const b = sxy / sxx, a = my - b * mx, r = sxy / Math.sqrt(sxx * syy); const xs = [Math.min(...p.map(q => q.x)), Math.max(...p.map(q => q.x))];
    mk('chScatter', { type: 'scatter', data: { datasets: [ { label: 'State', data: p, backgroundColor: alpha(t.accent, .75), pointRadius: 6, pointHoverRadius: 8 },
      { label: `Trend (r = ${r.toFixed(2)})`, type: 'line', data: xs.map(x => ({ x, y: a + b * x })), borderColor: t.accent2, borderDash: [6, 4], pointRadius: 0, borderWidth: 2 } ] },
      options: baseOpts({ interaction: { mode: 'nearest', intersect: true }, scales: { x: { title: { display: true, text: 'Workers encouraged by employer' }, ticks: { callback: v => Math.round(v * 100) + '%' }, grid: { color: css('--line') } }, y: { title: { display: true, text: 'Formal volunteering' }, ticks: { callback: v => Math.round(v * 100) + '%' }, grid: { color: css('--line') } } },
        plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => c.raw.s ? ` ${D.states[c.raw.s].name}: ${pct(c.raw.x)} encouraged, ${pct(c.raw.y)} volunteer` : null } } } }) });
  }
  function chCecp() {
    const t = theme(), c = D.cecp;
    const rows = [['Offer gift matching', c.matchingOffered], ['Offer virtual volunteering', c.virtualOffered], ['Offer pro bono service', c.proBonoOffered], ['Avg. employee volunteer participation', c.volunteerParticipation], ['  … companies under 10,000 staff', c.volunteerParticipationSmall], ['  … companies over 100,000 staff', c.volunteerParticipationLarge], ['Avg. matching-gift participation (tech: 31%)', c.matchingParticipation]];
    mk('chCecp', { type: 'bar', data: { labels: rows.map(r => r[0]), datasets: [{ label: 'Share of large companies / employees', data: rows.map(r => r[1]), backgroundColor: rows.map((r, i) => i < 3 ? t.accent3 : t.accent), borderRadius: 3 }] },
      options: baseOpts({ indexAxis: 'y', scales: { x: pctAxis(1), y: { grid: { display: false }, ticks: { autoSkip: false, font: { size: 12 } } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c2 => ` ${pct(c2.raw, 0)}` } }, barLabels: { fmt: v => pct(v, 0), horizontal: true } } }), plugins: [barLabels] });
  }

  /* ---------- 7 Value ---------- */
  function chHourValue() {
    const t = theme(); const ys = Object.keys(D.valueOfHour).map(Number).sort();
    mk('chHourValue', { type: 'line', data: { labels: ys, datasets: [{ label: 'Value of a volunteer hour', data: ys.map(y => D.valueOfHour[y]), borderColor: t.accent, backgroundColor: alpha(t.accent, .15), fill: true, tension: .3, pointRadius: ys.map(y => YEARS.includes(y) ? 6 : 2), pointBackgroundColor: ys.map(y => YEARS.includes(y) ? t.accent2 : t.accent), borderWidth: 2.5 }] },
      options: baseOpts({ scales: { y: { ticks: { callback: v => '$' + v }, grid: { color: css('--line') } }, x: { grid: { display: false }, ticks: { maxTicksLimit: 9 } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` $${c.raw.toFixed(2)} per hour${YEARS.includes(+c.label) ? ' (CEV year)' : ''}` } } } }) });
  }
  function chVirtual() {
    const t = theme();
    mk('chVirtual', { type: 'bar', data: { labels: ['In person only (82%)', 'Partly or fully online (18%)'], datasets: [{ label: 'Average hours per year', data: [64, 95], backgroundColor: [t.neutral, t.accent], borderRadius: 4, barThickness: 44 }] },
      options: baseOpts({ indexAxis: 'y', plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.raw} hours` } }, barLabels: { fmt: v => v + ' hrs', horizontal: true } }, scales: { x: { grid: { color: css('--line') }, max: 110 }, y: { grid: { display: false } } } }), plugins: [barLabels] });
  }

  /* ---------- Table ---------- */
  function renderTable() {
    const typeLbl = { formal: 'Formal', informal: 'Informal', other: 'Other' };
    const h = `<thead><tr><th>Type</th><th>Measure</th>${YEARS.map(y => `<th class="num">${y}</th>`).join('')}<th class="num">Δ 17→23</th><th class="num">Δ 21→23</th></tr></thead>`;
    const ordered = TYPE_ORDER.flatMap(t => D.measures.filter(m => m.type === t));
    const b = ordered.map(m => { const r = D.national[m.key]; const d1 = r[2017] != null ? r[2023] - r[2017] : null, d2 = r[2023] - r[2021];
      return `<tr><td>${typeLbl[m.type]}</td><td>${m.label}</td>${YEARS.map(y => `<td class="num">${pct(r[y])}</td>`).join('')}<td class="num ${d1 == null ? '' : d1 >= 0 ? 'up' : 'down'}">${d1 == null ? '–' : pts(d1)}</td><td class="num ${d2 >= 0 ? 'up' : 'down'}">${pts(d2)}</td></tr>`; }).join('');
    document.getElementById('natTable').innerHTML = h + '<tbody>' + b + '</tbody>';
  }

  /* ---------- Navigation, theme, presenter ---------- */
  function renderCharts() { chPicture(); chChanged(); chLong(); chDemo(); chWork(); chScatter(); chCecp(); chHourValue(); chVirtual(); renderMap(); }
  function setTheme(mode) { if (mode) document.documentElement.setAttribute('data-theme', mode); else document.documentElement.removeAttribute('data-theme'); try { if (mode) localStorage.setItem('theme', mode); else localStorage.removeItem('theme'); } catch (e) {} renderCharts(); }
  function currentDark() { const a = document.documentElement.getAttribute('data-theme'); return a ? a === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; }
  document.getElementById('themeBtn').addEventListener('click', () => setTheme(currentDark() ? 'light' : 'dark'));
  function togglePresent() { document.body.classList.toggle('present'); const on = document.body.classList.contains('present');
    if (on && document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {}); if (!on && document.fullscreenElement) document.exitFullscreen().catch(() => {});
    setTimeout(() => Object.values(charts).forEach(c => c.resize()), 250); }
  document.getElementById('presentBtn').addEventListener('click', togglePresent); document.getElementById('presentBtn2').addEventListener('click', togglePresent);
  document.addEventListener('fullscreenchange', () => { if (!document.fullscreenElement) document.body.classList.remove('present'); });
  document.getElementById('menuBtn').addEventListener('click', () => document.getElementById('sidebar').classList.toggle('open'));
  document.getElementById('nav').addEventListener('click', () => document.getElementById('sidebar').classList.remove('open'));
  const sections = [...document.querySelectorAll('section.slide')], links = [...document.querySelectorAll('#nav a')];
  const io = new IntersectionObserver(es => es.forEach(e => { if (e.isIntersecting) links.forEach(l => l.classList.toggle('active', l.getAttribute('href') === '#' + e.target.id)); }), { rootMargin: '-40% 0px -55% 0px' });
  sections.forEach(s => io.observe(s));
  document.addEventListener('keydown', e => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
    const at = sections.findIndex(s => Math.abs(s.getBoundingClientRect().top) < 10); const next = sections.findIndex(s => s.getBoundingClientRect().top > 10);
    if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') { e.preventDefault(); const n = at >= 0 ? at + 1 : (next === -1 ? sections.length : next); if (sections[n]) sections[n].scrollIntoView({ behavior: 'smooth' }); }
    if (e.key === 'ArrowLeft' || e.key === 'PageUp') { e.preventDefault(); const p = (at >= 0 ? at : (next === -1 ? sections.length : next)) - 1; if (sections[p]) sections[p].scrollIntoView({ behavior: 'smooth' }); }
    if (e.key.toLowerCase() === 'p') togglePresent();
  });

  try { const t = localStorage.getItem('theme'); if (t) document.documentElement.setAttribute('data-theme', t); } catch (e) {}
  renderTiles(); initDemo(); initMap(); renderTable(); renderCharts();
  matchMedia('(prefers-color-scheme: dark)').addEventListener('change', () => { if (!document.documentElement.getAttribute('data-theme')) renderCharts(); });
})();
