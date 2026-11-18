import { request } from "./apiClient";

function draftPath(problemId, language) {
  return `/api/code-drafts/${encodeURIComponent(problemId)}/${encodeURIComponent(language)}`;
}

export function getCodeDraft(problemId, language) {
  return request(draftPath(problemId, language));
}

export function saveCodeDraft(problemId, language, code) {
  return request(draftPath(problemId, language), { method: "PUT", body: { code } });
}
