// 올팍 물때 — 진입 모듈(라우터·데이터·모델·차트·오늘 화면·시트·사리·실시간 카드·ics).
// 첫 화면 요청 수를 줄이려고 홈에 필요한 코드는 이 파일 하나에 두고, 나머지 화면은 지연 로드한다.
// 계산식은 build/tide.py · build/model_*.py와 같다. 숫자는 모두 ./data/*.json에서 읽는다.

/* ---------------- 공통 유틸 ---------------- */
export const $ = (s, r = document) => r.querySelector(s);
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmtN = (n) => Math.round(n).toLocaleString('ko-KR');
export const pad = (n) => String(n).padStart(2, '0');
export const hm = (m) => { m = ((Math.round(m) % 1440) + 1440) % 1440; return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; };
export const hmKo = (m) => { m = ((Math.round(m) % 1440) + 1440) % 1440; const h = Math.floor(m / 60), mi = m % 60; return mi ? `${h}시 ${mi}분` : `${h}시`; };
export const durKo = (m) => { m = Math.abs(Math.round(m)); const h = Math.floor(m / 60), mi = m % 60; return h ? (mi ? `${h}시간 ${mi}분` : `${h}시간`) : `${mi}분`; };
export const binLabel = (k) => `${hm(k * 10)} ~ ${hm(k * 10 + 10)}`;
export const icon = (id, size = 18) => `<svg width="${size}" height="${size}" aria-hidden="true" focusable="false"><use href="#i-${id}"/></svg>`;
export const ext = (href, text, cls = '') => `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener">${text} ${icon('ext', 14)}<span class="sr-only">(새 창)</span></a>`;
const WD = ['월', '화', '수', '목', '금', '토', '일'];
export const store = {
  get(k) { try { return localStorage.getItem('olpark.' + k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem('olpark.' + k, v); } catch (e) { /* 막혀도 정상 동작 */ } },
};

/* ---------------- 날짜(Asia/Seoul) ---------------- */
const dtf = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
export function nowKST() {
  const p = Object.fromEntries(dtf.formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, min: (+p.hour) * 60 + (+p.minute) };
}
const toD = (iso) => new Date(iso + 'T00:00:00Z');
export const addDays = (iso, n) => { const d = toD(iso); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const wdOf = (iso) => (toD(iso).getUTCDay() + 6) % 7; // 월=0
export const diffDays = (a, b) => Math.round((toD(a) - toD(b)) / 864e5);
export const dateKo = (iso) => { const d = toD(iso); return `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${WD[wdOf(iso)]})`; };
export const dateShort = (iso) => { const d = toD(iso); return `${d.getUTCMonth() + 1}/${d.getUTCDate()}${WD[wdOf(iso)]}`; };
export const fmtStamp = (s) => s ? s.slice(0, 16).replace('T', ' ') : '';

/* ---------------- 데이터 ---------------- */
const cache = {};
export function load(name, opt = {}) {
  if (!cache[name]) {
    cache[name] = fetch(`./data/${name}.json`, { cache: 'no-cache' }).then((r) => {
      if (!r.ok) throw new Error(`${name} ${r.status}`);
      return r.json();
    }).catch((e) => { delete cache[name]; if (opt.optional) return null; throw e; });
  }
  return cache[name];
}
export const loadCore = () => Promise.all(['meta', 'profiles', 'season', 'context', 'holidays'].map((n) => load(n)))
  .then(([meta, profiles, season, context, holidays]) => ({ meta, profiles, season, context, holidays }));

/* ---------------- 모델 ---------------- */
export const GROUP_KO = { weekday: '평일', sat: '토요일', sun: '일요일' };
export function groupOf(iso, hol) {
  if (hol && hol.dates[iso]) return 'sun';
  const w = wdOf(iso);
  return w < 5 ? 'weekday' : (w === 5 ? 'sat' : 'sun');
}
export function forecast(iso, D) {
  const g = groupOf(iso, D.holidays);
  const m = +iso.slice(5, 7);
  const s = D.season.index[String(m)];
  const G = D.profiles.groups[g];
  const mul = (a) => a.map((x) => x * s);
  return { iso, g, m, s, cv: D.season.cv[String(m)], occ: mul(G.occ), arr: mul(G.arr), dep: mul(G.dep), lo: mul(G.occ_lo), hi: mul(G.occ_hi), G, holiday: D.holidays.dates[iso] || null };
}
export const toMin = (t) => { const [h, m] = t.split(':').map(Number); return h * 60 + m; };
export function sari(fc, ov, T) {
  const shift = Math.round((T - toMin(ov.ref_start)) / 10);
  const at = (a, k) => { const j = k - shift; return j >= 0 && j < 144 ? a[j] : 0; };
  const occ = fc.occ.map((x, k) => Math.max(0, x + at(ov.d_occ, k)));
  const arr = fc.arr.map((x, k) => Math.max(0, x + at(ov.d_arr, k)));
  const dOcc = fc.occ.map((_, k) => at(ov.d_occ, k));
  const dArr = fc.arr.map((_, k) => at(ov.d_arr, k));
  return { occ, arr, dOcc, dArr, T };
}
export function smooth3(a) {
  return a.map((_, k) => { const s = a.slice(Math.max(0, k - 1), Math.min(a.length, k + 2)); return s.reduce((x, y) => x + y, 0) / s.length; });
}
const median = (v) => { const s = [...v].sort((a, b) => a - b), n = s.length; return n % 2 ? s[(n - 1) / 2] : (s[n / 2 - 1] + s[n / 2]) / 2; };
function prominence(sm, k, a, b) {
  let lmin = sm[k], rmin = sm[k];
  for (let j = k - 1; j >= a && sm[j] <= sm[k]; j--) lmin = Math.min(lmin, sm[j]);
  for (let j = k + 1; j <= b && sm[j] <= sm[k]; j++) rmin = Math.min(rmin, sm[j]);
  return sm[k] - Math.max(lmin, rmin);
}
// §6.6 — build/tide.py와 같은 규칙
export function tideStats(occ, arr, R) {
  const sm = smooth3(occ), sa = smooth3(arr);
  const [A, B] = R.hi, W = R.win;
  const dmax = Math.max(...sm.slice(A, B + 1));
  const cands = [];
  for (let k = A; k <= B; k++) {
    const l = k > A ? sm[k - 1] : -Infinity, r = k < B ? sm[k + 1] : -Infinity;
    if (sm[k] >= l && sm[k] > r && prominence(sm, k, A, B) >= R.prom * dmax) cands.push([sm[k], k]);
  }
  cands.sort((x, y) => y[0] - x[0] || y[1] - x[1]);
  const highs = [];
  for (const [, k] of cands) { if (highs.every((c) => Math.abs(k - c) >= W)) highs.push(k); if (highs.length === 3) break; }
  const main = highs[0];
  highs.sort((x, y) => x - y);
  const [LA, LB] = R.low;
  const amed = median(sa.slice(LA, LB));
  const ok = []; for (let k = LA; k < LB; k++) ok.push(sm[k] <= R.low_occ * dmax && sa[k] <= amed);
  let runs = [];
  for (let i = 0; i < ok.length;) {
    if (ok[i]) { let j = i; while (j < ok.length && ok[j]) j++; if (j - i >= R.low_min) runs.push([LA + i, LA + j]); i = j; } else i++;
  }
  runs = runs.map((r, i) => [r, i]).sort((x, y) => (y[0][1] - y[0][0]) - (x[0][1] - x[0][0]) || x[1] - y[1]).slice(0, 2).map((x) => x[0]).sort((x, y) => x[0] - y[0]);
  let pa = R.arr[0]; for (let k = R.arr[0]; k < R.arr[1]; k++) if (arr[k] > arr[pa]) pa = k;
  return { highs, main, lows: runs, peakArr: pa, max: dmax };
}
// 강좌: 그 날짜에 유효한 강좌(§6.8). 기준일 뒤 날짜는 기준일 시간표를 쓴다.
export function classesOn(iso, C) {
  const w = wdOf(iso), ref = C.ref_date, by = new Map();
  for (const c of C.classes) {
    if (!c.days.includes(w)) continue;
    const inRange = c.valid[0] <= iso && iso <= c.valid[1];
    if (!(inRange || (iso > ref && c.on_ref))) continue;
    const prev = by.get(c.id);
    if (!prev || (inRange && !(prev.valid[0] <= iso && iso <= prev.valid[1]))) by.set(c.id, c);
  }
  return [...by.values()];
}
export function classesStale(iso, C) {
  const latest = Object.values(C.latest_month).sort().pop();
  return iso > addDays(latest + '-01', 62) ? latest : null;
}
export const BASIS = (D, fc) => {
  const rows = D.profiles.basis.rows;
  const man = rows >= 10000 ? `${Math.floor(rows / 10000)}만` : fmtN(rows);
  let s = `근거: 2024년 7월 입출차 ${man} 건 × ${fc.m}월 계절 지수 ${fc.s.toFixed(2)}`;
  if (fc.cv >= D.season.high_cv_threshold) s += ' · 해마다 차이가 큰 달이에요';
  return s;
};

/* ---------------- 물때 차트(SVG, §13.6) ---------------- */
const VB = { w: 360, h: 222, l: 40, r: 352, top: 14, base: 148, bTop: 160, bBase: 196, k0: 30, k1: 144 };
const X = (k) => VB.l + (k - VB.k0) / (VB.k1 - VB.k0) * (VB.r - VB.l);
function niceTop(v) { const step = v > 1600 ? 500 : v > 800 ? 250 : v > 300 ? 100 : 50; return Math.max(step, Math.ceil(v / step) * step); }
const pathOf = (a, Y, k0 = VB.k0) => { let d = ''; for (let k = k0; k < 144; k++) d += `${k === k0 ? 'M' : 'L'}${X(k + 0.5).toFixed(1)},${Y(a[k]).toFixed(1)}`; return d; };
export function tideChart(el, fc, opt) {
  const st = { k: opt.cursor ?? null };
  const occs = [fc.hi, fc.occ, opt.sari ? opt.sari.occ : []].flat();
  const top = niceTop(Math.max(...occs.slice(0)));
  const Y = (v) => VB.base - (v / top) * (VB.base - VB.top);
  const arrA = opt.sari ? opt.sari.arr : fc.arr;
  const amax = Math.max(...arrA.slice(30), 1);
  const YB = (v) => VB.bBase - (v / amax) * (VB.bBase - VB.bTop);
  const ts = opt.stats;
  const bw = (X(1) - X(0)) * 0.72;
  let bars = '';
  for (let k = 30; k < 144; k++) { const y = YB(arrA[k]); bars += `<rect x="${(X(k) + 0.6).toFixed(1)}" y="${y.toFixed(1)}" width="${bw.toFixed(1)}" height="${Math.max(0, VB.bBase - y).toFixed(1)}" rx="0.8"/>`; }
  let band = `M${X(30.5)},${Y(fc.hi[30])}`;
  for (let k = 31; k < 144; k++) band += `L${X(k + 0.5).toFixed(1)},${Y(fc.hi[k]).toFixed(1)}`;
  for (let k = 143; k >= 30; k--) band += `L${X(k + 0.5).toFixed(1)},${Y(fc.lo[k]).toFixed(1)}`;
  const ticks = [6, 10, 14, 18, 22].map((h) => `<line x1="${X(h * 6)}" x2="${X(h * 6)}" y1="${VB.top}" y2="${VB.bBase}"/><text x="${X(h * 6)}" y="${VB.h - 6}" text-anchor="middle">${pad(h)}</text>`).join('');
  const yt = [0, top / 2, top].map((v) => `<line x1="${VB.l}" x2="${VB.r}" y1="${Y(v)}" y2="${Y(v)}"${v === 0 ? ' class="base"' : ''}/><text x="${VB.l - 5}" y="${Y(v) + 4}" text-anchor="end">${fmtN(v)}</text>`).join('');
  const occA = opt.sari ? opt.sari.occ : fc.occ;
  let hi = '';
  ts.highs.forEach((k) => {
    const x = X(k + 0.5), y = Y(occA[k]) - 6, isMain = k === ts.main;
    const label = isMain ? `만조 ${hm(k * 10)}` : hm(k * 10);
    const anchor = x > VB.r - 40 ? 'end' : x < VB.l + 40 ? 'start' : 'middle';
    hi += `<path d="M${x - 5},${y - 1} L${x + 5},${y - 1} L${x},${y + 6}Z" transform="rotate(180 ${x} ${y + 2.5})"/>`;
    if (isMain || ts.highs.every((j) => j === k || Math.abs(X(j) - X(k)) > 56)) hi += `<text x="${x}" y="${Math.max(10, y - 6)}" text-anchor="${anchor}">${label}</text>`;
  });
  let now = '';
  if (opt.nowMin != null && opt.nowMin >= 300) { const x = X(opt.nowMin / 10); now = `<g class="now"><line x1="${x}" x2="${x}" y1="${VB.top}" y2="${VB.bBase}"/><text x="${x + 3}" y="${VB.top + 8}">지금</text></g>`; }
  const sariP = opt.sari ? `<path class="sari draw" d="${pathOf(opt.sari.occ, Y)}"/>` : '';
  const title = opt.title, desc = opt.desc;
  el.innerHTML = `<svg viewBox="0 0 ${VB.w} ${VB.h}" role="img" aria-labelledby="ct cd" preserveAspectRatio="xMidYMid meet">
<title id="ct">${esc(title)}</title><desc id="cd">${esc(desc)}</desc>
<g class="ax">${yt}${ticks}<line class="base" x1="${VB.l}" x2="${VB.r}" y1="${VB.bBase}" y2="${VB.bBase}"/></g>
<text class="lbl" x="${VB.l}" y="${VB.top - 4}">점유(대)</text>
<text class="lbl" x="${VB.l - 5}" y="${VB.bTop + 8}" text-anchor="end">입차</text>
<path class="band" d="${band}Z"/>
<g class="bars">${bars}</g>
<path class="occ draw" d="${pathOf(fc.occ, Y)}"/>
${sariP}<g class="hi">${hi}</g>${now}<g class="cur" id="cur"></g>
<rect id="hit" x="${VB.l}" y="0" width="${VB.r - VB.l}" height="${VB.bBase}" fill="transparent"/>
</svg>`;
  const svg = el.querySelector('svg'), cur = el.querySelector('#cur');
  const draw = () => {
    if (st.k == null) { cur.innerHTML = ''; return; }
    const k = st.k, x = X(k + 0.5);
    cur.innerHTML = `<line x1="${x}" x2="${x}" y1="${VB.top}" y2="${VB.bBase}"/><circle cx="${x}" cy="${Y(occA[k])}" r="4.5"/>`;
  };
  let raf = 0;
  const set = (k, announce = true) => {
    k = Math.max(30, Math.min(143, k)); st.k = k;
    cancelAnimationFrame(raf); raf = requestAnimationFrame(draw);
    opt.onMove && opt.onMove(k, announce);
  };
  const kAt = (e) => { const r = svg.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * VB.w; return Math.floor(VB.k0 + (x - VB.l) / (VB.r - VB.l) * (VB.k1 - VB.k0)); };
  let downAt = null;
  svg.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || downAt) set(kAt(e)); });
  svg.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX, t: Date.now() }; set(kAt(e)); });
  svg.addEventListener('pointerup', (e) => { if (downAt && Math.abs(e.clientX - downAt.x) < 12) opt.onPick && opt.onPick(kAt(e)); downAt = null; });
  svg.addEventListener('pointercancel', () => { downAt = null; });
  el.onkeydown = (e) => {
    const step = e.shiftKey ? 6 : 1, k = st.k ?? (opt.nowMin ? Math.floor(opt.nowMin / 10) : ts.main ?? 60);
    if (e.key === 'ArrowRight') set(st.k == null ? k : k + step);
    else if (e.key === 'ArrowLeft') set(st.k == null ? k : k - step);
    else if (e.key === 'Home') set(30);
    else if (e.key === 'End') set(143);
    else if (e.key === 'Enter' || e.key === ' ') { if (st.k == null) set(k); opt.onPick && opt.onPick(st.k); }
    else return;
    e.preventDefault();
  };
  if (st.k != null) draw();
  return { set };
}

