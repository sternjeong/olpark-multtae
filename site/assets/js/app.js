// 올팍 물때 — 진입 모듈(언어·라우터·데이터·모델·차트·오늘 화면·시트·사리·실시간 카드·ics).
// 첫 화면 요청 수를 줄이려고 홈에 필요한 코드는 이 파일 하나에 두고, 나머지 화면·영어 사전은 지연 로드한다.
// 계산식은 build/tide.py · build/model_*.py와 같다. 숫자는 모두 ./data/*.json에서 읽는다.

/* ---------------- 언어(ko 기본, en 지연 로드) ---------------- */
// tests/test_i18n.py가 아래 KO 사전과 ./i18n/en.json의 키가 같은지 검사한다.
const KO = /*I18N-KO*/{
  "app.name": "올팍 물때",
  "nav.today": "오늘", "nav.week": "주간", "nav.live": "실시간", "nav.method": "계산 방법", "nav.org": "기관용",
  "ui.large": "큰 글씨", "ui.dark": "다크 모드", "ui.lang": "English", "ui.langShort": "EN", "ui.close": "닫기", "ui.newWin": "(새 창)",
  "ui.retry": "다시 시도", "ui.more": "자세히", "ui.table": "표로 보기", "ui.method": "계산 방법 보기", "ui.koOnly": "",
  "g.weekday": "평일", "g.sat": "토요일", "g.sun": "일요일",
  "unit.cars": "{n}대", "unit.seats": "{n}석", "unit.pct": "{n}%",
  "foot.data": "데이터 기준 {t} · 출처: 한국체육산업개발(주) 개방 데이터(공공데이터포털, 이용허락범위 제한 없음) · <a href=\"./#/method/license\">출처·이용허락</a>",
  "foot.notOfficial": "기관 공식 서비스가 아닌 개인 제작 서비스예요. <a href=\"{repo}\" rel=\"noopener\">소스 코드</a>",
  "banner.stale": "데이터 갱신이 {d}일째 멈춰 있어요. 숫자는 그대로 볼 수 있어요.",
  "banner.offline": "오프라인이에요. 마지막으로 받은 데이터를 보여 드려요.",
  "err.title": "데이터를 불러오지 못했어요", "err.body": "네트워크를 확인하고 다시 시도해 주세요.",
  "nf.title": "물이 닿지 않는 곳이에요", "nf.body": "찾는 화면이 없어요. 주소를 확인해 주세요.", "nf.go": "오늘의 물때로 가기", "nf.doc": "없는 화면",
  "range.title": "이 날짜는 보여 드리지 않아요", "range.body": "오늘부터 앞으로 60일, 지난 7일까지 볼 수 있어요.", "range.go": "오늘로 가기", "range.goWeek": "이번 주로 가기",
  "today.doc": "오늘의 물때", "today.docDate": "{d} 물때", "today.prefix": "오늘 · ",
  "today.intro": "<strong>올림픽공원에도 물때가 있어요.</strong> 언제 차오르고 언제 빠지는지, 그리고 왜 그런지 기관 데이터로 보여 드려요.", "today.introOk": "알겠어요",
  "today.prev": "전날", "today.next": "다음 날", "today.pick": "날짜 고르기",
  "today.holidayChip": "{h} · 일요일처럼 봐요", "today.idx": "{m}월 지수 {s}",
  "today.summary": "오늘의 물때 요약",
  "key.high": "만조 (가장 붐비는 시각)", "key.highToday": "오늘 만조 (가장 붐비는 시각)", "key.occ": "점유 약 {n}대", "key.sariOn": " · 사리 시나리오 반영",
  "key.noHigh": "오늘은 뚜렷한 만조가 없어요.", "key.low": "한산한 창", "key.noLow": "오늘은 뚜렷한 한산한 창이 없어요.",
  "key.peakArr": "밀물 최고", "key.per10": "10분 {n}대",
  "key.day": "낮에 덜 붐비는 때 (10~18시)", "key.dayRed": "낮 최고({t})보다 {p}% 적어요", "key.noDay": "낮에는 뚜렷이 덜 붐비는 때가 없어요.",
  "basis.main": "근거: 2024년 7월 입출차 {rows} 건 × {m}월 계절 지수 {s}", "basis.cv": " · 해마다 차이가 큰 달이에요", "basis.rows": "{n}만",
  "chart.title": "하루 물때 곡선", "chart.range": "05:00 ~ 24:00", "chart.aria": "물때 곡선. 화살표로 10분, Shift+화살표로 1시간 이동, Enter로 그 시각의 물결 자세히 보기",
  "chart.hint": "봉우리를 누르면 그 시각 물결의 정체를 볼 수 있어요.", "chart.yOcc": "점유(대)", "chart.yArr": "입차", "chart.now": "지금", "chart.high": "만조 {t}",
  "chart.svgTitle": "{d} 물때 곡선",
  "chart.desc": "{d} {g} 물때. ", "chart.descHigh": "만조 {t}, 최대 약 {n}대. ", "chart.descLow": "한산한 창 {w}. ", "chart.descLowItem": "{a}부터 {b}까지", "chart.descArr": "밀물 최고 {t} 10분 {n}대.",
  "chart.readout": "{t} · 점유 약 {o}대 · 10분 입차 약 {a}대",
  "lg.occ": "점유 예보", "lg.band": "관측 범위({b})", "lg.bandIqr": "25~75%", "lg.bandMinMax": "최소~최대, {n}일", "lg.arr": "10분 입차(밀물)", "lg.sari": "사리 시나리오(추정)",
  "tbl.caption": "매시 정각 점유 예보와 1시간 입차({m})", "tbl.mSari": "사리 시나리오 반영", "tbl.mFc": "예보", "tbl.time": "시각", "tbl.occ": "점유(대)", "tbl.band": "관측 범위", "tbl.arr1h": "1시간 입차",
  "sheet.title": "{a} ~ {b}의 밀물", "sheet.arr": "10분에 약 {n}대가 들어와요", "sheet.basis": "근거: 2024-07 {g} 평균 {n}대 × {m}월 지수 {s}",
  "sheet.verify": "검증: 2024-07 평일 {a}~{b} 계산 {p}대 · 실제 {o}대",
  "sheet.cls": "강좌 시작 직전 수요", "sheet.clsLoading": "강좌 정보를 불러오는 중이에요…", "sheet.clsFail": "강좌 정보를 불러오지 못했어요.",
  "sheet.clsExplain": "약 <strong>{n}대</strong>로 설명돼요.", "sheet.clsRange": "{a}~{b}에 시작하는 강좌 {c}개, 정원 {s}석", "sheet.clsMode": " ({t} 시작 {s}석)",
  "sheet.clsMore": "강좌 더 보기 ({n})", "sheet.clsLink": "강좌 페이지", "sheet.clsNames": "",
  "sheet.clsCalc": "계산: {m}월 지수 {s} × β {b} × 정원 {c}석 ÷ 3 (시작 전 30분에 고르게 도착 가정)", "sheet.clsStale": "강좌는 {m} 시간표 기준이에요",
  "sheet.clsNone": "이 시각엔 곧 시작하는 강좌가 거의 없어요.",
  "sheet.short": "10분 안에 나가는 차", "sheet.shortText": "이 시간대({h}시) 입차의 <strong>{p}%</strong>는 10분 안에 나가요. 승하차나 회차로 보여요(단정할 수는 없어요).",
  "sheet.shortRule": "공원 안내 페이지에 '{r}'라고 적혀 있어요.", "sheet.shortBasis": "근거: 2024-07 입출차 전체, 입차 시각 {h}시 기준",
  "sheet.sari": "사리 시나리오", "sheet.sariText": "공연 때문에 이 10분 입차 <strong>{a}대</strong>, 점유 <strong>{o}대</strong>로 추정돼요.", "sheet.sariBasis": "근거: {d} 기록 − 보통날, 공연 {t} 시작 기준으로 옮김",
  "sheet.noSum": "세 값은 서로 겹칠 수 있어 더하지 않아요.",
  "sari.title": "공연 보러 가요", "sari.sub": "(사리 시나리오)", "sari.weekday": "평일 공연은 근거가 부족해요(2024년 7월 금요일 1일, 패턴 불명확). 공연 시작 시각 선택은 토·일·공휴일에만 열려요.",
  "sari.start": "공연 시작 시각", "sari.same": "{d} 대형 공연일과 같은 규모라면:", "sari.srcDate": "{y}년 {m}월 {d}일({w})",
  "sari.f1": "공원이 평소의 약 <strong>{r}배</strong>까지 차요 (그날 {p}대 vs 보통 {g} {n}대)",
  "sari.f2": "공연 <strong>{d} 전</strong>부터 입차가 몰렸어요 → {t}부터",
  "sari.f3": "공연 시작 <strong>{d} 뒤</strong>, 10분에 {n}대가 빠져나갔어요 → {t}",
  "sari.f4": "시작 <strong>{d} 뒤</strong>에야 평소 수준이었어요 → {t}",
  "sari.f5": "가장 몰린 30분 동안 {n}대가 나갔어요 (보통 {g} 최대 {m}대)",
  "sari.ics": "출발·퇴장 알림 받기 (.ics)",
  "sari.transit": "공원은 대형 행사 때 대중교통 이용을 요청해요: {s}",
  "sari.limits": "공연장이 어디였는지는 데이터에 없어요. 규모는 다를 수 있어요. 공연 관객 수는 계절과 무관하다고 보고 계절 지수를 곱하지 않았어요. 기준 시작 시각 {r}는 공연 포스터(15099006) {g} 시작 시각 상위값에서 골랐어요.",
  "ev.title": "이 날짜의 공연 기록(개방 데이터)", "ev.loading": "불러오는 중이에요…", "ev.fail": "공연 기록을 불러오지 못했어요.",
  "ev.tag": " · 이 날짜가 공연일인지 게시일인지 데이터로 확인되지 않아요",
  "ev.none": "<strong>이 날짜의 공연 기록이 없어요.</strong> 개방 데이터(영문 공연정보)에는 {d} 이후 일정이 없어요.", "ev.noneInput": " 공연 시작 시각을 직접 넣어 보세요.",
  "ev.past": "지난 공연 기록 보기", "ev.pastBasis": "출처: 영문 공연정보(15149169) 최근 {n}건, 마지막 날짜 {d}", "ev.key": "문화공공데이터광장 키가 연결되면 다가오는 공연이 자동으로 채워져요.",
  "ctx.title": "오늘의 공원", "ctx.rain": "비 예보 {p}% <span class=\"muted\">(기상청)</span>", "ctx.lawnClosed": "잔디 출입 통제 {a}~{b}", "ctx.lawnOpen": "잔디마당 개방 ({p}) ~{b}",
  "ctx.rose": "장미 만개 무렵 <span class=\"small\">(FAQ 문구를 날짜로 옮긴 범위)</span>", "ctx.notice": "공지: {t}", "ctx.none": "이 날짜에 해당하는 공원 소식이 없어요.",
  "live.title": "지금 실시간", "live.titlePage": "동2·남2·북2문 합계", "live.at": "{t} 기준 · 5분마다 새로 받아요",
  "live.maint": "기관 실시간 주차 서비스가 점검 중이에요.", "live.outlier": "실시간 값이 평소 범위를 벗어나 표시하지 않았어요.", "live.loading": "실시간 값을 받는 중이에요…", "live.fail": "실시간 값을 불러오지 못했어요.",
  "live.last": " 마지막 기록은 {t}의 {n}대예요.", "live.note": "이 값은 장기주차 차량이 포함될 수 있어 아래 물때 곡선과 단위가 달라요. 그래서 같은 축에 그리지 않아요.",
  "live.src": "출처: 한국체육산업개발 실시간 주차현황(15168686)", "live.spark": "오늘 실시간 기록 {n}회",
  "live.rankNone": "같은 요일·시각 기록을 쌓는 중이에요 (첫 기록 전).", "live.rankDays": "같은 요일·시각 기록을 쌓는 중이에요 ({d}일째).",
  "live.rank": "같은 요일·시각 기록 {n}회 중 {r} (중앙값 {m}대)", "live.r1": "가장 많아요", "live.rLast": "가장 적어요", "live.rN": "{r}번째로 많아요",
  "visit.title": "편하게 방문하기", "visit.sub": "(어르신·유모차·휠체어·단체)",
  "visit.lead": "덜 붐비는 때에 오면 주차 대기와 혼잡을 줄일 수 있어요. 아래 시각은 이 날짜의 예보에서 계산했어요.",
  "visit.quiet": "추천 시간(10~18시 중 덜 붐비는 때)", "visit.quietItem": "{a}~{b} · 낮 최고({t})보다 약 {p}% 적어요", "visit.early": "더 한산한 때: {w}",
  "visit.avoid": "피하면 좋은 시간: 만조 {t} 전후", "visit.large": "글씨가 작으면 큰 글씨로 볼 수 있어요.", "visit.largeBtn": "큰 글씨 켜기",
  "visit.transit": "대중교통(공원 '오시는 길' 안내)", "visit.line": "{l}호선 {s} {e}", "visit.bigEvent": "공원 안내: {t}",
  "visit.parking": "주차 안내(공원 홈페이지)", "visit.src": "출처: {s} ({d} 확인). 시설의 접근성 정보는 이 데이터에 없어 안내하지 않아요.", "visit.srcLink": "원문 보기",
  "visit.who": "누구에게 도움이 되나요: 걷기·이동이 느린 어르신, 유모차·휠체어 이용자, 단체 방문(버스) 담당자가 주차·보행 혼잡이 적은 시간을 고를 수 있어요.",
  "disp.title": "분산 효과 계산기", "disp.sub": "(모두가 조금씩 옮기면)",
  "disp.lead": "{g} 만조({h}) 직전 1시간({p})에 들어오는 차의 일부가 덜 붐비는 때({q})로 옮기면 어떻게 될까요?",
  "disp.f": "옮기는 비율", "disp.moved": "옮기는 차: 하루 약 {n}대({lo}~{hi}대)",
  "disp.occ": "하루 최고 점유", "disp.occRes": "약 {n}대 줄어요 · 중앙값 {p}% (보통날 {d}일 범위 {lo}~{hi}%)",
  "disp.arr": "만조 직전 10분 최대 입차", "disp.arrRes": "약 {n}대 줄어요 ({p}%)",
  "disp.scale": "대수는 {m}월 지수 {s}를 곱한 값이에요. 머문 시간은 그대로라고 보고, 2024년 7월 보통날 각각에 적용했어요. 옮긴 차가 새 봉우리를 만들면 효과가 줄어요.",
  "disp.exit": "공연 날 퇴장 대기", "disp.exitLead": "기록된 대형 공연일에 30분 동안 {m}대가 나갔고, 10분 최대 출차는 {c}대였어요. 모두 공연 직후 한꺼번에 나가려 한다고 보면:",
  "disp.exitBase": "대기 합계 약 {w}차량·분(한 대 평균 약 {a}분)", "disp.exitF": "나눠 나가는 비율", "disp.exitS": "나눠 나가는 시간", "disp.minutes": "{n}분",
  "disp.exitRes": "대기 합계 약 {w}차량·분 → 약 {w2}차량·분 ({p}% 감소, 범위 {lo}~{hi}%)",
  "disp.exitModel": "모델: 최대 30분 출차 M대가 공연 직후 한꺼번에 나가려 하고, 관측된 최대 10분 출차를 처리량으로 보는 1분 단위 대기열이에요. 범위는 토·일 행사일 2일의 값이에요. 실제 대기는 출구·신호·보행에 따라 달라요.",
  "disp.weekdayExit": "평일은 공연 근거가 부족해 퇴장 대기 계산을 하지 않아요.", "disp.method": "식과 가정 보기",
  "week.doc": "주간 물때표", "week.title": "이번 주 물때표", "week.titleFrom": "{d}부터 7일 물때표", "week.prev": "이전 7일", "week.next": "다음 7일",
  "week.caption": "{a} ~ {b} · 만조·낮에 덜 붐비는 때·한산한 창·붐빔(기간 안 최대 대비 4단계)", "week.date": "날짜", "week.high": "만조", "week.day": "낮에 덜 붐비는 때", "week.low": "한산한 창", "week.busy": "붐빔",
  "week.holiday": "공휴일", "week.today": "오늘", "week.noHigh": "뚜렷한 만조 없음", "week.none": "없음", "week.meterAria": "붐빔 4단계 중 {l}단계, 최대 약 {n}대", "week.max": "최대 {n}대",
  "week.hint": "날짜를 누르면 그날 물때로 가요. 낮에 덜 붐비는 때의 %는 그날 낮(10~18시) 최고 대비예요.", "week.print": "인쇄하기",
  "week.basis": "근거: 2024-07 요일군({g}) 프로파일 × 월 계절 지수({m}). 공휴일은 일요일로 봐요(한국천문연구원 달력자료).",
  "lp.doc": "실시간 수위", "lp.h1": "지금 실시간 주차", "lp.title": "최근 7일 기록", "lp.sub": "(15분 간격)",
  "lp.empty": "같은 요일·시각 기록을 쌓는 중이에요 ({d}). 기록은 GitHub Actions가 15분마다 기관 실시간 API를 불러 저장해요.", "lp.dayN": "{n}일째", "lp.day0": "첫 기록 전",
  "lp.aria": "최근 7일 실시간 주차 기록. 오늘 {a}회, 지난주 같은 요일 {b}회 기록", "lp.lgToday": "오늘", "lp.lgLastWeek": "지난주 같은 요일", "lp.lg6": "최근 6일",
  "lp.tblCap": "최근 기록(15분 간격, 최근 48개)", "lp.tblVal": "주차 대수", "lp.start": "수집 시작", "lp.none": "아직 없음", "lp.count": "기록 수", "lp.countV": "{n}건", "lp.fail": " · 실패 비율 {p}%",
  "lp.unit": "이 값은 장기주차 차량이 포함될 수 있어 2024년 원자료 곡선보다 크게 나와요{r}. 그래서 물때 곡선과 겹쳐 그리지 않고, 이 서비스가 쌓은 같은 요일·시각 기록하고만 비교해요.",
  "lp.ratio": "(같은 요일·시각 약 {r}배, {b} 기준)", "lp.csv": "기록 내려받기 (CSV)",
  "lp.csvNote": "이 CSV는 이 서비스가 기관 실시간 API를 15분마다 기록한 것이에요. 자유롭게 쓰세요(출처: 한국체육산업개발 실시간 주차현황)."
}/*/I18N-KO*/;
let DICT = KO;
export let LANG = 'ko';
export function t(key, vars) {
  let s = DICT[key] ?? KO[key] ?? key;
  if (vars) s = s.replace(/\{(\w+)\}/g, (m, k) => (vars[k] ?? m));
  return s;
}
async function setLang(lang) {
  if (lang === 'en') {
    try { DICT = await fetch('./assets/i18n/en.json', { cache: 'no-cache' }).then((r) => r.json()); LANG = 'en'; } catch (e) { DICT = KO; LANG = 'ko'; }
  } else { DICT = KO; LANG = 'ko'; }
  document.documentElement.lang = LANG;
}

