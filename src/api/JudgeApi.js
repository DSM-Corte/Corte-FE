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

  const date = new Date(value);

  // 소수점 아래 자릿수가 많은 시각을 못 읽는 브라우저에서는 받은 문자열을 그대로 보여준다
  if (Number.isNaN(date.getTime())) {
    return String(value).replace("T", " ").slice(0, 16);
  }

  return new Intl.DateTimeFormat("ko-KR", {
    dateStyle: "medium",
    timeStyle: "short",
  }).format(date);
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

export const judgeLanguageOptions = Object.entries(languageLabels).map(([key, label]) => ({
  key,
  label,
}));

const JOB_POLL_INTERVAL_MS = 1000;
const JOB_WAIT_TIMEOUT_MS = 3 * 60 * 1000;

function delay(ms) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

export async function getPublicTestCases(problemId) {
  const result = await request(
    `/api/problems/${encodeURIComponent(problemId)}/test-cases?size=100`,
  );

  return result.content
    .filter((testCase) => testCase.publicExample)
    .sort((a, b) => a.position - b.position || a.id - b.id);
}

export function createExecution({ problemId, language, code, stdin }) {
  return request("/api/executions", {
    method: "POST",
    body: { problemId: Number(problemId), language, code, stdin },
  });
}

export function createSubmission({ problemId, language, code }) {
  return request("/api/submissions", {
    method: "POST",
    body: { problemId: Number(problemId), language, code },
  });
}

// 채점은 비동기라 최종 판정이 나올 때까지 단건 조회를 반복한다
// isCancelled가 true를 돌려주면 화면을 떠난 것으로 보고 조회를 멈춘다
export async function waitForJob(kind, id, { onUpdate, isCancelled = () => false } = {}) {
  const path = kind === "submission" ? "/api/submissions" : "/api/executions";
  const startedAt = Date.now();

  while (Date.now() - startedAt < JOB_WAIT_TIMEOUT_MS) {
    if (isCancelled()) {
      const error = new Error("결과 조회를 멈췄습니다.");
      error.code = "CANCELLED";
      throw error;
    }

    const job = await request(`${path}/${encodeURIComponent(id)}`);
    onUpdate?.(job);

    if (!isPendingVerdict(job.verdict)) {
      return job;
    }

    await delay(JOB_POLL_INTERVAL_MS);
  }

  const error = new Error("채점 결과를 기다리는 시간이 초과되었습니다. 제출 기록에서 다시 확인해주세요.");
  error.code = "WAIT_TIMEOUT";
  throw error;
}

export function getStarterCode(language) {
  return starterCodes[language] ?? "";
}

const starterCodes = {
  C: `#include <stdio.h>

int main(void) {
    // 표준 입력을 읽고 정답을 출력하세요.
    return 0;
}
`,
  CPP: `#include <iostream>
using namespace std;

int main() {
    // 표준 입력을 읽고 정답을 출력하세요.
    return 0;
}
`,
  JAVA: `import java.io.*;

public class Main {
    public static void main(String[] args) throws IOException {
        BufferedReader br = new BufferedReader(new InputStreamReader(System.in));
        // 표준 입력을 읽고 정답을 출력하세요.
    }
}
`,
  CSHARP: `using System;

public class Program
{
    public static void Main()
    {
        // 표준 입력을 읽고 정답을 출력하세요.
    }
}
`,
  JAVASCRIPT: `const input = require("fs").readFileSync(0, "utf8");

// 입력을 분석하고 console.log로 정답을 출력하세요.
`,
  PYTHON: `import sys

input_data = sys.stdin.read()

# 입력을 분석하고 print로 정답을 출력하세요.
`,
};
