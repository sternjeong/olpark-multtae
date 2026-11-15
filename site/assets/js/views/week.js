// S4 주간 물때표
import { $, addDays, dateShort, diffDays, emptyState, esc, forecast, GROUP_KO, hm, loadCore, nowKST, setTitle, tideStats } from '../app.js';

export default async function viewWeek(main, start) {
  const D = await loadCore();
  const today = nowKST().date;
  start = start || today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(start)) start = today;
  setTitle('주간 물때표');
  const off = diffDays(start, today);
  if (off < -7 || off > 54) {
    main.innerHTML = emptyState('이 날짜는 보여 드리지 않아요', '오늘부터 앞으로 60일, 지난 7일까지 볼 수 있어요.', '<a class="btn" href="./#/week">이번 주로 가기</a>');
    return;
  }
  const days = Array.from({ length: 7 }, (_, i) => addDays(start, i));
  const rows = days.map((iso) => { const fc = forecast(iso, D); return { iso, fc, ts: tideStats(fc.occ, fc.arr, D.profiles.tide_rules), max: Math.max(...fc.occ.slice(36, 139)) }; });
  const top = Math.max(...rows.map((r) => r.max));
  const months = [...new Set(rows.map((r) => `${r.fc.m}월 ${r.fc.s.toFixed(2)}`))].join(', ');
  const tr = rows.map(({ iso, fc, ts, max }) => {
    const lv = Math.max(1, Math.ceil(max / top * 4));
    return `<tr><th scope="row"><a href="./#/day/${iso}">${dateShort(iso)}</a>${fc.holiday ? ` <span class="chip accent">공휴일</span>` : ''}${iso === today ? ' <span class="chip">오늘</span>' : ''}</th>
<td>${ts.main != null ? `<strong>${hm(ts.main * 10)}</strong>${ts.highs.length > 1 ? `<br><span class="small muted">${ts.highs.filter((k) => k !== ts.main).map((k) => hm(k * 10)).join(' · ')}</span>` : ''}` : '<span class="small">뚜렷한 만조 없음</span>'}</td>
<td>${ts.lows.length ? ts.lows.map(([a, b]) => `<span class="nw">${hm(a * 10)}~${hm(b * 10)}</span>`).join("<br>") : '<span class="small">없음</span>'}</td>
<td><span class="meter" role="img" aria-label="붐빔 4단계 중 ${lv}단계, 최대 약 ${Math.round(max).toLocaleString('ko-KR')}대">${[1, 2, 3, 4].map((i) => `<i class="${i <= lv ? 'on' : ''}"></i>`).join('')}</span><br><span class="small muted">최대 ${Math.round(max).toLocaleString('ko-KR')}대</span></td></tr>`;
  }).join('');
  const prev = off - 7 >= -7 ? `<a class="btn ghost" href="./#/week/${addDays(start, -7)}">이전 7일</a>` : '';
  const next = off + 7 <= 54 ? `<a class="btn ghost" href="./#/week/${addDays(start, 7)}">다음 7일</a>` : '';
  main.innerHTML = `<div class="row between"><h1 tabindex="-1">${start === today ? '이번 주' : `${dateShort(start)}부터 7일`} 물때표</h1><div class="row noprint">${prev}${next}</div></div>
<section class="card week"><div class="tbl"><table>
<caption>${esc(dateShort(days[0]))} ~ ${esc(dateShort(days[6]))} · 만조·한산한 창·붐빔(기간 안 최대 대비 4단계)</caption>
<thead><tr><th scope="col">날짜</th><th scope="col">만조</th><th scope="col">한산한 창</th><th scope="col">붐빔</th></tr></thead><tbody>${tr}</tbody></table></div>
<p class="small muted">날짜를 누르면 그날 물때로 가요.</p>
<button class="btn ghost noprint" type="button" id="print">인쇄하기</button>
<p class="basis">근거: 2024-07 요일군(${Object.values(GROUP_KO).join('·')}) 프로파일 × 월 계절 지수(${esc(months)}). 공휴일은 일요일로 봐요(한국천문연구원 달력자료). <a href="./#/method/tide">만조·한산한 창 규칙</a></p></section>`;
  $('#print').onclick = () => window.print();
}
