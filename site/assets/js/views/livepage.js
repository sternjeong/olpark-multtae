// S5 실시간 수위 + 아카이브 차트(기관용 아카이브 화면과 공유)
import { $, addDays, esc, fmtN, fmtStamp, icon, liveCard, load, loadCore, nowKST, pad, setTitle, t } from '../app.js';

export function archiveBlock(live, quality) {
  const today = nowKST().date;
  const rd = (live && live.readings) || [];
  const q11 = quality && quality.checks.find((c) => c.id === 'Q11');
  const r = q11 && q11.metric.ratio;
  const recent = rd.filter((x) => x[0].slice(0, 10) >= addDays(today, -6));
  let chart;
  if (recent.length < 2) {
    chart = `<p class="muted">${t('lp.empty', { d: live && live.days ? t('lp.dayN', { n: live.days }) : t('lp.day0') })}</p>`;
  } else {
    const W = 360, H = 170, L = 40, R = 352, T = 12, B = 140;
    const mx = Math.max(...recent.map((x) => x[1])) * 1.1;
    const X = (m) => L + m / 1440 * (R - L), Y = (v) => B - v / mx * (B - T);
    const series = (d) => rd.filter((x) => x[0].startsWith(d)).map((x) => [+x[0].slice(11, 13) * 60 + +x[0].slice(14, 16), x[1]]);
    const path = (pts) => pts.map((p, i) => `${i ? 'L' : 'M'}${X(p[0]).toFixed(1)},${Y(p[1]).toFixed(1)}`).join('');
    const tday = series(today), lw = series(addDays(today, -7));
    const others = [];
    for (let i = 1; i <= 6; i++) others.push(series(addDays(today, -i)));
    const ticks = [0, 6, 12, 18, 24].map((h) => `<line x1="${X(h * 60)}" x2="${X(h * 60)}" y1="${T}" y2="${B}"/><text x="${X(h * 60)}" y="${H - 12}" text-anchor="middle">${pad(h)}</text>`).join('');
    const yt = [0, mx / 2].map((v) => `<line x1="${L}" x2="${R}" y1="${Y(v)}" y2="${Y(v)}"/><text x="${L - 5}" y="${Y(v) + 4}" text-anchor="end">${fmtN(v)}</text>`).join('');
    chart = `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="${t('lp.aria', { a: tday.length, b: lw.length })}"><g class="ax">${yt}${ticks}</g>
${others.map((s) => (s.length > 1 ? `<path d="${path(s)}" fill="none" stroke="var(--hair)" stroke-width="1.5"/>` : '')).join('')}
${lw.length > 1 ? `<path d="${path(lw)}" fill="none" stroke="var(--muted)" stroke-width="2" stroke-dasharray="5 4"/>` : ''}
${tday.length > 1 ? `<path d="${path(tday)}" class="occ"/>` : ''}</svg></div>
<ul class="legend"><li><span class="sw"></span>${t('lp.lgToday')}</li><li><span class="sw dash"></span>${t('lp.lgLastWeek')}</li><li><span class="sw" style="border-color:var(--hair)"></span>${t('lp.lg6')}</li></ul>
<details><summary>${t('ui.table')}</summary><div class="tbl"><table><caption>${t('lp.tblCap')}</caption><thead><tr><th scope="col">${t('tbl.time')}</th><th scope="col" class="n">${t('lp.tblVal')}</th></tr></thead><tbody>${recent.slice(-48).reverse().map((x) => `<tr><td>${esc(fmtStamp(x[0]))}</td><td class="n">${fmtN(x[1])}</td></tr>`).join('')}</tbody></table></div></details>`;
  }
  return `<section class="card"><h2>${t('lp.title')} <span class="small muted">${t('lp.sub')}</span></h2>${chart}
<dl class="kv"><dt>${t('lp.start')}</dt><dd>${live && live.archive_start ? esc(live.archive_start) : t('lp.none')}</dd><dt>${t('lp.count')}</dt><dd>${t('lp.countV', { n: live ? fmtN(live.n_records || 0) : 0 })}${live && live.missing_rate != null ? t('lp.fail', { p: (live.missing_rate * 100).toFixed(1) }) : ''}</dd></dl></section>
<section class="card"><p class="info">${icon('info', 16)}<span>${t('lp.unit', { r: r ? t('lp.ratio', { r: r.toFixed(1), b: esc(q11.metric.basis) }) : '' })}</span></p>
<p><a class="btn ghost" href="./data/live_archive.csv" download="olpark-live-archive.csv">${t('lp.csv')}</a></p>
<p class="basis">${t('lp.csvNote')}</p></section>`;
}

export default async function viewLive(main) {
  const D = await loadCore();
  setTitle(t('lp.doc'));
  const [live, quality] = await Promise.all([load('live', { optional: true }), load('quality', { optional: true })]);
  main.innerHTML = `<h1 tabindex="-1">${t('lp.h1')}</h1><div id="lc"></div>${archiveBlock(live, quality)}`;
  liveCard($('#lc'), D, live, { title: t('live.titlePage'), link: false });
}
