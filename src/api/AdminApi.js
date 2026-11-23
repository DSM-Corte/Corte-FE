import { request } from "./apiClient";

// 관리자 화면에서 쓰는 API. 쓰기 요청은 모두 서버가 관리자 권한을 검사한다(아니면 403 A004)

export const PROBLEM_DIFFICULTIES = [
  "UNRATED",
  ...["BRONZE", "SILVER", "GOLD", "PLATINUM", "DIAMOND", "RUBY"].flatMap((group) =>
    ["5", "4", "3", "2", "1"].map((grade) => `${group}_${grade}`),
  ),
];

// "GOLD_3" → "Gold 3", "UNRATED" → "Unrated"
export function formatDifficulty(difficulty) {
  const [group, grade] = String(difficulty).split("_");
  const name = group.charAt(0) + group.slice(1).toLowerCase();

  return grade ? `${name} ${grade}` : name;
}

// 문제

export function listProblems(page = 0, size = 20) {
  return request(`/api/problems?page=${page}&size=${size}`);
}

export function getProblem(id) {
  return request(`/api/problems/${id}`);
}

export function createProblem(problem) {
  return request("/api/problems", { method: "POST", body: problem });
}

export function updateProblem(id, problem) {
  return request(`/api/problems/${id}`, { method: "PATCH", body: problem });
}

export function deleteProblem(id) {
  return request(`/api/problems/${id}`, { method: "DELETE" });
}

// 테스트케이스 (관리자에게는 숨김 케이스까지 온다)

export function listTestCases(problemId) {
  return request(`/api/problems/${problemId}/test-cases?page=0&size=100`);
}

export function createTestCase(problemId, testCase) {
  return request(`/api/problems/${problemId}/test-cases`, { method: "POST", body: testCase });
}

export function updateTestCase(problemId, testCaseId, testCase) {
  return request(`/api/problems/${problemId}/test-cases/${testCaseId}`, { method: "PATCH", body: testCase });
}

export function deleteTestCase(problemId, testCaseId) {
  return request(`/api/problems/${problemId}/test-cases/${testCaseId}`, { method: "DELETE" });
}

// 문제집

export function listWorkbooks(page = 0, size = 20) {
  return request(`/api/workbooks?page=${page}&size=${size}`);
}

export function getWorkbook(id, page = 0, size = 100) {
  return request(`/api/workbooks/${id}?page=${page}&size=${size}`);
}

export function createWorkbook(name) {
  return request("/api/workbooks", { method: "POST", body: { name } });
}

export function renameWorkbook(id, name) {
  return request(`/api/workbooks/${id}`, { method: "PATCH", body: { name } });
}

export function deleteWorkbook(id) {
  return request(`/api/workbooks/${id}`, { method: "DELETE" });
}

export function addWorkbookProblem(id, problemId) {
  return request(`/api/workbooks/${id}/problems`, { method: "POST", body: { problemId } });
}

export function removeWorkbookProblem(id, problemId) {
  return request(`/api/workbooks/${id}/problems/${problemId}`, { method: "DELETE" });
}

// GitHub 연동 (연동 전이면 세 값이 모두 null)

export function getMyGithub() {
  return request("/api/users/me/github");
}

export function saveMyGithub(link) {
  return request("/api/users/me/github", { method: "PUT", body: link });
}
