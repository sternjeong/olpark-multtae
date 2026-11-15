"""데이터셋 레지스트리와 공통 상수.

모든 파라미터는 산출 JSON에 기록되고 화면은 그 값을 읽는다(하드코딩 금지).
"""
import datetime as dt
import os
from zoneinfo import ZoneInfo

KST = ZoneInfo("Asia/Seoul")
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), ".."))
RAW_DIR = os.path.join(ROOT, "data", "raw")          # 커밋된 원본 스냅숏(CP949)
WORK_DIR = os.path.join(ROOT, "work")                # 갱신본(커밋하지 않음)
STATIC_DIR = os.path.join(os.path.dirname(__file__), "static")
SCHEMA_DIR = os.path.join(os.path.dirname(__file__), "schemas")

MODEL_VERSION = "1.0.0"
SITE_URL = "https://sternjeong.github.io/olpark-multtae/"
REPO_URL = "https://github.com/sternjeong/olpark-multtae"
USER_AGENT = f"olpark-multtae/{MODEL_VERSION} (+{REPO_URL})"

LICENSE_FREE = "이용허락범위 제한 없음"

# id, 이름, 역할, 기대 헤더(정규화 검사용)
DATASETS = {
    "15138735": {"name": "올림픽공원 입출차 정보", "role": "core",
                 "header": ["입차일", "입차일시", "출차일시"]},
    "15101610": {"name": "올림픽수영장 강좌정보", "role": "core",
                 "header": ["일련번호", "강좌번호", "강좌서브번호", "시작월", "강좌코드명", "강좌명", "시작종료시간",
                            "정원", "요일", "강습반", "강좌금액", "시작일자", "종료일자", "링크주소"]},
    "15110953": {"name": "올림픽스포츠센터 강좌정보", "role": "core",
                 "header": ["일련번호", "강좌일련번호", "강좌서브일련번호", "수강월", "종목", "강좌명", "수강시간",
                            "정원", "수강요일", "수강대상", "수강금액", "수강시작일", "수강종료일"]},
    "15131671": {"name": "월별주차현황", "role": "core", "header": ["연도", "월", "주차장소", "주차대수"]},
    "15099006": {"name": "공연 포스터 정보", "role": "core",
                 "header": ["일련번호", "공연포스터 일련번호", "제목", "공연일", "공연장소", "공연가수",
                            "연결홈페이지주소", "등록일", "데이터 기준일"]},
    "15149169": {"name": "영문 공연정보", "role": "core",
                 "header": ["일련번호", "공연제목", "조회수", "상세주소", "공연이미지", "공연일자"]},
    "15090715": {"name": "올림픽공원 핫뉴스 정보", "role": "core",
                 "header": ["순번", "핫뉴스번호", "제목", "시작일", "종료일", "홈페이지 주소", "파일위치", "등록일"]},
    "15143220": {"name": "잔디시설정보", "role": "core", "header": ["순서", "장소", "개방시간", "개방내용", "링크"]},
    "15089962": {"name": "자주 묻는 질문정보", "role": "support",
                 "header": ["순번", "일련번호", "카테고리", "제목", "내용", "등록일"]},
    "15164156": {"name": "주차장 혼잡도 정보", "role": "support",
                 "header": ["일련번호", "주차장아이디", "주차구역", "혼잡도", "등록일", "등록시간"]},
    "15147873": {"name": "공공데이터 개방목록", "role": "support",
                 "header": ["파일데이터명", "분류체계", "제공기관", "관리부서명", "키워드", "제공형태", "설명",
                            "비용부과유무", "이용허락범위", "등록일", "수정일", "링크주소"]},
    "15114776": {"name": "일산스포츠센터 강좌정보", "role": "support",
                 "header": ["일련번호", "강좌번호", "시작월", "종목", "강좌명", "시작종료시간", "정원", "요일",
                            "강습반", "금액", "시작일", "종료일", "링크"]},
    "15118652": {"name": "분당스포츠센터 강좌정보", "role": "support",
                 "header": ["일련번호", "강좌번호", "강좌일련번호", "수강월", "종목", "강좌명", "시작종료시간",
                            "정원", "수강요일", "수강대상", "수강료", "기간시작일", "기간종료일"]},
}

# 실시간 주차현황(15168686). 기관이 공개 개방목록 페이지(ksponco.or.kr/pubData/64)에 게시한 공개 apiKey다.
# (docs/data_catalog.md §5.1) 비밀 키가 아니므로 코드 상수로 둔다.
LIVE_DATASET = "15168686"
LIVE_API_URL = "https://www.ksponco.or.kr/online/main/parkingorsApi.do?apiKey=PARKING21803504"

# 모델 파라미터
BIN_MIN = 10
BINS = 144
EVENT_WINDOW = (14 * 60, 19 * 60)   # 저녁 장기입차 입차 시각 [14:00, 19:00)
EVENT_MIN_DWELL = 150               # 분
EVENT_RATIO = 1.5
BETA_WINDOW = (30, 132)             # 05:00 ~ 22:00 (구간 번호, 끝 미포함)
ARRIVAL_LEAD_BINS = 3               # 시작 전 30분
ZOMBIE_START_BEFORE = dt.date(2023, 1, 1)
CLASS_HORIZON_DAYS = 60
HIGH_CV = 0.10

# 기상청 단기예보 격자(선택 어댑터, DATA_GO_KR_KEY 있을 때만 사용).
# 올림픽공원(서울 송파구 방이2동, 위경도 37.5206, 127.1214)을 기상청 Open API 활용가이드의
# LCC 격자 변환식(build/adapters/kma.py latlon_to_grid)으로 계산한 값: nx=62, ny=126.
# TODO(사람 확인): 기상청 '격자_위경도' 엑셀에서 송파구 방이2동(행정코드 1171052000) 값과 대조할 것.
#   이 값은 키가 없으면 쓰이지 않으며 화면 어디에도 영향을 주지 않는다.
KMA_GRID = {"nx": 62, "ny": 126, "lat": 37.5206, "lon": 127.1214,
            "basis": "기상청 LCC 격자 변환식으로 계산(엑셀 대조 필요)"}


def now_kst():
    return dt.datetime.now(KST).replace(microsecond=0)


def today_kst():
    env = os.environ.get("OLPARK_TODAY")   # 테스트·재현용 기준일 덮어쓰기
    if env:
        return dt.date.fromisoformat(env)
    return now_kst().date()
