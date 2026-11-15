// S7 기관용 데이터 청진기 · 강좌 엇갈림 실험실 · 실시간 아카이브 · 추가 개방 제안
import { $, esc, fmtN, hm, koOnlyNote, load, setTitle } from '../app.js';
import { archiveBlock } from './livepage.js';

const SEV = { high: ['높음', 'hi'], medium: ['보통', 'md'], low: ['낮음', 'lo'] };
const back = '<p class="noprint"><a href="./#/org">← 기관용 처음으로</a></p>';

function card(c) {
  const m = c.metric;
  const num = m.total != null ? `${fmtN(m.found)} <span class="small muted">/ ${fmtN(m.total)} ${esc(m.unit || '')}</span>` : `${fmtN(m.found)} <span class="small muted">${esc(m.unit || '')}</span>`;
  return `<article class="card qcard" aria-labelledby="q-${c.id}">
<div class="row between"><span class="badge ${SEV[c.severity][1]}">${SEV[c.severity][0]}</span><span class="small muted">${esc(c.id)} · ${esc(c.dataset)}</span></div>
<h3 id="q-${c.id}">${esc(c.title)}</h3>
<p class="qnum">${num}</p>
<dl class="kv"><dt>예</dt><dd>${esc(c.example)}</dd><dt>영향</dt><dd>${esc(c.impact)}</dd><dt>개선 제안</dt><dd>${esc(c.fix)}</dd><dt>기대 효과</dt><dd>${esc(c.benefit)}</dd><dt>근거</dt><dd>${esc(c.finding)}</dd><dt>상태</dt><dd>${c.status === 'resolved' ? `해결됨(${esc(c.resolved_at || '')} 확인)` : `열림 · 이 서비스 기록상 ${esc(c.open_since || '')}부터`}</dd></dl>
<div class="row"><code>${esc(c.repro)}</code><button class="btn ghost" type="button" data-copy="${esc(c.repro)}">재현 명령 복사</button></div>
</article>`;
}

async function viewHome(main) {
  setTitle('기관용 데이터 청진기');
  const Q = await load('quality');
  const open = Q.checks.filter((c) => c.status === 'open'), done = Q.checks.filter((c) => c.status === 'resolved');
  main.innerHTML = `${koOnlyNote()}<h1 tabindex="-1">기관용 · 데이터 청진기</h1>
<p>${esc(Q.note)} 서비스를 더 잘 만들기 위한 <strong>개선 제안</strong>으로 정리했어요. 각 카드에 근거 숫자, 고칠 방법, 기대 효과, 재현 명령을 붙였어요.</p>
<div class="tabsel" role="tablist" aria-label="점검 상태"><button role="tab" id="t-open" aria-selected="true" aria-controls="p-q">제안 ${open.length}건</button><button role="tab" id="t-done" aria-selected="false" aria-controls="p-q">해결됨 ${done.length}건</button></div>
<div id="p-q" role="tabpanel" aria-labelledby="t-open"></div>
<section class="card"><h2>운영 인사이트</h2><ul>${Q.insights.map((i) => `<li>${esc(i.text)} <span class="small muted">(${esc(i.finding)})</span></li>`).join('')}</ul>
<p class="basis">만차 기록 구역: ${Object.entries(Q.zones.full_counts).slice(0, 5).map(([z, n]) => `${esc(z)} ${n}회`).join(' · ')} (주차장 혼잡도 스냅숏 ${Q.zones.snapshots}개 기준)</p></section>
<nav class="navlist" aria-label="기관용 도구"><a href="./#/org/lab">강좌 엇갈림 실험실 <span aria-hidden="true">›</span></a><a href="./#/org/archive">실시간 주차 아카이브 <span aria-hidden="true">›</span></a><a href="./#/org/proposals">추가 개방 제안 <span aria-hidden="true">›</span></a></nav>`;
  const panel = $('#p-q');
  const show = (which) => {
    const list = which === 'open' ? open : done;
    $('#t-open').setAttribute('aria-selected', String(which === 'open'));
    $('#t-done').setAttribute('aria-selected', String(which !== 'open'));
    panel.setAttribute('aria-labelledby', which === 'open' ? 't-open' : 't-done');
    panel.innerHTML = list.length ? list.map(card).join('') : '<p class="card">아직 해결된 항목이 없어요. 데이터가 고쳐지면 자동으로 이쪽으로 옮겨져요.</p>';
    panel.querySelectorAll('[data-copy]').forEach((b) => b.addEventListener('click', async () => {
      try { await navigator.clipboard.writeText(b.dataset.copy); b.textContent = '복사했어요'; } catch (e) { b.textContent = '복사하지 못했어요 — 직접 선택해 주세요'; }
    }));
  };
  $('#t-open').onclick = () => show('open');
  $('#t-done').onclick = () => show('done');
  $('.tabsel').addEventListener('keydown', (e) => { if (e.key === 'ArrowRight' || e.key === 'ArrowLeft') { const t = document.activeElement.id === 't-open' ? $('#t-done') : $('#t-open'); t.focus(); t.click(); } });
  show('open');
}

