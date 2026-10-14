import { getProblemById } from "./ProblemApi";
import { getCurrentUserId } from "./AuthApi";
import { getStoredSubmissions, saveSubmissions } from "./submissionStorage";

const RUN_TIMEOUT_MS = 2500;
const PYTHON_RUN_TIMEOUT_MS = 20000;
const PYODIDE_CDN_URL = "https://cdn.jsdelivr.net/pyodide/v0.29.4/full/pyodide.mjs";

let pythonWorker = null;
let pythonRequestId = 0;

export const languageOptions = [
  { key: "javascript", label: "JavaScript" },
  { key: "python", label: "Python" },
];

export const ACCEPTED_RESULT = "맞았습니다";

function delay(ms = 150) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function createSubmissionError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function createJavaScriptRunner() {
  const workerSource = `
    self.onmessage = async (event) => {
      const { code, testCases } = event.data;

      try {
        const results = [];

        function createRequire(stdin) {
          return (moduleName) => {
            if (moduleName !== "fs") {
              throw new Error(moduleName + " 모듈은 브라우저 실행에서 지원하지 않습니다.");
            }

            return {
              readFileSync: () => stdin,
            };
          };
        }

        for (const testCase of testCases) {
          const startedAt = performance.now();
          const logs = [];
          const fakeConsole = {
            log: (...values) => logs.push(values.map(String).join(" ")),
          };
          const process = {
            stdin: {
              read: () => testCase.input,
            },
          };
          const createSolve = new Function(
            "stdin",
            "console",
            "process",
            "require",
            code + "\\n; return typeof solve === 'function' ? solve : null;"
          );
          const solve = createSolve(
            testCase.input,
            fakeConsole,
            process,
            createRequire(testCase.input)
          );
          let output = logs.join("\\n");

          if (!output && solve) {
            const value = await solve(testCase.input);
            output = String(value ?? "");
          }

          if (!output && !solve) {
            throw new Error("console.log(...)로 출력하거나 solve(input) 함수를 정의해주세요.");
          }

          const runtimeMs = Math.max(1, Math.round(performance.now() - startedAt));
          const hasExpected = Object.prototype.hasOwnProperty.call(testCase, "output");
          const expected = hasExpected ? String(testCase.output ?? "").trim() : null;
          const normalizedOutput = String(output ?? "").trim();

          results.push({
            title: testCase.title,
            input: testCase.input,
            expected,
            output: normalizedOutput,
            passed: hasExpected ? normalizedOutput === expected : null,
            runtimeMs,
          });
        }

        self.postMessage({ ok: true, results });
      } catch (error) {
        self.postMessage({
          ok: false,
          error: error?.message || String(error),
        });
      }
    };
  `;
  const blob = new Blob([workerSource], { type: "text/javascript" });

  return new Worker(URL.createObjectURL(blob));
}

function createPythonWorker() {
  const workerSource = `
    let pyodideReadyPromise;

    async function getPyodide() {
      if (!pyodideReadyPromise) {
        pyodideReadyPromise = import("${PYODIDE_CDN_URL}").then(({ loadPyodide }) =>
          loadPyodide()
        );
      }

      return pyodideReadyPromise;
    }

    self.onmessage = async (event) => {
      const { id, code, testCases } = event.data;

      try {
        const pyodide = await getPyodide();
        const results = [];

        for (const testCase of testCases) {
          const startedAt = performance.now();
          pyodide.globals.set("__cotre_user_code", code);
          pyodide.globals.set("__cotre_stdin", testCase.input);
          await pyodide.runPythonAsync(\`
import io
import sys

__namespace = {}
__cotre_result = ""
__old_stdin = sys.stdin
__old_stdout = sys.stdout
__stdout = io.StringIO()
sys.stdin = io.StringIO(__cotre_stdin)
sys.stdout = __stdout

try:
    exec(__cotre_user_code, __namespace)
    __printed = __stdout.getvalue()
finally:
    sys.stdin = __old_stdin
    sys.stdout = __old_stdout

if not __printed and callable(__namespace.get("solve")):
    __value = __namespace["solve"](__cotre_stdin)
    __cotre_result = "" if __value is None else str(__value)
else:
    __cotre_result = __printed
\`);
          const output = pyodide.globals.get("__cotre_result");
          const runtimeMs = Math.max(1, Math.round(performance.now() - startedAt));
          const hasExpected = Object.prototype.hasOwnProperty.call(testCase, "output");
          const expected = hasExpected ? String(testCase.output ?? "").trim() : null;
          const normalizedOutput = String(output ?? "").trim();
          results.push({
            title: testCase.title,
            input: testCase.input,
            expected,
            output: normalizedOutput,
            passed: hasExpected ? normalizedOutput === expected : null,
            runtimeMs,
          });
        }

        self.postMessage({ id, ok: true, results });
      } catch (error) {
        self.postMessage({
          id,
          ok: false,
          error: error?.message || String(error),
        });
      }
    };
  `;
  const blob = new Blob([workerSource], { type: "text/javascript" });

  return new Worker(URL.createObjectURL(blob), { type: "module" });
}

