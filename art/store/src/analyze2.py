# Analyze celeb2/rounds_*.json -> celeb2/analysis.json + printed summary.  python3 src/analyze2.py [glob]
import json, glob, sys, gzip
files = sorted(glob.glob(sys.argv[1] if len(sys.argv) > 1 else 'celeb/v2/logs/rounds_*.json*'))
out = []; totals = dict(rounds=0, stuck=0, shift_on_actions=0, before_land=0, dealer_turn=0, after_result=0, deal_during_toast=0, rack_during_toast=0)
for f in files:
    d = json.load(gzip.open(f) if f.endswith('.gz') else open(f))
    for r in d['rounds']:
        if 'log' not in r: continue
        L = r['log']; S = [e for e in L if e['ev'] == 's']; M = {m['m']: m['t'] for m in r['marks']}
        marks = r['marks']
        if not S: continue
        totals['rounds'] += 1
        act = lambda e: 'Hit' in e['pills'] or 'Stand' in e['pills']
        stuck = [e for e in S if act(e) and e['n'] == 0]
        first = next((e for e in S if act(e)), None)
        i0 = S.index(first) if first else None
        prev = S[i0 - 1] if i0 else None
        before = first is not None and (first['n'] < 3 or (prev is not None and prev['moving']))
        shift = bool(first and first['moving'] and prev is not None and not prev['moving'])
        tstand = max([m['t'] for m in marks if m['m'] in ('stand', 'hit')], default=None)
        tadd = next((e['t'] for e in L if e['ev'] == 'toast+'), None)
        trem = next((e['t'] for e in L if e['ev'] == 'toast-'), None)
        tdeal = M.get('deal', S[0]['t'])
        # dealer turn: after the last stand (not hit) until toast or Deal
        tlaststand = max([m['t'] for m in marks if m['m'] == 'stand'], default=None)
        tend = next((e['t'] for e in S if e['t'] > tdeal + 500 and e['deal'] > 0.05), None)
        dealer = [e for e in S if tlaststand and e['t'] > tlaststand + 350 and (tadd is None or e['t'] < tadd) and act(e)]
        after = [e for e in S if ((tadd and e['t'] > tadd) or (tend and e['t'] > tend)) and act(e)]
        dtoast = [e for e in S if e['toast'] and e['deal'] > 0.05]
        rtoast = [e for e in S if e['toast'] and e['rack'] > 0.05]
        canv = [e['canvas'] for e in S if e['toast'] and e['canvas'] is not None]
        dealback = next((e['t'] for e in S if tadd and e['t'] > tadd and e['deal'] > 0.05), None)
        rec = dict(src=f.split('/')[-1], r=r['r'], kind=r['kind'], toast=(r['toast'] or {}).get('text'), shots=bool(r['shots']),
                   stuck=len(stuck) > 0, stuck_ms=round(len(stuck) * 50), before_land=before, first_action=first and dict(n=first['n'], moving=first['moving'], ms=round(first['t'] - tdeal)),
                   dealer_turn=len(dealer), after_result=len(after), deal_during_toast=len(dtoast), rack_during_toast=len(rtoast),
                   shift_on_actions=shift, toast_ms=round(trem - tadd) if tadd and trem else None, deal_back_after_toast_ms=round(dealback - tadd) if dealback else None,
                   canvas_max=max(canv) if canv else 0, dim_max=max(e['dim'] for e in S))
        for k in ('stuck', 'before_land', 'shift_on_actions'): totals[k] += bool(rec[k])
        for k in ('dealer_turn', 'after_result', 'deal_during_toast', 'rack_during_toast'): totals[k] += rec[k] > 0
        out.append(rec)
json.dump(dict(totals=totals, rounds=out), open('celeb/v2/analysis.json', 'w'), indent=1)
print(totals)
for x in out:
    if x['kind'] or x['stuck'] or x['before_land'] or x['dealer_turn'] or x['after_result'] or x['deal_during_toast']: print(json.dumps(x))
