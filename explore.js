/* CEV Data Explorer. Fully offline. */
(function () {
  'use strict';
  const D = window.CEV, YEARS = D.years;
  const SHORT = { formal: 'Volunteer through an organization', member: 'Belong to an organization', giving: 'Give $25+ to charity', informal: 'Help neighbors informally', talkFF: 'Talk with friends & family', talkNb: 'Talk with neighbors', news: 'Follow news on issues', discussFF: 'Discuss issues with friends & family', discussNb: 'Discuss issues with neighbors', post: 'Post views online', vote: 'Vote in local elections', contact: 'Contact public officials', polDonate: 'Donate to a political cause', meetings: 'Attend public meetings', action: 'Take action with neighbors', buycott: 'Buycott or boycott a company', employer: 'Employer encourages service' };
  const TYPE_FALLBACK = { formal: 'formal', member: 'formal', giving: 'formal', informal: 'informal', talkNb: 'informal', discussNb: 'informal', action: 'informal' };
  const TYPE_ORDER = ['formal', 'informal', 'other'];
  const TYPE_GROUP = { formal: 'Formal (through an organization)', informal: 'Informal (helping neighbors)', other: 'Other civic' };
  D.measures.forEach(m => { m.short = SHORT[m.key] || m.label; m.type = m.type || TYPE_FALLBACK[m.key] || 'other'; });
  const M = Object.fromEntries(D.measures.map(m => [m.key, m]));
  const AREAS = [...new Set(D.measures.map(m => m.area))];
  const css = v => getComputedStyle(document.documentElement).getPropertyValue(v).trim();
  const T = () => ({ text: css('--text'), muted: css('--muted'), line: css('--line'), accent: css('--accent'), accent2: css('--accent-2'), accent3: css('--accent-3'), pos: css('--pos'), neg: css('--neg'), neutral: css('--neutral'), surface: css('--surface') });
  const PAL = () => { const t = T(); return [t.accent, t.accent2, t.accent3, t.pos, t.neg, '#c2a000', '#e0569b', '#2f6fdd', t.neutral, '#7a4b2a']; };
  const AREA_COLOR = a => { const t = T(); return { 'Organizational engagement': t.accent, 'Engaging with neighbors': t.accent2, 'Political engagement': t.accent3, 'Economic engagement': t.pos, 'Friends, family & issues': t.neutral }[a]; };
  const pct = (v, d = 1) => v == null ? '–' : (v * 100).toFixed(d) + '%';
  const pts = v => v == null ? '–' : (v > 0 ? '+' : '') + (v * 100).toFixed(1);
  const nat = (k, y) => D.national[k][y];
  const first = k => k === 'employer' ? 2021 : 2017;
  const charts = {};
  function mk(id, cfg) { const el = document.getElementById(id); if (!el) return; if (charts[id]) charts[id].destroy(); charts[id] = new Chart(el.getContext('2d'), cfg); }
  function base(extra) { const t = T(); Chart.defaults.font.family = css('--font') || 'system-ui'; Chart.defaults.font.size = 12; Chart.defaults.color = t.muted; Chart.defaults.borderColor = t.line;
    return Object.assign({ responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { labels: { usePointStyle: true, boxWidth: 8 } }, tooltip: { backgroundColor: t.surface, titleColor: t.text, bodyColor: t.text, borderColor: t.line, borderWidth: 1 } } }, extra || {}); }
  const pctAxis = (min, max) => ({ ticks: { callback: v => Math.round(v * 100) + '%' }, min, max, grid: { color: css('--line') } });
  const barLabels = { id: 'barLabels', afterDatasetsDraw(ch, _a, o) { const { ctx } = ch; ctx.save(); ctx.font = '600 11px ' + Chart.defaults.font.family; ctx.fillStyle = T().text; ctx.textBaseline = 'middle';
    ch.data.datasets.forEach((ds, i) => { if (!ch.isDatasetVisible(i)) return; ch.getDatasetMeta(i).data.forEach((b, j) => { const v = ds.data[j]; if (v == null) return; const s = o.fmt(v, i);
      if (o.horizontal) { ctx.textAlign = 'left'; ctx.fillText(s, b.x + 5, b.y); } else { ctx.textAlign = 'center'; ctx.fillText(s, b.x, b.y - 9); } }); }); ctx.restore(); } };
  const P = v => (v * 100).toFixed(1) + '%';
  const P0 = v => Math.round(v * 100) + '%';
  const PT = v => Math.abs(v * 100).toFixed(1) + ' point' + (Math.abs(v * 100).toFixed(1) === '1.0' ? '' : 's');
  const say = (id, html) => { const el = document.getElementById(id); if (el) el.innerHTML = `<div class="h">What this shows, in plain words</div>${html}`; };
  const tipPct = { callbacks: { label: c => c.raw == null ? null : ` ${c.dataset.label}: ${pct(c.raw)}` } };
  /* heat cell: color by value within [lo,hi], or diverging if div */
  function heat(v, lo, hi, div) { if (v == null) return '<span>–</span>'; const t = T(); let bg;
    if (div) { const m = Math.max(Math.abs(lo), Math.abs(hi)) || 1; const u = Math.min(1, Math.abs(v) / m); bg = `color-mix(in srgb, ${v < 0 ? t.neg : t.pos} ${Math.round(u * 55)}%, transparent)`; }
    else { const u = (v - lo) / ((hi - lo) || 1); bg = `color-mix(in srgb, ${t.accent} ${Math.round(u * 60)}%, transparent)`; }
    return `<span style="background:${bg}">${div ? pts(v) : pct(v)}</span>`; }
  function sortable(table, rows, cols, state) { /* rows: array of objects; cols: [{k,label,fmt,cls,num}] */
    const render = () => { const { k, dir } = state; const rs = rows.slice().sort((a, b) => { const x = a[k], y = b[k]; if (x == null) return 1; if (y == null) return -1; return (x < y ? -1 : x > y ? 1 : 0) * (dir === 'asc' ? 1 : -1); });
      table.innerHTML = `<thead><tr>${cols.map(c => `<th class="sortable ${c.num ? 'num' : ''} ${state.k === c.k ? state.dir : ''}" data-k="${c.k}">${c.label}</th>`).join('')}</tr></thead><tbody>${rs.map(r => `<tr>${cols.map(c => `<td class="${c.cls || (c.num ? 'num' : '')}">${c.fmt ? c.fmt(r[c.k], r) : r[c.k] ?? '–'}</td>`).join('')}</tr>`).join('')}</tbody>`; };
    table.onclick = e => { const th = e.target.closest('th.sortable'); if (!th) return; const k = th.dataset.k; state.dir = state.k === k && state.dir === 'desc' ? 'asc' : 'desc'; state.k = k; render(); };
    render(); return render; }

  /* ================= OVERVIEW ================= */
  function renderOverview() {
    const host = document.getElementById('smGroups');
    host.innerHTML = AREAS.map(area => { const ms = D.measures.filter(m => m.area === area);
      return `<div class="sm-area"><i style="background:${AREA_COLOR(area)}"></i>${area} <span>· ${ms.length} behaviors</span></div><div class="sm-grid">${ms.map(m => { const d = nat(m.key, 2023) - nat(m.key, first(m.key));
        return `<div class="sm" data-k="${m.key}"><div class="t">${m.short}</div><div class="row"><span class="v">${P(nat(m.key, 2023))}</span><span class="d ${d >= 0 ? 'up' : 'down'}">${pts(d)} pts since ${first(m.key)}</span></div><div class="cw"><canvas id="sm-${m.key}"></canvas></div></div>`; }).join('')}</div>`; }).join('');
    D.measures.forEach(m => { const ys = YEARS.filter(y => nat(m.key, y) != null); const c = AREA_COLOR(m.area);
      mk('sm-' + m.key, { type: 'line', data: { labels: ys, datasets: [{ data: ys.map(y => nat(m.key, y)), borderColor: c, backgroundColor: c, pointRadius: 3, borderWidth: 2.5, tension: .3 }] },
        options: base({ plugins: { legend: { display: false }, tooltip: { callbacks: { label: c2 => ' ' + pct(c2.raw) } } }, scales: { x: { grid: { display: false }, ticks: { font: { size: 10 } } }, y: { display: false, suggestedMin: Math.min(...ys.map(y => nat(m.key, y))) * .9, suggestedMax: Math.max(...ys.map(y => nat(m.key, y))) * 1.05 } }, animation: false }) }); });
    const f = D.national.formal, i = D.national.informal, ch = D.measures.filter(m => m.key !== 'employer').map(m => ({ m, d: nat(m.key, 2023) - nat(m.key, 2017) })).sort((x, y) => y.d - x.d);
    say('exOverview', `<ul><li><b>About 1 in 4 Americans volunteer</b> through an organization: ${P(f[2017])} in 2017, down to ${P(f[2021])} in the pandemic year 2021, back up to ${P(f[2023])} in 2023.</li>
      <li><b>Helping neighbors directly is at a record high</b>, ${P(i[2023])}. The biggest rises since 2017: ${ch.slice(0, 2).map(x => x.m.short.toLowerCase()).join(' and ')}.</li>
      <li><b>Following and talking about the news keeps falling</b>: ${ch.slice(-3).reverse().map(x => `${x.m.short.toLowerCase()} (−${PT(x.d)})`).join(', ')}.</li></ul>`);
    host.onclick = e => { const c = e.target.closest('.sm'); if (!c) return; trSel = new Set([c.dataset.k]); showView('trends'); renderTrends(); };
  }

  /* ================= TRENDS ================= */
  let trSel = new Set(['formal', 'informal', 'giving', 'member']), trMode = 'rate';
  function renderTrends() {
    const keys = D.measures.map(m => m.key).filter(k => trSel.has(k)); const pal = PAL();
    document.getElementById('trChips').innerHTML = keys.map((k, i) => `<button data-k="${k}" class="on" style="background:${pal[i % pal.length]}" title="Remove">${M[k].short}</button>`).join('');
    document.getElementById('trChips').onclick = e => { const b = e.target.closest('button'); if (!b || keys.length === 1) return; trSel.delete(b.dataset.k); renderTrends(); };
    const add = document.getElementById('trAdd');
    add.innerHTML = '<option value="">+ Add a behavior…</option>' + TYPE_ORDER.map(t => {
      const ms = D.measures.filter(m => m.type === t && !trSel.has(m.key));
      return ms.length ? `<optgroup label="${TYPE_GROUP[t]}">${ms.map(m => `<option value="${m.key}">${m.short}</option>`).join('')}</optgroup>` : '';
    }).join('');
    add.onchange = () => { if (add.value) { trSel.add(add.value); renderTrends(); } };
    const val = (k, y) => { const v = nat(k, y); if (v == null) return null; return trMode === 'rate' ? v : v - nat(k, first(k)); };
    const fmt = v => v == null ? '–' : trMode === 'rate' ? pct(v) : pts(v) + ' pts';
    const ds = keys.map((k, i) => ({ label: M[k].short, data: YEARS.map(y => val(k, y)), borderColor: pal[i % pal.length], backgroundColor: pal[i % pal.length], tension: .25, pointRadius: 5, borderWidth: 3, spanGaps: true }));
    const yscale = trMode === 'rate' ? pctAxis(0, undefined) : { ticks: { callback: v => (v > 0 ? '+' : '') + Math.round(v * 100) }, grid: { color: css('--line') }, title: { display: true, text: 'percentage points, compared with 2017' } };
    mk('chTrends', { type: 'line', data: { labels: YEARS, datasets: ds }, options: base({ scales: { y: yscale, x: { grid: { display: false } } }, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${fmt(c.raw)}` } } } }) });
    say('exTrends', `<ul>${keys.map(k => { const f = first(k), v = D.national[k]; const dip = f === 2017 && v[2021] < v[2019] ? ` dipped to ${P(v[2021])} in 2021,` : ''; const d = v[2023] - v[f];
      return `<li><b>${M[k].short}:</b> ${P(v[f])} in ${f},${dip} ${P(v[2023])} in 2023. ${Math.abs(d) < 0.01 ? 'Basically flat.' : (d > 0 ? 'Up ' : 'Down ') + PT(d) + ' overall.'}</li>`; }).join('')}</ul>`);
    const rows = keys.map(k => ({ k, ...Object.fromEntries(YEARS.map(y => [y, nat(k, y)])), d: nat(k, 2023) - nat(k, first(k)), r: nat(k, 2023) / nat(k, first(k)) - 1 }));
    const all = rows.flatMap(r => YEARS.map(y => r[y])).filter(v => v != null); const lo = Math.min(...all), hi = Math.max(...all); const dd = rows.map(r => r.d);
    document.getElementById('trTable').innerHTML = `<thead><tr><th>Behavior</th>${YEARS.map(y => `<th class="num">${y}</th>`).join('')}<th class="num">Change (pts)</th><th class="num">Relative</th></tr></thead><tbody>${rows.map(r => `<tr><td>${M[r.k].short}</td>${YEARS.map(y => `<td class="h">${heat(r[y], lo, hi)}</td>`).join('')}<td class="h">${heat(r.d, Math.min(...dd), Math.max(...dd), true)}</td><td class="num ${r.r >= 0 ? 'up' : 'down'}">${(r.r * 100).toFixed(0)}%</td></tr>`).join('')}</tbody>`;
  }
  document.getElementById('trMode').onclick = e => { const b = e.target.closest('button'); if (!b) return; trMode = b.dataset.m; [...e.currentTarget.children].forEach(x => x.classList.toggle('on', x === b)); renderTrends(); };

  /* ================= DEMOGRAPHICS ================= */
  const CATS = [...new Set(D.demographics.map(d => d.category))];
  let dmType = 'line';
  function fillMeasureSelect(id, def) {
    const s = document.getElementById(id);
    s.innerHTML = TYPE_ORDER.map(t => {
      const ms = D.measures.filter(m => m.type === t);
      return `<optgroup label="${TYPE_GROUP[t]}">${ms.map(m => `<option value="${m.key}">${m.short}</option>`).join('')}</optgroup>`;
    }).join('');
    s.value = def; return s;
  }
  const dmCat = document.getElementById('dmCat'); dmCat.innerHTML = CATS.map(c => `<option>${c}</option>`).join(''); dmCat.value = 'Generation';
  const dmMeasure = fillMeasureSelect('dmMeasure', 'formal');
  dmCat.onchange = renderDemo; dmMeasure.onchange = renderDemo;
  document.getElementById('dmType').onclick = e => { const b = e.target.closest('button'); if (!b) return; dmType = b.dataset.t; [...e.currentTarget.children].forEach(x => x.classList.toggle('on', x === b)); renderDemo(); };
  function renderDemo() {
    document.querySelector('#v-demo .chart-wrap').style.height = dmType === 'rank' ? '1150px' : '';
    const cat = dmCat.value, k = dmMeasure.value, rows = D.demographics.filter(d => d.category === cat), pal = PAL(), t = T();
    const ys = YEARS.filter(y => !(k === 'employer' && y < 2021)); const f = first(k);
    const usLine = { label: 'U.S. overall', data: ys.map(y => nat(k, y)), borderColor: t.text, borderDash: [5, 4], pointRadius: 0, borderWidth: 2, tension: .25 };
    if (dmType === 'line') mk('chDemo', { type: 'line', data: { labels: ys, datasets: [...rows.map((r, i) => ({ label: r.group, data: ys.map(y => r.rates[k][y] ?? null), borderColor: pal[i % pal.length], backgroundColor: pal[i % pal.length], tension: .25, pointRadius: 4, borderWidth: 2.5, spanGaps: true })), usLine] }, options: base({ scales: { y: pctAxis(undefined, undefined), x: { grid: { display: false } } }, plugins: { legend: { position: 'bottom' }, tooltip: tipPct, title: { display: true, text: `${M[k].short} by ${cat.toLowerCase()}`, color: t.text, font: { weight: '700', size: 14 } } } }) });
    else if (dmType === 'bar') mk('chDemo', { type: 'bar', data: { labels: rows.map(r => r.group), datasets: ys.map((y, i) => ({ label: String(y), data: rows.map(r => r.rates[k][y] ?? null), backgroundColor: [t.neutral, t.accent3, t.neg, t.accent].slice(-ys.length)[i], borderRadius: 3 })) }, options: base({ scales: { y: pctAxis(0, undefined), x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 35, font: { size: 11 } } } }, plugins: { legend: { position: 'bottom' }, tooltip: tipPct } }) });
    else if (dmType === 'rank') { const all = D.demographics.map(d => ({ g: d.group, cat: d.category, a: d.rates[k][2021], b: d.rates[k][2023] })).filter(r => r.a && r.b).map(r => ({ ...r, rel: r.b / r.a - 1 })).sort((x, y) => y.rel - x.rel);
      mk('chDemo', { type: 'bar', data: { labels: all.map(r => r.g), datasets: CATS.map((c, i) => ({ label: c, data: all.map(r => r.cat === c ? r.rel : null), backgroundColor: pal[i % pal.length], borderRadius: 3, stack: 's', barPercentage: .85, categoryPercentage: .95 })) },
        options: base({ indexAxis: 'y', scales: { x: { stacked: true, ticks: { callback: v => (v > 0 ? '+' : '') + Math.round(v * 100) + '%' }, grid: { color: css('--line') }, title: { display: true, text: `relative change in ${M[k].short.toLowerCase()}, 2021 → 2023 (U.S. overall: ${((nat(k, 2023) / nat(k, 2021) - 1) * 100).toFixed(0)}%)` } }, y: { stacked: true, grid: { display: false }, ticks: { autoSkip: false, font: { size: 11 } } } },
          plugins: { legend: { position: 'top' }, tooltip: { callbacks: { label: c => c.raw == null ? null : ` ${c.dataset.label}: ${pct(all[c.dataIndex].a)} → ${pct(all[c.dataIndex].b)} (${(c.raw * 100).toFixed(0)}%)` } }, barLabels: { fmt: v => (v > 0 ? '+' : '') + (v * 100).toFixed(0) + '%', horizontal: true } } }), plugins: [barLabels] }); }
    else mk('chDemo', { type: 'bar', data: { labels: rows.map(r => r.group), datasets: [{ label: `${f} → 2023`, data: rows.map(r => [r.rates[k][f], r.rates[k][2023]]), backgroundColor: rows.map(r => (r.rates[k][2023] ?? 0) >= (r.rates[k][f] ?? 0) ? t.pos : t.neg), borderRadius: 4, barThickness: 10 }, { label: f, type: 'scatter', data: rows.map((r, i) => ({ x: r.rates[k][f], y: i })), backgroundColor: t.neutral, pointRadius: 7 }, { label: '2023', type: 'scatter', data: rows.map((r, i) => ({ x: r.rates[k][2023], y: i })), backgroundColor: t.accent, pointRadius: 7 }] },
      options: base({ indexAxis: 'y', interaction: { mode: 'nearest', intersect: true }, scales: { x: pctAxis(0, undefined), y: { grid: { display: false }, ticks: { autoSkip: false } } }, plugins: { legend: { position: 'bottom', labels: { filter: l => l.text !== `${f} → 2023` } }, tooltip: { callbacks: { label: c => c.dataset.type === 'scatter' ? ` ${c.dataset.label}: ${pct(c.raw.x)}` : ` ${pct(c.raw[0])} → ${pct(c.raw[1])}` } } } }) });
    { const g = rows.filter(r => r.rates[k][2023] != null).map(r => ({ n: r.group, a: r.rates[k][f], b: r.rates[k][2023], l: r.rates[k][2021] })).sort((x, y) => y.b - x.b); const hi = g[0], lo = g[g.length - 1]; const above = g.filter(x => x.a != null && x.b > x.a); const big = g.filter(x => x.l != null).slice().sort((x, y) => (y.b - y.l) - (x.b - x.l))[0];
      say('exDemo', `<ul><li><b>${hi.n}</b> ${M[k].short.toLowerCase().replace(/^volunteer/, 'volunteer')} the most (${P(hi.b)} in 2023); <b>${lo.n}</b> the least (${P(lo.b)}). All Americans: ${P(nat(k, 2023))}.</li>
      ${f === 2017 ? `<li><b>${above.length === 0 ? 'No group' : above.length === g.length ? 'Every group' : above.length + ' of ' + g.length + ' groups'}</b> ${above.length === 1 ? 'is' : 'are'} now above where ${above.length === 1 ? 'it' : 'they'} stood in 2017${above.length && above.length < g.length ? ': ' + above.map(x => x.n).join(', ') : ''}.</li>` : ''}
      ${big && big.l != null ? `<li>Since the 2021 low, the biggest comeback was <b>${big.n}</b>: ${P(big.l)} → ${P(big.b)} (+${PT(big.b - big.l)}).</li>` : ''}
      ${dmType === 'rank' ? `<li>Longer bar = faster comeback from the 2021 low, as a percent of where that group started.</li>` : ''}</ul>`); }
    const all = rows.flatMap(r => ys.map(y => r.rates[k][y])).filter(v => v != null); const lo = Math.min(...all), hi = Math.max(...all);
    const dd = rows.map(r => r.rates[k][2023] != null && r.rates[k][f] != null ? r.rates[k][2023] - r.rates[k][f] : null).filter(v => v != null);
    document.getElementById('dmTable').innerHTML = `<thead><tr><th>${cat}</th>${ys.map(y => `<th class="num">${y}</th>`).join('')}<th class="num">Change ${f}→23 (pts)</th><th class="num">vs U.S. 2023</th></tr></thead><tbody>${rows.map(r => { const d = r.rates[k][2023] != null && r.rates[k][f] != null ? r.rates[k][2023] - r.rates[k][f] : null; const g = r.rates[k][2023] != null ? r.rates[k][2023] - nat(k, 2023) : null;
      return `<tr><td>${r.group}</td>${ys.map(y => `<td class="h">${heat(r.rates[k][y], lo, hi)}</td>`).join('')}<td class="h">${heat(d, Math.min(...dd), Math.max(...dd), true)}</td><td class="num ${g >= 0 ? 'up' : 'down'}">${pts(g)}</td></tr>`; }).join('')}<tr><td><b>U.S. overall</b></td>${ys.map(y => `<td class="num"><b>${pct(nat(k, y))}</b></td>`).join('')}<td class="num"><b>${pts(nat(k, 2023) - nat(k, f))}</b></td><td></td></tr></tbody>`;
  }

  /* ================= STATES ================= */
  const GRID = { AK: [0, 0], ME: [10, 0], WA: [0, 1], ID: [1, 1], MT: [2, 1], ND: [3, 1], MN: [4, 1], WI: [5, 1], MI: [6, 1], NY: [8, 1], VT: [9, 1], NH: [10, 1], OR: [0, 2], NV: [1, 2], WY: [2, 2], SD: [3, 2], IA: [4, 2], IL: [5, 2], IN: [6, 2], OH: [7, 2], PA: [8, 2], NJ: [9, 2], MA: [10, 2], CA: [0, 3], UT: [1, 3], CO: [2, 3], NE: [3, 3], MO: [4, 3], KY: [5, 3], WV: [6, 3], VA: [7, 3], MD: [8, 3], DE: [9, 3], CT: [10, 3], AZ: [1, 4], NM: [2, 4], KS: [3, 4], AR: [4, 4], TN: [5, 4], NC: [6, 4], SC: [7, 4], DC: [8, 4], RI: [10, 4], OK: [3, 5], LA: [4, 5], MS: [5, 5], AL: [6, 5], GA: [7, 5], HI: [0, 6], TX: [3, 6], FL: [7, 6] };
  const st = { measure: 'formal', mode: 'level', yi: 3, cmp: ['UT', 'FL', 'CA', 'TX'], timer: null };
  const stMeasure = fillMeasureSelect('stMeasure', 'formal'); stMeasure.onchange = () => { st.measure = stMeasure.value; renderStates(); };
  document.getElementById('stMode').onclick = e => { const b = e.target.closest('button'); if (!b) return; st.mode = b.dataset.mode; [...e.currentTarget.children].forEach(x => x.classList.toggle('on', x === b)); renderMap(); };
  const stYear = document.getElementById('stYear'); stYear.oninput = () => { st.yi = +stYear.value; renderMap(); };
  document.getElementById('stPlay').onclick = e => { if (st.timer) { clearInterval(st.timer); st.timer = null; e.target.textContent = '▶ Play'; return; } st.yi = -1; e.target.textContent = '⏸ Pause'; const step = () => { st.yi = (st.yi + 1) % 4; stYear.value = st.yi; renderMap(); if (st.yi === 3) { clearInterval(st.timer); st.timer = null; e.target.textContent = '▶ Play'; } }; step(); st.timer = setInterval(step, 1100); };
  const grid = document.getElementById('tilemap'); grid.innerHTML = Object.keys(GRID).map(s => `<div class="t" data-s="${s}" style="grid-column:${GRID[s][0] + 1};grid-row:${GRID[s][1] + 1}">${s}</div>`).join('');
  grid.onclick = e => { const el = e.target.closest('.t'); if (!el) return; const s = el.dataset.s; const i = st.cmp.indexOf(s); if (i >= 0) st.cmp.splice(i, 1); else if (st.cmp.length < 8) st.cmp.push(s); renderStates(); };
  const hexToRgb = h => { h = h.replace('#', ''); if (h.length === 3) h = h.split('').map(c => c + c).join(''); const n = parseInt(h, 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; };
  const mix = (c1, c2, u) => { const a = hexToRgb(c1), b = hexToRgb(c2); return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * u)).join(',')})`; };
  function stVal(s, yi = st.yi) { const r = D.states[s].rates[st.measure], y = YEARS[yi]; if (st.mode === 'level') return r[y] ?? null; const b = st.mode === 'change' ? first(st.measure) : 2019; return r[y] != null && r[b] != null ? r[y] - r[b] : null; }
  function renderMap() {
    const t = T(); document.getElementById('stYearLbl').textContent = YEARS[st.yi];
    /* fixed color scale across all years so the animation is comparable */
    const allv = Object.keys(GRID).flatMap(s => [0, 1, 2, 3].map(yi => stVal(s, yi))).filter(v => v != null); const lo = Math.min(...allv), hi = Math.max(...allv); let color, legend;
    if (st.mode === 'level') { color = v => mix('#d4ecf0', '#083e49', (v - lo) / (hi - lo || 1)); legend = `<span>${pct(lo)}</span><div class="bar" style="background:linear-gradient(90deg,#d4ecf0,#083e49)"></div><span>${pct(hi)}</span>`; }
    else { const m = Math.max(Math.abs(lo), Math.abs(hi)); color = v => v < 0 ? mix('#e6e6e6', t.neg, Math.min(1, -v / m)) : mix('#e6e6e6', t.pos, Math.min(1, v / m)); legend = `<span>${pts(-m)} pts</span><div class="bar" style="background:linear-gradient(90deg,${t.neg},#e6e6e6,${t.pos})"></div><span>${pts(m)} pts</span>`; }
    grid.querySelectorAll('.t').forEach(el => { const v = stVal(el.dataset.s); el.style.background = v == null ? css('--surface-2') : color(v); el.style.color = v == null ? t.muted : '#fff'; el.classList.toggle('sel', st.cmp.includes(el.dataset.s)); el.title = `${D.states[el.dataset.s].name}: ${v == null ? 'n/a' : st.mode === 'level' ? pct(v) : pts(v) + ' pts'}`; });
    document.getElementById('mapLegend').innerHTML = legend + `<span class="muted">· ${M[st.measure].short}, ${st.mode === 'level' ? YEARS[st.yi] : YEARS[st.yi] + ' vs ' + (st.mode === 'change' ? first(st.measure) : 2019)}</span>`;
    { const k = st.measure, y = YEARS[st.yi], S = Object.keys(D.states).map(s => ({ s, n: D.states[s].name, v: D.states[s].rates[k][y], d19: D.states[s].rates[k][2023] != null && D.states[s].rates[k][2019] != null ? D.states[s].rates[k][2023] - D.states[s].rates[k][2019] : null })).filter(x => x.v != null).sort((a, b) => b.v - a.v);
      const back = S.filter(x => x.d19 != null && x.d19 >= 0).length, behind = S.filter(x => x.d19 != null && x.d19 <= -0.05).length; const cmp = st.cmp.map(s => `${D.states[s].name} ${P(D.states[s].rates[k][2023])}`).join(', ');
      say('exStates', `<ul><li><b>${y}:</b> highest is <b>${S[0].n}</b> (${P(S[0].v)}), lowest is <b>${S[S.length - 1].n}</b> (${P(S[S.length - 1].v)}). All Americans: ${P(nat(k, y))}.</li>
      <li><b>${back} states</b> are back to their 2019 (pre-pandemic) level; <b>${behind}</b> are still more than 5 points below it.</li>
      ${cmp ? `<li>Comparing: ${cmp} (2023).</li>` : ''}</ul>`); }
  }
  let stRender; const stSort = { k: 'y2023', dir: 'desc' };
  function renderStates() {
    renderMap(); const pal = PAL(), t = T(), k = st.measure;
    document.getElementById('cmpList').innerHTML = `<span class="muted">Comparing:</span> ` + st.cmp.map((s, i) => `<span class="c" data-s="${s}" style="background:${pal[i % pal.length]}" title="remove">${s} ✕</span>`).join('') + (st.cmp.length ? '' : '<span class="muted">click states on the map</span>');
    document.getElementById('cmpList').onclick = e => { const c = e.target.closest('.c'); if (!c) return; st.cmp.splice(st.cmp.indexOf(c.dataset.s), 1); renderStates(); };
    mk('chStates', { type: 'line', data: { labels: YEARS, datasets: [...st.cmp.map((s, i) => ({ label: D.states[s].name, data: YEARS.map(y => D.states[s].rates[k][y] ?? null), borderColor: pal[i % pal.length], backgroundColor: pal[i % pal.length], tension: .25, pointRadius: 4, borderWidth: 2.5, spanGaps: true })), { label: 'U.S.', data: YEARS.map(y => nat(k, y)), borderColor: t.text, borderDash: [5, 4], pointRadius: 0, borderWidth: 2 }] }, options: base({ scales: { y: pctAxis(undefined, undefined), x: { grid: { display: false } } }, plugins: { legend: { position: 'bottom', labels: { boxWidth: 6, font: { size: 10 } } }, tooltip: tipPct } }) });
    const tp = D.toplines.states; const rows = Object.keys(D.states).map(s => { const r = D.states[s].rates[k]; return { s, name: D.states[s].name, y2017: r[2017], y2019: r[2019], y2021: r[2021], y2023: r[2023], d: r[2023] != null && r[first(k)] != null ? r[2023] - r[first(k)] : null, d19: r[2023] != null && r[2019] != null ? r[2023] - r[2019] : null, vol: tp[s]?.volunteers, hrs: tp[s]?.hours, val: tp[s]?.value, rate: tp[s]?.valuePerHour }; });
    const all = rows.flatMap(r => [r.y2017, r.y2019, r.y2021, r.y2023]).filter(v => v != null); const lo = Math.min(...all), hi = Math.max(...all); const dd = rows.map(r => r.d).filter(v => v != null), dd19 = rows.map(r => r.d19).filter(v => v != null);
    const cols = [{ k: 'name', label: 'State' }, ...YEARS.map(y => ({ k: 'y' + y, label: String(y), num: true, cls: 'h', fmt: v => heat(v, lo, hi) })), { k: 'd', label: `Δ ${first(k)}→23`, num: true, cls: 'h', fmt: v => heat(v, Math.min(...dd), Math.max(...dd), true) }, { k: 'd19', label: 'Δ 19→23', num: true, cls: 'h', fmt: v => heat(v, Math.min(...dd19), Math.max(...dd19), true) }, { k: 'vol', label: 'Volunteers 2023', num: true, fmt: v => v == null ? '–' : (v / 1e6).toFixed(2) + 'M' }, { k: 'hrs', label: 'Hours 2023', num: true, fmt: v => v == null ? '–' : (v / 1e6).toFixed(0) + 'M' }, { k: 'rate', label: '$/hour', num: true, fmt: v => v == null ? '–' : '$' + v.toFixed(2) }, { k: 'val', label: 'Value 2023', num: true, fmt: v => v == null ? '–' : '$' + (v / 1e9).toFixed(2) + 'B' }];
    const q = (document.getElementById('stSearch')?.value || '').toLowerCase(); stRender = sortable(document.getElementById('stTable'), rows.filter(r => !q || r.name.toLowerCase().includes(q) || r.s.toLowerCase() === q), cols, stSort);
    const ms = D.toplines.metros.map(m => ({ ...m })); const mlo = Math.min(...ms.map(m => m.formal)), mhi = Math.max(...ms.map(m => m.formal));
    sortable(document.getElementById('metroTable'), ms, [{ k: 'name', label: 'Metro area' }, { k: 'formal', label: 'Formal volunteering', num: true, cls: 'h', fmt: v => heat(v, mlo, mhi) }, { k: 'informal', label: 'Informal helping', num: true, fmt: v => pct(v) }, { k: 'member', label: 'Org. membership', num: true, fmt: v => pct(v) }, { k: 'giving', label: 'Charitable giving', num: true, fmt: v => pct(v) }, { k: 'volunteers', label: 'Volunteers', num: true, fmt: v => (v / 1e6).toFixed(2) + 'M' }, { k: 'hours', label: 'Hours', num: true, fmt: v => (v / 1e6).toFixed(0) + 'M' }, { k: 'value', label: 'Value', num: true, fmt: v => '$' + (v / 1e9).toFixed(2) + 'B' }], { k: 'formal', dir: 'desc' });
  }
  const stS = document.getElementById('stSearch'); if (stS) stS.oninput = renderStates;

  /* ================= LONG RUN ================= */
  function renderLong() {
    const t = T(); const labels = []; for (let y = 2003; y <= 2023; y++) labels.push(y); const hist = Object.fromEntries(D.historical.map(h => [h.year, h]));
    mk('chLong', { type: 'line', data: { labels, datasets: [{ label: 'CPS Volunteer Supplement (BLS) 2003–2015', data: labels.map(y => hist[y]?.rate ?? null), borderColor: t.neutral, backgroundColor: t.neutral, pointRadius: 3, borderWidth: 2, tension: .25 }, { label: 'redesign gap', data: labels.map(y => y === 2015 ? hist[2015].rate : y === 2017 ? nat('formal', 2017) : null), borderColor: t.neutral, borderDash: [4, 5], pointRadius: 0, spanGaps: true, borderWidth: 1.5 }, { label: 'CEV (AmeriCorps/Census) 2017–2023', data: labels.map(y => D.national.formal[y] ?? null), borderColor: t.accent, backgroundColor: t.accent, pointRadius: 6, borderWidth: 3.5, spanGaps: true, tension: .25 }] }, options: base({ scales: { y: pctAxis(0.2, 0.32), x: { grid: { display: false } } }, plugins: { legend: { position: 'bottom', labels: { filter: l => l.text !== 'redesign gap' } }, tooltip: { callbacks: { label: c => c.raw == null ? null : ` ${pct(c.raw)}` } } } }) });
    const cnt = { ...Object.fromEntries(D.historical.map(h => [h.year, h.volunteers])), 2019: D.economic[2019].volunteers, 2023: D.economic[2023].volunteers };
    mk('chCount', { type: 'bar', data: { labels, datasets: [{ label: 'Volunteers (millions)', data: labels.map(y => cnt[y] ? cnt[y] / 1e6 : null), backgroundColor: labels.map(y => y >= 2017 ? t.accent : t.neutral), borderRadius: 3 }] }, options: base({ scales: { y: { grid: { color: css('--line') }, title: { display: true, text: 'millions' } }, x: { grid: { display: false } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => c.raw == null ? null : ` ${c.raw.toFixed(1)} million` } } } }) });
    const ys = Object.keys(D.valueOfHour).map(Number).sort();
    mk('chHour', { type: 'line', data: { labels: ys, datasets: [{ label: '$ per hour', data: ys.map(y => D.valueOfHour[y]), borderColor: t.accent, backgroundColor: 'rgba(11,110,127,.12)', fill: true, tension: .3, borderWidth: 2.5, pointRadius: ys.map(y => YEARS.includes(y) ? 6 : 2), pointBackgroundColor: ys.map(y => YEARS.includes(y) ? t.accent2 : t.accent) }] }, options: base({ scales: { y: { ticks: { callback: v => '$' + v }, grid: { color: css('--line') } }, x: { grid: { display: false }, ticks: { maxTicksLimit: 9 } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` $${c.raw.toFixed(2)}` } } } }) });
    mk('chHoursValue', { type: 'bar', data: { labels: ['2019', '2023'], datasets: [{ label: 'Hours (billions)', data: [D.economic[2019].hours / 1e9, D.economic[2023].hours / 1e9], backgroundColor: t.neutral, yAxisID: 'y', borderRadius: 3 }, { label: 'Economic value ($ billions)', data: [D.economic[2019].value / 1e9, D.economic[2023].value / 1e9], backgroundColor: t.accent2, yAxisID: 'y2', borderRadius: 3 }] }, options: base({ scales: { y: { position: 'left', title: { display: true, text: 'billion hours' }, grid: { color: css('--line') }, min: 0 }, y2: { position: 'right', title: { display: true, text: '$ billions' }, grid: { display: false }, min: 0 }, x: { grid: { display: false } } }, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${c.raw.toFixed(2)}` } }, barLabels: { fmt: (v, i) => i === 0 ? v.toFixed(2) + 'B hrs' : '$' + v.toFixed(0) + 'B', horizontal: false } } }), plugins: [barLabels] });
    { const f = D.national.formal; say('exLong', `<ul><li><b>Roughly 1 in 4 Americans</b> has volunteered each year for 20 years. The pandemic year 2021 (${P(f[2021])}) was the lowest ever; 2023 (${P(f[2023])}) was the fastest comeback ever.</li>
      <li><b>Each volunteer gives less time:</b> the typical volunteer gave 52 hours a year in 2002, 40 in 2017, 24 in 2023.</li>
      <li><b>Each hour is worth more:</b> $${D.valueOfHour[2019].toFixed(2)} in 2019, $${D.valueOfHour[2023].toFixed(2)} in 2023. So fewer hours (5.8 → 4.99 billion) still added up to more value ($147 → $167 billion).</li></ul>`); }
    const hv = D.hoursPerVolunteer, hy = Object.keys(hv).map(Number).sort();
    mk('chHoursPer', { type: 'bar', data: { labels: hy, datasets: [{ label: 'Mean hours per volunteer', data: hy.map(y => hv[y].mean ?? null), backgroundColor: t.accent, borderRadius: 3 }, { label: 'Median hours per volunteer', data: hy.map(y => hv[y].median ?? null), backgroundColor: t.accent2, borderRadius: 3 }] }, options: base({ scales: { y: { grid: { color: css('--line') }, title: { display: true, text: 'hours per year' }, min: 0 }, x: { grid: { display: false } } }, plugins: { legend: { position: 'bottom' }, tooltip: { callbacks: { label: c => c.raw == null ? null : ` ${c.dataset.label}: ${c.raw}` } }, barLabels: { fmt: v => v, horizontal: false } } }), plugins: [barLabels] });
    const yrs = []; for (let y = 2001; y <= 2025; y++) yrs.push(y);
    document.getElementById('longTable').innerHTML = `<thead><tr><th>Year</th><th class="num">Volunteer rate</th><th class="num">Volunteers</th><th class="num">Hours</th><th class="num">$ per hour</th><th class="num">Economic value</th><th>Series</th></tr></thead><tbody>${yrs.map(y => { const h = hist[y]; const c = D.national.formal[y]; const e = D.economic[y]; const r = h ? h.rate : c; const v = h ? h.volunteers : e?.volunteers;
      return `<tr><td>${y}</td><td class="num">${r == null ? '–' : pct(r)}</td><td class="num">${v ? (v / 1e6).toFixed(1) + 'M' : '–'}</td><td class="num">${e ? (e.hours / 1e9).toFixed(2) + 'B' : '–'}</td><td class="num">${D.valueOfHour[y] ? '$' + D.valueOfHour[y].toFixed(2) : '–'}</td><td class="num">${e ? '$' + (e.value / 1e9).toFixed(1) + 'B' : '–'}</td><td class="muted small">${h ? 'BLS CPS Volunteer Supplement' : c != null ? 'AmeriCorps CEV' : y === 2016 || y === 2018 || y === 2020 || y === 2022 || y > 2023 ? 'no survey' : ''}</td></tr>`; }).join('')}</tbody>`;
  }

  /* ================= CORPORATE ================= */
  function renderCorp() {
    const t = T(), c = D.cecp;
    const rows = [['Offer matching gifts', c.matchingOffered, 'offer'], ['Offer virtual volunteering', c.virtualOffered, 'offer'], ['Offer pro bono service', c.proBonoOffered, 'offer'], ['Avg. employee volunteer participation', c.volunteerParticipation, 'part'], ['   companies < 10,000 employees', c.volunteerParticipationSmall, 'part'], ['   companies > 100,000 employees', c.volunteerParticipationLarge, 'part'], ['Flexible-scheduling program participation', c.flexSchedulingParticipation, 'part'], ['Avg. matching-gift participation', c.matchingParticipation, 'part'], ['   technology companies', c.matchingParticipationTech, 'part'], ['CEV: workers encouraged by employer, 2023', nat('employer', 2023), 'cev'], ['CEV: workers encouraged by employer, 2021', nat('employer', 2021), 'cev']];
    mk('chCecp', { type: 'bar', data: { labels: rows.map(r => r[0]), datasets: [{ label: 'share', data: rows.map(r => r[1]), backgroundColor: rows.map(r => ({ offer: t.accent3, part: t.accent, cev: t.accent2 })[r[2]]), borderRadius: 3 }] }, options: base({ indexAxis: 'y', scales: { x: pctAxis(0, 1), y: { grid: { display: false }, ticks: { autoSkip: false, font: { size: 11 } } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c2 => ' ' + pct(c2.raw, 0) } }, barLabels: { fmt: v => pct(v, 0), horizontal: true } } }), plugins: [barLabels] });
    say('exCorp', `<ul><li><b>Most big companies offer programs</b> (${P0(c.matchingOffered)} match donations, ${P0(c.virtualOffered)} offer online volunteering), but only about <b>${P0(c.volunteerParticipation)} of employees</b> take part in a year.</li>
      <li><b>${P(nat('employer', 2023))} of workers</b> said their employer asked them to volunteer or give in 2023, up from ${P(nat('employer', 2021))}. Higher-income workers are asked about twice as often as lower-income workers.</li></ul>`);
    const groups = D.demographics.filter(d => d.category === 'Generation' || d.category === 'Family income'); const SH = { 'Baby Boomers': 'Boomers', 'Silent Generation or older': 'Silent+', '$24,999 or less': '<$25k', '$25,000 to $39,999': '$25–40k', '$40,000 to $59,999': '$40–60k', '$60,000 to $74,999': '$60–75k', '$75,000 to $99,999': '$75–100k', '$100,000 to $149,999': '$100–150k', '$150,000 or more': '$150k+' };
    mk('chEmp', { type: 'bar', data: { labels: groups.map(g => SH[g.group] || g.group), datasets: [{ label: '2021', data: groups.map(g => g.rates.employer[2021]), backgroundColor: t.neutral, borderRadius: 3 }, { label: '2023', data: groups.map(g => g.rates.employer[2023]), backgroundColor: t.accent2, borderRadius: 3 }] }, options: base({ scales: { y: pctAxis(0, 0.6), x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 40, font: { size: 10 } } } }, plugins: { legend: { position: 'bottom' }, tooltip: tipPct } }) });
    const tb = [['Median Total Community Investment per company', '$21.5 million'], ['TCI as % of pre-tax profit (median / top quartile)', '0.78% / 1.6% (field standard 1%)'], ['TCI as % of revenue (median / top quartile)', '0.10% / 0.21%'], ['Companies offering matching gifts', '93% (median $1.6M; avg participation 21%)'], ['Average employee volunteer participation', '25% (31% at <10k staff, 16% at >100k staff)'], ['Median volunteer hours per company / per employee', '47,000 / 1.8'], ['Most common volunteer programs offered', 'Virtual volunteering 82%, pro bono 66%, extended campaigns 46%'], ['Change 2022→2024', 'Participation +12 pts; median hours +49%; median matching value −9%'], ['Sectors where more companies raised giving than cut it', 'Technology and Consumer Staples only']];
    document.getElementById('cecpTable').innerHTML = `<thead><tr><th>CECP benchmark (2024 data)</th><th>Value</th></tr></thead><tbody>${tb.map(r => `<tr><td>${r[0]}</td><td>${r[1]}</td></tr>`).join('')}</tbody>`;
  }

  /* ================= TABS / THEME ================= */
  const rendered = {}; const RENDER = { overview: renderOverview, trends: renderTrends, demo: renderDemo, states: renderStates, long: renderLong, corp: renderCorp };
  function showView(v) { document.querySelectorAll('.view').forEach(s => s.classList.toggle('on', s.id === 'v-' + v)); document.querySelectorAll('#tabs button').forEach(b => b.classList.toggle('on', b.dataset.v === v)); if (!rendered[v]) { RENDER[v](); rendered[v] = true; } history.replaceState(null, '', '#' + v); window.scrollTo({ top: 0 }); }
  document.getElementById('tabs').onclick = e => { const b = e.target.closest('button'); if (b) showView(b.dataset.v); };
  function rerenderAll() { Object.keys(rendered).forEach(v => RENDER[v]()); }
  document.getElementById('themeBtn').onclick = () => { const dark = document.documentElement.getAttribute('data-theme') ? document.documentElement.getAttribute('data-theme') === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches; document.documentElement.setAttribute('data-theme', dark ? 'light' : 'dark'); try { localStorage.setItem('theme', dark ? 'light' : 'dark'); } catch (e) {} rerenderAll(); };
  try { const t = localStorage.getItem('theme'); if (t) document.documentElement.setAttribute('data-theme', t); } catch (e) {}
  document.addEventListener('keydown', e => { if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return; const vs = Object.keys(RENDER), cur = vs.findIndex(v => document.getElementById('v-' + v).classList.contains('on')); if (e.key === 'ArrowRight' && vs[cur + 1]) showView(vs[cur + 1]); if (e.key === 'ArrowLeft' && vs[cur - 1]) showView(vs[cur - 1]); });
  const h = location.hash.replace('#', ''); showView(RENDER[h] ? h : 'overview');
})();