/* ---------------- 공통 유틸 ---------------- */
export const $ = (s, r = document) => r.querySelector(s);
export const esc = (s) => String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
export const fmtN = (n) => Math.round(n).toLocaleString('ko-KR');
export const pad = (n) => String(n).padStart(2, '0');
export const hm = (m) => { m = ((Math.round(m) % 1440) + 1440) % 1440; return `${pad(Math.floor(m / 60))}:${pad(m % 60)}`; };
export const hmKo = (m) => { if (LANG === 'en') return hm(m); m = ((Math.round(m) % 1440) + 1440) % 1440; const h = Math.floor(m / 60), mi = m % 60; return mi ? `${h}시 ${mi}분` : `${h}시`; };
export const durKo = (m) => {
  m = Math.abs(Math.round(m)); const h = Math.floor(m / 60), mi = m % 60;
  if (LANG === 'en') return h ? (mi ? `${h} h ${mi} min` : `${h} h`) : `${mi} min`;
  return h ? (mi ? `${h}시간 ${mi}분` : `${h}시간`) : `${mi}분`;
};
export const binLabel = (k) => t('sheet.title', { a: hm(k * 10), b: hm(k * 10 + 10) });
export const icon = (id, size = 18) => `<svg width="${size}" height="${size}" aria-hidden="true" focusable="false"><use href="#i-${id}"/></svg>`;
export const ext = (href, text, cls = '') => `<a class="${cls}" href="${esc(href)}" target="_blank" rel="noopener">${text} ${icon('ext', 14)}<span class="sr-only">${t('ui.newWin')}</span></a>`;
const WD = ['월', '화', '수', '목', '금', '토', '일'];
const WD_EN = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const MON_EN = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export const store = {
  get(k) { try { return localStorage.getItem('olpark.' + k); } catch (e) { return null; } },
  set(k, v) { try { localStorage.setItem('olpark.' + k, v); } catch (e) { /* 막혀도 정상 동작 */ } },
};
export const gName = (g) => t('g.' + g);

