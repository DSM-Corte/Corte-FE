import { useEffect, useState } from "react";
import { Link, useNavigate, useParams, useSearchParams } from "react-router";
import { isAuthenticated } from "../api/AuthApi";
import { getProblemById } from "../api/ProblemApi";
import {
  getStarterCode,
  getSubmissionList,
  languageOptions,
  runCode,
  runTerminalCode,
  submitCode,
} from "../api/SubmissionApi";
import TierBadge from "../components/problems/TierBadge";
import CodeEditorPanel from "../components/submissions/CodeEditorPanel";
import RunnerPanel from "../components/submissions/RunnerPanel";
import SubmitResultModal from "../components/submissions/SubmitResultModal";
import "./ProblemSubmitPage.css";

function createTerminalLine(type, text) {
  return { type, text };
}

function createInitialTerminalLines() {
  return [
    createTerminalLine("system", "COTRE runner ready."),
    createTerminalLine(
      "muted",
      "stdin에 직접 입력값을 작성한 뒤 입력 실행을 누르세요.",
    ),
  ];
}

function ProblemSubmitPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const sourceSubmissionId = searchParams.get("submissionId");
  const [problem, setProblem] = useState(null);
  const [language, setLanguage] = useState("javascript");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [exampleRunResult, setExampleRunResult] = useState(null);
  const [submissionResult, setSubmissionResult] = useState(null);
  const [activeRunView, setActiveRunView] = useState("terminal");
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalLines, setTerminalLines] = useState(createInitialTerminalLines);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login", {
        replace: true,
        state: {
          from: `/problems/${id}/submit`,
          message: "제출하려면 먼저 로그인해주세요.",
        },
      });
      return;
    }

    async function fetchProblem() {
      const nextProblem = await getProblemById(id);
      setProblem(nextProblem);

      if (nextProblem) {
        const submissions = sourceSubmissionId
          ? await getSubmissionList({ problemId: id })
          : [];
        const sourceSubmission = submissions.find(
          (submission) => submission.id === sourceSubmissionId,
        );

        setLanguage(sourceSubmission?.language ?? "javascript");
        setCode(sourceSubmission?.code ?? getStarterCode(nextProblem));
        setTerminalInput(nextProblem.detail.examples[0]?.input ?? "");
      }

      setIsLoading(false);
    }

    fetchProblem();
  }, [id, navigate, sourceSubmissionId]);

  function appendTerminalLines(lines) {
    setTerminalLines((currentLines) => [...currentLines, ...lines]);
  }

  function resetTerminal() {
    setTerminalLines(createInitialTerminalLines());
    setMessage("");
  }

  function handleLanguageChange(nextLanguage) {
    setLanguage(nextLanguage);

    if (problem) {
      setCode(getStarterCode(problem, nextLanguage));
    }
  }

  async function handleRunInput() {
    setIsRunning(true);
    setMessage("");
    setActiveRunView("terminal");

    appendTerminalLines([
      createTerminalLine(
        "command",
        `cotre run --language ${language} --problem ${id}`,
      ),
      createTerminalLine("label", "stdin"),
      createTerminalLine("input", terminalInput || "(빈 입력)"),
    ]);

    try {
      const result = await runTerminalCode({
        problemId: id,
        language,
        code,
        input: terminalInput,
      });

      appendTerminalLines([
        createTerminalLine("label", "stdout"),
        createTerminalLine("output", result.output || "(출력 없음)"),
        createTerminalLine("success", `finished in ${result.runtimeMs}ms`),
      ]);
    } catch (error) {
      appendTerminalLines([
        createTerminalLine("error", error.message),
        createTerminalLine("muted", "코드나 입력값을 확인한 뒤 다시 실행하세요."),
      ]);
    } finally {
      setIsRunning(false);
    }
  }

  async function handleRun() {
    setIsRunning(true);
    setMessage("");
    setActiveRunView("examples");

    try {
      const result = await runCode({ problemId: id, language, code });
      setExampleRunResult(result);
      setMessage(
        `${result.summary.passedCount}/${result.summary.totalCount}개 예제를 통과했습니다.`,
      );
    } catch (error) {
      setExampleRunResult(null);
      setMessage(error.message);
    } finally {
      setIsRunning(false);
    }
  }

  async function handleSubmit() {
    if (!isAuthenticated()) {
      navigate("/login", {
        state: {
          from: `/problems/${id}/submit`,
          message: "제출하려면 먼저 로그인해주세요.",
        },
      });
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      const submission = await submitCode({ problemId: id, language, code });
      setSubmissionResult(submission);
    } catch (error) {
      setMessage(error.message);
      appendTerminalLines([createTerminalLine("error", error.message)]);
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
        <p>문제를 찾을 수 없습니다.</p>
        <Link to="/problems">문제 목록으로 돌아가기</Link>
      </main>
    );
  }

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
            <TierBadge tier={problem.tier} showName />
            <span>{problem.tags.join(", ")}</span>
          </div>
        </div>
      </header>

      <section className="submit-workspace">
        <CodeEditorPanel
          code={code}
          language={language}
          languageOptions={languageOptions}
          isRunning={isRunning}
          isSubmitting={isSubmitting}
          onChangeCode={setCode}
          onChangeLanguage={handleLanguageChange}
          onRunExamples={handleRun}
          onSubmit={handleSubmit}
        />

        <aside className="submit-result-panel">
          <section className="submit-guide">
            <h2>터미널 실행</h2>
            <p>
              JavaScript와 Python 모두 stdin을 읽어 출력할 수 있습니다.
              JavaScript는 <code>solve(input)</code> 함수도 지원합니다.
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
        submission={submissionResult}
        onClose={() => setSubmissionResult(null)}
      />
    </main>
  );
}

export default ProblemSubmitPage;
