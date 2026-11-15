// 홈의 '편하게 방문하기'·'분산 효과 계산기' 패널(펼칠 때만 로드). 숫자는 profiles.json·context.json에서 읽는다.
import { $, esc, fmtN, gName, hm, icon, LANG, t, toggleLarge } from '../app.js';

const btn = (id, title, sub, open) => `<h2><button class="panel-t" type="button" aria-expanded="${open}" aria-controls="${id}-b" id="${id}-btn">${title} <span class="small muted">${sub}</span><span class="chev">${icon('chev', 20)}</span></button></h2>`;
const pct = (x) => Math.round(x * 100);

export function renderVisit(el, { D, ts, open }) {
  let body = '';
  if (open) {
    const v = D.context.visit;
    const en = LANG === 'en';
    const wins = ts.day.wins.map((w) => `<li>${t('visit.quietItem', { a: hm(w.k * 10), b: hm(w.k * 10 + 60), t: hm(ts.day.peakK * 10), p: pct(w.red) })}</li>`).join('');
    const lows = ts.lows.map(([a, b]) => `${hm(a * 10)}~${hm(b * 10)}`).join(', ');
    body = `<p>${t('visit.lead')}</p>
<h3>${t('visit.quiet')}</h3><ul>${wins || `<li>${t('key.noDay')}</li>`}</ul>
${lows ? `<p class="small">${t('visit.early', { w: lows })}</p>` : ''}
${ts.main != null ? `<p class="small">${t('visit.avoid', { t: hm(ts.main * 10) })}</p>` : ''}
<p class="row">${t('visit.large')} <button class="btn ghost" type="button" id="v-large">${t('visit.largeBtn')}</button></p>
${v ? `<h3>${t('visit.transit')}</h3><ul>${v.subway.map((s) => `<li>${esc(en ? `Line ${s.line} ${s.station_en}, ${s.exits_en}` : t('visit.line', { l: s.line, s: s.station, e: s.exits }))}</li>`).join('')}</ul>
<p class="small">${esc(t('visit.bigEvent', { t: en ? v.big_event_notice_en : v.big_event_notice }))}</p>
<h3>${t('visit.parking')}</h3><ul class="small">${(en ? v.parking_rules_en : v.parking_rules).map((r) => `<li>${esc(r)}</li>`).join('')}</ul>
<p class="small">${t('visit.who')}</p>
<p class="basis">${esc(t('visit.src', { s: v.source, d: v.retrieved_at }))} <a href="${esc(v.url)}" target="_blank" rel="noopener">${t('visit.srcLink')}</a></p>` : ''}`;
  }
  el.innerHTML = btn('visit', t('visit.title'), t('visit.sub'), open) + `<div id="visit-b">${body}</div>`;
  const lb = $('#v-large'); if (lb) lb.onclick = () => toggleLarge();
}

export function renderDisp(el, { D, fc, ov, open }) {
  let body = '';
  const ds = D.profiles.dispersion;
  const g = ds.day_shift[fc.g];
  if (open && g) {
    const s = fc.s;
    body = `<p>${t('disp.lead', { g: gName(fc.g), h: hm(g.high_tide_k * 10), p: `${hm(g.p_bins[0] * 10)}~${hm(g.p_bins[1] * 10)}`, q: `${hm(g.q_start_k * 10)}~${hm(g.q_end_k * 10)}` })}</p>
<div><label for="d-f" class="row between"><span>${t('disp.f')}</span><strong id="d-fv"></strong></label><input type="range" id="d-f" min="0" max="${g.rows.length - 1}" step="1" value="2"></div>
<div aria-live="polite" id="d-out"></div>
<p class="basis">${t('disp.scale', { m: fc.m, s: s.toFixed(2) })} <a href="./#/method/dispersion">${t('disp.method')}</a></p>
<div class="part"><h3>${t('disp.exit')}</h3><div id="d-exit"></div></div>`;
  }
  el.innerHTML = btn('disp', t('disp.title'), t('disp.sub'), open) + `<div id="disp-b">${body}</div>`;
  if (!(open && g)) return;
  const out = () => {
    const r = g.rows[+$('#d-f').value];
    $('#d-fv').textContent = `${pct(r.f)}%`;
    const sc = (x) => fmtN(x * fc.s);
    $('#d-out').innerHTML = `<p class="small">${t('disp.moved', { n: sc(r.moved_cars[1]), lo: sc(r.moved_cars[0]), hi: sc(r.moved_cars[2]) })}</p>
<div class="result"><span class="small muted">${t('disp.occ')}</span><br><strong>${t('disp.occRes', { n: sc(r.occ_peak_red[1]), p: (r.occ_peak_red_pct[1] * 100).toFixed(1), d: g.n_days, lo: (r.occ_peak_red_pct[0] * 100).toFixed(1), hi: (r.occ_peak_red_pct[2] * 100).toFixed(1) })}</strong></div>
<div class="result"><span class="small muted">${t('disp.arr')}</span><br><strong>${t('disp.arrRes', { n: sc(r.arr_peak_red[1]), p: pct(r.arr_peak_red_pct[1]) })}</strong></div>`;
  };
  $('#d-f').oninput = out;
  out();
  const ex = $('#d-exit');
  if (!ov) { ex.innerHTML = `<p>${t('disp.weekdayExit')}</p>`; return; }
  const q = ds.exit_queue;
  const pi = q.params.findIndex((p) => p.group === fc.g);
  const P = q.params[pi];
  const base = q.table.find((r) => r.f === 0 && r.spread_min === 60);
  const fs = [...new Set(q.table.map((r) => r.f))].filter((f) => f > 0);
  const S = { f: 0.3, sp: 60 };
  ex.innerHTML = `<p>${t('disp.exitLead', { m: fmtN(P.M), c: fmtN(P.c10) })}</p>
<p><strong>${t('disp.exitBase', { w: fmtN(base.wait_car_min[pi]), a: (base.wait_car_min[pi] / P.M).toFixed(1) })}</strong></p>
<div><label for="e-f" class="row between"><span>${t('disp.exitF')}</span><strong id="e-fv"></strong></label><input type="range" id="e-f" min="0" max="${fs.length - 1}" step="1" value="${fs.indexOf(0.3)}"></div>
<div class="row between"><span id="e-sl">${t('disp.exitS')}</span><div class="seg" role="group" aria-labelledby="e-sl">${[30, 60].map((m) => `<button type="button" data-sp="${m}" aria-pressed="${m === S.sp}">${t('disp.minutes', { n: m })}</button>`).join('')}</div></div>
<div class="result" aria-live="polite" id="e-out"></div>
<p class="basis">${t('disp.exitModel')}</p>`;
  const render = () => {
    S.f = fs[+$('#e-f').value];
    $('#e-fv').textContent = `${pct(S.f)}%`;
    const r = q.table.find((x) => Math.abs(x.f - S.f) < 1e-9 && x.spread_min === S.sp);
    const reds = r.wait_car_min.map((w, i) => 1 - w / base.wait_car_min[i]);
    $('#e-out').innerHTML = `<strong>${t('disp.exitRes', { w: fmtN(base.wait_car_min[pi]), w2: fmtN(r.wait_car_min[pi]), p: pct(reds[pi]), lo: pct(Math.min(...reds)), hi: pct(Math.max(...reds)) })}</strong>`;
  };
  $('#e-f').oninput = render;
  ex.querySelectorAll('[data-sp]').forEach((b) => b.addEventListener('click', () => { S.sp = +b.dataset.sp; ex.querySelectorAll('[data-sp]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); render(); }));
  render();
}