/* ---------------- 바텀 시트(§S2) ---------------- */
let sheetState = null;
export function openSheet(title, bodyHtml, onClose) {
  closeSheet(true);
  const root = $('#sheet-root');
  const opener = document.activeElement;
  root.innerHTML = `<div class="scrim" data-close></div><div class="sheet" role="dialog" aria-modal="true" aria-labelledby="sheet-t">
<div class="grip" aria-hidden="true"></div>
<div class="sheet-hd"><h2 id="sheet-t" tabindex="-1">${title}</h2><button class="iconbtn" type="button" data-close aria-label="닫기">${icon('close', 20)}</button></div>
<div class="sheet-bd">${bodyHtml}</div></div>`;
  const sheet = $('.sheet', root);
  sheetState = { opener, onClose, sheet };
  root.querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', () => closeSheet()));
  const key = (e) => {
    if (e.key === 'Escape') { e.preventDefault(); closeSheet(); }
    if (e.key === 'Tab') {
      const f = [...sheet.querySelectorAll('a[href],button,select,input,[tabindex="0"]')].filter((x) => !x.disabled);
      if (!f.length) return;
      if (e.shiftKey && document.activeElement === f[0]) { e.preventDefault(); f[f.length - 1].focus(); }
      else if (!e.shiftKey && document.activeElement === f[f.length - 1]) { e.preventDefault(); f[0].focus(); }
    }
  };
  document.addEventListener('keydown', key);
  sheetState.key = key;
  // 아래로 끌어 닫기
  const grip = $('.grip', root); let y0 = null;
  const hd = $('.sheet-hd', root);
  [grip, hd].forEach((g) => {
    g.addEventListener('pointerdown', (e) => { if (e.target.closest('button')) return; y0 = e.clientY; g.setPointerCapture(e.pointerId); });
    g.addEventListener('pointermove', (e) => { if (y0 != null) sheet.style.transform = `translateY(${Math.max(0, e.clientY - y0)}px)`; });
    g.addEventListener('pointerup', (e) => { if (y0 != null && e.clientY - y0 > 80) closeSheet(); else sheet.style.transform = ''; y0 = null; });
  });
  $('#sheet-t').focus();
  return sheet;
}
export function closeSheet(silent) {
  if (!sheetState) return;
  const s = sheetState; sheetState = null;
  document.removeEventListener('keydown', s.key);
  $('#sheet-root').innerHTML = '';
  if (!silent) { s.onClose && s.onClose(); if (s.opener && s.opener.focus && document.contains(s.opener)) s.opener.focus(); }
}