function runJavaScriptCode({ code, testCases }) {
  return new Promise((resolve, reject) => {
    const worker = createJavaScriptRunner();
    const timeout = window.setTimeout(() => {
      worker.terminate();
      reject(createSubmissionError("실행 시간이 초과되었습니다.", "TIMEOUT"));
    }, RUN_TIMEOUT_MS);

    worker.onmessage = (event) => {
      window.clearTimeout(timeout);
      worker.terminate();

      if (event.data.ok) {
        resolve(event.data.results);
        return;
      }

      reject(createSubmissionError(event.data.error, "RUNTIME_ERROR"));
    };

    worker.onerror = (event) => {
      window.clearTimeout(timeout);
      worker.terminate();
      reject(createSubmissionError(event.message, "RUNTIME_ERROR"));
    };

    worker.postMessage({ code, testCases });
  });
}

function getPythonWorker() {
  if (!pythonWorker) {
    pythonWorker = createPythonWorker();
  }

  return pythonWorker;
}

function runPythonCode({ code, testCases }) {
  return new Promise((resolve, reject) => {
    const worker = getPythonWorker();
    const requestId = pythonRequestId + 1;
    pythonRequestId = requestId;

    const timeout = window.setTimeout(() => {
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
      worker.terminate();
      pythonWorker = null;
      reject(createSubmissionError("Python 실행 시간이 초과되었습니다.", "TIMEOUT"));
    }, PYTHON_RUN_TIMEOUT_MS);

    function cleanup() {
      window.clearTimeout(timeout);
      worker.removeEventListener("message", handleMessage);
      worker.removeEventListener("error", handleError);
    }

    function handleMessage(event) {
      if (event.data.id !== requestId) {
        return;
      }

      cleanup();

      if (event.data.ok) {
        resolve(event.data.results);
        return;
      }

      reject(createSubmissionError(event.data.error, "RUNTIME_ERROR"));
    }

    function handleError(event) {
      cleanup();
      reject(createSubmissionError(event.message, "RUNTIME_ERROR"));
    }

    worker.addEventListener("message", handleMessage);
    worker.addEventListener("error", handleError);
    worker.postMessage({ id: requestId, code, testCases });
  });
}

function runLanguageCode({ language, code, testCases }) {
  if (language === "javascript") {
    return runJavaScriptCode({ code, testCases });
  }

  if (language === "python") {
    return runPythonCode({ code, testCases });
  }

  throw createSubmissionError("지원하지 않는 언어입니다.", "UNSUPPORTED_LANGUAGE");
}

function getExampleTestCases(problem) {
  return problem.detail.examples.map((example) => ({
    title: example.title,
    input: example.input,
    output: example.output,
  }));
}

function createRunSummary(testResults) {
  const passedCount = testResults.filter((result) => result.passed).length;

  return {
    passedCount,
    totalCount: testResults.length,
    verdict: passedCount === testResults.length ? ACCEPTED_RESULT : "틀렸습니다",
    runtimeMs: testResults.reduce((sum, result) => sum + result.runtimeMs, 0),
  };
}

