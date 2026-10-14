function renderVisibleWhitespace(value) {
  return Array.from(value).map((character, index) => {
    if (character === " ") {
      return (
        <span className="example-whitespace example-whitespace--space" key={index}>
          {" "}
        </span>
      );
    }

    if (character === "\t") {
      return (
        <span className="example-whitespace example-whitespace--tab" key={index}>
          {"\t"}
        </span>
      );
    }

    if (character === "\n") {
      return "\n";
    }

    return character;
  });
}

function ExampleField({ label, value, copied, onCopy, showWhitespace = false }) {
  const displayValue = value ?? "";

  return (
    <section className="example-field">
      <div className="example-field__header">
        <h4>{label}</h4>
        <button className="example-copy" type="button" onClick={onCopy}>
          {copied ? "복사됨" : "복사"}
        </button>
      </div>
      <pre>
        <code aria-label={displayValue}>
          {showWhitespace
            ? renderVisibleWhitespace(displayValue)
            : displayValue}
        </code>
      </pre>
    </section>
  );
}

function ProblemExampleList({ examples, copiedKey, onCopy }) {
  return (
    <div className="example-list">
      {examples.map((example) => (
        <section className="example-card" key={example.title}>
          <h3>{example.title}</h3>
          <div className="example-field-list">
            <ExampleField
              label="Input"
              value={example.input}
              copied={copiedKey === `${example.title}-input`}
              onCopy={() => onCopy(`${example.title}-input`, example.input)}
              showWhitespace
            />
            <ExampleField
              label="Output"
              value={example.output}
              copied={copiedKey === `${example.title}-output`}
              onCopy={() => onCopy(`${example.title}-output`, example.output)}
              showWhitespace
            />
            <ExampleField
              label="Explanation"
              value={example.explanation}
              copied={copiedKey === `${example.title}-explanation`}
              onCopy={() =>
                onCopy(`${example.title}-explanation`, example.explanation)
              }
            />
          </div>
        </section>
      ))}
    </div>
  );
}

export default ProblemExampleList;
