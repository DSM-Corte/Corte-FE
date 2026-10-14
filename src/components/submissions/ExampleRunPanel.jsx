function ExampleRunPanel({ result, message, isRunning }) {
  const statusClassName = result
    ? `example-run-panel__status ${
        result.summary.verdict === "맞았습니다" ? "is-passed" : "is-failed"
      }`
    : "example-run-panel__status";

  return (
    <section className="example-run-panel" aria-label="예제 실행 결과">
      <div className="example-run-panel__header">
        <h2>예제 실행 결과</h2>
        <span className={isRunning ? "example-run-panel__status is-running" : statusClassName}>
          {isRunning ? "실행 중" : result ? result.summary.verdict : "대기"}
        </span>
      </div>

      <div className="example-run-panel__body">
        {!result && (
          <p className="example-run-panel__empty">
            예제 실행을 누르면 이 창에 테스트 결과가 표시됩니다.
          </p>
        )}

        {message && <p className="example-run-panel__message">{message}</p>}

        {result && (
          <div className="example-run-list">
            {result.testResults.map((testResult) => (
              <article
                className={`example-run-item ${
                  testResult.passed ? "is-passed" : "is-failed"
                }`}
                key={testResult.title}
              >
                <div className="example-run-item__top">
                  <strong>{testResult.title}</strong>
                  <span>{testResult.passed ? "PASS" : "FAIL"}</span>
                </div>
                <dl>
                  <div>
                    <dt>Input</dt>
                    <dd>{testResult.input}</dd>
                  </div>
                  <div>
                    <dt>Expected</dt>
                    <dd>{testResult.expected || "(빈 출력)"}</dd>
                  </div>
                  <div>
                    <dt>Output</dt>
                    <dd>{testResult.output || "(출력 없음)"}</dd>
                  </div>
                </dl>
              </article>
            ))}
          </div>
        )}
      </div>
    </section>
  );
}

export default ExampleRunPanel;
