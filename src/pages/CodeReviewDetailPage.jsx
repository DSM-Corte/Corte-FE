import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router";
import { getCurrentUserId } from "../api/AuthApi";
import {
  acceptCodeReviewSuggestion,
  addCodeReviewComment,
  CODE_REVIEW_UPDATED_EVENT,
  ensureCodeReviewGenerated,
  getCodeReviewById,
  recommendCodeReviewSuggestion,
  setCodeReviewClosed,
} from "../api/CodeReviewApi";
import { getProblemById } from "../api/ProblemApi";
import { runTerminalCode } from "../api/SubmissionApi";
import MarkdownPreview from "../components/community/MarkdownPreview";
import Button from "../components/common/Button";
import ExecutionTerminal from "../components/submissions/ExecutionTerminal";
import "./CodeReviewPage.css";

function createTerminalLine(type, text) {
  return { type, text };
}

function createInitialTerminalLines(targetLabel = "code") {
  return [
    createTerminalLine("system", `COTRE ${targetLabel} terminal ready.`),
    createTerminalLine("muted", "stdin을 직접 입력하고 코드를 실행해볼 수 있습니다."),
  ];
}

function createDiffRows(originalCode, suggestedCode) {
  const originalLines = String(originalCode ?? "").split("\n");
  const suggestedLines = String(suggestedCode ?? "").split("\n");
  const rows = [];
  let left = 0;
  let right = 0;

  while (left < originalLines.length || right < suggestedLines.length) {
    const originalLine = originalLines[left] ?? "";
    const suggestedLine = suggestedLines[right] ?? "";

    if (originalLine === suggestedLine) {
      rows.push({ type: "same", left: left + 1, right: right + 1, code: originalLine });
      left += 1;
      right += 1;
      continue;
    }

    if (suggestedLine && originalLines[left] !== suggestedLine) {
      rows.push({ type: "added", left: "", right: right + 1, code: suggestedLine });
      right += 1;
      continue;
    }

    rows.push({ type: "removed", left: left + 1, right: "", code: originalLine });
    left += 1;
  }

  return rows;
}

function getSuggestionAuthor(suggestion, review) {
  const authorId =
    suggestion.authorId ||
    (suggestion.authorType === "ai" ? "ai-cotre" : review.authorId);

  return {
    id: authorId,
    name:
      suggestion.authorName ||
      (suggestion.authorType === "ai" ? "COTRE Review" : review.authorName),
    type: suggestion.authorType === "ai" ? "COTRE" : "User",
  };
}

function getSourceFileName(review) {
  const extension = review.language === "python" ? "py" : "js";

  return `solutions/${review.problemId}-${review.problemTitle}.${extension}`;
}

function formatLanguage(language) {
  if (language === "javascript") {
    return "JavaScript";
  }

  if (language === "python") {
    return "Python";
  }

  return language;
}

const keywordPatternByLanguage = {
  python:
    /\b(?:False|None|True|and|as|assert|async|await|break|class|continue|def|elif|else|except|finally|for|from|if|import|in|is|lambda|not|or|pass|print|raise|return|try|while|with|yield)\b/,
  javascript:
    /\b(?:async|await|break|case|catch|class|const|continue|default|else|export|finally|for|from|function|if|import|let|new|null|return|switch|throw|try|undefined|var|while)\b/,
};

function getSyntaxTokenType(token, language) {
  const keywordPattern =
    keywordPatternByLanguage[language] ?? keywordPatternByLanguage.javascript;

  if (/^\/\/|^#/.test(token)) {
    return "comment";
  }

  if (/^["'`]/.test(token)) {
    return "string";
  }

  if (/^\d/.test(token)) {
    return "number";
  }

  if (keywordPattern.test(token)) {
    return "keyword";
  }

  return "";
}

function renderHighlightedCode(line, language) {
  const tokenPattern =
    /("(?:\\.|[^"\\])*"|'(?:\\.|[^'\\])*'|`(?:\\.|[^`\\])*`|\/\/.*|#.*|\b\d+(?:\.\d+)?\b|\b[A-Za-z_][A-Za-z0-9_]*\b)/g;
  const parts = String(line || " ").split(tokenPattern);

  return parts.map((part, index) => {
    if (!part) {
      return null;
    }

    const tokenType = getSyntaxTokenType(part, language);

    return (
      <span className={tokenType ? `syntax-token syntax-token--${tokenType}` : ""} key={index}>
        {part}
      </span>
    );
  });
}