/* ---------------- 실시간(§F07, §11) ---------------- */
export function classifyLive(txt) {
  let d; try { d = JSON.parse(txt); } catch (e) { return { status: 'error' }; }
  if (d && !Array.isArray(d) && typeof d === 'object') return { status: (d.error || JSON.stringify(d).includes('9999')) ? 'maintenance' : 'error' };
  const v = Array.isArray(d) && d[0] && d[0].parking_sum;
  if (typeof v !== 'number' || !isFinite(v)) return { status: 'error' };
  if (v <= 0 || v >= 10000) return { status: 'outlier' };
  return { status: 'ok', value: v };
}
export async function fetchLive(url) {
  const ctl = new AbortController(); const t = setTimeout(() => ctl.abort(), 5000);
  try {
    const r = await fetch(url, { signal: ctl.signal, cache: 'no-store', credentials: 'omit' });
    if (!r.ok) return { status: 'error' };
    return { ...classifyLive(await r.text()), at: nowKST() };
  } catch (e) { return { status: 'error' }; } finally { clearTimeout(t); }
}
export function slotOf(iso, min) { return `${wdOf(iso)}-${Math.floor(min / 15)}`; }
export function rankText(live, iso, min, value) {
  if (!live || !live.days) return '같은 요일·시각 기록을 쌓는 중이에요 (첫 기록 전).';
  const key = slotOf(iso, min), s = live.slots[key];
  if (!s || s.n < 2) return `같은 요일·시각 기록을 쌓는 중이에요 (${live.days}일째).`;
  const vals = live.readings.filter(([ts]) => { const d = ts.slice(0, 10), m = +ts.slice(11, 13) * 60 + +ts.slice(14, 16); return slotOf(d, m) === key && d !== iso; }).map((r) => r[1]);
  const all = [...vals, value].sort((a, b) => b - a);
  const r = all.indexOf(value) + 1;
  return `같은 요일·시각 기록 ${all.length}회 중 ${r === 1 ? '가장 많아요' : r === all.length ? '가장 적어요' : `${r}번째로 많아요`} (중앙값 ${fmtN(s.median)}대)`;
}
let liveTimer = 0;
export function liveCard(el, D, live, opts = {}) {
  const render = (res) => {
    let val, sub, note = '';
    if (res.status === 'ok') {
      val = `<span class="val">${fmtN(res.value)}대</span>`;
      sub = `${hm(res.at.min)} 기준 · 5분마다 새로 받아요`;
      note = esc(rankText(live, res.at.date, res.at.min, res.value));
    } else {
      const last = live && live.last_ok;
      const msg = res.status === 'maintenance' ? '기관 실시간 주차 서비스가 점검 중이에요.'
        : res.status === 'outlier' ? '실시간 값이 평소 범위를 벗어나 표시하지 않았어요.'
          : res.status === 'loading' ? '실시간 값을 받는 중이에요…' : '실시간 값을 불러오지 못했어요.';
      val = last && res.status !== 'loading' ? `<span class="val stale">${fmtN(last[1])}대</span>` : '';
      sub = esc(msg) + (last && res.status !== 'loading' ? ` 마지막 기록은 ${esc(fmtStamp(last[0]).slice(5))}의 ${fmtN(last[1])}대예요.` : '');
      if (res.status !== 'loading') sub += ` <button type="button" class="linkbtn" data-retry>다시 시도</button>`;
    }
    const today = nowKST().date;
    const pts = live && live.readings ? live.readings.filter((r) => r[0].startsWith(today)) : [];
    let spark = '';
    if (pts.length > 1) {
      const mx = Math.max(...pts.map((p) => p[1])), mn = Math.min(...pts.map((p) => p[1]));
      const d = pts.map((p, i) => { const m = +p[0].slice(11, 13) * 60 + +p[0].slice(14, 16); return `${i ? 'L' : 'M'}${(m / 1440 * 200).toFixed(1)},${(36 - (p[1] - mn) / Math.max(1, mx - mn) * 32).toFixed(1)}`; }).join('');
      spark = `<svg class="spark" viewBox="0 0 200 40" preserveAspectRatio="none" role="img" aria-label="오늘 실시간 기록 ${pts.length}회"><path d="${d}"/></svg>`;
    }
    el.innerHTML = `<div class="card live"><div class="row between"><h2>${opts.title || '지금 실시간'}</h2>${opts.link === false ? '' : '<a href="./#/live">자세히</a>'}</div>
<div aria-live="polite">${val}<p class="small muted">${sub}</p>${note ? `<p class="small">${note}</p>` : ''}</div>${spark}
${opts.link === false ? '' : `<p class="info">${icon('info', 16)}<span>이 값은 장기주차 차량이 포함될 수 있어 아래 물때 곡선과 단위가 달라요. 그래서 같은 축에 그리지 않아요.</span></p>`}
<p class="basis">출처: 한국체육산업개발 실시간 주차현황(15168686)</p></div>`;
    const b = el.querySelector('[data-retry]'); if (b) b.onclick = run;
  };
  const run = async () => { render({ status: 'loading' }); render(await fetchLive(D.meta.live_api)); };
  clearInterval(liveTimer);
  run();
  liveTimer = setInterval(() => { if (document.visibilityState === 'visible' && document.contains(el)) run(); else if (!document.contains(el)) clearInterval(liveTimer); }, 5 * 60 * 1000);
}