async function viewLab(main) {
  setTitle('강좌 엇갈림 실험실');
  const C = await load('classes');
  const lab = C.lab, beta = C.beta.value;
  const starts = Object.entries(lab.cap_by_start).map(([m, c]) => [+m, c]).filter(([m, c]) => m >= 300 && m <= 1320 && c >= 1);
  const S = { ...lab.default };
  main.innerHTML = `${koOnlyNote()}${back}<h1 tabindex="-1">강좌 시작 시각을 엇갈리면?</h1>
<section class="card"><div class="stack">
<label class="row between" for="lab-h"><span>대상 시각</span><select id="lab-h">${starts.map(([m, c]) => `<option value="${m}"${m === S.H ? ' selected' : ''}>${hm(m)} (평일 평균 ${fmtN(c)}석)</option>`).join('')}</select></label>
<div><label for="lab-f" class="row between"><span>옮길 비율</span><strong id="lab-fv"></strong></label><input type="range" id="lab-f" min="0" max="100" step="10" value="${S.f * 100}"></div>
<div class="row between"><span id="lab-dl">옮길 시간</span><div class="seg" role="group" aria-labelledby="lab-dl">${[10, 20, 30].map((d) => `<button type="button" data-d="${d}" aria-pressed="${d === S.delta}">${d}분</button>`).join('')}</div></div>
</div></section>
<section class="card" aria-live="polite" id="lab-out"></section>
<section class="card"><p class="info"><svg width="16" height="16" aria-hidden="true"><use href="#i-info"/></svg><span>정원 1석당 시작 전 30분 안에 ${beta.toFixed(3)}대(±${C.beta.se.toFixed(3)})가 들어온다는 2024년 7월 관계를 그대로 썼어요. 이 실험은 회원 수·이동 수단 변화를 반영하지 않아요. 실제 효과는 회원 이동 수단에 따라 달라요.</span></p>
<p class="formula">A′(k) = Ā(k) + β · (S′(k) − S̄(k))</p><p class="basis">${esc(lab.basis)}. 결과 값 = 구간 [H−30분, H+이동) 안 10분 입차 최고값.</p></section>`;
  const calc = () => {
    const cap = lab.cap_by_start[String(S.H)] || 0;
    const s2 = lab.sbar.slice();
    for (const [start, w] of [[S.H, -S.f * cap], [S.H + S.delta, S.f * cap]]) { const k = Math.floor(start / 10); for (const j of [1, 2, 3]) if (k - j >= 0 && k - j < 144) s2[k - j] += w / 3; }
    const a2 = lab.abar.map((a, k) => a + beta * (s2[k] - lab.sbar[k]));
    const k0 = Math.floor((S.H - 30) / 10), k1 = Math.floor((S.H + S.delta) / 10);
    let b = k0, a = k0;
    for (let k = k0; k < k1; k++) { if (lab.abar[k] > lab.abar[b]) b = k; if (a2[k] > a2[a]) a = k; }
    return { before: lab.abar[b], bk: b, after: a2[a], ak: a, change: (a2[a] - lab.abar[b]) / lab.abar[b], k0, k1 };
  };
  const render = () => {
    $('#lab-fv').textContent = `${Math.round(S.f * 100)}%`;
    const r = calc(), mx = Math.max(r.before, r.after);
    const sign = r.change > 0 ? '+' : r.change < 0 ? '−' : '';
    $('#lab-out').innerHTML = `<h2>${hm(r.k0 * 10)}~${hm(r.k1 * 10)} 밀물 <span class="small muted">(평일, 7월 규모)</span></h2>
<p>지금 <strong>${fmtN(r.before)}대/10분</strong> 최고 (${hm(r.bk * 10)})<br>바꾸면 <strong>${fmtN(r.after)}대/10분</strong> 최고 (${hm(r.ak * 10)}) · <strong>${sign}${Math.abs(r.change * 100).toFixed(1)}%</strong></p>
<div class="lab-bars" role="img" aria-label="전후 비교: 지금 ${fmtN(r.before)}대, 바꾸면 ${fmtN(r.after)}대">
<div class="lab-bar"><span>지금</span><span class="trk"><span class="fil" style="display:block;width:${(r.before / mx * 100).toFixed(1)}%"></span></span><span class="n">${fmtN(r.before)}대</span></div>
<div class="lab-bar"><span>바꾸면</span><span class="trk"><span class="fil after" style="display:block;width:${(r.after / mx * 100).toFixed(1)}%"></span></span><span class="n">${fmtN(r.after)}대</span></div></div>
<p class="basis">${hm(S.H)}에 시작하는 강좌 정원의 ${Math.round(S.f * 100)}%를 ${S.delta}분 늦췄을 때의 모델 값이에요.</p>`;
  };
  $('#lab-h').onchange = (e) => { S.H = +e.target.value; render(); };
  $('#lab-f').oninput = (e) => { S.f = +e.target.value / 100; render(); };
  main.querySelectorAll('[data-d]').forEach((b) => b.addEventListener('click', () => { S.delta = +b.dataset.d; main.querySelectorAll('[data-d]').forEach((x) => x.setAttribute('aria-pressed', String(x === b))); render(); }));
  render();
}

