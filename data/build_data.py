"""Builds data/cev-data.js from the raw AmeriCorps CEV tables in data/raw/.
Run:  python3 data/build_data.py
"""
import csv, json, re, os
import openpyxl

RAW = os.path.join(os.path.dirname(__file__), 'raw')
OUT = os.path.join(os.path.dirname(__file__), 'cev-data.js')
YEARS = [2017, 2019, 2021, 2023]

# type: formal = through an organization; informal = helping neighbors directly / neighbor civic life;
# other = remaining civic behaviors (friends/family, political, economic).
MEASURES = [  # key, label, area, type
  ('formal', 'Formal Volunteering', 'Organizational engagement', 'formal'),
  ('member', 'Organizational Membership', 'Organizational engagement', 'formal'),
  ('giving', 'Charitable Giving', 'Organizational engagement', 'formal'),
  ('informal', 'Informal Helping', 'Engaging with neighbors', 'informal'),
  ('talkFF', 'Talking with Friends and Family', 'Friends, family & issues', 'other'),
  ('talkNb', 'Talking with Neighbors', 'Engaging with neighbors', 'informal'),
  ('news', 'Learning About Issues', 'Friends, family & issues', 'other'),
  ('discussFF', 'Discussing Issues with Friends and Family', 'Friends, family & issues', 'other'),
  ('discussNb', 'Discussing Issues with Neighbors', 'Engaging with neighbors', 'informal'),
  ('post', 'Posting Views Online', 'Friends, family & issues', 'other'),
  ('vote', 'Voting in Local Elections', 'Political engagement', 'other'),
  ('contact', 'Contacting Public Officials', 'Political engagement', 'other'),
  ('polDonate', 'Donating to a Political Cause', 'Political engagement', 'other'),
  ('meetings', 'Attending Public Meetings', 'Political engagement', 'other'),
  ('action', 'Taking Action with Neighbors', 'Engaging with neighbors', 'informal'),
  ('buycott', 'Buycotting or Boycotting', 'Economic engagement', 'other'),
  ('employer', 'Employer Promotes Volunteering', 'Economic engagement', 'other'),
]
LABEL_TO_KEY = {m[1]: m[0] for m in MEASURES}

def norm_label(col):
    """Map a column header like 'State 2019 Formal Volunteering Rate' to (year, key)."""
    m = re.match(r'^(?:State|National) (\d{4}) (.+?) Rate$', col)
    if not m: return None
    return int(m.group(1)), LABEL_TO_KEY[m.group(2)]

def fnum(x):
    try: return round(float(x), 4)
    except (TypeError, ValueError): return None

# ---------- National (canonical: xlsx 'Rates' sheet, full precision, deduped) ----------
wb = openpyxl.load_workbook(os.path.join(RAW, '2017-23_CEV_NationalRates_AllMeasures.xlsx'), data_only=True)
ws = wb['Rates']
rows = [r for r in ws.iter_rows(values_only=True) if r[0] is not None]
hdr = [h.replace('National Rate of Voting in Local Elections', 'National Voting in Local Elections Rate') for h in rows[0]]
national = {m[0]: {} for m in MEASURES}
for r in rows[1:]:
    year = int(r[0])
    for h, val in zip(hdr[1:], r[1:]):
        key = LABEL_TO_KEY[re.sub(r'^National (.+?) Rate$', r'\1', h)]
        national[key][year] = fnum(val)

# ---------- Demographics ----------
rows = list(csv.reader(open(os.path.join(RAW, 'bhmf-84dy.csv'))))
hdr = rows[0]
demo = []  # [{category, group, rates:{key:{year:v}}}]
for r in rows[1:]:
    cat, grp = r[0].split(':', 1)
    rates = {m[0]: {} for m in MEASURES}
    for h, val in zip(hdr[1:], r[1:]):
        yk = norm_label(h)
        if yk: rates[yk[1]][yk[0]] = fnum(val)
    demo.append({'category': cat.strip(), 'group': grp.strip(), 'rates': rates})

# ---------- States ----------
rows = list(csv.reader(open(os.path.join(RAW, '4r6x-re58.csv'))))
hdr = rows[0]
states = {}
for r in rows[1:]:
    rates = {m[0]: {} for m in MEASURES}
    for h, val in zip(hdr[1:], r[1:]):
        yk = norm_label(h)
        if yk: rates[yk[1]][yk[0]] = fnum(val)
    states[r[0]] = {'rates': rates}

# ---------- 2023 toplines (volunteers, hours, value) by state + metros ----------
wb = openpyxl.load_workbook(os.path.join(RAW, '2023_CEV_VCLA_Toplines.xlsx'), data_only=True)
ws = wb['Figures for VCLA Graphics']
rows = [r for r in ws.iter_rows(values_only=True) if r[0] is not None]
toplines = {'states': {}, 'metros': []}
for r in rows[1:]:
    name, ref = str(r[0]).strip(), str(r[1]).strip()
    rec = {'name': name, 'volunteers': round(r[2]), 'hours': round(r[4]), 'valuePerHour': round(r[5], 2),
           'value': round(r[6]), 'formal': round(r[8], 4), 'helpers': round(r[9]), 'informal': round(r[11], 4),
           'member': round(r[12], 4), 'giving': round(r[13], 4)}
    if ref == 'USA': toplines['us'] = rec
    elif len(ref) == 2:
        toplines['states'][ref] = rec
        states[ref]['name'] = name
    else:
        rec['ref'] = ref; toplines['metros'].append(rec)