const REVIEW_COLLAPSE_STORAGE_PREFIX = "cotre_code_review_collapse";

function getReviewCollapseStorageKey(reviewId) {
  return `${REVIEW_COLLAPSE_STORAGE_PREFIX}:${reviewId}`;
}

function createEmptyCollapseState() {
  return {
    lines: new Set(),
    comments: new Set(),
  };
}

function readReviewCollapseState(reviewId) {
  if (!reviewId) {
    return createEmptyCollapseState();
  }

  try {
    const rawState = window.localStorage.getItem(getReviewCollapseStorageKey(reviewId));

    if (!rawState) {
      return createEmptyCollapseState();
    }

    const parsedState = JSON.parse(rawState);
    const lines = Array.isArray(parsedState.lines) ? parsedState.lines : [];
    const comments = Array.isArray(parsedState.comments) ? parsedState.comments : [];

    return {
      lines: new Set(
        lines.map((line) => Number(line)).filter((line) => Number.isFinite(line)),
      ),
      comments: new Set(comments.map((commentId) => String(commentId)).filter(Boolean)),
    };
  } catch {
    window.localStorage.removeItem(getReviewCollapseStorageKey(reviewId));
    return createEmptyCollapseState();
  }
}

function saveReviewCollapseState(reviewId, { lines, comments }) {
  if (!reviewId) {
    return;
  }

  window.localStorage.setItem(
    getReviewCollapseStorageKey(reviewId),
    JSON.stringify({
      lines: [...lines],
      comments: [...comments],
    }),
  );
}

