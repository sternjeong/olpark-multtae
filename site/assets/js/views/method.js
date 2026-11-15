// S6 계산 방법·출처 — 모든 숫자·파라미터는 JSON에서 읽는다.
import { $, esc, fmtN, fmtStamp, GROUP_KO, hm, koOnlyNote, load, loadCore, setTitle } from '../app.js';

const SECTIONS = [['data', '쓴 데이터'], ['occupancy', '점유 재구성'], ['profile', '요일군 프로파일'], ['season', '계절 지수'], ['classes', '강좌 계수 β'], ['tide', '만조·한산한 창 규칙'], ['dispersion', '분산 효과 모델'], ['visit', '편하게 방문하기 출처'], ['sari', '사리 시나리오'], ['live', '실시간·아카이브'], ['backtest', '검증'], ['limits', '한계'], ['keys', '키 연동 상태'], ['impact', '공익 효과 측정 계획'], ['license', '출처·이용허락']];
const USE = {
  15138735: '점유 재구성·요일군 프로파일·사리·짧은 정차·백테스트', 15101610: '강좌 시작 수요·β·실험실', 15110953: '강좌 시작 수요·β·실험실(좀비 행 제외)',
  15131671: '월 계절 지수', 15168686: '실시간 수위·자체 아카이브', 15099006: '공연 기준 시작 시각(T_ref)', 15149169: '공연 기록 목록',
  15090715: '상황 칩(공지)', 15143220: '상황 칩(잔디)', 15089962: '상황 칩(장미 시기)', 15164156: '기관용 점검·만차 구역', 15147873: '기관용 점검(개방목록)',
  15114776: '기관용 점검(강좌 스키마)', 15118652: '기관용 점검(강좌 스키마)',
};
const f2 = (a) => a.map((x) => x.toFixed(2).replace('-', '−')).join(', ');
const pct = (x, d = 1) => `${(x * 100).toFixed(d)}%`;
const sec = (id, title, body) => `<section class="card" id="m-${id}" aria-labelledby="h-${id}"><h2 id="h-${id}">${title}</h2>${body}</section>`;
const fmtOff = (m) => `${m < 0 ? '−' : '+'}${Math.floor(Math.abs(m) / 60)}:${String(Math.abs(m) % 60).padStart(2, '0')}`;