# ---------- Historical national volunteer rate (CPS Volunteer Supplement, BLS releases) ----------
# 2003-2007: BLS "Volunteering in the United States, 2007" (Jan 23 2008). 2008-2010: BLS Jan 26 2011 release.
# 2011-2015: BLS "Volunteering in the United States, 2015" (Feb 25 2016). 2017+: CEV (AmeriCorps/Census).
historical = [
  {'year': 2003, 'rate': 0.288, 'volunteers': 63791000}, {'year': 2004, 'rate': 0.288, 'volunteers': 64542000},
  {'year': 2005, 'rate': 0.288, 'volunteers': 65357000}, {'year': 2006, 'rate': 0.267, 'volunteers': 61199000},
  {'year': 2007, 'rate': 0.262, 'volunteers': 60838000}, {'year': 2008, 'rate': 0.264, 'volunteers': 61803000},
  {'year': 2009, 'rate': 0.268, 'volunteers': 63361000}, {'year': 2010, 'rate': 0.263, 'volunteers': 62800000},
  {'year': 2011, 'rate': 0.268, 'volunteers': 64252000}, {'year': 2012, 'rate': 0.265, 'volunteers': 64513000},
  {'year': 2013, 'rate': 0.254, 'volunteers': 62615000}, {'year': 2014, 'rate': 0.253, 'volunteers': 62757000},
  {'year': 2015, 'rate': 0.249, 'volunteers': 62623000},
]

# ---------- Economic value series (AmeriCorps Volunteering and Civic Life in America) ----------
economic = {
  2019: {'volunteers': 77949981, 'hours': 5.8e9, 'value': 147e9, 'source': 'AmeriCorps 2019 CEV Key Findings report (Dec 2021)'},
  2023: {'volunteers': toplines['us']['volunteers'], 'hours': toplines['us']['hours'], 'value': toplines['us']['value'],
         'valuePerHour': toplines['us']['valuePerHour'], 'source': '2023 CEV VCLA Toplines (data.americorps.gov/9zzx-8cwf)'},
}

# ---------- Independent Sector: value of a volunteer hour, national, 2001-2025 ----------
wb = openpyxl.load_workbook(os.path.join(RAW, 'IS_Historic_Value_of_Volunteer_Time_2026.xlsx'), data_only=True)
ws = wb['VOVT Data']
rows = [r for r in ws.iter_rows(values_only=True)]
yrs = rows[0]; us = next(r for r in rows if r[0] and str(r[0]).strip() == 'US Total')
value_of_hour = {int(y): round(v, 2) for y, v in zip(yrs[1:], us[1:]) if y and v}

# ---------- CECP Giving in Numbers, 2025 edition (2024 data), corporate benchmarks ----------
cecp = {
  'edition': 'Giving in Numbers 2025 Edition (2024 data, N≈189 large companies)',
  'medianTCI': 21.5e6, 'tciPctPretaxProfit': 0.0078, 'tciPctRevenue': 0.0010, 'fieldStandardPretax': 0.01,
  'matchingOffered': 0.93, 'medianMatching': 1.6e6, 'matchingParticipation': 0.21, 'matchingParticipationTech': 0.31,
  'volunteerParticipation': 0.25, 'volunteerParticipationSmall': 0.31, 'volunteerParticipationLarge': 0.16,
  'medianHoursPerEmployee': 1.8, 'virtualOffered': 0.82, 'proBonoOffered': 0.66, 'flexSchedulingParticipation': 0.43,
  'participationChange2022to2024': 0.12, 'hoursChange2022to2024': 0.49,
}

# ---------- Hours per formal volunteer (mean / median) ----------
# 2002 median: AmeriCorps Formal Volunteering Intensity brief (Jan 2024). 2017 & 2023 mean/median: U.S. Census Bureau story
# "New U.S. Census Bureau and AmeriCorps Research Tracks Virtual Volunteering for First Time" (Nov 19 2024).
# 2019 mean: AmeriCorps 2019 CEV Key Findings report. 2021 median: Formal Volunteering Intensity brief.
hours_per_volunteer = {2002: {'median': 52}, 2017: {'mean': 96.5, 'median': 40}, 2019: {'mean': 74}, 2021: {'median': 25}, 2023: {'mean': 70, 'median': 24}}

data = {
  'years': YEARS,
  'hoursPerVolunteer': hours_per_volunteer,
  'valueOfHour': value_of_hour,
  'cecp': cecp,
  'measures': [{'key': k, 'label': l, 'area': a, 'type': t} for k, l, a, t in MEASURES],
  'national': national,
  'demographics': demo,
  'states': states,
  'toplines': toplines,
  'historical': historical,
  'economic': economic,
}
with open(OUT, 'w') as f:
    f.write('// Generated by data/build_data.py from AmeriCorps CEV open data. Do not edit by hand.\n')
    f.write('window.CEV = ' + json.dumps(data, separators=(',', ':')) + ';\n')
print('wrote', OUT, os.path.getsize(OUT), 'bytes;', len(demo), 'subgroups,', len(states), 'states,', len(toplines['metros']), 'metros')