function estimateMemoryKb({ code, language, testResults }) {
  const languageBaseMemory = language === "python" ? 28672 : 12288;
  const codeMemory = Math.ceil(String(code ?? "").length / 16);
  const testMemory = testResults.length * 384;

  return languageBaseMemory + codeMemory + testMemory;
}

export function getStarterCode(problem, language = "javascript") {
  if (problem.id === 1000) {
    if (language === "python") {
      return `import sys

data = sys.stdin.read().strip().split()
a, b = map(int, data)
print(a + b)`;
    }

    return `function solve(input) {
  const [a, b] = input.trim().split(/\\s+/).map(Number);
  return String(a + b);
}`;
  }

  if (problem.id === 1001) {
    if (language === "python") {
      return `import sys

data = sys.stdin.read().strip().split()
a, b = map(int, data)
print(a - b)`;
    }

    return `function solve(input) {
  const [a, b] = input.trim().split(/\\s+/).map(Number);
  return String(a - b);
}`;
  }

  if (language === "python") {
    return `import sys

input_data = sys.stdin.read()

# 입력을 분석하고 정답을 출력하세요.
print("")`;
  }

  return `function solve(input) {
  // input 문자열을 분석하고 정답 문자열을 반환하세요.
  return "";
}`;
}

export async function runCode({ problemId, language, code }) {
  await delay();

  const problem = await getProblemById(problemId);

  if (!problem) {
    throw createSubmissionError("문제를 찾을 수 없습니다.", "PROBLEM_NOT_FOUND");
  }

  const testResults = await runLanguageCode({
    language,
    code,
    testCases: getExampleTestCases(problem),
  });

  return {
    problem,
    testResults,
    summary: {
      ...createRunSummary(testResults),
      memoryKb: estimateMemoryKb({ code, language, testResults }),
    },
  };
}

export async function runTerminalCode({ problemId, language, code, input }) {
  await delay();

  const problem = await getProblemById(problemId);

  if (!problem) {
    throw createSubmissionError("문제를 찾을 수 없습니다.", "PROBLEM_NOT_FOUND");
  }

  const [result] = await runLanguageCode({
    language,
    code,
    testCases: [
      {
        title: "터미널 입력",
        input,
      },
    ],
  });

  return {
    problem,
    input: result.input,
    output: result.output,
    runtimeMs: result.runtimeMs,
  };
}

export async function runSnippetCode({ language, code, input = "" }) {
  await delay();

  const [result] = await runLanguageCode({
    language,
    code,
    testCases: [
      {
        title: "코드블록 실행",
        input,
      },
    ],
  });

  return {
    input: result.input,
    output: result.output,
    runtimeMs: result.runtimeMs,
  };
}

export async function submitCode({ problemId, language, code }) {
  const runResult = await runCode({ problemId, language, code });
  const userId = getCurrentUserId();

  if (!userId) {
    throw createSubmissionError("로그인 후 제출할 수 있습니다.", "AUTH_REQUIRED");
  }

  const submission = {
    id: `submission-${Date.now()}`,
    userId,
    problemId: Number(problemId),
    problemTitle: runResult.problem.title,
    language,
    code,
    result: runResult.summary.verdict,
    runtimeMs: runResult.summary.runtimeMs,
    memoryKb: runResult.summary.memoryKb,
    submittedAt: new Date().toISOString(),
    testResults: runResult.testResults,
  };

  saveSubmissions([submission, ...getStoredSubmissions()]);

  return submission;
}

export async function getSubmissionList({ problemId } = {}) {
  await delay(100);

  const userId = getCurrentUserId();
  const submissions = getStoredSubmissions().filter(
    (submission) => submission.userId === userId,
  );

  if (!problemId) {
    return submissions;
  }

  return submissions.filter(
    (submission) => submission.problemId === Number(problemId),
  );
}

export async function getSubmissionById(id) {
  await delay(100);

  const userId = getCurrentUserId();

  return getStoredSubmissions().find(
    (submission) => submission.userId === userId && submission.id === id,
  );
}