export default async function viewMethod(main, anchor) {
  const D = await loadCore();
  const [C, B, L, E] = await Promise.all([load('classes'), load('backtest'), load('live', { optional: true }), load('events')]);
  setTitle('계산 방법·출처');
  const P = D.profiles, S = D.season, M = D.meta, R = P.tide_rules, b = C.beta, cc = B.class_checks;
  const G = P.groups;
  const srcRows = M.sources.map((s) => `<tr><td>${esc(s.id)}</td><td>${esc(s.name)}</td><td>${s.role === 'core' ? '핵심' : '보조'}</td><td>${esc(USE[s.id] || '')}</td></tr>`).join('');
  const seasonRows = Object.keys(S.index).map((m) => `<tr><th scope="row">${m}월</th><td class="n">${S.index[m].toFixed(2)}</td><td class="n">${pct(S.cv[m], 0)}${S.cv[m] >= S.high_cv_threshold ? ' · 차이 큼' : ''}</td></tr>`).join('');
  const ov = P.event_overlay;
  const offRows = Object.entries(ov).map(([g, o]) => `<tr><th scope="row">${GROUP_KO[g]} (${esc(o.source_day)}, ${o.ref_start})</th><td>${fmtOff(o.offsets_min.rush_start)} ~ ${fmtOff(o.offsets_min.rush_end)}</td><td>${fmtOff(o.offsets_min.exit_peak)} (${fmtN(o.exit_peak_10min)}대/10분)</td><td>${fmtOff(o.offsets_min.clear)}</td><td class="n">${fmtN(o.exit_max_30min)}대</td></tr>`).join('');
  const mt = B.methods;
  const keyRow = (name, on, change) => `<tr><td>${name}</td><td>${on ? '<span class="badge">연결됨</span>' : '<span class="badge lo">연결 안 됨</span>'}</td><td>${change}</td></tr>`;
  const lic = M.sources.map((s) => `<tr><td>${esc(s.id)}</td><td>${esc(s.name)}</td><td>한국체육산업개발(주)</td><td>${esc(s.license)}</td><td>${esc((M.periods[s.id] || []).join(' ~ '))}</td><td>${esc(s.via)}</td><td>${esc(fmtStamp(s.fetched_at))}</td><td><a href="${esc(s.url)}" rel="noopener">포털</a></td></tr>`).join('');
  const hol = D.holidays;
  const ed = P.event_detection;
  const DS = P.dispersion, DT = P.daytime, V = D.context.visit;
  const dtRows = Object.entries(DT).map(([g, v]) => `<tr><th scope="row">${GROUP_KO[g]}</th><td>${hm(v.peak_k * 10)} (${fmtN(v.peak)}대)</td><td>${v.windows.map((w) => `${hm(w.start_k * 10)}~${hm(w.start_k * 10 + 60)} (−${(w.reduction * 100).toFixed(0)}%)`).join(', ')}</td></tr>`).join('');
  const dsRows = Object.entries(DS.day_shift).map(([g, v]) => { const r = v.rows.find((x) => x.f === 0.3); return `<tr><th scope="row">${GROUP_KO[g]}</th><td>${hm(v.p_bins[0] * 10)}~${hm(v.p_bins[1] * 10)} → ${hm(v.q_start_k * 10)}~${hm(v.q_end_k * 10)}</td><td class="n">${fmtN(r.moved_cars[1])}</td><td class="n">${fmtN(r.occ_peak_red[1])}대 (${(r.occ_peak_red_pct[1] * 100).toFixed(1)}%, 범위 ${(r.occ_peak_red_pct[0] * 100).toFixed(1)}~${(r.occ_peak_red_pct[2] * 100).toFixed(1)}%)</td><td class="n">${v.n_days}</td></tr>`; }).join('');
  const qb = DS.exit_queue.table.find((x) => x.f === 0 && x.spread_min === 60), q3 = DS.exit_queue.table.find((x) => x.f === 0.3 && x.spread_min === 60);
  const qRows = DS.exit_queue.params.map((p, i) => `<tr><th scope="row">${GROUP_KO[p.group]} ${esc(p.source_day)}</th><td class="n">${fmtN(p.M)}</td><td class="n">${fmtN(p.c10)}</td><td class="n">${fmtN(qb.wait_car_min[i])} (${(qb.wait_car_min[i] / p.M).toFixed(1)}분/대)</td><td class="n">${fmtN(q3.wait_car_min[i])} (−${((1 - q3.wait_car_min[i] / qb.wait_car_min[i]) * 100).toFixed(0)}%)</td></tr>`).join('');
  const Q = await load('quality', { optional: true });
  const resolved = Q ? Q.checks.filter((c) => c.status === 'resolved').length : 0;
  main.innerHTML = `${koOnlyNote()}<h1 tabindex="-1">계산 방법·출처</h1>
<p>화면의 모든 숫자는 아래 식으로 빌드할 때마다 원자료에서 다시 계산해요. 아래 값도 같은 JSON에서 읽어 보여 드려요.</p>
<nav class="card" aria-label="목차"><ol class="toc">${SECTIONS.map(([id, t]) => `<li><a href="./#/method/${id}">${t}</a></li>`).join('')}</ol></nav>
${sec('data', '쓴 데이터', `<p>한국체육산업개발(주) 개방 데이터 ${M.sources.length}종(실시간 API 포함)을 써요. 핵심 데이터는 빠지면 해당 기능이 동작하지 않아요.</p>
<div class="tbl"><table><caption>데이터셋별 쓰임</caption><thead><tr><th scope="col">ID</th><th scope="col">이름</th><th scope="col">역할</th><th scope="col">쓰임</th></tr></thead><tbody>${srcRows}</tbody></table></div>`)}
${sec('occupancy', '점유 재구성', `<p>입출차 원자료(15138735) ${fmtN(P.basis.rows)}건으로 분 단위 주차 대수를 다시 계산해요.</p>
<p class="formula">O(m) = Σᵢ 1[입차ᵢ ≤ m &lt; 출차ᵢ]  (차분 배열 누적합)</p>
<p>10분 구간 값: 점유 = 구간 시작 분의 O, 입차·출차 = 구간 안 건수. ${esc(P.basis.occupancy_excluded.join(', '))}은 그 전에 들어온 차가 자료에 없어 점유 통계에서 뺐어요.</p>
<p class="basis">보존 검사: 7월 입차 ${fmtN(P.checks.arr_in_month)} − 7월 출차 ${fmtN(P.checks.dep_in_month)} = 7/31 24:00 점유 ${fmtN(P.checks.end_occ)}대</p>`)}
${sec('profile', '요일군 프로파일', `<p>요일군 g ∈ {평일, 토, 일}. 공휴일은 일요일로 봐요(가정). 행사 의심일(${esc(P.basis.event_days.join(', '))})은 보통날에서 뺐어요.</p>
<ul><li>입차·출차: 구간별 평균, 점유: 구간별 중앙값</li><li>관측 범위: 평일 25~75 백분위, 주말 최소~최대</li><li>주말은 표본이 3일이라 중심 3구간 이동평균으로 다듬어요</li></ul>
<div class="tbl"><table><thead><tr><th scope="col">요일군</th><th scope="col" class="n">날 수(입차/점유)</th><th scope="col">점유 최대(다듬기 전 중앙값)</th></tr></thead><tbody>${Object.entries(G).map(([g, v]) => `<tr><th scope="row">${GROUP_KO[g]}</th><td class="n">${v.n_days}/${v.n_days_occ}</td><td>${fmtN(v.raw_median_peak.occ)}대 @${v.raw_median_peak.time}</td></tr>`).join('')}</tbody></table></div>
<p class="formula">F_occ(d,k) = s_m(d) · P_occ,g(d)(k) · F_arr(d,k) = s_m(d) · P_arr,g(d)(k)</p>
<p class="basis">가정: 하루 모양은 2024년 7월과 같고 규모만 달마다 달라요.</p>`)}
${sec('season', '계절 지수', `<p class="formula">s_m = 평균_y M(y,m) / 평균_y M(y,7)  (y = ${S.years.join('·')}, ${esc(S.place)})</p>
<div class="tbl"><table><caption>월별주차현황(15131671) 기준 월 지수와 해마다 차이(변동계수)</caption><thead><tr><th scope="col">월</th><th scope="col" class="n">지수</th><th scope="col" class="n">변동계수</th></tr></thead><tbody>${seasonRows}</tbody></table></div>
<p class="basis">${esc(S.note)}. 변동계수 ${pct(S.high_cv_threshold, 0)} 이상인 달(${S.high_cv_months.join('·')}월)은 근거 꼬리표에 "해마다 차이가 큰 달이에요"를 붙여요.</p>`)}
${sec('classes', '강좌 계수 β', `<p>공원 안 올림픽수영장·올림픽스포츠센터 강좌가 시작 전 30분 동안 고르게 도착한다고 보고 수요를 만들어요.</p>
<p class="formula">S_d(k) = Σ_c 정원_c/3 · 1[k ∈ {b_c−3, b_c−2, b_c−1}],  b_c = ⌊시작분/10⌋</p>
<p>2024년 7월 평일 요일별 입차가 요일 평균에서 벗어난 만큼을 강좌 수요가 벗어난 만큼으로 회귀했어요(원점 통과, ${b.window.join('~')}).</p>
<p class="formula">β = Σ(S_w−S̄)(A_w−Ā) / Σ(S_w−S̄)² = ${b.value.toFixed(3)} ± ${b.se.toFixed(3)} (표준오차, n = ${b.n})</p>
<p class="formula">강좌 기여 C(d,k) = min(s_m · β · S_d(k), F_arr(d,k))</p>
<ul><li>2024-07 유효 강좌 ${fmtN(b.n_classes_2024_07)}개(수영장 정원 ${fmtN(b.capacity_2024_07.swim)}석 · 스포츠센터 ${fmtN(b.capacity_2024_07.center)}석)</li>
<li>평일 05~22시 입차 중 강좌 기여 추정 ${pct(b.share_weekday)}</li>
<li>시간대 상관(요일별) r = ${f2(cc.r_hourly)} · 주말 ${f2(cc.r_weekend)}</li>
<li>요일 차분 상관(월수금 − 화목) r = ${cc.r_weekday_diff.toFixed(2)}</li>
<li>정시 직전 30분 / 정시 직후 30분 입차 = ${f2(cc.pre_hour_ratio)}배</li>
<li><strong>새벽 수준 검증</strong>: 06시 시작 평일 정원 ${fmtN(cc.dawn_check.capacity_06)}석 × β = 계산 ${fmtN(cc.dawn_check.predicted)}대 vs 실제 평일 ${cc.dawn_check.window.join('~')} 평균 ${fmtN(cc.dawn_check.observed)}대(${cc.dawn_check.n_days}일). β는 요일 간 차이로만 추정했으므로 수준 일치는 별도 점검이에요.</li></ul>
<p class="basis">현재 화면의 강좌 목록: ${esc(C.ref_date)} 기준 유효 ${fmtN(C.count_on_ref)}개 + 60일 안에 시작하는 ${fmtN(C.count_upcoming)}개. 2023년 이전 시작·종료일 9999-12-31 행 ${fmtN(C.zombie_excluded)}개는 끝난 강좌로 보고 뺐어요. 최신 시간표: 수영장 ${esc(C.latest_month['15101610'])}, 스포츠센터 ${esc(C.latest_month['15110953'])}.</p>`)}
${sec('tide', '만조·한산한 창 규칙', `<ul><li><strong>만조</strong>: ${hm(R.hi[0] * 10)}~${hm(R.hi[1] * 10)} 점유 예보를 ${R.smooth}구간 이동평균한 곡선의 국소 최대 중, 양쪽으로 자기보다 높은 지점까지의 최소값과의 차(돌출도)가 그날 최대의 ${pct(R.prom, 0)} 이상이고 서로 ${R.win * 10}분 이상 떨어진 것. 높이 순 최대 3개.</li>
<li><strong>한산한 창</strong>: ${hm(R.low[0] * 10)}~${hm(R.low[1] * 10)}에서 점유 ≤ 그날 최대 × ${R.low_occ} 이고 입차 ≤ 그 시간대 입차 중앙값인 구간이 ${R.low_min * 10}분 이상 이어지는 곳(긴 순 최대 2개).</li>
<li><strong>밀물 최고</strong>: ${hm(R.arr[0] * 10)}~${hm(R.arr[1] * 10)} 10분 입차 예보가 가장 큰 구간.</li></ul>`)}
${sec('dispersion', '낮에 덜 붐비는 때와 분산 효과 모델', `<p><strong>낮에 덜 붐비는 때</strong>: ${hm(R.day[0] * 10)}~${hm(R.day[1] * 10)} 점유 예보(3구간 평활)에서 ${R.day_win * 10}분 평균이 가장 낮은 창. 두 번째 창은 겹치지 않고 낮 최고보다 ${(R.day_min_red * 100).toFixed(0)}% 이상 낮을 때만(최대 ${R.day_max}개). 감소율 = 1 − 창 평균 / 낮 최고. 계절 지수는 모든 시각에 같은 배율이라 %에는 영향이 없어요.</p>
<div class="tbl"><table><caption>요일군별 낮 최고와 덜 붐비는 때(2024-07 프로파일)</caption><thead><tr><th scope="col">요일군</th><th scope="col">낮 최고</th><th scope="col">덜 붐비는 때(낮 최고 대비)</th></tr></thead><tbody>${dtRows}</tbody></table></div>
<p><strong>낮 시간 분산</strong>: ${esc(DS.day_shift_rule)}. 비율 f만큼 옮기면 기대값은 원래 곡선 + f·(옮긴 곡선 − 원래 곡선)이에요. 보통날 하루하루에 적용해 하루 최고 점유(06~23시)와 만조 직전 10분 최대 입차가 얼마나 줄어드는지 셌어요.</p>
<div class="tbl"><table><caption>f = 30%일 때(7월 규모, 보통날 중앙값)</caption><thead><tr><th scope="col">요일군</th><th scope="col">옮기는 구간</th><th scope="col" class="n">옮기는 차/일</th><th scope="col" class="n">최고 점유 감소</th><th scope="col" class="n">날 수</th></tr></thead><tbody>${dsRows}</tbody></table></div>
<p><strong>공연 퇴장 대기</strong>: ${esc(DS.exit_queue.assumption)}. q(t+1) = max(0, q(t) + 도착(t) − c), 대기 차량·분 = Σ q(t). 기준(f=0)은 M대 전부가 0분에 나가려는 경우로, 대기 합계 = M²/(2c)에 가까워요. 비율 f가 S분에 걸쳐 고르게 나가면 그만큼 대기가 줄어요.</p>
<div class="tbl"><table><caption>행사일별 입력과 결과(나눠 나가는 시간 60분)</caption><thead><tr><th scope="col">행사일</th><th scope="col" class="n">M(30분 최대 출차)</th><th scope="col" class="n">처리량 c(10분 최대)</th><th scope="col" class="n">대기 f=0</th><th scope="col" class="n">대기 f=30%</th></tr></thead><tbody>${qRows}</tbody></table></div>
<p class="basis">한계: 옮길 의향이 있는 사람이 얼마인지는 데이터로 알 수 없어 사용자가 비율을 고르게 했어요. 처리량은 관측된 최대값이라 실제 출구 용량보다 작을 수 있고(그러면 대기는 과대 추정), 공연 직후 동시 출차 가정은 최악에 가까운 경우예요. 이산화탄소 등 환경 효과로 바꾸지 않았어요(인용할 공식 계수를 확인하지 못함).</p>`)}
${sec('visit', '편하게 방문하기 출처', V ? `<p>지하철·주차 안내는 ${esc(V.source)}(<a href="${esc(V.url)}" rel="noopener">원문</a>, ${esc(V.retrieved_at)} 확인)에서 옮겼어요: ${V.subway.map((s) => `${s.line}호선 ${esc(s.station)} ${esc(s.exits)}`).join(' · ')}. 대형 행사 때 대중교통 이용 요청 문구와 주차 요금 규칙("${esc(V.parking_rules[0])}" 등)도 같은 페이지예요. 시설별 접근성(경사로·엘리베이터 등)은 확인한 데이터가 없어 안내하지 않아요.</p>` : '<p>방문 안내 정보가 없어요.</p>')}
${sec('sari', '사리 시나리오', `<p>저녁 장기입차 E(d) = ${ed.window.join('~')}에 들어와 ${ed.min_dwell_min}분 이상 머문 차. 같은 요일군 중앙값의 1.5배 이상이면 행사 의심일이에요.</p>
<p>${ed.days.map((d) => `${esc(d.date)} ${d.ratio.toFixed(2)}배(${fmtN(d.count)}대)`).join(' · ')}</p>
<p class="formula">Δ_g(k) = X_행사일(k) − P_g(k),  F_sari(d,k) = F(d,k) + Δ_g(k − (T − T_ref)/10)</p>
<p>Δ에는 계절 지수를 곱하지 않아요(관객 수는 계절과 무관하다고 가정). 기준 시작 시각 T_ref는 공연 포스터(15099006, 파싱 ${fmtN(P.poster_times.n_parsed)}건)의 요일별 시작 시각 상위 2개 중 행사일 점유 최대 시각 뒤 30분 안의 값이에요: ${Object.entries(ov).map(([g, o]) => `${GROUP_KO[g]} ${o.ref_start} (후보 ${o.ref_start_candidates.join('·')}, 점유 최대 ${o.event_peak_time})`).join(' · ')}.</p>
<div class="tbl"><table><caption>공연 시작 기준 오프셋</caption><thead><tr><th scope="col">기준</th><th scope="col">입차 몰림</th><th scope="col">출차 정점</th><th scope="col">평소 수준</th><th scope="col" class="n">최대 30분 출차</th></tr></thead><tbody>${offRows}</tbody></table></div>
<p class="basis">입차 몰림: 행사일 입차 ≥ 1.5 × 보통날, 시작 전 4시간 안 가장 긴 연속 구간. 평소 수준: 정점 뒤 출차 &lt; 1.5 × 보통날. 평일 시나리오는 제공하지 않아요(${esc(P.weekday_scenario.reason)}). 공연장 정보는 데이터에 없어요.</p>`)}
${sec('live', '실시간·아카이브', `<p>기관 실시간 API(15168686)는 값 하나(parking_sum)만 줘요. 브라우저에서 5초 제한으로 부르고, 실패하면 이 서비스 아카이브의 마지막 값을 회색으로 보여 드려요. GitHub Actions가 15분마다 값을 기록해 같은 요일·15분 슬롯의 중앙값과 기록 수(최근 28일)를 만들어요.</p>
<ul><li>순위 문장은 기록이 2회 이상일 때만 보여요.</li><li>지금 보정: ${L && L.nowcast.enabled ? `켜짐(MAE ${L.nowcast.mae_adj} vs ${L.nowcast.mae_base})` : `꺼짐 — ${L ? esc(L.nowcast.reason) : '아카이브 없음'}. 아카이브가 21일을 넘으면 보정이 10% 이상 나을 때만 켜요.`}</li>
<li>아카이브: ${L && L.archive_start ? `${esc(L.archive_start)}부터 ${L.days}일, ${fmtN(L.n_records)}건` : '아직 기록이 없어요'}</li></ul>`)}
${sec('backtest', '검증(백테스트)', `<p>학습 ${B.split.train.join('~')}(${B.split.n_train}일) → 검증 ${B.split.test.join('~')}(${B.split.n_test}일), 행사 의심일 제외. 10분 입차 예보의 오차예요.</p>
<div class="tbl"><table><thead><tr><th scope="col">방법</th><th scope="col" class="n">10분 MAE(대)</th><th scope="col" class="n">1시간 MAE(대)</th></tr></thead><tbody>
<tr><td>(a) 한 달 평균 평탄선</td><td class="n">${mt.flat.mae10}</td><td class="n">${mt.flat.mae60}</td></tr>
<tr><td>(b) 요일 무시 단일 프로파일</td><td class="n">${mt.single.mae10}</td><td class="n">${mt.single.mae60}</td></tr>
<tr><th scope="row">(c) 요일군 프로파일(이 서비스)</th><td class="n"><strong>${mt.group.mae10}</strong></td><td class="n"><strong>${mt.group.mae60}</strong></td></tr></tbody></table></div>
<p>(c) 1시간 오차는 검증일 시간당 평균 입차 ${fmtN(B.mean_hourly_arrivals_test)}대의 ${pct(B.group_mae60_share)}예요. 하루 총 입차 오차 평균 ${mt.group.ape_day}%, 입차가 가장 많은 시각은 ${mt.group.peak_hour_match[1]}일 중 ${mt.group.peak_hour_match[0]}일 맞았어요.</p>
<p class="basis">${esc(B.limits)}</p>`)}
${sec('limits', '한계', `<ul>
<li>입출차 원자료는 2024년 7월 한 달뿐이에요. 다른 달은 하루 모양이 같다고 보고 규모만 계절 지수로 맞춰요.</li>
<li>주말 프로파일은 토·일 각 3일, 사리 근거는 행사일 2일(토·일)이에요. 공연 규모·공연장은 다를 수 있어요.</li>
<li>강좌 기여는 정원 기준 추정이에요. 실제 등록 인원과 이동 수단은 데이터에 없어요.</li>
<li>10분 안에 나가는 차를 승하차·회차로 단정할 수 없어요(회차 규칙 데이터 없음).</li>
<li>실시간 값은 원자료와 기준이 달라 예보 곡선과 겹쳐 그리지 않아요.</li>
<li>영문 공연정보의 날짜는 공연일인지 게시일인지 확인되지 않고, ${esc(E.latest_date)} 이후 일정이 없어요.</li>
<li>날씨는 예보 계산에 넣지 않아요.</li></ul>`)}
${sec('keys', '키 연동 상태', `<div class="tbl"><table><thead><tr><th scope="col">키</th><th scope="col">상태</th><th scope="col">연결되면 달라지는 것</th></tr></thead><tbody>
${keyRow('공공데이터포털(data.go.kr) 키', M.keys.data_go_kr, '파일데이터를 자동변환 API로 받아 갱신이 안정돼요. 공휴일을 특일정보 API로 확인해요.')}
${keyRow('기상청 단기예보(같은 data.go.kr 키)', M.adapters.weather, '"비 예보 60%" 같은 상황 칩이 보여요(예보 계산에는 넣지 않아요).')}
${keyRow('문화공공데이터광장 키', M.keys.culture, '다가오는 공연이 자동으로 채워지고, 2025년 연계 데이터로 예보를 다시 검증해요.')}
</tbody></table></div><p class="basis">키 값은 저장소·로그·산출물 어디에도 남기지 않아요. 연결 여부만 기록해요.</p>`)}
${sec('impact', '공익 효과 측정 계획', `<p>이 서비스는 쿠키·추적 스크립트를 쓰지 않아요. GitHub Pages에는 방문 통계가 없으므로, 효과는 아래처럼 개인을 식별하지 않는 집계로만 재요.</p>
<ul><li><strong>혼잡 분산</strong>: 기관 입출차 원자료(15138735)가 2025년 이후에도 열리면, 서비스 공개 전후 같은 달·요일군의 만조 시간대 입차 비중과 하루 최고 점유를 비교해요(빌드에서 자동 계산 가능).</li>
<li><strong>실시간 아카이브</strong>: 이 서비스가 쌓는 15분 기록으로 공연일·주말 최고 대비 낮 시간 분포 변화를 공개 CSV로 추적해요.</li>
<li><strong>이용 규모</strong>: 기관 이관 뒤에는 기관 서버의 접속 로그(일별 페이지 요청 수 합계만, IP 저장 없이)로 셉니다. 이관 전에는 측정하지 않아요.</li>
<li><strong>데이터 품질 개선</strong>: 기관용 점검은 빌드할 때마다 원자료로 다시 계산되고, 결함이 사라지면 카드가 자동으로 '해결됨'으로 옮겨지며 해결 날짜(resolved_at)를 기록해요. 현재 해결됨 ${resolved}건.</li></ul>
<p class="basis">수치 목표는 정하지 않았어요. 기준선(2024년 7월)과 같은 정의로 비교할 수 있는 데이터가 열리는 것이 먼저예요(추가 개방 제안 P01).</p>`)}
${sec('license', '출처·이용허락', `<div class="tbl"><table><caption>모든 데이터 제공: 한국체육산업개발(주) · 공공데이터포털</caption><thead><tr><th scope="col">ID</th><th scope="col">이름</th><th scope="col">제공기관</th><th scope="col">이용허락</th><th scope="col">기간</th><th scope="col">가져온 방법</th><th scope="col">가져온 시각</th><th scope="col">링크</th></tr></thead><tbody>${lic}</tbody></table></div>
<p>공휴일: ${esc(hol.source)} (${Object.entries(hol.status).map(([y, s]) => `${y}년 ${esc(s)}`).join(' / ')}). <a href="${esc(hol.source_urls['2027'])}" rel="noopener">원문</a></p>
<p>코드: MIT 라이선스. 이 서비스는 한국체육산업개발(주)의 공식 서비스가 아니에요. 데이터 기준 ${esc(fmtStamp(M.built_at))}, 모델 ${esc(M.model_version)}.</p>`)}`;
  if (anchor) { const el = $(`#m-${CSS.escape(anchor)}`); if (el) { el.scrollIntoView(); el.querySelector('h2').setAttribute('tabindex', '-1'); el.querySelector('h2').focus({ preventScroll: true }); } }
}
