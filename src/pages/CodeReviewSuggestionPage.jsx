import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  addCodeReviewSuggestion,
  getCodeReviewById,
} from "../api/CodeReviewApi";
import { getProblemById } from "../api/ProblemApi";
import { runCode, runTerminalCode } from "../api/SubmissionApi";
import CodeEditorPanel from "../components/submissions/CodeEditorPanel";
import RunnerPanel from "../components/submissions/RunnerPanel";
import "./ProblemSubmitPage.css";
import "./CodeReviewPage.css";

function createTerminalLine(type, text) {
  return { type, text };
}

function createInitialTerminalLines() {
  return [
    createTerminalLine("system", "COTRE suggestion runner ready."),
    createTerminalLine(
      "muted",
      "개선한 코드를 예제 또는 직접 입력으로 실행해볼 수 있습니다.",
    ),
  ];
}

function formatLanguageLabel(language) {
  if (language === "javascript") {
    return "JavaScript";
  }

  if (language === "python") {
    return "Python";
  }

  return language;
}

function CodeReviewSuggestionPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const [review, setReview] = useState(null);
  const [title, setTitle] = useState("코드 제안");
  const [description, setDescription] = useState("");
  const [code, setCode] = useState("");
  const [message, setMessage] = useState("");
  const [exampleRunResult, setExampleRunResult] = useState(null);
  const [activeRunView, setActiveRunView] = useState("terminal");
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalLines, setTerminalLines] = useState(createInitialTerminalLines);
  const [isLoading, setIsLoading] = useState(true);
  const [isRunning, setIsRunning] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const languageOptions = review?.language
    ? [
        {
          key: review.language,
          label: formatLanguageLabel(review.language),
        },
      ]
    : [];

  useEffect(() => {
    let ignore = false;

    async function fetchReview() {
      const nextReview = await getCodeReviewById(id);
      const nextProblem = nextReview
        ? await getProblemById(nextReview.problemId)
        : undefined;

      if (ignore) {
        return;
      }

      setReview(nextReview);
      setCode(nextReview?.code ?? "");
      setTerminalInput(nextProblem?.detail.examples[0]?.input ?? "");
      setDescription("");
      setIsLoading(false);
    }

    fetchReview();

    return () => {
      ignore = true;
    };
  }, [id]);

  function appendTerminalLines(lines) {
    setTerminalLines((currentLines) => [...currentLines, ...lines]);
  }

  function resetTerminal() {
    setTerminalLines(createInitialTerminalLines());
    setMessage("");
  }

  async function handleRunInput() {
    if (!review) {
      return;
    }

    setIsRunning(true);
    setMessage("");
    setActiveRunView("terminal");

    appendTerminalLines([
      createTerminalLine(
        "command",
        `cotre suggest --language ${review.language} --problem ${review.problemId}`,
      ),
      createTerminalLine("label", "stdin"),
      createTerminalLine("input", terminalInput || "(빈 입력)"),
    ]);

    try {
      const result = await runTerminalCode({
        problemId: review.problemId,
        language: review.language,
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
        createTerminalLine("muted", "코드나 입력값을 확인하고 다시 실행해보세요."),
      ]);
    } finally {
      setIsRunning(false);
    }
  }

  async function handleRunExamples() {
    if (!review) {
      return;
    }

    setIsRunning(true);
    setMessage("");
    setActiveRunView("examples");

    try {
      const result = await runCode({
        problemId: review.problemId,
        language: review.language,
        code,
      });
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

  async function handleSubmitSuggestion() {
    if (!review) {
      return;
    }

    setIsSubmitting(true);
    setMessage("");

    try {
      await addCodeReviewSuggestion(id, {
        title,
        description,
        code,
      });
      navigate(`/code-review/${id}`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSubmitting(false);
    }
  }

  if (isLoading) {
    return <main className="submit-state">코드 제안 페이지를 불러오는 중입니다.</main>;
  }

  if (!review) {
    return (
      <main className="submit-state">
        <p>코드 리뷰를 찾을 수 없습니다.</p>
        <Link to="/code-review">코드 리뷰 목록으로 돌아가기</Link>
      </main>
    );
  }

  return (
    <main className="submit-page code-suggestion-page">
      <header className="submit-header">
        <div>
          <Link to={`/code-review/${review.id}`} className="submit-header__back">
            코드 리뷰로 돌아가기
          </Link>
          <h1>코드 제안 작성</h1>
          <div className="submit-header__meta">
            <span>
              #{review.problemId} {review.problemTitle}
            </span>
            <span>{formatLanguageLabel(review.language)}</span>
          </div>
        </div>
      </header>

      <section className="submit-workspace">
        <CodeEditorPanel
          code={code}
          language={review.language}
          languageOptions={languageOptions}
          isRunning={isRunning}
          isSubmitting={isSubmitting}
          runLabel="예제 실행"
          submitLabel="코드 제안 등록"
          onChangeCode={setCode}
          onChangeLanguage={() => {}}
          onRunExamples={handleRunExamples}
          onSubmit={handleSubmitSuggestion}
        />

        <aside className="submit-result-panel">
          <section className="code-suggestion-form-card">
            <h2>제안 정보</h2>
            <label>
              <span>제목</span>
              <input
                value={title}
                onChange={(event) => setTitle(event.target.value)}
                placeholder="제안 제목을 입력하세요."
              />
            </label>
            <label>
              <span>설명</span>
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                placeholder="어떤 점을 개선했는지 적어주세요."
              />
            </label>
            {message && <p className="submit-message">{message}</p>}
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
    </main>
  );
}

export default CodeReviewSuggestionPage;
