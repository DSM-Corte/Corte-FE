function normalizeSnippetLanguage(language) {
  const normalizedLanguage = String(language ?? "").trim().toLowerCase();

  if (normalizedLanguage === "js" || normalizedLanguage === "javascript") {
    return "javascript";
  }

  if (normalizedLanguage === "py" || normalizedLanguage === "python") {
    return "python";
  }

  return "";
}

function renderInline(text) {
  const source = String(text ?? "");
  const pattern =
    /(!\[[^\]]*\]\([^)]+\)|`[^`]+`|\*\*[^*]+\*\*|\*[^*]+\*|\[[^\]]+\]\([^)]+\))/g;
  const nodes = [];
  let lastIndex = 0;
  let match;

  while ((match = pattern.exec(source))) {
    const [token] = match;

    if (match.index > lastIndex) {
      nodes.push(source.slice(lastIndex, match.index));
    }

    if (token.startsWith("![")) {
      const imageMatch = token.match(/^!\[([^\]]*)\]\(([^)]+)\)$/);

      if (imageMatch) {
        nodes.push(
          <img
            src={imageMatch[2]}
            alt={imageMatch[1] || "첨부 이미지"}
            className="markdown-preview__image"
            key={match.index}
          />,
        );
      } else {
        nodes.push(token);
      }
    } else if (token.startsWith("`")) {
      nodes.push(<code key={match.index}>{token.slice(1, -1)}</code>);
    } else if (token.startsWith("**")) {
      nodes.push(<strong key={match.index}>{token.slice(2, -2)}</strong>);
    } else if (token.startsWith("*")) {
      nodes.push(<em key={match.index}>{token.slice(1, -1)}</em>);
    } else {
      const linkMatch = token.match(/^\[([^\]]+)\]\(([^)]+)\)$/);
      nodes.push(
        <a href={linkMatch[2]} target="_blank" rel="noreferrer" key={match.index}>
          {linkMatch[1]}
        </a>,
      );
    }

    lastIndex = match.index + token.length;
  }

  if (lastIndex < source.length) {
    nodes.push(source.slice(lastIndex));
  }

  return nodes;
}

function renderMarkdownChunk(chunk, chunkIndex) {
  const lines = chunk.split("\n");
  const blocks = [];
  let paragraphLines = [];
  let listLines = [];

  function flushParagraph(index) {
    if (!paragraphLines.length) {
      return;
    }

    blocks.push(
      <p key={`p-${chunkIndex}-${index}`}>
        {renderInline(paragraphLines.join(" "))}
      </p>,
    );
    paragraphLines = [];
  }

  function flushList(index) {
    if (!listLines.length) {
      return;
    }

    blocks.push(
      <ul key={`ul-${chunkIndex}-${index}`}>
        {listLines.map((line, itemIndex) => (
          <li key={itemIndex}>{renderInline(line.replace(/^[-*]\s+/, ""))}</li>
        ))}
      </ul>,
    );
    listLines = [];
  }

  lines.forEach((line, index) => {
    const trimmedLine = line.trim();

    if (!trimmedLine) {
      flushParagraph(index);
      flushList(index);
      return;
    }

    const headingMatch = trimmedLine.match(/^(#{1,3})\s+(.+)$/);

    if (headingMatch) {
      flushParagraph(index);
      flushList(index);

      const level = headingMatch[1].length;
      const HeadingTag = `h${level}`;
      blocks.push(
        <HeadingTag key={`h-${chunkIndex}-${index}`}>
          {renderInline(headingMatch[2])}
        </HeadingTag>,
      );
      return;
    }

    if (/^[-*]\s+/.test(trimmedLine)) {
      flushParagraph(index);
      listLines.push(trimmedLine);
      return;
    }

    if (trimmedLine.startsWith("> ")) {
      flushParagraph(index);
      flushList(index);
      blocks.push(
        <blockquote key={`quote-${chunkIndex}-${index}`}>
          {renderInline(trimmedLine.slice(2))}
        </blockquote>,
      );
      return;
    }

    if (trimmedLine === "---") {
      flushParagraph(index);
      flushList(index);
      blocks.push(<hr key={`hr-${chunkIndex}-${index}`} />);
      return;
    }

    paragraphLines.push(trimmedLine);
  });

  flushParagraph(lines.length);
  flushList(lines.length);

  return blocks;
}

function MarkdownCodeBlock({ code, language, index, onRunSnippet }) {
  const runnableLanguage = normalizeSnippetLanguage(language);
  const languageLabel = language || "text";

  return (
    <section className="markdown-code-card">
      <div className="markdown-code-card__header">
        <div className="markdown-code-card__traffic" aria-hidden="true">
          <span />
          <span />
          <span />
        </div>
        <span className="markdown-code-card__language">{languageLabel}</span>
        {runnableLanguage && onRunSnippet && (
          <button
            type="button"
            className="markdown-code-card__run"
            onClick={() =>
              onRunSnippet({
                code,
                language: runnableLanguage,
                title: `${languageLabel} 코드블록 ${index + 1}`,
              })
            }
          >
            Run Code
          </button>
        )}
      </div>
      <pre>
        <code>{code}</code>
      </pre>
    </section>
  );
}

function MarkdownPreview({ markdown, onRunSnippet }) {
  const source = String(markdown ?? "");
  const fencePattern = /```([^\n`]*)\n?([\s\S]*?)```/g;
  const nodes = [];
  let lastIndex = 0;
  let match;
  let codeIndex = 0;

  while ((match = fencePattern.exec(source))) {
    const [rawBlock, language, code] = match;
    const textChunk = source.slice(lastIndex, match.index);

    nodes.push(...renderMarkdownChunk(textChunk, nodes.length));
    nodes.push(
      <MarkdownCodeBlock
        code={code}
        language={language.trim()}
        index={codeIndex}
        onRunSnippet={onRunSnippet}
        key={`code-${match.index}`}
      />,
    );

    codeIndex += 1;
    lastIndex = match.index + rawBlock.length;
  }

  nodes.push(...renderMarkdownChunk(source.slice(lastIndex), nodes.length));

  if (!nodes.length) {
    return (
      <div className="markdown-preview markdown-preview--empty">
        미리보기할 내용이 없습니다.
      </div>
    );
  }

  return <div className="markdown-preview">{nodes}</div>;
}

export default MarkdownPreview;
