import ExampleRunPanel from "./ExampleRunPanel";
import ExecutionTerminal from "./ExecutionTerminal";

function RunnerPanel({
  activeView,
  exampleRunResult,
  input,
  isRunning,
  lines,
  message,
  onChangeInput,
  onClear,
  onRunInput,
  onSelectView,
}) {
  return (
    <section className="runner-panel" aria-label="실행 패널">
      <div className="runner-panel__tabs" role="tablist" aria-label="실행 보기">
        <button
          className={
            activeView === "examples"
              ? "runner-panel__tab is-active"
              : "runner-panel__tab"
          }
          type="button"
          role="tab"
          aria-selected={activeView === "examples"}
          onClick={() => onSelectView("examples")}
        >
          실행 결과
        </button>
        <button
          className={
            activeView === "terminal"
              ? "runner-panel__tab is-active"
              : "runner-panel__tab"
          }
          type="button"
          role="tab"
          aria-selected={activeView === "terminal"}
          onClick={() => onSelectView("terminal")}
        >
          터미널
        </button>
      </div>

      <div className="runner-panel__content">
        {activeView === "examples" ? (
          <ExampleRunPanel
            result={exampleRunResult}
            message={message}
            isRunning={isRunning}
          />
        ) : (
          <ExecutionTerminal
            input={input}
            lines={lines}
            isRunning={isRunning}
            onChangeInput={onChangeInput}
            onClear={onClear}
            onRunInput={onRunInput}
          />
        )}
      </div>
    </section>
  );
}

export default RunnerPanel;