/* ---------------- 날짜(Asia/Seoul) ---------------- */
const dtf = new Intl.DateTimeFormat('en-CA', { timeZone: 'Asia/Seoul', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
export function nowKST() {
  const p = Object.fromEntries(dtf.formatToParts(new Date()).map((x) => [x.type, x.value]));
  return { date: `${p.year}-${p.month}-${p.day}`, min: (+p.hour % 24) * 60 + (+p.minute) };
}
const toD = (iso) => new Date(iso + 'T00:00:00Z');
export const addDays = (iso, n) => { const d = toD(iso); d.setUTCDate(d.getUTCDate() + n); return d.toISOString().slice(0, 10); };
export const wdOf = (iso) => (toD(iso).getUTCDay() + 6) % 7; // 월=0
export const diffDays = (a, b) => Math.round((toD(a) - toD(b)) / 864e5);
export const dateKo = (iso) => {
  const d = toD(iso);
  return LANG === 'en' ? `${WD_EN[wdOf(iso)]}, ${MON_EN[d.getUTCMonth()]} ${d.getUTCDate()}` : `${d.getUTCMonth() + 1}월 ${d.getUTCDate()}일 (${WD[wdOf(iso)]})`;
};
export const dateShort = (iso) => {
  const d = toD(iso);
  return LANG === 'en' ? `${WD_EN[wdOf(iso)]} ${d.getUTCMonth() + 1}/${d.getUTCDate()}` : `${d.getUTCMonth() + 1}/${d.getUTCDate()}${WD[wdOf(iso)]}`;
};
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
export const toMin = (x) => { const [h, m] = x.split(':').map(Number); return h * 60 + m; };
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
  return { highs, main, lows: runs, peakArr: pa, max: dmax, day: daytimeQuiet(sm, R) };
}
// 낮(10~18시) 덜 붐비는 때 — build/tide.py daytime_quiet()와 같은 규칙(입력은 평활 곡선)
export function daytimeQuiet(sm, R) {
  const [a, b] = R.day, W = R.day_win;
  let pk = a; for (let k = a; k < b; k++) if (sm[k] > sm[pk]) pk = k;
  const peak = sm[pk];
  const wins = [];
  for (let k = a; k <= b - W; k++) wins.push([sm.slice(k, k + W).reduce((x, y) => x + y, 0) / W, k]);
  wins.sort((x, y) => x[0] - y[0] || x[1] - y[1]);
  const out = [];
  for (const [m, k] of wins) {
    const red = 1 - m / peak;
    if (out.length && red < R.day_min_red) break;
    if (out.every((c) => Math.abs(k - c.k) >= W)) out.push({ k, mean: m, red });
    if (out.length === R.day_max) break;
  }
  out.sort((x, y) => x.k - y.k);
  return { peakK: pk, peak, wins: out };
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
  const man = LANG === 'en' ? `${Math.floor(rows / 1000)}k` : (rows >= 10000 ? t('basis.rows', { n: Math.floor(rows / 10000) }) : fmtN(rows));
  let s = t('basis.main', { rows: man, m: fc.m, s: fc.s.toFixed(2) });
  if (fc.cv >= D.season.high_cv_threshold) s += t('basis.cv');
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
  const top = niceTop(Math.max(...occs));
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
  let quiet = '';
  (ts.day ? ts.day.wins : []).forEach((w) => { quiet += `<rect class="quiet" x="${X(w.k)}" y="${VB.top}" width="${X(w.k + 6) - X(w.k)}" height="${VB.base - VB.top}"/>`; });
  let hi = '';
  ts.highs.forEach((k) => {
    const x = X(k + 0.5), y = Y(occA[k]) - 6, isMain = k === ts.main;
    const label = isMain ? t('chart.high', { t: hm(k * 10) }) : hm(k * 10);
    const anchor = x > VB.r - 40 ? 'end' : x < VB.l + 40 ? 'start' : 'middle';
    hi += `<path d="M${x - 5},${y - 1} L${x + 5},${y - 1} L${x},${y + 6}Z" transform="rotate(180 ${x} ${y + 2.5})"/>`;
    if (isMain || ts.highs.every((j) => j === k || Math.abs(X(j) - X(k)) > 56)) hi += `<text x="${x}" y="${Math.max(10, y - 6)}" text-anchor="${anchor}">${label}</text>`;
  });
  let now = '';
  if (opt.nowMin != null && opt.nowMin >= 300) { const x = X(opt.nowMin / 10); now = `<g class="now"><line x1="${x}" x2="${x}" y1="${VB.top}" y2="${VB.bBase}"/><text x="${x + 3}" y="${VB.top + 8}">${t('chart.now')}</text></g>`; }
  const sariP = opt.sari ? `<path class="sari draw" d="${pathOf(opt.sari.occ, Y)}"/>` : '';
  el.innerHTML = `<svg viewBox="0 0 ${VB.w} ${VB.h}" role="img" aria-labelledby="ct cd" preserveAspectRatio="xMidYMid meet">
<defs><pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" class="hatch"/></pattern></defs>
<title id="ct">${esc(opt.title)}</title><desc id="cd">${esc(opt.desc)}</desc>
<g class="ax">${yt}${ticks}<line class="base" x1="${VB.l}" x2="${VB.r}" y1="${VB.bBase}" y2="${VB.bBase}"/></g>
${quiet}
<text class="lbl" x="${VB.l}" y="${VB.top - 4}">${t('chart.yOcc')}</text>
<text class="lbl" x="${VB.l - 5}" y="${VB.bTop + 8}" text-anchor="end">${t('chart.yArr')}</text>
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
  const set = (k) => {
    k = Math.max(30, Math.min(143, k)); st.k = k;
    cancelAnimationFrame(raf); raf = requestAnimationFrame(draw);
    opt.onMove && opt.onMove(k);
  };
  const kAt = (e) => { const r = svg.getBoundingClientRect(); const x = (e.clientX - r.left) / r.width * VB.w; return Math.floor(VB.k0 + (x - VB.l) / (VB.r - VB.l) * (VB.k1 - VB.k0)); };
  let downAt = null;
  svg.addEventListener('pointermove', (e) => { if (e.pointerType === 'mouse' || downAt) set(kAt(e)); });
  svg.addEventListener('pointerdown', (e) => { downAt = { x: e.clientX }; set(kAt(e)); });
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
<div class="sheet-hd"><h2 id="sheet-t" tabindex="-1">${title}</h2><button class="iconbtn" type="button" data-close aria-label="${t('ui.close')}">${icon('close', 20)}</button></div>
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
  const ctl = new AbortController(); const tm = setTimeout(() => ctl.abort(), 5000);
  try {
    const r = await fetch(url, { signal: ctl.signal, cache: 'no-store', credentials: 'omit' });
    if (!r.ok) return { status: 'error' };
    return { ...classifyLive(await r.text()), at: nowKST() };
  } catch (e) { return { status: 'error' }; } finally { clearTimeout(tm); }
}
export function slotOf(iso, min) { return `${wdOf(iso)}-${Math.floor(min / 15)}`; }
export function rankText(live, iso, min, value) {
  if (!live || !live.days) return t('live.rankNone');
  const key = slotOf(iso, min), s = live.slots[key];
  if (!s || s.n < 2) return t('live.rankDays', { d: live.days });
  const vals = live.readings.filter(([ts]) => { const d = ts.slice(0, 10), m = +ts.slice(11, 13) * 60 + +ts.slice(14, 16); return slotOf(d, m) === key && d !== iso; }).map((r) => r[1]);
  const all = [...vals, value].sort((a, b) => b - a);
  const r = all.indexOf(value) + 1;
  return t('live.rank', { n: all.length, r: r === 1 ? t('live.r1') : r === all.length ? t('live.rLast') : t('live.rN', { r }), m: fmtN(s.median) });
}
let liveTimer = 0;
export function liveCard(el, D, live, opts = {}) {
  const render = (res) => {
    let val, sub, note = '';
    if (res.status === 'ok') {
      val = `<span class="val">${t('unit.cars', { n: fmtN(res.value) })}</span>`;
      sub = t('live.at', { t: hm(res.at.min) });
      note = esc(rankText(live, res.at.date, res.at.min, res.value));
    } else {
      const last = live && live.last_ok;
      const msg = t({ maintenance: 'live.maint', outlier: 'live.outlier', loading: 'live.loading' }[res.status] || 'live.fail');
      val = last && res.status !== 'loading' ? `<span class="val stale">${t('unit.cars', { n: fmtN(last[1]) })}</span>` : '';
      sub = esc(msg) + (last && res.status !== 'loading' ? esc(t('live.last', { t: fmtStamp(last[0]).slice(5), n: fmtN(last[1]) })) : '');
      if (res.status !== 'loading') sub += ` <button type="button" class="linkbtn" data-retry>${t('ui.retry')}</button>`;
    }
    const today = nowKST().date;
    const pts = live && live.readings ? live.readings.filter((r) => r[0].startsWith(today)) : [];
    let spark = '';
    if (pts.length > 1) {
      const mx = Math.max(...pts.map((p) => p[1])), mn = Math.min(...pts.map((p) => p[1]));
      const d = pts.map((p, i) => { const m = +p[0].slice(11, 13) * 60 + +p[0].slice(14, 16); return `${i ? 'L' : 'M'}${(m / 1440 * 200).toFixed(1)},${(36 - (p[1] - mn) / Math.max(1, mx - mn) * 32).toFixed(1)}`; }).join('');
      spark = `<svg class="spark" viewBox="0 0 200 40" preserveAspectRatio="none" role="img" aria-label="${t('live.spark', { n: pts.length })}"><path d="${d}"/></svg>`;
    }
    el.innerHTML = `<div class="card live"><div class="row between"><h2>${opts.title || t('live.title')}</h2>${opts.link === false ? '' : `<a class="tap" href="./#/live">${t('ui.more')}</a>`}</div>
<div aria-live="polite">${val}<p class="small muted">${sub}</p>${note ? `<p class="small">${note}</p>` : ''}</div>${spark}
${opts.link === false ? '' : `<p class="info">${icon('info', 16)}<span>${t('live.note')}</span></p>`}
<p class="basis">${t('live.src')}</p></div>`;
    const b = el.querySelector('[data-retry]'); if (b) b.onclick = run;
  };
  const run = async () => { render({ status: 'loading' }); render(await fetchLive(D.meta.live_api)); };
  clearInterval(liveTimer);
  run();
  liveTimer = setInterval(() => { if (document.visibilityState === 'visible' && document.contains(el)) run(); else if (!document.contains(el)) clearInterval(liveTimer); }, 5 * 60 * 1000);
}

/* ---------------- .ics (§6.7, 알림 문구는 한국어 고정) ---------------- */
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
const durK = (m) => { m = Math.abs(Math.round(m)); const h = Math.floor(m / 60), mi = m % 60; return h ? (mi ? `${h}시간 ${mi}분` : `${h}시간`) : `${mi}분`; };
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
    ...ev(1, T + o.rush_start - 20, 20, '올팍 물때: 입차 몰림 전 도착', `${src}(${WD[wdOf(src)]}) 기록에서 공연 ${durK(o.rush_start)} 전부터 입차가 몰렸어요. 대중교통도 고려해 보세요.`, 60),
    ...ev(2, T + o.clear, 10, '올팍 물때: 썰물이 빠지는 시각', `기록상(${srcKo}) 공연 시작 ${durK(o.exit_peak)} 뒤 출차가 가장 몰렸고, ${durK(o.clear)} 뒤 평소 수준으로 돌아왔어요.`, 15),
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
  main.innerHTML = emptyState(t('err.title'), t('err.body'), `<button class="btn" type="button" id="retry">${t('ui.retry')}</button>`);
  $('#retry').onclick = retry;
}
export const koOnlyNote = () => (LANG === 'en' ? `<p class="warnbar" lang="en">${t('ui.koOnly')}</p>` : '');

/* ---------------- 오늘의 물때(S1·S2·S3) ---------------- */
function parseQuery(q) { return Object.fromEntries(new URLSearchParams(q || '')); }
function setQuery(path, params) {
  const q = new URLSearchParams(Object.entries(params).filter(([, v]) => v != null && v !== '')).toString();
  history.replaceState(null, '', `#${path}${q ? '?' + q : ''}`);
}
const signed = (v) => `${v >= 0 ? '+' : '−'}${fmtN(Math.abs(v))}`;
const panelBtn = (id, title, sub, open) => `<h2><button class="panel-t" type="button" aria-expanded="${open}" aria-controls="${id}-b" id="${id}-btn">${title} <span class="small muted">${sub}</span><span class="chev">${icon('chev', 20)}</span></button></h2>`;

async function viewToday(main, path, qs, dateParam) {
  const D = await loadCore();
  const now = nowKST(), today = now.date;
  const iso = dateParam || today;
  if (!/^\d{4}-\d{2}-\d{2}$/.test(iso) || isNaN(toD(iso))) return viewNotFound(main);
  const off = diffDays(iso, today);
  setTitle(iso === today ? t('today.doc') : t('today.docDate', { d: dateKo(iso) }));
  if (off < -7 || off > 60) {
    main.innerHTML = emptyState(t('range.title'), t('range.body'), `<a class="btn" href="./#/">${t('range.go')}</a>`);
    return;
  }
  const q = parseQuery(qs);
  const fc = forecast(iso, D);
  const ov = D.profiles.event_overlay[fc.g === 'weekday' ? '' : fc.g];
  const isToday = iso === today;
  const S = { sariT: null, cursor: null, open: {} };
  if (ov && q.show && /^\d{4}$/.test(q.show)) { const x = +q.show.slice(0, 2) * 60 + +q.show.slice(2); if (x >= 720 && x <= 1260) S.sariT = x; }
  S.panelOpen = S.sariT != null;
  const intro = store.get('intro') ? '' : `<div class="card intro" id="intro"><p>${t('today.intro')}</p><button class="btn ghost" type="button" id="intro-x">${t('today.introOk')}</button></div>`;
  const minD = addDays(today, -7), maxD = addDays(today, 60);
  const hid = ' aria-disabled="true" tabindex="-1" style="visibility:hidden"';
  main.innerHTML = `${intro}
<div class="datenav">
  <a class="iconbtn" href="./#/day/${addDays(iso, -1)}" aria-label="${t('today.prev')}"${off <= -7 ? hid : ''}>${icon('left', 20)}</a>
  <h1 tabindex="-1">${isToday ? t('today.prefix') : ''}${dateKo(iso)}</h1>
  <a class="iconbtn" href="./#/day/${addDays(iso, 1)}" aria-label="${t('today.next')}"${off >= 60 ? hid : ''}>${icon('right', 20)}</a>
</div>
<div class="datepick"><span class="chip">${fc.holiday ? t('today.holidayChip', { h: LANG === 'en' ? 'Holiday' : esc(fc.holiday) }) : gName(fc.g)} · ${t('today.idx', { m: fc.m, s: fc.s.toFixed(2) })}</span>
  <label class="row small"><span class="sr-only">${t('today.pick')}</span><input type="date" id="pick" value="${iso}" min="${minD}" max="${maxD}" aria-label="${t('today.pick')}"></label></div>
<section class="card" aria-labelledby="k-t"><h2 id="k-t" class="sr-only">${t('today.summary')}</h2><div class="keys" id="keys"></div><div id="dayq"></div><p class="basis">${esc(BASIS(D, fc))} · <a href="./#/method/season">${t('ui.method')}</a></p></section>
<div id="live"></div>
<section class="card" aria-labelledby="c-t">
  <div class="row between"><h2 id="c-t">${t('chart.title')}</h2><span class="small muted">${t('chart.range')}</span></div>
  <ul class="legend" id="legend"></ul>
  <div class="chart" id="chart" tabindex="0" role="group" aria-label="${t('chart.aria')}"></div>
  <div class="readout" id="readout" aria-live="polite"></div>
  <p class="small muted">${t('chart.hint')}</p>
  <details><summary>${t('ui.table')}</summary><div class="tbl" id="tbl"></div></details>
</section>
<section class="card" id="sari"></section>
<section class="card" id="visit"></section>
<section class="card" id="disp"></section>
<section class="card" aria-labelledby="ctx-t"><h2 id="ctx-t">${t('ctx.title')}</h2><div class="chips" id="ctx"></div></section>`;
  if (intro) $('#intro-x').onclick = () => { store.set('intro', '1'); $('#intro').remove(); };
  $('#pick').addEventListener('change', (e) => { const v = e.target.value; if (v) location.hash = `#/day/${v}`; });

  const syncUrl = () => setQuery(dateParam ? `/day/${iso}` : '/', { t: S.cursorOpen != null ? hm(S.cursorOpen * 10).replace(':', '') : null, show: S.sariT != null ? hm(S.sariT).replace(':', '') : null });
  const cur = () => {
    const sar = S.sariT != null && ov ? sari(fc, ov, S.sariT) : null;
    return { sar, ts: tideStats(sar ? sar.occ : fc.occ, sar ? sar.arr : fc.arr, D.profiles.tide_rules), A: sar ? sar.arr : fc.arr, O: sar ? sar.occ : fc.occ };
  };

  const draw = () => {
    const { sar, ts, A, O } = cur();
    const others = ts.highs.filter((k) => k !== ts.main);
    $('#keys').innerHTML = `<div class="key"><span class="lab">${isToday ? t('key.highToday') : t('key.high')}</span>${ts.main != null
      ? `<span class="val" aria-label="${hmKo(ts.main * 10)}">${hm(ts.main * 10)}${others.length ? `<span class="sub"> · ${others.map((k) => hm(k * 10)).join(' · ')}</span>` : ''}</span><span class="small muted">${t('key.occ', { n: fmtN(O[ts.main]) })}${sar ? t('key.sariOn') : ''}</span>`
      : `<span class="mid">${t('key.noHigh')}</span>`}</div>
<div class="keys2"><div class="key"><span class="lab">${t('key.low')}</span><span class="mid">${ts.lows.length ? ts.lows.map(([a, b]) => `<span class="nw">${hm(a * 10)}~${hm(b * 10)}</span>`).join('<br>') : `<span class="small">${t('key.noLow')}</span>`}</span></div>
<div class="key"><span class="lab">${t('key.peakArr')}</span><span class="mid">${hm(ts.peakArr * 10)}</span><span class="small muted">${t('key.per10', { n: fmtN(A[ts.peakArr]) })}</span></div></div>`;
    const dq = ts.day;
    $('#dayq').innerHTML = `<div class="key dayq"><span class="lab">${t('key.day')}</span>${dq.wins.length
      ? `<div class="keys2">${dq.wins.map((w) => `<div><span class="mid nw">${hm(w.k * 10)}~${hm(w.k * 10 + 60)}</span><span class="small muted" style="display:block">${t('key.dayRed', { t: hm(dq.peakK * 10), p: Math.round(w.red * 100) })}</span></div>`).join('')}</div>`
      : `<span class="small">${t('key.noDay')}</span>`}</div>`;
    $('#legend').innerHTML = `<li><span class="sw"></span>${t('lg.occ')}</li><li><span class="sw band"></span>${t('lg.band', { b: fc.G.band === 'p25-p75' ? t('lg.bandIqr') : t('lg.bandMinMax', { n: fc.G.n_days_occ }) })}</li><li><span class="sw bar"></span>${t('lg.arr')}</li><li><span class="sw quiet"></span>${t('key.day')}</li>${sar ? `<li><span class="sw sari"></span>${t('lg.sari')}</li>` : ''}`;
    const desc = t('chart.desc', { d: dateKo(iso), g: gName(fc.g) }) + (ts.main != null ? t('chart.descHigh', { t: hmKo(ts.main * 10), n: fmtN(O[ts.main]) }) : '')
      + (ts.lows.length ? t('chart.descLow', { w: ts.lows.map(([a, b]) => t('chart.descLowItem', { a: hmKo(a * 10), b: hmKo(b * 10) })).join(', ') }) : '')
      + t('chart.descArr', { t: hmKo(ts.peakArr * 10), n: fmtN(A[ts.peakArr]) });
    const readout = $('#readout');
    S.chart = tideChart($('#chart'), fc, {
      stats: ts, sari: sar, nowMin: isToday ? now.min : null, cursor: S.cursor, title: t('chart.svgTitle', { d: dateKo(iso) }), desc,
      onMove: (k) => { S.cursor = k; readout.textContent = t('chart.readout', { t: hm(k * 10), o: fmtN(O[k]), a: fmtN(A[k]) }); },
      onPick: (k) => openWave(k),
    });
    let rows = '';
    for (let h = 5; h < 24; h++) { const k = h * 6; rows += `<tr><th scope="row">${pad(h)}:00</th><td class="n">${fmtN(O[k])}</td><td class="n">${fmtN(fc.lo[k])}~${fmtN(fc.hi[k])}</td><td class="n">${fmtN(A.slice(k, k + 6).reduce((x, y) => x + y, 0))}</td></tr>`; }
    $('#tbl').innerHTML = `<table><caption>${t('tbl.caption', { m: sar ? t('tbl.mSari') : t('tbl.mFc') })}</caption><thead><tr><th scope="col">${t('tbl.time')}</th><th scope="col" class="n">${t('tbl.occ')}</th><th scope="col" class="n">${t('tbl.band')}</th><th scope="col" class="n">${t('tbl.arr1h')}</th></tr></thead><tbody>${rows}</tbody></table>`;
    if (S.open.visit || S.open.disp) extras();
  };

  const openWave = async (k) => {
    S.cursorOpen = k; syncUrl();
    const { sar } = cur();
    const h = Math.floor(k / 6);
    const share = D.profiles.short_stop_share[h];
    const rule = (D.context.visit && D.context.visit.parking_rules && D.context.visit.parking_rules[0]) || '';
    let html = `<p class="key"><span class="mid">${t('sheet.arr', { n: fmtN(fc.arr[k]) })}</span></p>
<p class="basis">${t('sheet.basis', { g: gName(fc.g), n: fmtN(fc.G.arr[k]), m: fc.m, s: fc.s.toFixed(2) })}</p>`;
    if (k >= 33 && k <= 35) {
      const bt = await load('backtest', { optional: true });
      const dc = bt && bt.class_checks.dawn_check;
      if (dc) html += `<p class="verify">${t('sheet.verify', { a: dc.window[0], b: dc.window[1], p: fmtN(dc.predicted), o: fmtN(dc.observed) })}</p>`;
    }
    html += `<div class="part" id="w-cls"><h3><span class="dot c" aria-hidden="true"></span>${t('sheet.cls')}</h3><p class="muted small">${t('sheet.clsLoading')}</p></div>
<div class="part"><h3><span class="dot s" aria-hidden="true"></span>${t('sheet.short')}</h3><p>${t('sheet.shortText', { h, p: Math.round(share * 100) })}</p>${rule ? `<p class="small">${esc(t('sheet.shortRule', { r: LANG === 'en' ? D.context.visit.parking_rules_en[0] : rule }))}</p>` : ''}<p class="basis">${t('sheet.shortBasis', { h })}</p></div>`;
    if (sar) html += `<div class="part"><h3><span class="dot a" aria-hidden="true"></span>${t('sheet.sari')}</h3><p>${t('sheet.sariText', { a: signed(sar.dArr[k]), o: signed(sar.dOcc[k]) })}</p><p class="basis">${t('sheet.sariBasis', { d: esc(ov.source_day), t: hm(S.sariT) })}</p></div>`;
    html += `<p class="info part">${icon('info', 16)}<span>${t('sheet.noSum')} <a href="./#/method/classes">${t('ui.method')}</a></span></p>`;
    openSheet(binLabel(k), html, () => { S.cursorOpen = null; syncUrl(); });
    try {
      const C = await load('classes');
      const el = $('#w-cls'); if (!el) return;
      const list = classesOn(iso, C).filter((c) => { const b = Math.floor(c.start / 10); return b >= k + 1 && b <= k + 3; }).sort((a, b) => b.cap - a.cap);
      const seats = list.reduce((s, c) => s + c.cap, 0);
      const contrib = Math.min(fc.s * C.beta.value * seats / 3, fc.arr[k]);
      const stale = classesStale(iso, C);
      const mode = (() => { const m = new Map(); list.forEach((c) => m.set(c.start, (m.get(c.start) || 0) + c.cap)); return [...m].sort((a, b) => b[1] - a[1])[0]; })();
      const li = (c) => `<li><span lang="ko">${esc(c.center)} · ${esc(c.name)} <span class="muted">${hm(c.start)}</span></span><span class="n">${t('unit.seats', { n: fmtN(c.cap) })} ${ext(c.url, `<span class="sr-only">${t('sheet.clsLink')}</span>`, 'small')}</span></li>`;
      const staleTxt = stale ? t('sheet.clsStale', { m: stale }) : '';
      el.innerHTML = `<h3><span class="dot c" aria-hidden="true"></span>${t('sheet.cls')}</h3>` + (seats && contrib >= 1
        ? `<p>${t('sheet.clsExplain', { n: fmtN(contrib) })}</p><p class="small">${t('sheet.clsRange', { a: hm((k + 1) * 10), b: hm((k + 4) * 10 - 1), c: list.length, s: fmtN(seats) })}${mode ? t('sheet.clsMode', { t: hm(mode[0]), s: fmtN(mode[1]) }) : ''}</p>${t('sheet.clsNames') ? `<p class="small muted">${t('sheet.clsNames')}</p>` : ''}
<ul class="list">${list.slice(0, 5).map(li).join('')}</ul>${list.length > 5 ? `<details><summary>${t('sheet.clsMore', { n: list.length - 5 })}</summary><ul class="list">${list.slice(5).map(li).join('')}</ul></details>` : ''}
<p class="basis">${t('sheet.clsCalc', { m: fc.m, s: fc.s.toFixed(2), b: C.beta.value.toFixed(3), c: fmtN(seats) })}${staleTxt ? ` · ${staleTxt}` : ''}</p>`
        : `<p>${t('sheet.clsNone')}</p>${staleTxt ? `<p class="basis">${staleTxt}</p>` : ''}`);
    } catch (e) {
      const el = $('#w-cls'); if (el) el.querySelector('p').textContent = t('sheet.clsFail');
    }
  };

  const sariPanel = () => {
    const el = $('#sari'), open = !!S.panelOpen;
    const times = []; for (let m = 720; m <= 1260; m += 30) times.push(m);
    let body = '';
    if (open) {
      if (!ov) body = `<p>${t('sari.weekday')}</p>`;
      else {
        const o = ov.offsets_min, T = S.sariT, src = ov.source_day;
        const srcTxt = LANG === 'en' ? dateKo(src) + ` ${src.slice(0, 4)}` : t('sari.srcDate', { y: +src.slice(0, 4), m: +src.slice(5, 7), d: +src.slice(8, 10), w: WD[wdOf(src)] });
        const v = D.context.visit;
        const st = v ? [...new Set(v.subway.map((x) => (LANG === 'en' ? `Line ${x.line} ${x.station_en}` : `${x.line}호선 ${x.station}`)))].join(', ') : '';
        body = `<label class="row" for="sari-t"><span>${t('sari.start')}</span><select id="sari-t">${times.map((m) => `<option value="${m}"${m === T ? ' selected' : ''}>${hm(m)}</option>`).join('')}</select></label>
<p>${t('sari.same', { d: srcTxt })}</p>
<ul class="facts">
<li>${t('sari.f1', { r: (ov.peak_occ / ov.normal_peak_occ).toFixed(1), p: fmtN(ov.peak_occ), g: gName(fc.g), n: fmtN(ov.normal_peak_occ) })}</li>
<li>${t('sari.f2', { d: durKo(o.rush_start), t: hm(T + o.rush_start) })}</li>
<li>${t('sari.f3', { d: durKo(o.exit_peak), n: fmtN(ov.exit_peak_10min), t: hm(T + o.exit_peak) })}</li>
<li>${t('sari.f4', { d: durKo(o.clear), t: hm(T + o.clear) })}</li>
<li>${t('sari.f5', { n: fmtN(ov.exit_max_30min), g: gName(fc.g), m: fmtN(ov.normal_exit_max_30min) })}</li>
</ul>
<button class="btn" type="button" id="ics">${icon('cal', 18)}${t('sari.ics')}</button>
${st ? `<p class="small">${t('sari.transit', { s: esc(st) })}</p>` : ''}
<p class="basis">${t('sari.limits', { r: ov.ref_start, g: gName(fc.g) })} <a href="./#/method/sari">${t('ui.method')}</a></p>`;
      }
      body += `<div class="part" id="ev"><h3>${t('ev.title')}</h3><p class="small muted">${t('ev.loading')}</p></div>`;
    }
    el.innerHTML = panelBtn('sari', t('sari.title'), t('sari.sub'), open) + `<div id="sari-b">${body}</div>`;
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
      const tag = E.date_semantics === 'uncertain' ? `<span class="small muted">${t('ev.tag')}</span>` : '';
      const li = (x) => `<li><span>${ext(x.url, `<span lang="en">${esc(x.title)}</span>`)}${x.venue ? ` · ${esc(x.venue)}` : ''}${tag}</span><span class="n small">${esc(x.date)}</span></li>`;
      el.innerHTML = `<h3>${t('ev.title')}</h3>` + (items.length ? `<ul class="list">${items.map(li).join('')}</ul>`
        : `<p>${t('ev.none', { d: esc(E.latest_date) })}${ov ? t('ev.noneInput') : ''}</p>`)
        + `<details${LANG === 'en' ? ' open' : ''}><summary>${t('ev.past')}</summary><ul class="list">${E.items.slice(0, 12).map(li).join('')}</ul><p class="basis">${t('ev.pastBasis', { n: 12, d: esc(E.latest_date) })}</p></details>`
        + (D.meta.keys.culture ? '' : `<p class="basis">${t('ev.key')}</p>`);
    } catch (e) { el.innerHTML = `<p class="small">${t('ev.fail')}</p>`; }
  };

  // 편하게 방문하기·분산 효과 — 펼칠 때만 지연 로드(views/extras.js)
  const extras = async () => {
    const mod = await import('./views/extras.js');
    const { ts } = cur();
    mod.renderVisit($('#visit'), { D, fc, ts, iso, open: !!S.open.visit });
    mod.renderDisp($('#disp'), { D, fc, ov, open: !!S.open.disp });
    bindPanels();
  };
  const bindPanels = () => {
    for (const id of ['visit', 'disp']) {
      const b = $(`#${id}-btn`);
      if (b) b.onclick = () => { S.open[id] = !S.open[id]; if (S.open[id]) extras().then(() => $(`#${id}-btn`).focus()); else { closedPanels(); $(`#${id}-btn`).focus(); } };
    }
  };
  const closedPanels = () => {
    if (!S.open.visit) $('#visit').innerHTML = panelBtn('visit', t('visit.title'), t('visit.sub'), false) + '<div id="visit-b"></div>';
    if (!S.open.disp) $('#disp').innerHTML = panelBtn('disp', t('disp.title'), t('disp.sub'), false) + '<div id="disp-b"></div>';
    bindPanels();
  };

  // 상황 칩(§6.9, F10)
  const chips = [];
  const md = iso.slice(5);
  const inMD = (a, b) => (a <= b ? (md >= a && md <= b) : (md >= a || md <= b));
  const fmtMD = (s) => `${+s.slice(0, 2)}/${+s.slice(3)}`;
  const ctx = D.context;
  if (ctx.weather && ctx.weather.hours) {
    const hrs = ctx.weather.hours.filter((x) => x.t.startsWith(iso));
    const pop = Math.max(0, ...hrs.map((x) => x.pop || 0));
    if (hrs.length && pop >= 30) chips.push(`<span class="chip">${t('ctx.rain', { p: pop })}</span>`);
  }
  for (const l of ctx.lawn) {
    if (l.closed && inMD(l.closed[0], l.closed[1])) chips.push(ext(l.url, t('ctx.lawnClosed', { a: fmtMD(l.closed[0]), b: fmtMD(l.closed[1]) }), 'chip'));
    if (l.open && inMD(l.open[0], l.open[1])) chips.push(ext(l.url, t('ctx.lawnOpen', { p: esc(l.places.join('·')), b: fmtMD(l.open[1]) }), 'chip'));
  }
  if (ctx.rose) for (const [a, b] of ctx.rose.periods) if (inMD(a, b)) chips.push(`<span class="chip accent" title="${esc(ctx.rose.note)}">${t('ctx.rose')}</span>`);
  ctx.notices.filter((n) => n.from <= iso && iso <= n.to).slice(0, 2).forEach((n) => chips.push(ext(n.url, `<span>${t('ctx.notice', { t: `<span lang="ko">${esc(n.title)}</span>` })}</span>`, 'chip')));
  $('#ctx').innerHTML = chips.slice(0, 4).join('') || `<p class="small muted">${t('ctx.none')}</p>`;

  closedPanels();
  draw();
  sariPanel();
  if (isToday) load('live', { optional: true }).then((live) => { if ($('#live')) liveCard($('#live'), D, live); });
  if (q.panel && ['visit', 'disp'].includes(q.panel)) { S.open[q.panel] = true; extras(); }
  if (q.t && /^\d{4}$/.test(q.t)) { const k = Math.floor((+q.t.slice(0, 2) * 60 + +q.t.slice(2)) / 10); if (k >= 0 && k < 144) { S.chart.set(k); openWave(k); } }
}