async function viewArchive(main) {
  setTitle('실시간 주차 아카이브');
  const [live, Q] = await Promise.all([load('live', { optional: true }), load('quality', { optional: true })]);
  main.innerHTML = `${koOnlyNote()}${back}<h1 tabindex="-1">실시간 주차 아카이브</h1><p>기관 실시간 API는 지금 값 하나만 줘요. 이 서비스가 15분마다 기록해 처음으로 공개 시계열을 쌓고 있어요.</p>${archiveBlock(live, Q)}`;
}

async function viewProposals(main) {
  setTitle('추가 개방 제안');
  const P = await load('proposals');
  main.innerHTML = `${koOnlyNote()}${back}<h1 tabindex="-1">추가 개방 제안 ${P.items.length}건</h1><p>${esc(P.note)}</p>
${P.items.map((p) => `<article class="card" aria-labelledby="p-${p.id}"><p class="small muted">${esc(p.id)}</p><h2 id="p-${p.id}">${esc(p.title)}</h2>
<dl class="kv"><dt>우리가 부딪힌 지점</dt><dd>${esc(p.hit)}</dd><dt>열리면</dt><dd>${esc(p.benefit)}</dd><dt>근거</dt><dd>${esc(p.basis.join(', '))}</dd></dl></article>`).join('')}`;
}

export default function viewOrg(main, sub) {
  if (sub === 'lab') return viewLab(main);
  if (sub === 'archive') return viewArchive(main);
  if (sub === 'proposals') return viewProposals(main);
  return viewHome(main);
}
