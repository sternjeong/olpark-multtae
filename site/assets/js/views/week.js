// S4 주간 물때표
import { $, addDays, dateShort, diffDays, emptyState, esc, fmtN, forecast, gName, hm, loadCore, nowKST, setTitle, t, tideStats } from '../app.js';

export default async function viewWeek(main, start) {
  const D = await loadCore();
  const today = nowKST().date;
  start = start || today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) start = today;
  setTitle(t('week.doc'));
  const off = diffDays(start, today);
  if (off < -7 || off > 54) {
    main.innerHTML = emptyState(t('range.title'), t('range.body'), `<a class="btn" href="./#/week">${t('range.goWeek')}</a>`);
    return;
  }
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const rows = days.map((iso) => { const fc = forecast(iso, D); return { iso, fc, ts: tideStats(fc.occ, fc.arr, D.profiles.tide_rules), max: Math.max(...fc.occ.slice(36, 139)) }; });
  const top = Math.max(...rows.map((r) => r.max));
  const months = [...new Set(rows.map((r) => `${r.fc.m}: ${r.fc.s.toFixed(2)}`))].join(', ');
  const tr = rows.map(({ iso, fc, ts, max }) => {
    const lv = Math.max(1, Math.ceil(max / top * 4));
    const day = ts.day.wins.map((w) => `<span class="nw">${hm(w.k * 10)}~${hm(w.k * 10 + 60)}</span> <span class="small muted">−${Math.round(w.red * 100)}%</span>`).join('<br>');
    return `<tr><th scope="row"><a href="./#/day/${iso}">${dateShort(iso)}</a>${fc.holiday ? ` <span class="chip accent">${t('week.holiday')}</span>` : ''}${iso === today ? ` <span class="chip">${t('week.today')}</span>` : ''}</th>
<td>${ts.main != null ? `<strong>${hm(ts.main * 10)}</strong>${ts.highs.length > 1 ? `<br><span class="small muted">${ts.highs.filter((k) => k !== ts.main).map((k) => hm(k * 10)).join(' · ')}</span>` : ''}` : `<span class="small">${t('week.noHigh')}</span>`}</td>
<td>${day || `<span class="small">${t('week.none')}</span>`}</td>
<td>${ts.lows.length ? ts.lows.map(([a, b]) => `<span class="nw">${hm(a * 10)}~${hm(b * 10)}</span>`).join('<br>') : `<span class="small">${t('week.none')}</span>`}</td>
<td><span class="meter" role="img" aria-label="${t('week.meterAria', { l: lv, n: fmtN(max) })}">${[1, 2, 3, 4].map((i) => `<i class="${i <= lv ? 'on' : ''}"></i>`).join('')}</span><br><span class="small muted">${t('week.max', { n: fmtN(max) })}</span></td></tr>`;
  }).join('');
  const prev = off - 7 >= -7 ? `<a class="btn ghost" href="./#/week/${addDays(start, -7)}">${t('week.prev')}</a>` : '';
  const next = off + 7 <= 54 ? `<a class="btn ghost" href="./#/week/${addDays(start, 7)}">${t('week.next')}</a>` : '';
  main.innerHTML = `<div class="row between"><h1 tabindex="-1">${start === today ? t('week.title') : t('week.titleFrom', { d: dateShort(start) })}</h1><div class="row noprint">${prev}${next}</div></div>
<section class="card week"><div class="tbl"><table>
<caption>${t('week.caption', { a: esc(dateShort(days[0])), b: esc(dateShort(days[6])) })}</caption>
<thead><tr><th scope="col">${t('week.date')}</th><th scope="col">${t('week.high')}</th><th scope="col">${t('week.day')}</th><th scope="col">${t('week.low')}</th><th scope="col">${t('week.busy')}</th></tr></thead><tbody>${tr}</tbody></table></div>
<p class="small muted">${t('week.hint')}</p>
<button class="btn ghost noprint" type="button" id="print">${t('week.print')}</button>
<p class="basis">${t('week.basis', { g: ['weekday', 'sat', 'sun'].map(gName).join('·'), m: esc(months) })} <a href="./#/method/tide">${t('ui.method')}</a></p></section>`;
  $('#print').onclick = () => window.print();
}