/* ---------------- 404 ---------------- */
export function viewNotFound(main) {
  setTitle(t('nf.doc'));
  main.innerHTML = emptyState(t('nf.title'), t('nf.body'), `<a class="btn" href="./#/">${t('nf.go')}</a>`);
}

/* ---------------- 셸·라우터 ---------------- */
const TABS = [['today', './#/', 'nav.today', 'wave'], ['week', './#/week', 'nav.week', 'cal'], ['live', './#/live', 'nav.live', 'signal'], ['method', './#/method', 'nav.method', 'formula'], ['org', './#/org', 'nav.org', 'steth']];
export function setTitle(x) { document.title = `${x} · ${t('app.name')}`; }
function shell(active) {
  const li = (x) => `<a href="${x[1]}"${x[0] === active ? ' aria-current="page"' : ''}>${icon(x[3], 22)}<span>${t(x[2])}</span></a>`;
  $('#tabs').innerHTML = `<ul>${TABS.map((x) => `<li>${li(x)}</li>`).join('')}</ul>`;
  $('#topnav').innerHTML = TABS.map((x) => `<a href="${x[1]}"${x[0] === active ? ' aria-current="page"' : ''}>${t(x[2])}</a>`).join('');
  $('.brand-name').textContent = t('app.name');
  const lb = $('#btn-lang'); lb.textContent = t('ui.langShort'); lb.setAttribute('aria-label', `${t('ui.langShort')} · ${t('ui.lang')}`);
  $('#btn-large').setAttribute('aria-label', t('ui.large'));
  $('#btn-theme').setAttribute('aria-label', t('ui.dark'));
}
async function footer() {
  try {
    const m = await load('meta');
    $('#ftr').innerHTML = `<p>${t('foot.data', { t: esc(fmtStamp(m.built_at)) })}</p><p>${t('foot.notOfficial', { repo: esc(m.repo_url) })}</p>`;
    const age = (Date.now() - new Date(m.built_at).getTime()) / 864e5;
    if (age > 7) $('#banner').innerHTML = `<div class="warnbar" role="status" style="margin:0">${t('banner.stale', { d: Math.floor(age) })}</div>`;
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
  shell(TABS.some((x) => x[0] === tab) ? tab : '');
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
  if (LANG === 'en' && (seg[0] === 'method' || seg[0] === 'org')) main.setAttribute('lang', 'ko'); else main.removeAttribute('lang');
  if (!first && !(seg[0] === 'method' && seg[1])) { const h = main.querySelector('h1'); (h || main).focus({ preventScroll: true }); window.scrollTo(0, 0); }
  first = false;
}
export function toggleLarge() { const root = document.documentElement; if (root.dataset.large === '1') delete root.dataset.large; else root.dataset.large = '1'; store.set('large', root.dataset.large || '0'); syncControls(); }
function syncControls() {
  const root = document.documentElement;
  $('#btn-large').setAttribute('aria-pressed', String(root.dataset.large === '1'));
  const dark = root.dataset.theme ? root.dataset.theme === 'dark' : matchMedia('(prefers-color-scheme: dark)').matches;
  $('#btn-theme').setAttribute('aria-pressed', String(dark));
  $('#btn-lang').setAttribute('aria-pressed', String(LANG === 'en'));
}
function initControls() {
  const root = document.documentElement;
  $('#btn-large').onclick = toggleLarge;
  $('#btn-theme').onclick = () => {
    const dark = $('#btn-theme').getAttribute('aria-pressed') === 'true';
    root.dataset.theme = dark ? 'light' : 'dark'; store.set('theme', root.dataset.theme); syncControls();
  };
  $('#btn-lang').onclick = async () => {
    await setLang(LANG === 'en' ? 'ko' : 'en'); store.set('lang', LANG); syncControls();
    first = true; await route(); footer(); $('#btn-lang').focus();
  };
  const off = () => { $('#banner').innerHTML = navigator.onLine ? '' : `<div class="offline" role="status">${t('banner.offline')}</div>`; };
  addEventListener('online', off); addEventListener('offline', off);
}
(async () => {
  initControls();
  await setLang(store.get('lang') === 'en' ? 'en' : 'ko');
  syncControls();
  addEventListener('hashchange', route);
  await route();
  footer();
})();