/* ---------------- .ics (§6.7) ---------------- */
function icsFold(line) {
  const enc = new TextEncoder(); const out = []; let cur = '', n = 0;
  for (const ch of line) {
    const b = enc.encode(ch).length;
    if (n + b > (out.length ? 74 : 75)) { out.push(cur); cur = ''; n = 0; }
    cur += ch; n += b;
  }
  out.push(cur);
  return out.join('\r\n ');
}
const icsEsc = (s) => s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\n/g, '\\n');
function icsDt(iso, min) { const d = addDays(iso, Math.floor(min / 1440)); const m = ((min % 1440) + 1440) % 1440; return `${d.replace(/-/g, '')}T${pad(Math.floor(m / 60))}${pad(m % 60)}00`; }
export function buildIcs(iso, T, ov, siteUrl, host) {
  const o = ov.offsets_min, day = iso.replace(/-/g, ''), tag = `${day}-${hm(T).replace(':', '')}`;
  const stamp = new Date().toISOString().replace(/[-:]/g, '').slice(0, 15) + 'Z';
  const src = ov.source_day, srcKo = `${+src.slice(5, 7)}월 ${+src.slice(8, 10)}일(${WD[wdOf(src)]})`;
  const tail = `근거·한계: ${siteUrl}#/method/sari`;
  const ev = (n, start, len, sum, desc, alarm) => [
    'BEGIN:VEVENT', `UID:olpark-multtae-${tag}-${n}@${host}`, `DTSTAMP:${stamp}`,
    `DTSTART;TZID=Asia/Seoul:${icsDt(iso, start)}`, `DTEND;TZID=Asia/Seoul:${icsDt(iso, start + len)}`,
    `SUMMARY:${icsEsc(sum)}`, `DESCRIPTION:${icsEsc(desc + '\n' + tail)}`,
    'BEGIN:VALARM', 'ACTION:DISPLAY', `DESCRIPTION:${icsEsc(sum)}`, `TRIGGER:-PT${alarm}M`, 'END:VALARM', 'END:VEVENT'];
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//olpark-multtae//KO', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH',
    'BEGIN:VTIMEZONE', 'TZID:Asia/Seoul', 'BEGIN:STANDARD', 'DTSTART:19700101T000000', 'TZOFFSETFROM:+0900', 'TZOFFSETTO:+0900', 'TZNAME:KST', 'END:STANDARD', 'END:VTIMEZONE',
    ...ev(1, T + o.rush_start - 20, 20, '올팍 물때: 입차 몰림 전 도착', `${src.slice(0, 4)}-${src.slice(5)}(${WD[wdOf(src)]}) 기록에서 공연 ${durKo(o.rush_start)} 전부터 입차가 몰렸어요. 대중교통도 고려해 보세요.`, 60),
    ...ev(2, T + o.clear, 10, '올팍 물때: 썰물이 빠지는 시각', `기록상(${srcKo}) 공연 시작 ${durKo(o.exit_peak)} 뒤 출차가 가장 몰렸고, ${durKo(o.clear)} 뒤 평소 수준으로 돌아왔어요.`, 15),
    'END:VCALENDAR'];
  return lines.map(icsFold).join('\r\n') + '\r\n';
}
function download(name, text, type) {
  const url = URL.createObjectURL(new Blob([text], { type }));
  const a = document.createElement('a'); a.href = url; a.download = name; document.body.appendChild(a); a.click();
  setTimeout(() => { URL.revokeObjectURL(url); a.remove(); }, 500);
}

