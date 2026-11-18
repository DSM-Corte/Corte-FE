import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import { getCurrentUserId } from "../api/AuthApi";
import {
  applyLineComment,
  closeReviewRequest,
  createComment,
  createLineComment,
  createReply,
  deleteComment,
  deleteLineComment,
  deleteReply,
  getComments,
  getLineComments,
  getReviewRequest,
  updateComment,
  updateLineComment,
  updateReply,
} from "../api/CodeReviewApi";
import {
  createExecution,
  getLanguageLabel,
  getVerdictLabel,
  waitForJob,
} from "../api/JudgeApi";
import MarkdownPreview from "../components/community/MarkdownPreview";
import Button from "../components/common/Button";
import "./CodeReviewPage.css";

const NOT_FOUND_CODES = ["R001"];

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


function redirectIfExpired(error, navigate, id) {
  if (error.status !== 401) {
    return false;
  }

  navigate("/login", {
    replace: true,
    state: { from: `/code-review/${id}`, message: "로그인이 만료되었습니다. 다시 로그인해주세요." },
  });
  return true;
}

function isMine(item, currentUserId) {
  return currentUserId !== "" && String(item.authorId) === String(currentUserId);
}

// 답글 목록: 쓴 사람만 수정·삭제하고 닫힌 요청에서는 모두 읽기 전용이다
function ReplyList({ replies, currentUserId, disabled, onUpdate, onDelete }) {
  const [editingId, setEditingId] = useState(null);
  const [draft, setDraft] = useState("");

  return replies.map((reply) => (
    <div className="review-line-comment__reply" key={reply.id}>
      <strong>{reply.author}</strong>
      {editingId === reply.id ? (
        <>
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} />
          <div>
            <Button
              type="button"
              size="small"
              onClick={async () => {
                if (await onUpdate(reply.id, draft)) {
                  setEditingId(null);
                }
              }}
            >
              저장
            </Button>
            <Button type="button" variant="pearl" size="small" onClick={() => setEditingId(null)}>
              취소
            </Button>
          </div>
        </>
      ) : (
        <>
          <MarkdownPreview markdown={reply.content} />
          {isMine(reply, currentUserId) && !disabled && (
            <div>
              <button
                type="button"
                onClick={() => {
                  setEditingId(reply.id);
                  setDraft(reply.content);
                }}
              >
                수정
              </button>
              <button type="button" onClick={() => onDelete(reply.id)}>
                삭제
              </button>
            </div>
          )}
        </>
      )}
    </div>
  ));
}

// 줄 코멘트·전체 댓글 공통 카드. 줄 코멘트만 suggestedCode와 적용 버튼이 있다
function CommentCard({
  item,
  isLine,
  isRequester,
  isClosed,
  currentUserId,
  onUpdate,
  onDelete,
  onReply,
  onReplyUpdate,
  onReplyDelete,
  onApply,
}) {
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState(item.content);
  const [suggestionDraft, setSuggestionDraft] = useState(item.suggestedCode ?? "");
  const [replyDraft, setReplyDraft] = useState("");
  const [isReplying, setIsReplying] = useState(false);

  async function saveEdit() {
    const saved = await onUpdate(
      item.id,
      isLine ? { content: draft, suggestedCode: suggestionDraft } : draft,
    );

    if (saved) {
      setIsEditing(false);
    }
  }

  async function submitReply(event) {
    event.preventDefault();

    if (await onReply(item.id, replyDraft)) {
      setReplyDraft("");
      setIsReplying(false);
    }
  }

  return (
    <article className="review-line-comment">
      <header className="review-line-comment__header">
        <strong>{item.author}</strong>
        {isMine(item, currentUserId) && !isClosed && !isEditing && (
          <span>
            <button type="button" onClick={() => setIsEditing(true)}>
              수정
            </button>
            <button type="button" onClick={() => onDelete(item.id)}>
              삭제
            </button>
          </span>
        )}
      </header>

      {isEditing ? (
        <div className="review-line-comment__body">
          <textarea value={draft} onChange={(event) => setDraft(event.target.value)} />
          {isLine && (
            <textarea
              value={suggestionDraft}
              onChange={(event) => setSuggestionDraft(event.target.value)}
              placeholder="이 줄을 대체할 제안 코드 (선택)"
            />
          )}
          <Button type="button" size="small" onClick={saveEdit}>
            저장
          </Button>
          <Button type="button" variant="pearl" size="small" onClick={() => setIsEditing(false)}>
            취소
          </Button>
        </div>
      ) : (
        <div className="review-line-comment__body">
          <MarkdownPreview markdown={item.content} />
          {isLine && item.suggestedCode && (
            <>
              <pre className="review-line-comment__suggestion">
                <code>{item.suggestedCode}</code>
              </pre>
              {isRequester && (
                <Button
                  type="button"
                  variant="pearl"
                  size="small"
                  onClick={() => onApply(item.id)}
                >
                  이 제안 적용해보기
                </Button>
              )}
            </>
          )}
        </div>
      )}

      <ReplyList
        replies={item.replies ?? []}
        currentUserId={currentUserId}
        disabled={isClosed}
        onUpdate={onReplyUpdate}
        onDelete={onReplyDelete}
      />

      {!isClosed &&
        (isReplying ? (
          <form onSubmit={submitReply}>
            <textarea
              value={replyDraft}
              onChange={(event) => setReplyDraft(event.target.value)}
              placeholder="답글을 입력하세요"
              autoFocus
            />
            <Button type="submit" size="small">
              답글
            </Button>
            <Button type="button" variant="pearl" size="small" onClick={() => setIsReplying(false)}>
              취소
            </Button>
          </form>
        ) : (
          <button type="button" onClick={() => setIsReplying(true)}>
            답글 달기
          </button>
        ))}
    </article>
  );
}

function CodeReviewDetailPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const currentUserId = getCurrentUserId();
  const [review, setReview] = useState(null);
  const [lineComments, setLineComments] = useState([]);
  const [comments, setComments] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);
  const [message, setMessage] = useState("");
  const [activeLine, setActiveLine] = useState(null);
  const [lineContent, setLineContent] = useState("");
  const [lineSuggestion, setLineSuggestion] = useState("");
  const [lineViewMode, setLineViewMode] = useState("editor");
  const [commentContent, setCommentContent] = useState("");
  const [applied, setApplied] = useState(null);
  const [stdin, setStdin] = useState("");
  const [runResult, setRunResult] = useState(null);
  const [isRunning, setIsRunning] = useState(false);

  const isClosed = Boolean(review?.closed);
  const isRequester = review ? isMine({ authorId: review.requesterId }, currentUserId) : false;

  function handleError(error) {
    if (!redirectIfExpired(error, navigate, id)) {
      setMessage(error.message);
    }
  }

  async function loadThreads() {
    const [nextLineComments, nextComments] = await Promise.all([
      getLineComments(id),
      getComments(id, { size: 100 }),
    ]);

    setLineComments(nextLineComments);
    setComments(nextComments.content);
  }

  useEffect(() => {
    let ignore = false;

    async function fetchReview() {
      setIsLoading(true);
      setNotFound(false);
      setApplied(null);

      try {
        const nextReview = await getReviewRequest(id);
        const [nextLineComments, nextComments] = await Promise.all([
          getLineComments(id),
          getComments(id, { size: 100 }),
        ]);

        if (ignore) {
          return;
        }

        setReview(nextReview);
        setLineComments(nextLineComments);
        setComments(nextComments.content);
      } catch (error) {
        if (ignore) {
          return;
        }

        if (error.status === 404 || NOT_FOUND_CODES.includes(error.code)) {
          setNotFound(true);
        } else {
          if (!redirectIfExpired(error, navigate, id)) {
            setMessage(error.message);
          }
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    fetchReview();

    return () => {
      ignore = true;
    };
  }, [id, navigate]);

  const codeLines = useMemo(() => {
    const lines = String(review?.code ?? "").split("\n");

    // 서버는 마지막 줄바꿈 뒤의 빈 줄을 세지 않는다
    if (lines.length > 1 && lines[lines.length - 1] === "") {
      lines.pop();
    }

    return lines;
  }, [review]);

  const commentsByLine = useMemo(() => {
    return lineComments.reduce((groups, item) => {
      groups.set(item.lineNumber, [...(groups.get(item.lineNumber) ?? []), item]);
      return groups;
    }, new Map());
  }, [lineComments]);

  // 모든 변경은 같은 형태로 실행하고 성공하면 목록을 다시 불러온다
  async function mutate(action) {
    setMessage("");

    try {
      await action();
      await loadThreads();
      return true;
    } catch (error) {
      handleError(error);
      return false;
    }
  }

  function openLineComment(lineNumber) {
    if (isClosed) {
      setMessage("닫힌 리뷰에는 새 코멘트를 추가할 수 없습니다.");
      return;
    }

    if (isRequester) {
      setMessage("요청자는 코멘트를 작성할 수 없습니다. 답글로 이야기를 이어가세요.");
      return;
    }

    setActiveLine(lineNumber);
    setLineContent("");
    setLineSuggestion("");
    setLineViewMode("editor");
    setMessage("");
  }

  function closeLineComment() {
    setActiveLine(null);
  }

  async function handleAddLineComment(event) {
    event.preventDefault();

    const saved = await mutate(() =>
      createLineComment(id, {
        lineNumber: activeLine,
        content: lineContent,
        suggestedCode: lineSuggestion,
      }),
    );

    if (saved) {
      closeLineComment();
    }
  }

  async function handleAddComment(event) {
    event.preventDefault();

    if (await mutate(() => createComment(id, commentContent))) {
      setCommentContent("");
    }
  }

  async function handleClose() {
    if (!window.confirm("리뷰를 닫으면 다시 열 수 없습니다. 닫을까요?")) {
      return;
    }

    setMessage("");

    try {
      await closeReviewRequest(id);
      setReview({ ...review, closed: true });
      closeLineComment();
      setMessage("리뷰를 닫았습니다.");
    } catch (error) {
      handleError(error);
    }
  }

  async function handleApply(commentId) {
    setMessage("");

    try {
      const code = await applyLineComment(id, commentId);
      setApplied({ commentId, code });
      setRunResult(null);
    } catch (error) {
      handleError(error);
    }
  }

  // 적용한 코드를 기존 실행 API로 돌린다. 서버에 저장되는 것은 없다
  async function handleRunApplied() {
    if (!applied || isRunning) {
      return;
    }

    setIsRunning(true);
    setRunResult(null);
    setMessage("");

    try {
      const execution = await createExecution({
        problemId: review.problemId,
        language: review.language,
        code: applied.code,
        stdin,
      });
      setRunResult(await waitForJob("execution", execution.id));
    } catch (error) {
      handleError(error);
    } finally {
      setIsRunning(false);
    }
  }

  function renderThread(isLine, items, kind) {
    return items.map((item) => (
      <CommentCard
        key={item.id}
        item={item}
        isLine={isLine}
        isRequester={isRequester}
        isClosed={isClosed}
        currentUserId={currentUserId}
        onUpdate={(commentId, value) =>
          mutate(() =>
            isLine ? updateLineComment(id, commentId, value) : updateComment(id, commentId, value),
          )
        }
        onDelete={(commentId) =>
          mutate(() => (isLine ? deleteLineComment(id, commentId) : deleteComment(id, commentId)))
        }
        onReply={(commentId, content) => mutate(() => createReply(id, kind, commentId, content))}
        onReplyUpdate={(replyId, content) => mutate(() => updateReply(id, replyId, content))}
        onReplyDelete={(replyId) => mutate(() => deleteReply(id, replyId))}
        onApply={handleApply}
      />
    ));
  }

  if (isLoading) {
    return <main className="code-review-state">코드 리뷰를 불러오는 중입니다.</main>;
  }

  if (notFound || !review) {
    return (
      <main className="code-review-state">
        <p>코드 리뷰를 찾을 수 없습니다.</p>
        <Link to="/code-review">코드 리뷰 목록으로 돌아가기</Link>
      </main>
    );
  }

  const highlightLanguage = review.language === "PYTHON" ? "python" : "javascript";

  return (
    <main className="code-review-detail-page review-diff-page">
      <header className="review-diff-header">
        <div className="review-diff-header__left">
          <Link to="/code-review" className="review-diff-header__back">
            ‹
          </Link>
          <div>
            <p>
              #{review.problemId} · {review.requester}
            </p>
            <h1>{review.problemTitle}</h1>
          </div>
        </div>

        <div className="review-diff-header__actions">
          <span className={`review-status-pill ${isClosed ? "review-status-pill--closed" : ""}`.trim()}>
            {isClosed ? "닫힘" : "열림"}
          </span>
          {isRequester && !isClosed && (
            <Button type="button" variant="pearl" size="small" onClick={handleClose}>
              리뷰 닫기
            </Button>
          )}
        </div>
      </header>

      {isClosed && (
        <section className="review-closed-banner" aria-label="닫힌 코드 리뷰">
          <strong>닫힌 코드 리뷰입니다.</strong>
          <span>내용은 읽을 수 있지만 코멘트, 댓글, 답글 작성과 수정은 제한됩니다.</span>
        </section>
      )}

      <section className="review-diff-shell">
        <article className="review-diff-file">
          <div className="review-diff-file__bar">
            <div className="review-diff-file__path">
              <strong>solution</strong>
            </div>
            <div className="review-diff-file__meta">
              <span>{getLanguageLabel(review.language)}</span>
            </div>
          </div>

          <div className="review-diff-code" role="table" aria-label="코드 리뷰 라인">
            {codeLines.map((codeLine, index) => {
              const lineNumber = index + 1;
              const lineItems = commentsByLine.get(lineNumber) ?? [];

              return (
                <div
                  className={`review-diff-line-block ${activeLine === lineNumber ? "is-active" : ""}`.trim()}
                  key={lineNumber}
                >
                  <div
                    className={`review-diff-code-line ${
                      isClosed || isRequester ? "review-diff-code-line--readonly" : ""
                    }`.trim()}
                    role="row"
                    onClick={() => openLineComment(lineNumber)}
                  >
                    <button
                      type="button"
                      className="review-line-add-button"
                      aria-label={`Line ${lineNumber}에 코멘트 추가`}
                      disabled={isClosed || isRequester}
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
                    <code role="cell">{renderHighlightedCode(codeLine || " ", highlightLanguage)}</code>
                  </div>

                  {activeLine === lineNumber && (
                    <form className="review-inline-comment-form" onSubmit={handleAddLineComment}>
                      <div className="review-inline-comment-form__title">
                        <strong>R{lineNumber} 줄에 코멘트 추가</strong>
                      </div>
                      <div className="review-inline-tabs">
                        <button
                          type="button"
                          className={lineViewMode === "editor" ? "is-active" : ""}
                          onClick={() => setLineViewMode("editor")}
                        >
                          작성
                        </button>
                        <button
                          type="button"
                          className={lineViewMode === "preview" ? "is-active" : ""}
                          onClick={() => setLineViewMode("preview")}
                        >
                          미리보기
                        </button>
                      </div>
                      {lineViewMode === "editor" ? (
                        <>
                          <textarea
                            value={lineContent}
                            onChange={(event) => setLineContent(event.target.value)}
                            placeholder="마크다운으로 코멘트를 입력하세요"
                            autoFocus
                          />
                          <textarea
                            value={lineSuggestion}
                            onChange={(event) => setLineSuggestion(event.target.value)}
                            placeholder="이 줄을 대체할 제안 코드 (선택)"
                          />
                        </>
                      ) : (
                        <div className="review-inline-markdown-preview">
                          <MarkdownPreview markdown={lineContent} />
                        </div>
                      )}
                      <div className="review-inline-comment-form__footer">
                        <div>
                          <Button type="button" variant="pearl" size="small" onClick={closeLineComment}>
                            취소
                          </Button>
                          <Button type="submit" size="small" disabled={!lineContent.trim()}>
                            코멘트
                          </Button>
                        </div>
                      </div>
                    </form>
                  )}

                  {lineItems.length > 0 && (
                    <section className="review-line-comment-thread">
                      <strong>
                        R{lineNumber} 줄 코멘트 {lineItems.length}개
                      </strong>
                      {renderThread(true, lineItems, "line-comments")}
                    </section>
                  )}
                </div>
              );
            })}
          </div>
        </article>
      </section>

      {applied && (
        <section className="review-suggestion-section review-suggestion-section--full">
          <div className="review-section-heading">
            <div>
              <p>Applied</p>
              <h2>제안을 적용한 코드</h2>
            </div>
            <Button type="button" variant="pearl" size="small" onClick={() => setApplied(null)}>
              닫기
            </Button>
          </div>
          <div className="review-diff">
            {createDiffRows(review.code, applied.code).map((row, index) => (
              <div className={`review-diff__row review-diff__row--${row.type}`} key={index}>
                <span>{row.left}</span>
                <span>{row.right}</span>
                <code>{row.code || " "}</code>
              </div>
            ))}
          </div>
          <div className="review-applied-run">
            <textarea
              value={stdin}
              onChange={(event) => setStdin(event.target.value)}
              placeholder="stdin 입력 (선택)"
              aria-label="실행 입력"
            />
            <Button type="button" size="small" loading={isRunning} onClick={handleRunApplied}>
              적용한 코드 실행
            </Button>
            {runResult && (
              <pre className="review-applied-run__output">
                {runResult.verdict === "FINISHED"
                  ? runResult.stdout || "(출력 없음)"
                  : getVerdictLabel(runResult.verdict)}
                {runResult.stderr ? `\n[stderr]\n${runResult.stderr}` : ""}
                {runResult.message ? `\n${runResult.message}` : ""}
              </pre>
            )}
          </div>
        </section>
      )}

      <section className="review-suggestion-section review-suggestion-section--full">
        <div className="review-section-heading">
          <div>
            <p>Comments</p>
            <h2>전체 댓글</h2>
          </div>
        </div>

        {comments.length === 0 && <p className="code-review-empty">아직 댓글이 없습니다.</p>}
        {renderThread(false, comments, "comments")}

        {!isClosed && !isRequester && (
          <form className="review-inline-comment-form" onSubmit={handleAddComment}>
            <textarea
              value={commentContent}
              onChange={(event) => setCommentContent(event.target.value)}
              placeholder="전체적인 리뷰를 마크다운으로 남겨보세요"
            />
            <Button type="submit" size="small" disabled={!commentContent.trim()}>
              댓글 작성
            </Button>
          </form>
        )}

        {message && <p className="code-review-message">{message}</p>}
      </section>
    </main>
  );
}

export default CodeReviewDetailPage;
