// S5 실시간 수위 + 아카이브 차트(기관용 아카이브 화면과 공유)
import { $, addDays, esc, fmtN, fmtStamp, liveCard, load, loadCore, nowKST, pad, setTitle } from '../app.js';

export function archiveBlock(live, quality) {
  const today = nowKST().date;
  const rd = (live && live.readings) || [];
  const ratio = quality && quality.checks.find((c) => c.id === 'Q11');
  const r = ratio && ratio.metric.ratio;
  const since = addDays(today, -6);
  const recent = rd.filter((x) => x[0].slice(0, 10) >= since);
  let chart;
  if (recent.length < 2) {
    chart = `<p class="muted">같은 요일·시각 기록을 쌓는 중이에요 (${live && live.days ? `${live.days}일째` : '첫 기록 전'}). 기록은 GitHub Actions가 15분마다 기관 실시간 API를 불러 저장해요.</p>`;
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
    chart = `<div class="chart"><svg viewBox="0 0 ${W} ${H}" role="img" aria-label="최근 7일 실시간 주차 기록. 오늘 ${tday.length}회, 지난주 같은 요일 ${lw.length}회 기록"><g class="ax">${yt}${ticks}</g>
${others.map((s) => s.length > 1 ? `<path d="${path(s)}" fill="none" stroke="var(--hair)" stroke-width="1.5"/>` : '').join('')}
${lw.length > 1 ? `<path d="${path(lw)}" fill="none" stroke="var(--muted)" stroke-width="2" stroke-dasharray="5 4"/>` : ''}
${tday.length > 1 ? `<path d="${path(tday)}" class="occ"/>` : ''}</svg></div>
<ul class="legend"><li><span class="sw"></span>오늘</li><li><span class="sw dash"></span>지난주 같은 요일</li><li><span class="sw" style="border-color:var(--hair)"></span>최근 6일</li></ul>
<details><summary>표로 보기</summary><div class="tbl"><table><caption>최근 기록(15분 간격, 최근 48개)</caption><thead><tr><th scope="col">시각</th><th scope="col" class="n">주차 대수</th></tr></thead><tbody>${recent.slice(-48).reverse().map((x) => `<tr><td>${esc(fmtStamp(x[0]))}</td><td class="n">${fmtN(x[1])}</td></tr>`).join('')}</tbody></table></div></details>`;
  }
  return `<section class="card"><h2>최근 7일 기록 <span class="small muted">(15분 간격)</span></h2>${chart}
<dl class="kv"><dt>수집 시작</dt><dd>${live && live.archive_start ? esc(live.archive_start) : '아직 없음'}</dd><dt>기록 수</dt><dd>${live ? fmtN(live.n_records || 0) : 0}건${live && live.missing_rate != null ? ` · 실패 비율 ${(live.missing_rate * 100).toFixed(1)}%` : ''}</dd></dl></section>
<section class="card"><p class="info">${'<svg width="16" height="16" aria-hidden="true"><use href="#i-info"/></svg>'}<span>이 값은 장기주차 차량이 포함될 수 있어 2024년 원자료 곡선보다 크게 나와요${r ? `(같은 요일·시각 약 ${r.toFixed(1)}배, ${esc(ratio.metric.basis)} 기준)` : ''}. 그래서 물때 곡선과 겹쳐 그리지 않고, 이 서비스가 쌓은 같은 요일·시각 기록하고만 비교해요.</span></p>
<p><a class="btn ghost" href="./data/live_archive.csv" download="olpark-live-archive.csv">기록 내려받기 (CSV)</a></p>
<p class="basis">이 CSV는 이 서비스가 기관 실시간 API를 15분마다 기록한 것이에요. 자유롭게 쓰세요(출처: 한국체육산업개발 실시간 주차현황).</p></section>`;
}

export default async function viewLive(main) {
  const D = await loadCore();
  setTitle('실시간 수위');
  const [live, quality] = await Promise.all([load('live', { optional: true }), load('quality', { optional: true })]);
  main.innerHTML = `<h1 tabindex="-1">지금 실시간 주차</h1><div id="lc"></div>${archiveBlock(live, quality)}`;
  liveCard($('#lc'), D, live, { title: '동2·남2·북2문 합계', link: false });
}
