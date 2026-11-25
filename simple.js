/* Simple Q&A page: one chart per question, plain-English answers generated from the data. */
(function () {
  'use strict';
  const D = window.CEV, YEARS = D.years;
  const SHORT = { formal: 'Volunteer through an organization', member: 'Belong to a group or organization', giving: 'Give $25+ to charity', informal: 'Help neighbors directly', talkFF: 'Spend time with friends & family', talkNb: 'Talk with neighbors', news: 'Follow news about issues', discussFF: 'Discuss issues with friends & family', discussNb: 'Discuss issues with neighbors', post: 'Post views online', vote: 'Vote in local elections', contact: 'Contact a public official', polDonate: 'Donate to a political cause', meetings: 'Attend a public meeting', action: 'Work with neighbors to fix something', buycott: 'Buy or boycott based on company values', employer: 'Employer encourages volunteering' };
  // Fallback type tags if an older cev-data.js is loaded without `type`.
  const TYPE_FALLBACK = { formal: 'formal', member: 'formal', giving: 'formal', informal: 'informal', talkNb: 'informal', discussNb: 'informal', action: 'informal' };
  D.measures.forEach(m => { m.short = SHORT[m.key] || m.label; m.type = m.type || TYPE_FALLBACK[m.key] || 'other'; });
  const M = Object.fromEntries(D.measures.map(m => [m.key, m]));
  const BLUE = '#0b6e7f', GREY = '#aab3bf', GREEN = '#1f8a5b', RED = '#c6413a', ORANGE = '#e8842b', TEXT = '#15202b', LINE = '#e6e9ee', MUTED = '#6b7684';
  const TYPE_COLOR = { formal: BLUE, informal: ORANGE, other: GREY };
  const TYPE_LABEL = { formal: 'Formal (through an organization)', informal: 'Informal (helping neighbors)', other: 'Other civic' };
  const P = (v, d = 1) => v == null ? '–' : (v * 100).toFixed(d) + '%';
  const P0 = v => Math.round(v * 100) + '%';
  const PT = v => Math.abs(v * 100).toFixed(1) + ' points';
  const nat = (k, y) => D.national[k][y];
  const say = (id, html) => document.getElementById(id).innerHTML = html;
  const byType = (t) => D.measures.filter(m => m.key !== 'employer' && (t === 'all' || m.type === t));
  Chart.defaults.font.family = getComputedStyle(document.documentElement).getPropertyValue('--font') || 'system-ui';
  Chart.defaults.font.size = 13; Chart.defaults.color = MUTED; Chart.defaults.borderColor = LINE;
  const charts = {};
  const mk = (id, cfg) => { if (charts[id]) charts[id].destroy(); charts[id] = new Chart(document.getElementById(id).getContext('2d'), cfg); };
  const base = (o) => Object.assign({ responsive: true, maintainAspectRatio: false, interaction: { mode: 'index', intersect: false }, plugins: { legend: { display: false }, tooltip: { backgroundColor: '#fff', titleColor: TEXT, bodyColor: TEXT, borderColor: LINE, borderWidth: 1 } } }, o);
  const pctAxis = (min, max) => ({ min, max, ticks: { callback: v => Math.round(v * 100) + '%' }, grid: { color: LINE } });
  const labels = { id: 'labels', afterDatasetsDraw(ch, _a, o) { const { ctx } = ch; ctx.save(); ctx.font = '700 12px ' + Chart.defaults.font.family; ctx.fillStyle = TEXT; ctx.textBaseline = 'middle';
    ch.data.datasets.forEach((ds, i) => { if (!ch.isDatasetVisible(i) || (o.only != null && i !== o.only)) return; ch.getDatasetMeta(i).data.forEach((b, j) => { const v = ds.data[j]; if (v == null) return; const s = o.fmt(v);
      if (o.horizontal) { ctx.textAlign = v >= 0 ? 'left' : 'right'; ctx.fillText(s, b.x + (v >= 0 ? 6 : -6), b.y); } else { ctx.textAlign = 'center'; ctx.fillText(s, b.x, b.y - 10); } }); }); ctx.restore(); } };

  /* 1. Formal vs informal */
  { const f = D.national.formal, i = D.national.informal, h = Object.fromEntries(D.historical.map(x => [x.year, x.rate])); const ys = []; for (let y = 2003; y <= 2023; y++) ys.push(y);
    say('a1', `<b>Informal helping is nearly twice as common as formal volunteering.</b> In 2023, ${P(i[2023])} of Americans (about 137.5 million) helped a neighbor directly — a record — while ${P(f[2023])} (75.8 million) volunteered through an organization. Formal volunteering bounced back +${PT(f[2023] - f[2021])} from the 2021 pandemic low; informal helping barely dipped and then climbed.`);
    say('big1', `<div><b>${P(f[2023])}</b><span>formal volunteering in 2023</span></div><div><b>${P(i[2023])}</b><span>informal helping in 2023</span></div><div><b>~2×</b><span>more informal helpers than formal volunteers</span></div>`);
    mk('c1', { type: 'line', data: { labels: ys, datasets: [
      { label: 'Formal (older BLS series)', data: ys.map(y => h[y] ?? null), borderColor: GREY, backgroundColor: GREY, pointRadius: 2, borderWidth: 1.5, tension: .25 },
      { label: 'redesign gap', data: ys.map(y => y === 2015 ? h[2015] : y === 2017 ? f[2017] : null), borderColor: GREY, borderDash: [4, 5], pointRadius: 0, spanGaps: true, borderWidth: 1.5 },
      { label: 'Formal volunteering', data: ys.map(y => f[y] ?? null), borderColor: BLUE, backgroundColor: BLUE, pointRadius: 6, borderWidth: 3.5, spanGaps: true, tension: .25 },
      { label: 'Informal helping', data: ys.map(y => i[y] ?? null), borderColor: ORANGE, backgroundColor: ORANGE, pointRadius: 6, borderWidth: 3.5, spanGaps: true, tension: .25 } ] },
      options: base({ scales: { y: { min: 0.2, max: 0.6, ticks: { stepSize: 0.05, callback: v => Math.round(v * 100) + '%' }, grid: { color: LINE } }, x: { grid: { display: false } } }, plugins: { legend: { display: true, position: 'top', labels: { filter: l => l.text !== 'redesign gap' && l.text !== 'Formal (older BLS series)' } }, tooltip: { callbacks: { title: items => items[0].label, label: c => c.raw == null ? null : ` ${c.dataset.label}: ${P(c.raw)}` } } } }) }); }

  /* 2. What else — filterable by type */
  { const sel = document.getElementById('s2');
    const draw = () => {
      const rows = byType(sel.value).map(m => ({ m, v: nat(m.key, 2023) })).sort((a, b) => b.v - a.v);
      say('a2', `<b>Formal behaviors go through organizations; informal ones happen between neighbors.</b> In 2023 the three formal measures (volunteering, membership, giving $25+) sit below informal helping (${P0(nat('informal', 2023))}). Formal volunteering is ${P0(nat('formal', 2023))}. Political activities stay the rarest, under 10%.`);
      mk('c2', { type: 'bar', data: { labels: rows.map(r => r.m.short), datasets: [{ data: rows.map(r => r.v), backgroundColor: rows.map(r => TYPE_COLOR[r.m.type]), borderRadius: 4 }] },
        options: base({ indexAxis: 'y', scales: { x: pctAxis(0, 1), y: { grid: { display: false }, ticks: { autoSkip: false, color: TEXT } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${TYPE_LABEL[rows[c.dataIndex].m.type]}: ${P(c.raw)}` } }, labels: { fmt: v => P0(v), horizontal: true } } }), plugins: [labels] });
    };
    sel.onchange = draw; draw(); }

  /* 3. What changed — filterable by type */
  { const sel = document.getElementById('s3');
    const draw = () => {
      const rows = byType(sel.value).map(m => ({ m, d: nat(m.key, 2023) - nat(m.key, 2017) })).sort((a, b) => b.d - a.d);
      const up = rows.filter(r => r.d > 0), down = rows.filter(r => r.d < 0);
      const iUp = nat('informal', 2023) - nat('informal', 2017), fDn = nat('formal', 2023) - nat('formal', 2017);
      say('a3', `<b>Informal helping rose; formal volunteering is still below 2017.</b> Across the list, ${up.length} behaviors rose and ${down.length} fell. Informal helping is up ${PT(iUp)} (a record ${P(nat('informal', 2023))}). Formal volunteering is down ${PT(fDn)} since 2017 because it has not fully recovered from 2021.`);
      mk('c3', { type: 'bar', data: { labels: rows.map(r => r.m.short), datasets: [{ data: rows.map(r => r.d), backgroundColor: rows.map(r => r.d >= 0 ? GREEN : RED), borderRadius: 4 }] },
        options: base({ indexAxis: 'y', scales: { x: { min: Math.floor((rows[rows.length - 1].d * 100 - 1.5)) / 100, max: Math.ceil((rows[0].d * 100 + 1.5)) / 100, ticks: { callback: v => (v > 0 ? '+' : '') + Math.round(v * 100) }, grid: { color: LINE }, title: { display: true, text: 'percentage points, 2017 → 2023' } }, y: { grid: { display: false }, ticks: { autoSkip: false, color: TEXT } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${TYPE_LABEL[rows[c.dataIndex].m.type]} · ${P(nat(rows[c.dataIndex].m.key, 2017))} → ${P(nat(rows[c.dataIndex].m.key, 2023))}` } }, labels: { fmt: v => (v > 0 ? '+' : '−') + Math.abs(v * 100).toFixed(1), horizontal: true } } }), plugins: [labels] });
    };
    sel.onchange = draw; draw(); }

  /* 4. Who — formal or informal */
  { const CATS = [...new Set(D.demographics.map(d => d.category))]; const sel = document.getElementById('s4'); const typ = document.getElementById('t4');
    sel.innerHTML = CATS.map(c => `<option>${c}</option>`).join(''); sel.value = 'Family income';
    const SH = { 'Silent Generation or older': 'Silent Gen+', '$24,999 or less': 'Under $25k', '$25,000 to $39,999': '$25–40k', '$40,000 to $59,999': '$40–60k', '$60,000 to $74,999': '$60–75k', '$75,000 to $99,999': '$75–100k', '$100,000 to $149,999': '$100–150k', '$150,000 or more': '$150k+', 'Some college, no degree': 'Some college', 'Associate degree, academic': 'Associate (academic)', 'Associate degree, occupational': 'Associate (occupational)', 'American Indian or Alaskan Native': 'American Indian / Alaska Native', 'Native Hawaiian or Pacific Islander': 'Native Hawaiian / Pacific Islander', 'Parent of child under 18': 'Parent of child under 18', 'No child in household': 'No child at home' };
    const HINT = {
      formal: { 'Family income': 'The more a household earns, the more likely its members formally volunteer: the gap between the lowest and highest income groups is about two and a half times.', 'Education': 'Education is the strongest predictor of formal volunteering: people with a graduate degree volunteer at almost three times the rate of high-school graduates.', 'Generation': 'Gen X formally volunteers most. Millennials are the only generation now above their 2017 level.', 'Age': 'Teenagers (16–17) formally volunteer the most; the rate drops sharply at 18–24 and is lowest after 85.', 'Sex': 'Women formally volunteer more than men, in every survey year.', 'Race': 'Formal rates vary by race; Asian and Native Hawaiian/Pacific Islander Americans had the fastest growth since 2021.', 'Ethnicity': 'Hispanic Americans formally volunteer at roughly half the rate of non-Hispanic Americans, though their rate grew fast after 2021.', 'Child in household': 'Parents of children under 18 formally volunteer much more than people without children at home, often through schools and youth activities.', 'Military service': 'Veterans and non-veterans formally volunteer at similar rates.' },
      informal: { 'Family income': 'Informal helping rises with income too, but the gap is smaller than for formal volunteering — neighbors help across income levels.', 'Education': 'More education means more informal helping, though the spread is narrower than for formal volunteering.', 'Generation': 'Gen X and Boomers help neighbors most; younger adults help less often but still more than they formally volunteer.', 'Age': 'Informal helping peaks in midlife, when people are most settled in a neighborhood.', 'Sex': 'Women help neighbors slightly more than men.', 'Race': 'Informal helping is more even across racial groups than formal volunteering.', 'Ethnicity': 'Hispanic and non-Hispanic Americans both help neighbors at high rates; the ethnicity gap is smaller than for formal volunteering.', 'Child in household': 'Parents and non-parents both help neighbors often; having kids at home lifts informal helping less than formal volunteering.', 'Military service': 'Veterans and non-veterans help neighbors at similar rates.' }
    };
    const draw = () => {
      const key = typ.value, cat = sel.value, rows = D.demographics.filter(d => d.category === cat);
      const hi = rows.slice().sort((a, b) => b.rates[key][2023] - a.rates[key][2023]);
      const color = TYPE_COLOR[key];
      say('a4', `<b>${HINT[key][cat] || ''}</b> In 2023, the highest group was ${hi[0].group} (${P(hi[0].rates[key][2023])}) and the lowest was ${hi[hi.length - 1].group} (${P(hi[hi.length - 1].rates[key][2023])}). All Americans: ${P(nat(key, 2023))}.`);
      mk('c4', { type: 'bar', data: { labels: rows.map(r => SH[r.group] || r.group), datasets: [{ label: '2017', data: rows.map(r => r.rates[key][2017]), backgroundColor: GREY, borderRadius: 4 }, { label: '2023', data: rows.map(r => r.rates[key][2023]), backgroundColor: color, borderRadius: 4 }] },
        options: base({ scales: { y: pctAxis(0, undefined), x: { grid: { display: false }, ticks: { autoSkip: false, maxRotation: 35, color: TEXT, font: { size: 12 } } } }, plugins: { legend: { display: true, position: 'top' }, tooltip: { callbacks: { label: c => ` ${c.dataset.label}: ${P(c.raw)}` } }, labels: { fmt: v => P0(v), horizontal: false, only: 1 } } }), plugins: [labels] });
    };
    sel.onchange = draw; typ.onchange = draw; draw(); }

  /* 5. Bounce back — still formal (pandemic story is about org volunteering) */
  { const all = D.demographics.map(d => ({ g: d.group, cat: d.category, a: d.rates.formal[2021], b: d.rates.formal[2023] })).filter(r => r.a && r.b).map(r => ({ ...r, rel: r.b / r.a - 1 })).sort((x, y) => y.rel - x.rel);
    const show = [...all.slice(0, 10), ...all.slice(-3)]; const us = nat('formal', 2023) / nat('formal', 2021) - 1;
    say('a5', `<b>The groups that formally volunteered least in 2021 grew fastest.</b> Nationally formal volunteering grew ${Math.round(us * 100)}% between 2021 and 2023. Asian Americans (+${Math.round(all[0].rel * 100)}%), Native Hawaiian and Pacific Islander Americans, Hispanic Americans, Millennials, people without a high-school diploma and households under $25,000 all grew faster than that. The highest-income and most-educated groups grew the least. Informal helping never crashed the same way.`);
    mk('c5', { type: 'bar', data: { labels: show.map(r => (r.cat === 'Age' ? 'Age ' : '') + r.g), datasets: [{ data: show.map(r => r.rel), backgroundColor: show.map(r => r.rel >= us ? BLUE : GREY), borderRadius: 4 }] },
      options: base({ indexAxis: 'y', scales: { x: { ticks: { callback: v => '+' + Math.round(v * 100) + '%' }, grid: { color: LINE }, title: { display: true, text: `growth in formal volunteering rate, 2021 → 2023 (all Americans: +${Math.round(us * 100)}%)` } }, y: { grid: { display: false }, ticks: { autoSkip: false, color: TEXT } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${show[c.dataIndex].cat}: ${P(show[c.dataIndex].a)} → ${P(show[c.dataIndex].b)}` } }, labels: { fmt: v => '+' + Math.round(v * 100) + '%', horizontal: true } } }), plugins: [labels] }); }

  /* 6. States — formal or informal */
  { const GRID = { AK: [0, 0], ME: [10, 0], WA: [0, 1], ID: [1, 1], MT: [2, 1], ND: [3, 1], MN: [4, 1], WI: [5, 1], MI: [6, 1], NY: [8, 1], VT: [9, 1], NH: [10, 1], OR: [0, 2], NV: [1, 2], WY: [2, 2], SD: [3, 2], IA: [4, 2], IL: [5, 2], IN: [6, 2], OH: [7, 2], PA: [8, 2], NJ: [9, 2], MA: [10, 2], CA: [0, 3], UT: [1, 3], CO: [2, 3], NE: [3, 3], MO: [4, 3], KY: [5, 3], WV: [6, 3], VA: [7, 3], MD: [8, 3], DE: [9, 3], CT: [10, 3], AZ: [1, 4], NM: [2, 4], KS: [3, 4], AR: [4, 4], TN: [5, 4], NC: [6, 4], SC: [7, 4], DC: [8, 4], RI: [10, 4], OK: [3, 5], LA: [4, 5], MS: [5, 5], AL: [6, 5], GA: [7, 5], HI: [0, 6], TX: [3, 6], FL: [7, 6] };
    const grid = document.getElementById('tilemap'); grid.innerHTML = Object.keys(GRID).map(s => `<div class="t" data-s="${s}" style="grid-column:${GRID[s][0] + 1};grid-row:${GRID[s][1] + 1}">${s}</div>`).join('');
    const hexToRgb = h => { const n = parseInt(h.replace('#', ''), 16); return [(n >> 16) & 255, (n >> 8) & 255, n & 255]; }; const mix = (c1, c2, u) => { const a = hexToRgb(c1), b = hexToRgb(c2); return `rgb(${a.map((v, i) => Math.round(v + (b[i] - v) * u)).join(',')})`; };
    const sel = document.getElementById('s6'), typ = document.getElementById('t6');
    const draw = () => {
      const key = typ.value, y = +sel.value;
      const allv = Object.keys(GRID).flatMap(s => YEARS.map(yr => D.states[s].rates[key][yr])).filter(v => v != null);
      const lo = Math.min(...allv), hi = Math.max(...allv);
      const light = key === 'formal' ? '#d4ecf0' : '#fde8d2', dark = key === 'formal' ? '#083e49' : '#8a4a0a';
      const S = Object.keys(GRID).map(s => ({ s, n: D.states[s].name, v: D.states[s].rates[key][y] })).sort((a, b) => b.v - a.v);
      grid.querySelectorAll('.t').forEach(el => { const v = D.states[el.dataset.s].rates[key][y]; el.style.background = mix(light, dark, (v - lo) / (hi - lo)); el.style.color = (v - lo) / (hi - lo) > .45 ? '#fff' : dark; el.style.textShadow = 'none'; el.title = `${D.states[el.dataset.s].name}: ${P(v)}`; });
      document.getElementById('mapLegend').innerHTML = `<span>${P(lo)}</span><div class="bar" style="background:linear-gradient(90deg,${light},${dark})"></div><span>${P(hi)}</span>`;
      document.getElementById('r6').innerHTML = `<h4>Highest, ${y}</h4><ol>${S.slice(0, 5).map(x => `<li><span>${x.n}</span><b>${P(x.v)}</b></li>`).join('')}</ol><h4>Lowest, ${y}</h4><ol>${S.slice(-5).reverse().map(x => `<li><span>${x.n}</span><b>${P(x.v)}</b></li>`).join('')}</ol>`;
      const noun = key === 'formal' ? 'formally volunteered' : 'helped neighbors informally';
      const back = S.filter(x => D.states[x.s].rates[key][2023] >= D.states[x.s].rates[key][2019]).length;
      const behind = S.filter(x => D.states[x.s].rates[key][2023] - D.states[x.s].rates[key][2019] <= -0.05).length;
      say('a6', `<b>${S[0].n} leads; ${S[S.length - 1].n} is last.</b> In ${y}, ${P(S[0].v)} of ${S[0].n} residents ${noun} compared with ${P(S[S.length - 1].v)} in ${S[S.length - 1].n}. ${back} states are at or above their 2019 level; ${behind} are still more than 5 points below it.`);
    };
    sel.onchange = draw; typ.onchange = draw; draw(); }

  /* 7. Time and value */
  { const e19 = D.economic[2019], e23 = D.economic[2023], hv = D.hoursPerVolunteer, hy = Object.keys(hv).map(Number).sort(); const vy = Object.keys(D.valueOfHour).map(Number).sort();
    say('a7', `<b>Fewer formal hours than before, but worth more money.</b> Formal volunteers gave ${(e23.hours / 1e9).toFixed(2)} billion hours in 2023, down from ${(e19.hours / 1e9).toFixed(1)} billion in 2019, because the typical volunteer now gives 24 hours a year instead of 40 (2017) or 52 (2002). But each hour is valued at $${D.valueOfHour[2023].toFixed(2)}, so the total was worth $${(e23.value / 1e9).toFixed(0)} billion, up from $${(e19.value / 1e9).toFixed(0)} billion. (Hours and dollar value are measured for formal volunteering only.)`);
    say('big7', `<div><b>${(e23.hours / 1e9).toFixed(2)}B</b><span>formal hours in 2023</span></div><div><b>24 hrs</b><span>typical volunteer per year (52 in 2002)</span></div><div><b>$${D.valueOfHour[2023].toFixed(2)}</b><span>value of one hour</span></div><div><b>$${(e23.value / 1e9).toFixed(0)}B</b><span>total value in 2023</span></div>`);
    mk('c7a', { type: 'bar', data: { labels: hy.filter(y => hv[y].median), datasets: [{ data: hy.filter(y => hv[y].median).map(y => hv[y].median), backgroundColor: BLUE, borderRadius: 4, barThickness: 48 }] }, options: base({ scales: { y: { min: 0, grid: { color: LINE }, title: { display: true, text: 'hours per year (median)' } }, x: { grid: { display: false }, ticks: { color: TEXT } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` ${c.raw} hours` } }, labels: { fmt: v => v + ' hrs', horizontal: false } } }), plugins: [labels] });
    mk('c7b', { type: 'line', data: { labels: vy, datasets: [{ data: vy.map(y => D.valueOfHour[y]), borderColor: BLUE, backgroundColor: 'rgba(11,110,127,.12)', fill: true, tension: .3, borderWidth: 2.5, pointRadius: vy.map(y => YEARS.includes(y) ? 6 : 2), pointBackgroundColor: vy.map(y => YEARS.includes(y) ? ORANGE : BLUE) }] }, options: base({ scales: { y: { ticks: { callback: v => '$' + v }, grid: { color: LINE } }, x: { grid: { display: false }, ticks: { maxTicksLimit: 7 } } }, plugins: { legend: { display: false }, tooltip: { callbacks: { label: c => ` $${c.raw.toFixed(2)} per hour` } } } }) }); }

  /* 8. Companies */
  { const c = D.cecp; const groups = D.demographics.filter(d => d.category === 'Family income'); const SH = { '$24,999 or less': 'Under $25k', '$25,000 to $39,999': '$25–40k', '$40,000 to $59,999': '$40–60k', '$60,000 to $74,999': '$60–75k', '$75,000 to $99,999': '$75–100k', '$100,000 to $149,999': '$100–150k', '$150,000 or more': '$150k+' };
    say('a8', `<b>Most big companies offer programs, but only about 1 in 4 employees join in.</b> ${P0(c.matchingOffered)} of large companies match employee donations and ${P0(c.virtualOffered)} offer online volunteering, yet average employee participation is ${P0(c.volunteerParticipation)}. On the worker side, ${P(nat('employer', 2023))} of employed Americans said their employer encouraged them to volunteer or give in 2023 (up from ${P(nat('employer', 2021))}), and higher-paid workers are asked about twice as often as lower-paid ones.`);
    say('big8', `<div><b>${P0(c.matchingOffered)}</b><span>of big companies match donations</span></div><div><b>${P0(c.virtualOffered)}</b><span>offer online volunteering</span></div><div><b>${P0(c.volunteerParticipation)}</b><span>of employees take part</span></div><div><b>${P0(nat('employer', 2023))}</b><span>of workers are asked to volunteer or give</span></div>`);
    mk('c8', { type: 'bar', data: { labels: groups.map(g => SH[g.group]), datasets: [{ label: '2021', data: groups.map(g => g.rates.employer[2021]), backgroundColor: GREY, borderRadius: 4 }, { label: '2023', data: groups.map(g => g.rates.employer[2023]), backgroundColor: BLUE, borderRadius: 4 }] },
      options: base({ scales: { y: pctAxis(0, 0.6), x: { grid: { display: false }, ticks: { color: TEXT }, title: { display: true, text: 'household income · share of workers whose employer asked them to volunteer or give' } } }, plugins: { legend: { display: true, position: 'top' }, tooltip: { callbacks: { label: c2 => ` ${c2.dataset.label}: ${P(c2.raw)}` } }, labels: { fmt: v => P0(v), horizontal: false, only: 1 } } }), plugins: [labels] }); }

  /* ---------- Slideshow / Present mode ---------- */
  const slides = [...document.querySelectorAll('.qtitle, .qs')];
  const countEl = document.getElementById('slideCount');
  const btn = document.getElementById('presentBtn');
  const navLinks = [...document.querySelectorAll('#qnav a')];
  let slideIdx = 0;

  function resizeCharts() {
    Object.values(charts).forEach(c => { try { c.resize(); } catch (_) {} });
    // Chart.js 4 registry fallback
    if (typeof Chart !== 'undefined' && Chart.helpers) { /* noop */ }
    slides.forEach(s => s.querySelectorAll('canvas').forEach(cv => {
      try { const ch = Chart.getChart(cv); if (ch) ch.resize(); } catch (_) {}
    }));
  }

  function syncChrome() {
    if (countEl) countEl.textContent = (slideIdx + 1) + ' / ' + slides.length;
    navLinks.forEach(a => a.classList.toggle('on', a.getAttribute('href') === '#' + slides[slideIdx].id));
  }

  function go(i) {
    slideIdx = Math.max(0, Math.min(slides.length - 1, i));
    if (document.body.classList.contains('present')) {
      slides.forEach((s, n) => s.classList.toggle('on', n === slideIdx));
      setTimeout(resizeCharts, 60);
    } else {
      slides[slideIdx].scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
    syncChrome();
  }

  function currentIndex() {
    if (document.body.classList.contains('present')) return slideIdx;
    let best = 0, bestDist = Infinity;
    slides.forEach((s, i) => { const d = Math.abs(s.getBoundingClientRect().top); if (d < bestDist) { bestDist = d; best = i; } });
    return best;
  }

  function exitPresent() {
    document.body.classList.remove('present');
    slides.forEach(s => s.classList.remove('on'));
    btn.textContent = 'Present';
    slides[slideIdx].scrollIntoView({ block: 'start' });
    setTimeout(resizeCharts, 300);
  }

  function togglePresent() {
    if (document.body.classList.contains('present')) {
      exitPresent();
      if (document.fullscreenElement) document.exitFullscreen().catch(() => {});
      return;
    }
    slideIdx = currentIndex();
    document.body.classList.add('present');
    btn.textContent = 'Exit';
    go(slideIdx);
    if (document.documentElement.requestFullscreen) document.documentElement.requestFullscreen().catch(() => {});
    setTimeout(resizeCharts, 300);
  }

  btn.addEventListener('click', togglePresent);
  document.addEventListener('fullscreenchange', () => {
    if (!document.fullscreenElement && document.body.classList.contains('present')) exitPresent();
  });

  document.addEventListener('keydown', e => {
    if (['INPUT', 'SELECT', 'TEXTAREA'].includes(e.target.tagName)) return;
    const key = e.key;
    if (key === 'ArrowRight' || key === 'PageDown' || (key === ' ' && document.body.classList.contains('present'))) {
      e.preventDefault(); go(currentIndex() + 1);
    } else if (key === 'ArrowLeft' || key === 'PageUp') {
      e.preventDefault(); go(currentIndex() - 1);
    } else if (key.toLowerCase() === 'p') {
      e.preventDefault(); togglePresent();
    } else if (key === 'Escape' && document.body.classList.contains('present') && !document.fullscreenElement) {
      e.preventDefault(); exitPresent();
    } else if (key === 'Home') {
      e.preventDefault(); go(0);
    } else if (key === 'End') {
      e.preventDefault(); go(slides.length - 1);
    }
  });

  const io = new IntersectionObserver(es => {
    if (document.body.classList.contains('present')) return;
    es.forEach(e => {
      if (!e.isIntersecting) return;
      slideIdx = slides.indexOf(e.target);
      syncChrome();
    });
  }, { rootMargin: '-40% 0px -40% 0px', threshold: 0 });
  slides.forEach(s => io.observe(s));
  syncChrome();
})();
