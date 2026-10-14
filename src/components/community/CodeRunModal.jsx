import { useState } from "react";
import { runSnippetCode } from "../../api/SubmissionApi";
import Button from "../common/Button";

function CodeRunModal({ snippet, onClose }) {
  const [input, setInput] = useState("");
  const [result, setResult] = useState(null);
  const [error, setError] = useState("");
  const [isRunning, setIsRunning] = useState(false);

  if (!snippet) {
    return null;
  }

  async function handleRun() {
    setIsRunning(true);
    setError("");

    try {
      const nextResult = await runSnippetCode({
        language: snippet.language,
        code: snippet.code,
        input,
      });

      setResult(nextResult);
    } catch (nextError) {
      setResult(null);
      setError(nextError.message);
    } finally {
      setIsRunning(false);
    }
  }

  return (
    <div className="code-run-modal" role="presentation">
      <div className="code-run-modal__backdrop" onClick={onClose} />
      <section
        className="code-run-modal__panel"
        role="dialog"
        aria-modal="true"
        aria-label="코드블록 실행"
      >
        <header className="code-run-modal__header">
          <div>
            <p>Code Runner</p>
            <h2>{snippet.title}</h2>
          </div>
          <button
            type="button"
            className="code-run-modal__close"
            onClick={onClose}
            aria-label="닫기"
          >
            ×
          </button>
        </header>

        <div className="code-run-modal__body">
          <section className="code-run-modal__code">
            <div className="code-run-modal__code-top">
              <span>{snippet.language}</span>
            </div>
            <pre>
              <code>{snippet.code}</code>
            </pre>
          </section>

          <section className="code-run-modal__terminal">
            <label>
              <span>stdin</span>
              <textarea
                value={input}
                onChange={(event) => setInput(event.target.value)}
                placeholder="실행할 입력값을 작성하세요."
              />
            </label>

            <div className="code-run-modal__terminal-actions">
              <Button
                type="button"
                size="medium"
                loading={isRunning}
                onClick={handleRun}
              >
                실행하기
              </Button>
            </div>

            <div className="code-run-modal__output" aria-live="polite">
              <div className="code-run-modal__output-top">
                <span>stdout</span>
                {result && <small>{result.runtimeMs}ms</small>}
              </div>
              <pre>{error || result?.output || "아직 실행 결과가 없습니다."}</pre>
            </div>
          </section>
        </div>
      </section>
    </div>
  );
}

export default CodeRunModal;
