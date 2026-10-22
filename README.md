# FBLA Data Analysis 2026–27: Civic Engagement Site

Static website for the FBLA Data Analysis presentation event. The home page is a data explorer; the analysis page tells the story.

Original description: static website for the FBLA Data Analysis presentation event (topic: Flinders Street Technology's U.S. Social Impact Plan).
It analyzes AmeriCorps / U.S. Census Bureau Civic Engagement and Volunteering (CEV) Supplement data, 2017–2023, and presents
ten competitor-built visualizations plus recommendations. The page is built chart-first: one headline, one chart and three takeaways per section.

## Run it
No build step and **no internet required** (the competition venue provides none). Either:

- double-click `index.html`, or
- serve the folder: `python3 -m http.server 8000` then open http://localhost:8000

`prep.html` is the event prep kit: practice timer, rating sheet, rules checklist, practice Q&A and a talk track.

Keyboard: `←` / `→` move between sections, `P` toggles presenter mode (fullscreen, one section per screen).

## Files
- `index.html`, `simple.js`, `simple.css` — **the home page**: eight plain questions, each answered in one sentence with one simple chart
- `explore.html`, `explore.js` — the full data explorer (small multiples of all 17 measures, trend overlays, demographics over time, animated state map with comparisons, 2003–2025 volunteering series, CECP benchmarks, and a plain-English "What this shows" box under every chart)
- `story.html`, `app.js` — the analysis and recommendations page
- `styles.css` — shared styles
- `prep.html` — event prep kit
- `data/cev-data.js` — all data used by the charts (generated)
- `data/build_data.py` — rebuilds `cev-data.js` from the raw tables (`python3 data/build_data.py`; needs `openpyxl`)
- `data/raw/` — downloaded CEV tables, spreadsheets and AmeriCorps research briefs (sources)
- `vendor/chart.umd.min.js` — Chart.js 4.4.1, vendored for offline use

## Data sources
- AmeriCorps CEV Dashboard: https://data.americorps.gov/stories/s/62w6-z7xa
- National rates (rhng-qtzw), rates by demographics (bhmf-84dy), state rates (4r6x-re58), 2023 toplines (9zzx-8cwf) on data.americorps.gov
- BLS "Volunteering in the United States" releases for the 2003–2015 CPS Volunteer Supplement series
- Independent Sector, Value of Volunteer Time (historic national series 2001–2025, `data/raw/IS_Historic_Value_of_Volunteer_Time_2026.xlsx`)
- CECP, Giving in Numbers 2025 Edition (corporate benchmarks: participation, matching, virtual volunteering, 1% of pre-tax profit standard)