/* ---------------- 공통 상태 화면 ---------------- */
export function emptyState(title, body, action) {
  return `<section class="empty"><h1 tabindex="-1">${esc(title)}</h1><p class="muted">${esc(body)}</p>${action || ''}</section>`;
}
export function errorState(main, retry) {
  main.innerHTML = emptyState('데이터를 불러오지 못했어요', '네트워크를 확인하고 다시 시도해 주세요.', '<button class="btn" type="button" id="retry">다시 시도</button>');
  $('#retry').onclick = retry;
}

/* ---------------- 오늘의 물때(S1·S2·S3) ---------------- */
function parseQuery(q) { return Object.fromEntries(new URLSearchParams(q || '')); }
function setQuery(path, params) {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '')).toString();
  history.replaceState(null, '', `#${path}${q ? '?' + q : ''}`);
}

async function viewToday(main, path, qs, dateParam) {
  const D = await loadCore();
  const now = nowKST(), today = now.date;
  let iso = dateParam || today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || isNaN(toD(iso))) return viewNotFound(main);
  const off = diffDays(iso, today);
  setTitle(iso === today ? '오늘의 물때' : `${dateKo(iso)} 물때`);
  if (off < -7 || off > 60) {
    main.innerHTML = emptyState('이 날짜는 보여 드리지 않아요', '오늘부터 앞으로 60일, 지난 7일까지 볼 수 있어요.', '<a class="btn" href="./#/">오늘로 가기</a>');
    return;
  }
  const q = parseQuery(qs);
  const fc = forecast(iso, D);
  const ov = D.profiles.event_overlay[fc.g === 'weekday' ? '' : fc.g];
  const isToday = iso === today;
  const S = { sariT: null, cursor: null };
  if (ov && q.show && /^\d{4}$/.test(q.show)) { const t = +q.show.slice(0, 2) * 60 + +q.show.slice(2); if (t >= 720 && t <= 1260) S.sariT = t; }
  S.panelOpen = S.sariT != null;
  const basis = BASIS(D, fc);
  const intro = store.get('intro') ? '' : `<div class="card intro" id="intro"><p><strong>올림픽공원에도 물때가 있어요.</strong> 언제 차오르고 언제 빠지는지, 그리고 왜 그런지 기관 데이터로 보여 드려요.</p><button class="btn ghost" type="button" id="intro-x">알겠어요</button></div>`;
  const minD = addDays(today, -7), maxD = addDays(today, 60);
  main.innerHTML = `${intro}
<div class="datenav">
  <a class="iconbtn" href="./#/day/${addDays(iso, -1)}" aria-label="전날"${off <= -7 ? ' aria-disabled="true" tabindex="-1" style="visibility:hidden"' : ''}>${icon('left', 20)}</a>
  <h1 tabindex="-1">${isToday ? '오늘 · ' : ''}${dateKo(iso)}</h1>
  <a class="iconbtn" href="./#/day/${addDays(iso, 1)}" aria-label="다음 날"${off >= 60 ? ' aria-disabled="true" tabindex="-1" style="visibility:hidden"' : ''}>${icon('right', 20)}</a>
</div>
<div class="datepick"><span class="chip">${fc.holiday ? `${esc(fc.holiday)} · 일요일처럼 봐요` : GROUP_KO[fc.g]} · ${fc.m}월 지수 ${fc.s.toFixed(2)}</span>
  <label class="row small"><span class="sr-only">날짜 고르기</span><input type="date" id="pick" value="${iso}" min="${minD}" max="${maxD}" aria-label="날짜 고르기"></label></div>
<section class="card" aria-labelledby="k-t"><h2 id="k-t" class="sr-only">오늘의 물때 요약</h2><div class="keys" id="keys"></div><p class="basis">${esc(basis)} · <a href="./#/method/season">계산 방법 보기</a></p></section>
<div id="live"></div>
<section class="card" aria-labelledby="c-t">
  <div class="row between"><h2 id="c-t">하루 물때 곡선</h2><span class="small muted">05:00 ~ 24:00</span></div>
  <ul class="legend" id="legend"></ul>
  <div class="chart" id="chart" tabindex="0" role="group" aria-label="물때 곡선. 화살표로 10분, Shift+화살표로 1시간 이동, Enter로 그 시각의 물결 자세히 보기"></div>
  <div class="readout" id="readout" aria-live="polite"></div>
  <p class="small muted">봉우리를 누르면 그 시각 물결의 정체를 볼 수 있어요.</p>
  <details><summary>표로 보기</summary><div class="tbl" id="tbl"></div></details>
</section>
<section class="card" id="sari"></section>
<section class="card" aria-labelledby="ctx-t"><h2 id="ctx-t">오늘의 공원</h2><div class="chips" id="ctx"></div></section>`;
  if (intro) $('#intro-x').onclick = () => { store.set('intro', '1'); $('#intro').remove(); };
  $('#pick').addEventListener('change', (e) => { const v = e.target.value; if (v) location.hash = `#/day/${v}`; });

  const syncUrl = () => setQuery(dateParam ? `/day/${iso}` : '/', { t: S.cursorOpen != null ? hm(S.cursorOpen * 10).replace(':', '') : null, show: S.sariT != null ? hm(S.sariT).replace(':', '') : null });

  const draw = () => {
    const sar = S.sariT != null && ov ? sari(fc, ov, S.sariT) : null;
    const ts = tideStats(sar ? sar.occ : fc.occ, sar ? sar.arr : fc.arr, D.profiles.tide_rules);
    const A = sar ? sar.arr : fc.arr, O = sar ? sar.occ : fc.occ;
    const others = ts.highs.filter((k) => k !== ts.main);
    $('#keys').innerHTML = `<div class="key"><span class="lab">${isToday ? '오늘 ' : ''}만조 (가장 붐비는 시각)</span>${ts.main != null
      ? `<span class="val" aria-label="${hmKo(ts.main * 10)}">${hm(ts.main * 10)}${others.length ? `<span class="sub"> · ${others.map((k) => hm(k * 10)).join(' · ')}</span>` : ''}</span><span class="small muted">점유 약 ${fmtN(O[ts.main])}대${sar ? ' · 사리 시나리오 반영' : ''}</span>`
      : '<span class="mid">오늘은 뚜렷한 만조가 없어요.</span>'}</div>
<div class="keys2"><div class="key"><span class="lab">한산한 창</span><span class="mid">${ts.lows.length ? ts.lows.map(([a, b]) => `${hm(a * 10)}~${hm(b * 10)}`).join('<br>') : '<span class="small">오늘은 뚜렷한 한산한 창이 없어요.</span>'}</span></div>
<div class="key"><span class="lab">밀물 최고</span><span class="mid">${hm(ts.peakArr * 10)}</span><span class="small muted">10분 ${fmtN(A[ts.peakArr])}대</span></div></div>`;
    $('#legend').innerHTML = `<li><span class="sw"></span>점유 예보</li><li><span class="sw band"></span>관측 범위(${fc.G.band === 'p25-p75' ? '25~75%' : `최소~최대, ${fc.G.n_days_occ}일`})</li><li><span class="sw bar"></span>10분 입차(밀물)</li>${sar ? '<li><span class="sw sari"></span>사리 시나리오(추정)</li>' : ''}`;
    const desc = `${dateKo(iso)} ${GROUP_KO[fc.g]} 물때. ${ts.main != null ? `만조 ${hmKo(ts.main * 10)}, 최대 약 ${fmtN(O[ts.main])}대. ` : ''}${ts.lows.length ? `한산한 창 ${ts.lows.map(([a, b]) => `${hmKo(a * 10)}부터 ${hmKo(b * 10)}까지`).join(', ')}. ` : ''}밀물 최고 ${hmKo(ts.peakArr * 10)} 10분 ${fmtN(A[ts.peakArr])}대.`;
    const readout = $('#readout');
    S.chart = tideChart($('#chart'), fc, {
      stats: ts, sari: sar, nowMin: isToday ? now.min : null, cursor: S.cursor, title: `${dateKo(iso)} 물때 곡선`, desc,
      onMove: (k) => { S.cursor = k; readout.textContent = `${hm(k * 10)} · 점유 약 ${fmtN(O[k])}대 · 10분 입차 약 ${fmtN(A[k])}대`; },
      onPick: (k) => openWave(k),
    });
    let rows = '';
    for (let h = 5; h < 24; h++) { const k = h * 6; rows += `<tr><th scope="row">${pad(h)}:00</th><td class="n">${fmtN(O[k])}</td><td class="n">${fmtN(fc.lo[k])}~${fmtN(fc.hi[k])}</td><td class="n">${fmtN(A.slice(k, k + 6).reduce((x, y) => x + y, 0))}</td></tr>`; }
    $('#tbl').innerHTML = `<table><caption>매시 정각 점유 예보와 1시간 입차(${sar ? '사리 시나리오 반영' : '예보'})</caption><thead><tr><th scope="col">시각</th><th scope="col" class="n">점유(대)</th><th scope="col" class="n">관측 범위</th><th scope="col" class="n">1시간 입차</th></tr></thead><tbody>${rows}</tbody></table>`;
  };

  const openWave = async (k) => {
    S.cursorOpen = k; syncUrl();
    const sar = S.sariT != null && ov ? sari(fc, ov, S.sariT) : null;
    const h = Math.floor(k / 6);
    const share = D.profiles.short_stop_share[h];
    const base = fc.G.arr[k];
    let html = `<p class="key"><span class="mid">10분에 약 ${fmtN(fc.arr[k])}대가 들어와요</span></p>
<p class="basis">근거: 2024-07 ${GROUP_KO[fc.g]} 평균 ${fmtN(base)}대 × ${fc.m}월 지수 ${fc.s.toFixed(2)}</p>`;
    if (k >= 33 && k <= 35) {
      const bt = await load('backtest', { optional: true });
      const dc = bt && bt.class_checks.dawn_check;
      if (dc) html += `<p class="verify">검증: 2024-07 평일 ${dc.window[0]}~${dc.window[1]} 계산 ${fmtN(dc.predicted)}대 · 실제 ${fmtN(dc.observed)}대</p>`;
    }
    html += `<div class="part" id="w-cls"><h3><span class="dot c" aria-hidden="true"></span>강좌 시작 직전 수요</h3><p class="muted small">강좌 정보를 불러오는 중이에요…</p></div>
<div class="part"><h3><span class="dot s" aria-hidden="true"></span>10분 안에 나가는 차</h3><p>이 시간대(${h}시) 입차의 <strong>${Math.round(share * 100)}%</strong>는 10분 안에 나가요. 승하차나 회차로 보여요(단정할 수는 없어요).</p><p class="basis">근거: 2024-07 입출차 전체, 입차 시각 ${h}시 기준</p></div>`;
    if (sar) html += `<div class="part"><h3><span class="dot a" aria-hidden="true"></span>사리 시나리오</h3><p>공연 때문에 이 10분 입차 <strong>${sar.dArr[k] >= 0 ? '+' : '−'}${fmtN(Math.abs(sar.dArr[k]))}대</strong>, 점유 <strong>${sar.dOcc[k] >= 0 ? '+' : '−'}${fmtN(Math.abs(sar.dOcc[k]))}대</strong>로 추정돼요.</p><p class="basis">근거: ${esc(ov.source_day)} 기록 − 보통날, 공연 ${hm(S.sariT)} 시작 기준으로 옮김</p></div>`;
    html += `<p class="info part">${icon('info', 16)}<span>세 값은 서로 겹칠 수 있어 더하지 않아요. <a href="./#/method/classes">계산 방법 보기</a></span></p>`;
    openSheet(`${binLabel(k)}의 밀물`, html, () => { S.cursorOpen = null; syncUrl(); });
    try {
      const C = await load('classes');
      const el = $('#w-cls'); if (!el) return;
      const list = classesOn(iso, C).filter((c) => { const b = Math.floor(c.start / 10); return b >= k + 1 && b <= k + 3; }).sort((a, b) => b.cap - a.cap);
      const seats = list.reduce((s, c) => s + c.cap, 0);
      const contrib = Math.min(fc.s * C.beta.value * seats / 3, fc.arr[k]);
      const stale = classesStale(iso, C);
      const mode = (() => { const m = new Map(); list.forEach((c) => m.set(c.start, (m.get(c.start) || 0) + c.cap)); return [...m].sort((a, b) => b[1] - a[1])[0]; })();
      const li = (c) => `<li><span>${esc(c.center)} · ${esc(c.name)} <span class="muted">${hm(c.start)}</span></span><span class="n">${fmtN(c.cap)}석 ${ext(c.url, '<span class="sr-only">강좌 페이지</span>', 'small')}</span></li>`;
      el.innerHTML = `<h3><span class="dot c" aria-hidden="true"></span>강좌 시작 직전 수요</h3>` + (seats && contrib >= 1
        ? `<p>약 <strong>${fmtN(contrib)}대</strong>로 설명돼요.</p><p class="small">${hm((k + 1) * 10)}~${hm((k + 4) * 10 - 1)}에 시작하는 강좌 ${list.length}개, 정원 ${fmtN(seats)}석${mode ? ` (${hm(mode[0])} 시작 ${fmtN(mode[1])}석)` : ''}</p>
<ul class="list">${list.slice(0, 5).map(li).join('')}</ul>${list.length > 5 ? `<details><summary>강좌 더 보기 (${list.length - 5})</summary><ul class="list">${list.slice(5).map(li).join('')}</ul></details>` : ''}
<p class="basis">계산: ${fc.m}월 지수 ${fc.s.toFixed(2)} × β ${C.beta.value.toFixed(3)} × 정원 ${fmtN(seats)}석 ÷ 3 (시작 전 30분에 고르게 도착 가정)${stale ? ` · 강좌는 ${stale} 시간표 기준이에요` : ''}</p>`
        : `<p>이 시각엔 곧 시작하는 강좌가 거의 없어요.</p>${stale ? `<p class="basis">강좌는 ${stale} 시간표 기준이에요.</p>` : ''}`);
    } catch (e) {
      const el = $('#w-cls'); if (el) el.querySelector('p').textContent = '강좌 정보를 불러오지 못했어요.';
    }
  };

  const sariPanel = () => {
    const el = $('#sari'), open = !!S.panelOpen;
    const weekend = !!ov;
    const times = []; for (let m = 720; m <= 1260; m += 30) times.push(m);
    let body = '';
    if (open) {
      if (!weekend) body = '<p>평일 공연은 근거가 부족해요(2024년 7월 금요일 1일, 패턴 불명확).</p>';
      else {
        const o = ov.offsets_min, T = S.sariT, src = ov.source_day;
        const srcKo = `${+src.slice(0, 4)}년 ${+src.slice(5, 7)}월 ${+src.slice(8, 10)}일(${WD[wdOf(src)]})`;
        body = `<label class="row" for="sari-t"><span>공연 시작 시각</span><select id="sari-t">${times.map((m) => `<option value="${m}"${m === T ? ' selected' : ''}>${hm(m)}</option>`).join('')}</select></label>
<p>${srcKo} 대형 공연일과 같은 규모라면:</p>
<ul class="facts">
<li>공원이 평소의 약 <strong>${(ov.peak_occ / ov.normal_peak_occ).toFixed(1)}배</strong>까지 차요 (그날 ${fmtN(ov.peak_occ)}대 vs 보통 ${GROUP_KO[fc.g]} ${fmtN(ov.normal_peak_occ)}대)</li>
<li>공연 <strong>${durKo(o.rush_start)} 전</strong>부터 입차가 몰렸어요 → ${hm(T + o.rush_start)}부터</li>
<li>공연 시작 <strong>${durKo(o.exit_peak)} 뒤</strong>, 10분에 ${fmtN(ov.exit_peak_10min)}대가 빠져나갔어요 → ${hm(T + o.exit_peak)}</li>
<li>시작 <strong>${durKo(o.clear)} 뒤</strong>에야 평소 수준이었어요 → ${hm(T + o.clear)}</li>
<li>가장 몰린 30분 동안 ${fmtN(ov.exit_max_30min)}대가 나갔어요 (보통 ${GROUP_KO[fc.g]} 최대 ${fmtN(ov.normal_exit_max_30min)}대)</li>
</ul>
<button class="btn" type="button" id="ics">${icon('cal', 18)}출발·퇴장 알림 받기 (.ics)</button>
<p class="basis">공연장이 어디였는지는 데이터에 없어요. 규모는 다를 수 있어요. 공연 관객 수는 계절과 무관하다고 보고 계절 지수를 곱하지 않았어요. 기준 시작 시각 ${ov.ref_start}는 공연 포스터(15099006) ${GROUP_KO[fc.g]} 시작 시각 상위값에서 골랐어요. <a href="./#/method/sari">계산 방법</a></p>`;
      }
      body += `<div class="part" id="ev"><h3>이 날짜의 공연 기록(개방 데이터)</h3><p class="small muted">불러오는 중이에요…</p></div>`;
    }
    el.innerHTML = `<h2><button class="panel-t" type="button" aria-expanded="${open}" aria-controls="sari-b" id="sari-btn">공연 보러 가요 <span class="small muted">(사리 시나리오)</span><span class="chev">${icon('chev', 20)}</span></button></h2><div id="sari-b">${body}</div>`;
    $('#sari-btn').onclick = () => {
      S.panelOpen = !S.panelOpen;
      S.sariT = S.panelOpen && ov ? (S.sariT ?? toMin(ov.ref_start)) : null;
      syncUrl(); draw(); sariPanel(); $('#sari-btn').focus();
    };
    const sel = $('#sari-t'); if (sel) sel.onchange = () => { S.sariT = +sel.value; syncUrl(); draw(); sariPanel(); $('#sari-t').focus(); };
    const ib = $('#ics'); if (ib) ib.onclick = () => download(`olpark-multtae-${iso.replace(/-/g, '')}.ics`, buildIcs(iso, S.sariT, ov, D.meta.site_url, location.host || 'olpark-multtae'), 'text/calendar;charset=utf-8');
    if (open) eventsBlock();
  };
  const eventsBlock = async () => {
    const el = $('#ev'); if (!el) return;
    try {
      const E = await load('events');
      const items = E.items.filter((x) => x.date === iso);
      const tag = E.date_semantics === 'uncertain' ? '<span class="small muted"> · 이 날짜가 공연일인지 게시일인지 데이터로 확인되지 않아요</span>' : '';
      const li = (x) => `<li><span>${ext(x.url, esc(x.title))}${x.venue ? ` · ${esc(x.venue)}` : ''}${tag}</span><span class="n small">${esc(x.date)}</span></li>`;
      el.innerHTML = `<h3>이 날짜의 공연 기록(개방 데이터)</h3>` + (items.length ? `<ul class="list">${items.map(li).join('')}</ul>`
        : `<p><strong>이 날짜의 공연 기록이 없어요.</strong> 개방 데이터(영문 공연정보)에는 ${esc(E.latest_date)} 이후 일정이 없어요.${ov ? ' 공연 시작 시각을 직접 넣어 보세요.' : ''}</p>`)
        + `<details><summary>지난 공연 기록 보기</summary><ul class="list">${E.items.slice(0, 12).map(li).join('')}</ul><p class="basis">출처: 영문 공연정보(15149169) 최근 12건</p></details>`
        + (D.meta.keys.culture ? '' : '<p class="basis">문화공공데이터광장 키가 연결되면 다가오는 공연이 자동으로 채워져요.</p>');
    } catch (e) { el.innerHTML = '<p class="small">공연 기록을 불러오지 못했어요.</p>'; }
  };

  // 상황 칩(§6.9, F10)
  const chips = [];
  const md = iso.slice(5);
  const inMD = (a, b) => a <= b ? (md >= a && md <= b) : (md >= a || md <= b);
  const fmtMD = (s) => `${+s.slice(0, 2)}/${+s.slice(3)}`;
  const ctx = D.context;
  if (ctx.weather && ctx.weather.hours) {
    const hrs = ctx.weather.hours.filter((x) => x.t.startsWith(iso));
    const pop = Math.max(0, ...hrs.map((x) => x.pop || 0));
    if (hrs.length && pop >= 30) chips.push(`<span class="chip">비 예보 ${pop}% <span class="muted">(기상청)</span></span>`);
  }
  for (const l of ctx.lawn) {
    if (l.closed && inMD(l.closed[0], l.closed[1])) chips.push(ext(l.url, `잔디 출입 통제 ${fmtMD(l.closed[0])}~${fmtMD(l.closed[1])}`, 'chip'));
    if (l.open && inMD(l.open[0], l.open[1])) chips.push(ext(l.url, `잔디마당 개방 (${esc(l.places.join('·'))}) ~${fmtMD(l.open[1])}`, 'chip'));
  }
  if (ctx.rose) for (const [a, b] of ctx.rose.periods) if (inMD(a, b)) chips.push(`<span class="chip accent" title="${esc(ctx.rose.note)}">장미 만개 무렵 <span class="small">(FAQ 문구를 날짜로 옮긴 범위)</span></span>`);
  ctx.notices.filter((n) => n.from <= iso && iso <= n.to).slice(0, 2).forEach((n) => chips.push(ext(n.url, `공지: ${esc(n.title)}`, 'chip')));
  $('#ctx').innerHTML = chips.slice(0, 4).join('') || '<p class="small muted">이 날짜에 해당하는 공원 소식이 없어요.</p>';

  draw();
  sariPanel();
  if (isToday) load('live', { optional: true }).then((live) => { if ($('#live')) liveCard($('#live'), D, live); });
  if (q.t && /^\d{4}$/.test(q.t)) { const k = Math.floor((+q.t.slice(0, 2) * 60 + +q.t.slice(2)) / 10); if (k >= 0 && k < 144) { S.chart.set(k); openWave(k); } }
}

