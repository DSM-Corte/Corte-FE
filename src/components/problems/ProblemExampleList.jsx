import { useState } from "react";
import { writeClipboardText } from "../../utils/clipboard";

function ExampleField({ label, value }) {
  const [status, setStatus] = useState("");

  async function copy() {
    try {
      await writeClipboardText(value);
      setStatus("복사됨");
    } catch {
      setStatus("복사 실패");
    }
  }

  return (
    <section className="example-field">
      <div className="example-field__header">
        <h4>{label}</h4>
        <button className="example-copy" type="button" onClick={copy} aria-label={`${label} 복사`}>
          <span aria-live="polite">{status || "복사"}</span>
        </button>
      </div>
      <pre tabIndex={0} aria-label={label}><code>{value}</code></pre>
    </section>
  );
}

function ProblemExampleList({ examples }) {
  return (
    <div className="example-list">
      {examples.map(({ title, input, output, text }) => (
        <section className="example-card" key={title}>
          <h3>{title}</h3>
          <div className="example-field-list">
            {input !== undefined && <ExampleField label="입력" value={input} />}
            {output !== undefined && <ExampleField label="출력" value={output} />}
            {text !== undefined && <ExampleField label="예제 내용" value={text} />}
          </div>
        </section>
      ))}
    </div>
  );
}

export default ProblemExampleList;