function CodeReviewDetailPage() {
  const { id } = useParams();
  const initialCollapseState = readReviewCollapseState(id);
  const [review, setReview] = useState(null);
  const [isLoading, setIsLoading] = useState(true);
  const [activeLine, setActiveLine] = useState(null);
  const [collapsedCommentLines, setCollapsedCommentLines] = useState(
    () => initialCollapseState.lines,
  );
  const [collapsedCommentIds, setCollapsedCommentIds] = useState(
    () => initialCollapseState.comments,
  );
  const [lineComment, setLineComment] = useState("");
  const [lineCommentViewMode, setLineCommentViewMode] = useState("editor");
  const [message, setMessage] = useState("");
  const [defaultTerminalInput, setDefaultTerminalInput] = useState("");
  const [terminalInput, setTerminalInput] = useState("");
  const [terminalLines, setTerminalLines] = useState(() =>
    createInitialTerminalLines(),
  );
  const [terminalTarget, setTerminalTarget] = useState(null);
  const [isTerminalRunning, setIsTerminalRunning] = useState(false);
  const currentUserId = getCurrentUserId();

  useEffect(() => {
    const timerId = window.setTimeout(() => {
      const savedState = readReviewCollapseState(id);

      setCollapsedCommentLines(savedState.lines);
      setCollapsedCommentIds(savedState.comments);
    }, 0);

    return () => {
      window.clearTimeout(timerId);
    };
  }, [id]);

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
      setDefaultTerminalInput(nextProblem?.detail.examples[0]?.input ?? "");
      setIsLoading(false);
    }

    fetchReview();

    return () => {
      ignore = true;
    };
  }, [id]);

  useEffect(() => {
    let ignore = false;

    async function handleReviewUpdate() {
      const nextReview = await getCodeReviewById(id);

      if (!ignore) {
        setReview(nextReview);
      }
    }

    window.addEventListener(CODE_REVIEW_UPDATED_EVENT, handleReviewUpdate);

    return () => {
      ignore = true;
      window.removeEventListener(CODE_REVIEW_UPDATED_EVENT, handleReviewUpdate);
    };
  }, [id]);

  useEffect(() => {
    if (review?.generationStatus === "generating") {
      void ensureCodeReviewGenerated(review.id);
    }
  }, [review?.generationStatus, review?.id]);

  const codeLines = useMemo(() => String(review?.code ?? "").split("\n"), [review]);
  const commentsByLine = useMemo(() => {
    return (review?.comments ?? []).reduce((groups, item) => {
      const key = Number(item.line);
      groups.set(key, [...(groups.get(key) ?? []), item]);
      return groups;
    }, new Map());
  }, [review]);

  function openLineComment(lineNumber) {
    if (review?.isClosed) {
      setMessage("닫힌 리뷰에는 새 코멘트를 추가할 수 없습니다.");
      return;
    }

    setActiveLine(lineNumber);
    setLineComment("");
    setLineCommentViewMode("editor");
    setMessage("");
  }

  function handleCodeLineKeyDown(event, lineNumber) {
    if (event.key !== "Enter" && event.key !== " ") {
      return;
    }

    event.preventDefault();
    openLineComment(lineNumber);
  }

  function closeLineComment() {
    setActiveLine(null);
    setLineComment("");
    setLineCommentViewMode("editor");
  }

  function toggleCommentThread(lineNumber) {
    setCollapsedCommentLines((currentLines) => {
      const nextLines = new Set(currentLines);

      if (nextLines.has(lineNumber)) {
        nextLines.delete(lineNumber);
      } else {
        nextLines.add(lineNumber);
      }

      saveReviewCollapseState(id, {
        lines: nextLines,
        comments: collapsedCommentIds,
      });
      return nextLines;
    });
  }

  function toggleInlineComment(commentId) {
    setCollapsedCommentIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(commentId)) {
        nextIds.delete(commentId);
      } else {
        nextIds.add(commentId);
      }

      saveReviewCollapseState(id, {
        lines: collapsedCommentLines,
        comments: nextIds,
      });
      return nextIds;
    });
  }

  async function handleAddLineComment(event) {
    event.preventDefault();
    setMessage("");

    if (!activeLine) {
      return;
    }

    try {
      const nextReview = await addCodeReviewComment(id, {
        line: activeLine,
        body: lineComment,
      });
      setReview(nextReview);
      setCollapsedCommentLines((currentLines) => {
        const nextLines = new Set(currentLines);
        nextLines.delete(activeLine);
        saveReviewCollapseState(id, {
          lines: nextLines,
          comments: collapsedCommentIds,
        });
        return nextLines;
      });
      closeLineComment();
    } catch (error) {
      setMessage(error.message);
    }
  }

  function openOriginalTerminal() {
    if (!review) {
      return;
    }

    setTerminalTarget({
      type: "original",
      title: "원본 코드",
      code: review.code,
      command: "run-original",
      label: "original code",
    });
    setTerminalInput(defaultTerminalInput);
    setTerminalLines(createInitialTerminalLines("original code"));
  }

  function openSuggestionTerminal(suggestion) {
    setTerminalTarget({
      type: "suggestion",
      title: suggestion.title,
      code: suggestion.code,
      command: "run-suggestion",
      label: "suggestion",
    });
    setTerminalInput(defaultTerminalInput);
    setTerminalLines(createInitialTerminalLines("suggestion"));
  }

  function closeTerminal() {
    if (isTerminalRunning) {
      return;
    }

    setTerminalTarget(null);
  }

  function resetTerminal() {
    setTerminalLines(createInitialTerminalLines(terminalTarget?.label));
  }

  function appendTerminalLines(lines) {
    setTerminalLines((currentLines) => [...currentLines, ...lines]);
  }

  async function handleRunTerminal() {
    if (!review || !terminalTarget) {
      return;
    }

    setIsTerminalRunning(true);

    appendTerminalLines([
      createTerminalLine(
        "command",
        `cotre ${terminalTarget.command} --language ${review.language} --problem ${review.problemId}`,
      ),
      createTerminalLine("label", "stdin"),
      createTerminalLine("input", terminalInput || "(빈 입력)"),
    ]);

    try {
      const result = await runTerminalCode({
        problemId: review.problemId,
        language: review.language,
        code: terminalTarget.code,
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
      setIsTerminalRunning(false);
    }
  }

  async function handleRecommendSuggestion(suggestionId) {
    setMessage("");

    try {
      setReview(await recommendCodeReviewSuggestion(id, suggestionId));
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleAcceptSuggestion(suggestionId) {
    setMessage("");

    try {
      setReview(await acceptCodeReviewSuggestion(id, suggestionId));
      setMessage("코드 제안을 채택했습니다.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  async function handleReviewStatusToggle() {
    setMessage("");

    try {
      const nextReview = await setCodeReviewClosed(id, !review.isClosed);
      setReview(nextReview);
      closeLineComment();
      setMessage(nextReview.isClosed ? "코드 리뷰를 닫았습니다." : "코드 리뷰를 다시 열었습니다.");
    } catch (error) {
      setMessage(error.message);
    }
  }

  if (isLoading) {
    return <main className="code-review-state">코드 리뷰를 불러오는 중입니다.</main>;
  }

  if (!review) {
    return (
      <main className="code-review-state">
        <p>코드 리뷰를 찾을 수 없습니다.</p>
        <Link to="/code-review">코드 리뷰 목록으로 돌아가기</Link>
      </main>
    );
  }

  const isGeneratingReview = review.generationStatus === "generating";
  const canManageReview = !review.authorId || review.authorId === currentUserId;

  return (
    <main className="code-review-detail-page review-diff-page">
      <header className="review-diff-header">
        <div className="review-diff-header__left">
          <Link to="/code-review" className="review-diff-header__back">
            ‹
          </Link>
          <div>
            <p>
              #{review.problemId} {review.problemTitle}
            </p>
            <h1>{review.title}</h1>
          </div>
        </div>

        <div className="review-diff-header__actions">
          <Button
            type="button"
            variant="pearl"
            size="small"
            onClick={openOriginalTerminal}
          >
            실행
          </Button>
          <span
            className={`review-status-pill ${
              review.isClosed ? "review-status-pill--closed" : ""
            }`.trim()}
          >
            {review.isClosed ? "닫힘" : "열림"}
          </span>
          {canManageReview && (
            <Button
              type="button"
              variant={review.isClosed ? "primary" : "pearl"}
              size="small"
              onClick={handleReviewStatusToggle}
            >
              {review.isClosed ? "다시 열기" : "리뷰 닫기"}
            </Button>
          )}
        </div>
      </header>

      {review.isClosed && (
        <section className="review-closed-banner" aria-label="닫힌 코드 리뷰">
          <strong>닫힌 코드 리뷰입니다.</strong>
          <span>내용은 읽을 수 있지만 새 코멘트, 추천, 채택, 제안 작성은 제한됩니다.</span>
        </section>
      )}

      <section className="review-diff-shell">
        <aside className="review-diff-context">
          <article className="review-info-card review-info-card--ai">
            <h2>리뷰 요약</h2>
            <p>{review.aiSummary}</p>
          </article>
        </aside>

        <article className="review-diff-file">
          <div className="review-diff-file__bar">
            <div className="review-diff-file__path">
              <span aria-hidden="true">⌄</span>
              <strong>{getSourceFileName(review)}</strong>
            </div>
            <div className="review-diff-file__meta">
              <span>{formatLanguage(review.language)}</span>
            </div>
          </div>

          <div className="review-diff-code" role="table" aria-label="코드 리뷰 라인">
            {codeLines.map((codeLine, index) => {
              const lineNumber = index + 1;
              const comments = commentsByLine.get(lineNumber) ?? [];
              const isActive = activeLine === lineNumber;
              const isCommentThreadCollapsed = collapsedCommentLines.has(lineNumber);

              return (
                <div
                  className={`review-diff-line-block ${
                    isActive ? "is-active" : ""
                  }`.trim()}
                  key={`${lineNumber}-${codeLine}`}
                >
                  <div
                    className={`review-diff-code-line ${
                      review.isClosed ? "review-diff-code-line--readonly" : ""
                    }`.trim()}
                    role="row"
                    tabIndex={review.isClosed ? -1 : 0}
                    onClick={() => openLineComment(lineNumber)}
                    onKeyDown={(event) => handleCodeLineKeyDown(event, lineNumber)}
                  >
                    <button
                      type="button"
                      className="review-line-add-button"
                      aria-label={`Line ${lineNumber}에 코멘트 추가`}
                      disabled={review.isClosed}
                      onClick={(event) => {
                        event.stopPropagation();
                        openLineComment(lineNumber);
                      }}
                    >
                      +
                    </button>
                    <span className="review-line-number" role="cell">
                      {lineNumber}
                    </span>
                    <span className="review-line-marker" role="cell">
                      +
                    </span>
                    <code role="cell">
                      {renderHighlightedCode(codeLine || " ", review.language)}
                    </code>
                  </div>

                  {isActive && (
                    <form
                      className="review-inline-comment-form"
                      onSubmit={handleAddLineComment}
                    >
                      <div className="review-inline-comment-form__title">
                        <span className="review-avatar" aria-hidden="true">
                          C
                        </span>
                        <strong>R{lineNumber} 줄에 코멘트 추가</strong>
                      </div>
                      <div className="review-inline-tabs">
                        <button
                          type="button"
                          className={lineCommentViewMode === "editor" ? "is-active" : ""}
                          onClick={() => setLineCommentViewMode("editor")}
                        >
                          작성
                        </button>
                        <button
                          type="button"
                          className={lineCommentViewMode === "preview" ? "is-active" : ""}
                          onClick={() => setLineCommentViewMode("preview")}
                        >
                          미리보기
                        </button>
                      </div>
                      {lineCommentViewMode === "editor" ? (
                        <textarea
                          value={lineComment}
                          onChange={(event) => setLineComment(event.target.value)}
                          placeholder="마크다운으로 코멘트를 입력하세요"
                          autoFocus
                        />
                      ) : (
                        <div className="review-inline-markdown-preview">
                          <MarkdownPreview markdown={lineComment} />
                        </div>
                      )}
                      <div className="review-inline-comment-form__footer">
                        <span>파일을 붙여넣거나 끌어오거나 클릭해서 추가</span>
                        <div>
                          <Button
                            type="button"
                            variant="pearl"
                            size="small"
                            onClick={closeLineComment}
                          >
                            취소
                          </Button>
                          <Button type="submit" size="small">
                            코멘트
                          </Button>
                        </div>
                      </div>
                    </form>
                  )}

                  {comments.length > 0 && (
                    <section
                      className={`review-line-comment-thread ${
                        isCommentThreadCollapsed ? "is-collapsed" : ""
                      }`.trim()}
                    >
                      <button
                        type="button"
                        className="review-line-comment-thread__toggle"
                        aria-expanded={!isCommentThreadCollapsed}
                        onClick={() => toggleCommentThread(lineNumber)}
                      >
                        <span aria-hidden="true">
                          {isCommentThreadCollapsed ? "›" : "⌄"}
                        </span>
                        <strong>
                          R{lineNumber} 줄 코멘트 {comments.length}개
                        </strong>
                      </button>

                      {!isCommentThreadCollapsed &&
                        comments.map((item) => {
                          const isCommentCollapsed = collapsedCommentIds.has(item.id);

                          return (
                            <article
                              className={`review-line-comment review-line-comment--${item.authorType} ${
                                isCommentCollapsed ? "is-collapsed" : ""
                              }`.trim()}
                              key={item.id}
                            >
                              <header className="review-line-comment__header">
                                <strong>{item.authorName}</strong>
                                <button
                                  type="button"
                                  onClick={() => toggleInlineComment(item.id)}
                                  aria-expanded={!isCommentCollapsed}
                                >
                                  {isCommentCollapsed ? "펼치기" : "접기"}
                                </button>
                              </header>
                              {!isCommentCollapsed && (
                                <div className="review-line-comment__body">
                                  <MarkdownPreview markdown={item.body} />
                                </div>
                              )}
                            </article>
                          );
                        })}
                    </section>
                  )}
                </div>
              );
            })}
          </div>
        </article>

      </section>

      <section className="review-suggestion-section review-suggestion-section--full">
        <div className="review-section-heading">
          <div>
            <p>Suggestions</p>
            <h2>제안 코드</h2>
          </div>
          <Link
            to={`/code-review/${review.id}/suggestions/new`}
            className={`button button--md button--contained ${
              review.isClosed ? "button--disabled-link" : ""
            }`.trim()}
            aria-disabled={review.isClosed}
            tabIndex={review.isClosed ? -1 : undefined}
            onClick={(event) => {
              if (review.isClosed) {
                event.preventDefault();
                setMessage("닫힌 리뷰에는 새 코드 제안을 작성할 수 없습니다.");
              }
            }}
          >
            코드 제안 작성
          </Link>
        </div>

        <div className="review-suggestion-list">
          {isGeneratingReview && (
            <article className="review-suggestion-loading">
              <div>
                <strong>제안 코드를 준비하는 중입니다.</strong>
                <p>완료되면 이 영역에 자동으로 표시됩니다.</p>
              </div>
              <div className="review-suggestion-loading__bar" aria-hidden="true">
                <span />
              </div>
            </article>
          )}

          {review.suggestions.map((suggestion) => {
            const author = getSuggestionAuthor(suggestion, review);
            const isAccepted = review.acceptedSuggestionId === suggestion.id;
            const isRecommended = suggestion.recommendedBy?.includes(currentUserId);

            return (
              <article className="review-suggestion-card" key={suggestion.id}>
                <div className="review-suggestion-card__head">
                  <div>
                    <div className="review-suggestion-title-row">
                      <strong>{suggestion.title}</strong>
                      {isAccepted && <span>채택됨</span>}
                    </div>
                    <Link
                      to={`/users/${author.id}`}
                      className="review-suggestion-author"
                    >
                      <span>{author.type}</span>
                      {author.name}
                    </Link>
                    <p>{suggestion.description}</p>
                  </div>
                  <div className="review-suggestion-actions">
                    <Button
                      type="button"
                      variant={isRecommended ? "primary" : "pearl"}
                      size="small"
                      disabled={review.isClosed}
                      onClick={() => handleRecommendSuggestion(suggestion.id)}
                    >
                      추천 {suggestion.recommendationCount ?? 0}
                    </Button>
                    <Button
                      type="button"
                      variant={isAccepted ? "primary" : "pearl"}
                      size="small"
                      disabled={isAccepted || review.isClosed}
                      onClick={() => handleAcceptSuggestion(suggestion.id)}
                    >
                      {isAccepted ? "채택 완료" : "채택"}
                    </Button>
                    <Button
                      type="button"
                      variant="dark"
                      size="small"
                      onClick={() => openSuggestionTerminal(suggestion)}
                    >
                      실행
                    </Button>
                  </div>
                </div>

                <div className="review-diff">
                  {createDiffRows(review.code, suggestion.code).map((row, index) => (
                    <div
                      className={`review-diff__row review-diff__row--${row.type}`}
                      key={index}
                    >
                      <span>{row.left}</span>
                      <span>{row.right}</span>
                      <code>{row.code || " "}</code>
                    </div>
                  ))}
                </div>
              </article>
            );
          })}
        </div>

        {message && <p className="code-review-message">{message}</p>}
      </section>

      {terminalTarget && (
        <div
          className="review-terminal-modal"
          role="dialog"
          aria-modal="true"
          aria-label={`${terminalTarget.title} 실행 터미널`}
        >
          <div className="review-terminal-modal__dialog">
            <header className="review-terminal-modal__header">
              <div>
                <p>
                  {terminalTarget.type === "original"
                    ? "Original Runner"
                    : "Suggestion Runner"}
                </p>
                <h2>{terminalTarget.title}</h2>
              </div>
              <Button
                type="button"
                variant="pearl"
                size="small"
                disabled={isTerminalRunning}
                onClick={closeTerminal}
              >
                닫기
              </Button>
            </header>
            <ExecutionTerminal
              input={terminalInput}
              lines={terminalLines}
              isRunning={isTerminalRunning}
              onChangeInput={setTerminalInput}
              onClear={resetTerminal}
              onRunInput={handleRunTerminal}
            />
          </div>
        </div>
      )}
    </main>
  );
}

export default CodeReviewDetailPage;
