import json,glob,sys
rows=[]
for f in sorted(glob.glob('celeb/run*/rounds_*.json'))+sorted(glob.glob('celeb_probe_run/rounds_*.json')):
  d=json.load(open(f))
  for r in d['rounds']:
    L=r['celLog']; adds=[e for e in L if e['ev']=='toast+']
    if not adds: continue
    t0=adds[0]['t']; rem=[e for e in L if e['ev']=='toast-']
    S=[e for e in L if e['ev']=='sample' and e['canvas']]
    lit=[(round(e['t']-t0),e['canvas']) for e in S]
    mx=max((c['lit'] for _,c in lit),default=0)
    first=next((t for t,c in lit if c['lit']>0),None); last=max((t for t,c in lit if c['lit']>0),default=None)
    colors={k:max(c[k] for _,c in lit) for k in ('gold','red','cream')} if lit else {}
    dim=max((float(e['dim'] or 0) for e in S),default=0)
    peak=max((float(e['toast']['tf'].split('scale(')[1].rstrip(')')) for e in S if e['toast'] and 'scale(' in e['toast']['tf']),default=0)
    subs={e['toast']['sub'] for e in S if e['toast'] and e['toast'].get('sub')}
    texts=[e['toast']['text'] for e in S if e['toast'] and e['toast'].get('text')]
    rows.append(dict(src=f.split('/')[-1],r=r['r'],kind=r['kind'],toast=adds[0]['text'].replace('\n',' | '),final_text=texts[-1] if texts else None,sub=list(subs),toast_ms=round(rem[0]['t']-t0) if rem else None,canvas_first_ms=first,canvas_last_ms=last,canvas_max_lit=mx,colors=colors,dim_max=dim,toast_peak_scale=peak,burst='burst' in r))
for x in rows: print(json.dumps(x))
json.dump(rows,open('celeb/summary.json','w'),indent=1)
