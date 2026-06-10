export const urlHistoryStorageKey = "autoqa.baseUrlHistory";
export const maxUrlHistoryItems = 6;
export const flowGridUnit = 24;

export const flowGuides = {
  start: {
    title: "시작 도형",
    description: "사용자 여정이나 테스트 흐름이 시작되는 지점을 표시합니다. 예: 로그인 페이지 진입.",
  },
  process: {
    title: "프로세스 도형",
    description: "사용자가 수행하거나 시스템이 처리하는 실제 행동을 적습니다. 예: 이메일 입력, 저장 버튼 클릭.",
  },
  decision: {
    title: "판단 도형",
    description: "성공/실패, 예/아니오처럼 갈림길이 생길 때 사용합니다. 연결선 순서대로 예, 아니오가 붙습니다.",
  },
  end: {
    title: "종료 도형",
    description: "테스트 시나리오가 끝나는 지점을 나타냅니다. 예: 대시보드 진입 완료.",
  },
  input: {
    title: "입력 / 출력 도형",
    description: "사용자 입력이나 시스템 출력, API 응답처럼 데이터가 드나드는 지점을 표현합니다.",
  },
  document: {
    title: "문서 도형",
    description: "리포트, 이메일, 영수증, 다운로드 파일처럼 문서 단위를 다룰 때 사용합니다.",
  },
  manualInput: {
    title: "수동 입력 도형",
    description: "사람이 직접 값을 입력해야 하는 단계에 적합합니다. 예: OTP 입력, 고객 정보 기입.",
  },
  predefinedProcess: {
    title: "사전정의 프로세스 도형",
    description: "다른 곳에서 이미 정의된 하위 시나리오나 공통 모듈을 호출할 때 사용합니다.",
  },
  database: {
    title: "데이터베이스 도형",
    description: "데이터 저장, 조회, 캐시 적재처럼 저장소와의 상호작용을 표현합니다.",
  },
  preparation: {
    title: "준비 도형",
    description: "본격적인 행동 전에 필요한 세팅, 초기화, 조건 맞춤 단계를 표시합니다.",
  },
};

export const flowShapeTemplates = {
  start: { width: flowGridUnit * 10, height: flowGridUnit * 5, label: "시작", defaultColor: "#0066cc" },
  end: { width: flowGridUnit * 10, height: flowGridUnit * 5, label: "종료", defaultColor: "#0066cc" },
  process: { width: flowGridUnit * 10, height: flowGridUnit * 5, label: "When 동작을 입력", defaultColor: "#1d1d1f" },
  decision: { width: flowGridUnit * 5, height: flowGridUnit * 5, label: "조건 확인", defaultColor: "#2a2a2c" },
  input: { width: flowGridUnit * 10, height: flowGridUnit * 5, label: "입력 / 출력", defaultColor: "#2997ff" },
  document: { width: flowGridUnit * 10, height: flowGridUnit * 5, label: "문서 처리", defaultColor: "#7a7a7a" },
  manualInput: { width: flowGridUnit * 10, height: flowGridUnit * 5, label: "수동 입력", defaultColor: "#f5f5f7" },
  predefinedProcess: { width: flowGridUnit * 10, height: flowGridUnit * 5, label: "공통 프로세스", defaultColor: "#333333" },
  database: { width: flowGridUnit * 10, height: flowGridUnit * 5, label: "데이터 저장", defaultColor: "#272729" },
  preparation: { width: flowGridUnit * 10, height: flowGridUnit * 5, label: "준비 단계", defaultColor: "#d2d2d7" },
};
