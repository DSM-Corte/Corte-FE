import { useEffect, useRef } from "react";
import Button from "../common/Button";

function ExecutionTerminal({
  input,
  lines,
  isRunning,
  onChangeInput,
  onClear,
  onRunInput,
}) {
  const screenRef = useRef(null);

  useEffect(() => {
    const screen = screenRef.current;

    if (!screen) {
      return;
    }

    requestAnimationFrame(() => {
      screen.scrollTop = screen.scrollHeight;
    });
  }, [lines, isRunning]);

  function handleKeyDown(event) {
    if ((event.ctrlKey || event.metaKey) && event.key === "Enter") {
      event.preventDefault();
      onRunInput();
    }
  }

  return (
    <section className="submit-terminal" aria-label="실행 터미널">
      <div className="terminal-window">
        <div className="terminal-window__bar">
          <div className="terminal-window__lights" aria-hidden="true">
            <span />
            <span />
            <span />
          </div>
          <strong>COTRE Terminal</strong>
          <Button
            type="button"
            variant="ghost"
            size="small"
            disabled={isRunning}
            onClick={onClear}
          >
            지우기
          </Button>
        </div>

        <div className="terminal-window__screen" aria-live="polite" ref={screenRef}>
          {lines.map((line, index) => (
            <pre className={`terminal-line terminal-line--${line.type}`} key={`${line.type}-${index}`}>
              {line.text}
            </pre>
          ))}
          {isRunning && <pre className="terminal-line terminal-line--cursor">실행 중...</pre>}
        </div>

        <div className="terminal-input">
          <div className="terminal-input__label">
            <span>$ stdin</span>
            <span>Ctrl + Enter로 실행</span>
          </div>
          <textarea
            value={input}
            spellCheck="false"
            aria-label="터미널 입력"
            placeholder="여기에 직접 입력값을 작성하세요."
            onChange={(event) => onChangeInput(event.target.value)}
            onKeyDown={handleKeyDown}
          />
          <Button
            type="button"
            size="medium"
            loading={isRunning}
            onClick={onRunInput}
          >
            입력 실행
          </Button>
        </div>
      </div>
    </section>
  );
}

export default ExecutionTerminal;
