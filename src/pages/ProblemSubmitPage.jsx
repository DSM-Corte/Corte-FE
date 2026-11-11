import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import {
  createExecution,
  createSubmission,
  getProblem,
  getPublicTestCases,
  getStarterCode,
  getSubmission,
  getVerdictLabel,
  judgeLanguageOptions,
  waitForJob,
} from "../api/JudgeApi";
import CodeEditorPanel from "../components/submissions/CodeEditorPanel";
import RunnerPanel from "../components/submissions/RunnerPanel";
import SubmitResultModal from "../components/submissions/SubmitResultModal";
import "./ProblemSubmitPage.css";

const DEFAULT_LANGUAGE = "PYTHON";

function createTerminalLine(type, text) {
  return { type, text };
}

function createInitialTerminalLines() {
  return [
    createTerminalLine("system", "COTRE runner ready."),
    createTerminalLine(
      "muted",
      "stdin에 입력값을 작성한 뒤 입력 실행을 누르세요. 입력은 실행 전에 한 번에 전달됩니다.",
    ),
  ];
}

function getJobOutput(job) {
  if (job.verdict === "FINISHED") {
    return job.stdout ?? "";
  }

  return job.message || job.stderr || getVerdictLabel(job.verdict);
}

function ProblemSubmitPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sourceSubmissionId = searchParams.get("submissionId");
  const [problem, setProblem] = useState(null);
  const [examples, setExamples] = useState([]);
  const [loadError, setLoadError] = useState("");
  const [language, setLanguage] = useState(DEFAULT_LANGUAGE);
  const [code, setCode] = useState(getStarterCode(DEFAULT_LANGUAGE));
  const [message, setMessage] = useState("");
  const [exampleRunResult, setExampleRunResult] = useState(null);
  const [submission, setSubmission] = useState(null);
  const [activeRunView, setActiveRunView] = useState("terminal");
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalLines, setTerminalLines] = useState(createInitialTerminalLines);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function fetchProblem() {
      setIsLoading(true);
      setLoadError("");

      try {
        const [nextProblem, nextExamples, sourceSubmission] = await Promise.all([
          getProblem(id),
          getPublicTestCases(id),
          sourceSubmissionId ? getSubmission(sourceSubmissionId) : null,
        ]);

        if (ignore) {
          return;
        }

        setProblem(nextProblem);
        setExamples(nextExamples);
        setTerminalInput(nextExamples[0]?.input ?? "");

        if (sourceSubmission && String(sourceSubmission.problemId) === String(id)) {
          setLanguage(sourceSubmission.language);
          setCode(sourceSubmission.code);
        }
      } catch (error) {
        if (ignore) {
          return;
        }

        if (error.status === 401) {
          navigate("/login", {
            replace: true,
            state: {
              from: `/problems/${id}/submit`,
              message: "로그인이 만료되었습니다. 다시 로그인해주세요.",
            },
          });
          return;
        }

        setLoadError(
          error.status === 404 ? "문제를 찾을 수 없습니다." : error.message,
        );
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    fetchProblem();

    return () => {
      ignore = true;
    };
  }, [id, navigate, sourceSubmissionId]);

  function handleActionError(error) {
    if (error.status === 401) {
      navigate("/login", {
        state: {
          from: `/problems/${id}/submit`,
          message: "로그인이 만료되었습니다. 다시 로그인해주세요.",
        },
      });
      return true;
    }

    return false;
  }

  function appendTerminalLines(lines) {
    setTerminalLines((currentLines) => [...currentLines, ...lines]);
  }

  function resetTerminal() {
    setTerminalLines(createInitialTerminalLines());
    setMessage("");
  }

  function handleLanguageChange(nextLanguage) {
    setLanguage(nextLanguage);
    setCode(getStarterCode(nextLanguage));
  }

  async function runOnce(stdin) {
    const execution = await createExecution({ problemId: id, language, code, stdin });
    return waitForJob("execution", execution.id);
  }

  async function handleRunInput() {
    setIsRunning(true);
    setMessage("");
    setActiveRunView("terminal");

    appendTerminalLines([
      createTerminalLine("command", `cotre run --language ${language} --problem ${id}`),
      createTerminalLine("label", "stdin"),
      createTerminalLine("input", terminalInput || "(빈 입력)"),
    ]);

    try {
      const job = await runOnce(terminalInput);
      const lines = [];

      if (job.verdict === "FINISHED") {
        lines.push(createTerminalLine("label", "stdout"));
        lines.push(createTerminalLine("output", job.stdout || "(출력 없음)"));
      }

      if (job.stderr) {
        lines.push(createTerminalLine("label", "stderr"));
        lines.push(createTerminalLine("error", job.stderr));
      }

      if (job.message) {
        lines.push(createTerminalLine("error", job.message));
      }

      lines.push(
        job.verdict === "FINISHED"
          ? createTerminalLine("success", `finished in ${job.runtimeMs}ms`)
          : createTerminalLine("error", getVerdictLabel(job.verdict)),
      );
      appendTerminalLines(lines);
    } catch (error) {
      if (!handleActionError(error)) {
        appendTerminalLines([
          createTerminalLine("error", error.message),
          createTerminalLine("muted", "코드나 입력값을 확인한 뒤 다시 실행하세요."),
        ]);
      }
    } finally {
      setIsRunning(false);
    }
  }

  async function handleRun() {
    setMessage("");
    setActiveRunView("examples");

    if (examples.length === 0) {
      setExampleRunResult(null);
      setMessage("이 문제에는 공개 예제가 없습니다. 터미널에서 직접 입력해 실행해보세요.");
      return;
    }

    setIsRunning(true);

    try {
      const testResults = [];

      // 한 사용자는 동시에 하나만 실행할 수 있어 예제를 차례로 실행한다
      for (const [index, example] of examples.entries()) {
        const job = await runOnce(example.input);
        const output = getJobOutput(job);

        testResults.push({
          title: `예제 ${index + 1}`,
          input: example.input,
          expected: example.expectedOutput,
          output,
          passed: job.verdict === "FINISHED" && output === example.expectedOutput,
        });

        // 컴파일 오류처럼 실행 자체가 실패하면 나머지 예제도 같은 결과라 멈춘다
        if (job.verdict !== "FINISHED") {
          break;
        }
      }

      const passedCount = testResults.filter((result) => result.passed).length;

      setExampleRunResult({
        testResults,
        summary: {
          passedCount,
          totalCount: examples.length,
          verdict: passedCount === examples.length ? "맞았습니다" : "틀렸습니다",
        },
      });
      setMessage(`${passedCount}/${examples.length}개 예제를 통과했습니다.`);
    } catch (error) {
      if (!handleActionError(error)) {
        setExampleRunResult(null);
        setMessage(error.message);
      }
    } finally {
      setIsRunning(false);
    }
  }

  async function handleSubmit() {
    setIsSubmitting(true);
    setMessage("");

    try {
      const created = await createSubmission({ problemId: id, language, code });
      setSubmission(created);
      await waitForJob("submission", created.id, { onUpdate: setSubmission });
    } catch (error) {
      setSubmission(null);

      if (!handleActionError(error)) {
        const nextMessage =
          error.status === 409
            ? "이 문제에는 채점용 테스트케이스가 없어 아직 제출할 수 없습니다."
            : error.message;
        setMessage(nextMessage);
        appendTerminalLines([createTerminalLine("error", nextMessage)]);
      }
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <main className="submit-state">제출 페이지를 불러오는 중입니다.</main>;
  }

  if (!problem) {
    return (
      <main className="submit-state">
        <p>{loadError || "문제를 찾을 수 없습니다."}</p>
        <Link to="/problems">문제 목록으로 돌아가기</Link>
      </main>
    );
  }

  const memoryLimitMb = problem.languageMemoryLimitsMb?.[language] ?? problem.memoryLimitMb;

  return (
    <main className="submit-page">
      <header className="submit-header">
        <div>
          <Link to={`/problems/${problem.id}`} className="submit-header__back">
            문제로 돌아가기
          </Link>
          <h1>
            {problem.id}. {problem.title}
          </h1>
          <div className="submit-header__meta">
            <span>시간 제한 {problem.timeLimitMs}ms</span>
            <span>메모리 제한 {memoryLimitMb}MB</span>
            {problem.tags?.length > 0 && <span>{problem.tags.join(", ")}</span>}
            <Link to={`/problems/${problem.id}/submissions`}>내 제출 기록</Link>
          </div>
        </div>
      </header>

      <section className="submit-workspace">
        <CodeEditorPanel
          code={code}
          language={language}
          languageOptions={judgeLanguageOptions}
          isRunning={isRunning}
          isSubmitting={isSubmitting}
          onChangeCode={setCode}
          onChangeLanguage={handleLanguageChange}
          onRunExamples={handleRun}
          onSubmit={handleSubmit}
        />

        <aside className="submit-result-panel">
          <section className="submit-guide">
            <h2>실행 안내</h2>
            <p>
              코드는 채점 서버에서 실행됩니다. 표준 입력을 읽고 표준 출력으로 답을
              출력하세요. Java는 <code>Main</code> 클래스로 작성합니다.
            </p>
          </section>

          <RunnerPanel
            activeView={activeRunView}
            exampleRunResult={exampleRunResult}
            input={terminalInput}
            isRunning={isRunning}
            lines={terminalLines}
            message={message}
            onChangeInput={setTerminalInput}
            onClear={resetTerminal}
            onRunInput={handleRunInput}
            onSelectView={setActiveRunView}
          />
        </aside>
      </section>

      <SubmitResultModal
        problemId={problem.id}
        submission={submission}
        onClose={() => setSubmission(null)}
      />
    </main>
  );
}

export default ProblemSubmitPage;
