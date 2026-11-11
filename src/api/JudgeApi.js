import { request } from "./apiClient";

export const SUBMISSION_PAGE_SIZE = 20;

export const verdictLabels = {
  QUEUED: "채점 대기",
  RUNNING: "채점 중",
  ACCEPTED: "맞았습니다",
  WRONG_ANSWER: "틀렸습니다",
  COMPILE_ERROR: "컴파일 에러",
  RUNTIME_ERROR: "런타임 에러",
  TIME_LIMIT: "시간 초과",
  MEMORY_LIMIT: "메모리 초과",
  OUTPUT_LIMIT: "출력 초과",
  SYSTEM_ERROR: "시스템 오류",
  CANCELLED: "취소됨",
  FINISHED: "실행 완료",
};

export const languageLabels = {
  C: "C",
  CPP: "C++",
  JAVA: "Java",
  CSHARP: "C#",
  JAVASCRIPT: "JavaScript",
  PYTHON: "Python",
};

export function getVerdictLabel(verdict) {
  return verdictLabels[verdict] ?? verdict;
}

export function getLanguageLabel(language) {
  return languageLabels[language] ?? language;
}

export function isPendingVerdict(verdict) {
  return verdict === "QUEUED" || verdict === "RUNNING";
}

export function getVerdictTone(verdict) {
  if (verdict === "ACCEPTED" || verdict === "FINISHED") {
    return "is-accepted";
  }

  return isPendingVerdict(verdict) ? "is-pending" : "is-failed";
}

// 서버가 시간대 없는 한국 시각을 보내므로 브라우저 시간대로 그대로 읽는다
export function formatSubmittedAt(value) {
  if (!value) {
    return "--";
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(new Date(value));
}

export function getMySubmissions({ problemId, page = 0, size = SUBMISSION_PAGE_SIZE } = {}) {
  const params = new URLSearchParams({ page: String(page), size: String(size) });

  if (problemId) {
    params.set("problemId", String(problemId));
  }

  return request(`/api/submissions?${params}`);
}

export function getSubmission(id) {
  return request(`/api/submissions/${encodeURIComponent(id)}`);
}

export function getProblem(id) {
  return request(`/api/problems/${encodeURIComponent(id)}`);
}