/* ---------------- 404 ---------------- */
export function viewNotFound(main) {
  setTitle('없는 화면');
  main.innerHTML = emptyState('물이 닿지 않는 곳이에요', '찾는 화면이 없어요. 주소를 확인해 주세요.', '<a class="btn" href="./#/">오늘의 물때로 가기</a>');
}

/* ---------------- 셸·라우터 ---------------- */
const TABS = [['today', './#/', '오늘', 'wave'], ['week', './#/week', '주간', 'cal'], ['live', './#/live', '실시간', 'signal'], ['method', './#/method', '계산 방법', 'formula'], ['org', './#/org', '기관용', 'steth']];
export function setTitle(t) { document.title = `${t} · 올팍 물때`; }
function shell(active) {
  const li = (t) => `<a href="${t[1]}"${t[0] === active ? ' aria-current="page"' : ''}>${icon(t[3], 22)}<span>${t[2]}</span></a>`;
  $('#tabs').innerHTML = `<ul>${TABS.map((t) => `<li>${li(t)}</li>`).join('')}</ul>`;
  $('#topnav').innerHTML = TABS.map((t) => `<a href="${t[1]}"${t[0] === active ? ' aria-current="page"' : ''}>${t[2]}</a>`).join('');
}
async function footer() {
  try {
    const m = await load('meta');
    $('#ftr').innerHTML = `<p>데이터 기준 ${esc(fmtStamp(m.built_at))} · 출처: 한국체육산업개발(주) 개방 데이터(공공데이터포털, 이용허락범위 제한 없음) · <a href="./#/method/license">출처·이용허락</a></p><p>기관 공식 서비스가 아닌 개인 제작 서비스예요. <a href="${esc(m.repo_url)}" rel="noopener">소스 코드</a></p>`;
    const age = (Date.now() - new Date(m.built_at).getTime()) / 864e5;
    if (age > 7) $('#banner').innerHTML = `<div class="warnbar" role="status" style="margin:0">데이터 갱신이 ${Math.floor(age)}일째 멈춰 있어요. 숫자는 그대로 볼 수 있어요.</div>`;
  } catch (e) { /* 푸터는 생략 가능 */ }
}
const lazy = { week: () => import('./views/week.js'), live: () => import('./views/livepage.js'), method: () => import('./views/method.js'), org: () => import('./views/org.js') };
let first = true;
async function route() {
  closeSheet(true);
  const raw = location.hash.replace(/^#/, '') || '/';
  const [path, qs] = raw.split('?');
  const seg = path.split('/').filter(Boolean);
  const main = $('#main');
  const tab = !seg.length || seg[0] === 'day' ? 'today' : seg[0];
  shell(TABS.some((t) => t[0] === tab) ? tab : '');
  try {
    if (!seg.length) await viewToday(main, path, qs, null);
    else if (seg[0] === 'day' && seg.length === 2) await viewToday(main, path, qs, seg[1]);
    else if (seg[0] === 'week' && seg.length <= 2) await (await lazy.week()).default(main, seg[1]);
    else if (seg[0] === 'live' && seg.length === 1) await (await lazy.live()).default(main);
    else if (seg[0] === 'method' && seg.length <= 2) await (await lazy.method()).default(main, seg[1]);
    else if (seg[0] === 'org' && seg.length <= 2 && (!seg[1] || ['lab', 'archive', 'proposals'].includes(seg[1]))) await (await lazy.org()).default(main, seg[1]);
    else viewNotFound(main);
  } catch (e) {
    console.warn(e);
    errorState(main, route);
  }
  if (!first && !(seg[0] === 'method' && seg[1])) { const h = main.querySelector('h1'); (h || main).focus({ preventScroll: true }); window.scrollTo(0, 0); }
  first = false;
}
function initControls() {
  const root = document.documentElement;
  const lb = $('#btn-large'), tb = $('#btn-theme');
  const sync = () => {
    lb.setAttribute('aria-pressed', String(root.dataset.large === '1'));
    const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
    tb.setAttribute('aria-pressed', String(dark));
  };
  lb.onclick = () => { if (root.dataset.large === '1') delete root.dataset.large; else root.dataset.large = '1'; store.set('large', root.dataset.large || '0'); sync(); };
  tb.onclick = () => {
    const dark = tb.getAttribute('aria-pressed') === 'true';
    root.dataset.theme = dark ? 'light' : 'dark'; store.set('theme', root.dataset.theme); sync();
  };
  sync();
  const off = () => { $('#banner').innerHTML = navigator.onLine ? '' : '<div class="offline" role="status">오프라인이에요. 마지막으로 받은 데이터를 보여 드려요.</div>'; };
  addEventListener('online', off); addEventListener('offline', off);
}
initControls();
addEventListener('hashchange', route);
route();
footer();
