import { useEffect, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { BOARD_POST_TYPES, createBoardPost } from "../api/BoardApi";
import { getProblemList } from "../api/ProblemApi";
import CodeRunModal from "../components/community/CodeRunModal";
import MarkdownPreview from "../components/community/MarkdownPreview";
import MarkdownToolbar from "../components/community/MarkdownToolbar";
import "./CommunityWritePage.css";

const IMAGE_UPLOAD_MAX_BYTES = 3 * 1024 * 1024;

const starterMarkdown = `# COTRE 풀이 기록

문제를 풀면서 접근 방식, 막혔던 부분, 개선할 수 있는 부분을 정리해보세요.

## 접근 방식

- 핵심 아이디어:
- 시간 복잡도:
- 다시 확인할 부분:

## 실행 가능한 코드

\`\`\`python
def greet(name):
    return f"Hello, {name}! Welcome to COTRE."

print(greet("Developer"))
\`\`\`

코드블록의 언어가 \`python\`, \`py\`, \`javascript\`, \`js\`이면 미리보기에서 실행할 수 있습니다.
`;

function getInsertion(type, selectedText) {
  const text = selectedText || "";

  const insertionMap = {
    h1: {
      value: `# ${text || "큰 제목"}`,
      selectStart: 2,
      selectLength: text ? 0 : 4,
    },
    h2: {
      value: `## ${text || "중간 제목"}`,
      selectStart: 3,
      selectLength: text ? 0 : 5,
    },
    h3: {
      value: `### ${text || "작은 제목"}`,
      selectStart: 4,
      selectLength: text ? 0 : 5,
    },
    bold: {
      value: `**${text || "굵은 글자"}**`,
      selectStart: 2,
      selectLength: text ? 0 : 5,
    },
    italic: {
      value: `*${text || "기울임 글자"}*`,
      selectStart: 1,
      selectLength: text ? 0 : 6,
    },
    divider: {
      value: "\n\n---\n\n",
      selectStart: 5,
      selectLength: 0,
    },
    link: {
      value: `[${text || "링크 텍스트"}](https://example.com)`,
      selectStart: 1,
      selectLength: text ? 0 : 6,
    },
    image: {
      value: `![${text || "이미지 설명"}](https://example.com/image.png)`,
      selectStart: 2,
      selectLength: text ? 0 : 6,
    },
    code: {
      value: `\n\n\`\`\`javascript\n${text || "console.log(\"Hello COTRE\");"}\n\`\`\`\n\n`,
      selectStart: 16,
      selectLength: text ? 0 : 27,
    },
    list: {
      value: text
        ? text
            .split("\n")
            .map((line) => `- ${line}`)
            .join("\n")
        : "- 첫 번째 항목\n- 두 번째 항목",
      selectStart: 2,
      selectLength: text ? 0 : 6,
    },
    quote: {
      value: text
        ? text
            .split("\n")
            .map((line) => `> ${line}`)
            .join("\n")
        : "> 인용문을 작성하세요.",
      selectStart: 2,
      selectLength: text ? 0 : 9,
    },
  };

  return insertionMap[type] ?? { value: text, selectStart: 0, selectLength: 0 };
}

function CommunityWritePage() {
  const navigate = useNavigate();
  const textareaRef = useRef(null);
  const imageInputRef = useRef(null);
  const historyRef = useRef({
    past: [],
    future: [],
  });
  const [title, setTitle] = useState("코드 리뷰 게시글 작성");
  const [postType, setPostType] = useState("general");
  const [relatedProblemId, setRelatedProblemId] = useState("");
  const [relatedProblem, setRelatedProblem] = useState(null);
  const [problemKeyword, setProblemKeyword] = useState("");
  const [problemResults, setProblemResults] = useState([]);
  const [isSearchingProblems, setIsSearchingProblems] = useState(false);
  const [markdown, setMarkdown] = useState(starterMarkdown);
  const [viewMode, setViewMode] = useState("editor");
  const [message, setMessage] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [activeSnippet, setActiveSnippet] = useState(null);
  const isProblemPostType = postType === "problem";

  useEffect(() => {
    if (!isProblemPostType) {
      return;
    }

    let ignore = false;

    async function fetchProblemResults() {
      setIsSearchingProblems(true);

      const nextProblemResults = await getProblemList({
        keyword: problemKeyword,
        pageSize: 5,
        page: 1,
        sortKey: "id",
        sortDirection: "asc",
      });

      if (!ignore) {
        setProblemResults(nextProblemResults.items);
        setIsSearchingProblems(false);
      }
    }

    fetchProblemResults();

    return () => {
      ignore = true;
    };
  }, [isProblemPostType, problemKeyword]);

  function readImageAsDataUrl(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();

      reader.addEventListener("load", () => {
        resolve(String(reader.result ?? ""));
      });
      reader.addEventListener("error", () => {
        reject(new Error("이미지를 불러오지 못했습니다."));
      });
      reader.readAsDataURL(file);
    });
  }

  function focusEditor(selectionStart, selectionEnd = selectionStart) {
    window.requestAnimationFrame(() => {
      const textarea = textareaRef.current;

      if (!textarea) {
        return;
      }

      textarea.focus();
      textarea.setSelectionRange(selectionStart, selectionEnd);
    });
  }

  function getCurrentEditorSnapshot() {
    const textarea = textareaRef.current;

    return {
      value: markdown,
      selectionStart: textarea?.selectionStart ?? markdown.length,
      selectionEnd: textarea?.selectionEnd ?? markdown.length,
    };
  }

  function pushEditorHistory(snapshot = getCurrentEditorSnapshot()) {
    historyRef.current.past = [...historyRef.current.past, snapshot].slice(-80);
    historyRef.current.future = [];
  }

  function restoreEditorSnapshot(snapshot) {
    setMarkdown(snapshot.value);
    focusEditor(snapshot.selectionStart, snapshot.selectionEnd);
  }

  function handleMarkdownChange(event) {
    const nextMarkdown = event.target.value;

    if (nextMarkdown === markdown) {
      return;
    }

    pushEditorHistory({
      value: markdown,
      selectionStart: Math.min(event.target.selectionStart, markdown.length),
      selectionEnd: Math.min(event.target.selectionEnd, markdown.length),
    });
    setMarkdown(nextMarkdown);
  }

  function undoMarkdown() {
    const previousSnapshot = historyRef.current.past.at(-1);

    if (!previousSnapshot) {
      return;
    }

    historyRef.current.past = historyRef.current.past.slice(0, -1);
    historyRef.current.future = [
      getCurrentEditorSnapshot(),
      ...historyRef.current.future,
    ].slice(0, 80);
    restoreEditorSnapshot(previousSnapshot);
  }

  function redoMarkdown() {
    const nextSnapshot = historyRef.current.future[0];

    if (!nextSnapshot) {
      return;
    }

    historyRef.current.future = historyRef.current.future.slice(1);
    historyRef.current.past = [
      ...historyRef.current.past,
      getCurrentEditorSnapshot(),
    ].slice(-80);
    restoreEditorSnapshot(nextSnapshot);
  }

  function handleMarkdownKeyDown(event) {
    const isUndo = (event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "z";
    const isRedo =
      (event.ctrlKey || event.metaKey) &&
      (event.key.toLowerCase() === "y" ||
        (event.shiftKey && event.key.toLowerCase() === "z"));

    if (isRedo) {
      event.preventDefault();
      redoMarkdown();
      return;
    }

    if (isUndo) {
      event.preventDefault();
      undoMarkdown();
    }
  }

  function handleInsert(type) {
    const textarea = textareaRef.current;

    if (!textarea) {
      return;
    }

    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const selectedText = markdown.slice(start, end);
    const insertion = getInsertion(type, selectedText);
    const nextMarkdown =
      markdown.slice(0, start) + insertion.value + markdown.slice(end);
    const nextSelectionStart = start + insertion.selectStart;
    const nextSelectionEnd = nextSelectionStart + insertion.selectLength;

    pushEditorHistory({
      value: markdown,
      selectionStart: start,
      selectionEnd: end,
    });
    setMarkdown(nextMarkdown);
    focusEditor(nextSelectionStart, nextSelectionEnd);
  }

  function insertMarkdownAtCursor(value) {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? markdown.length;
    const end = textarea?.selectionEnd ?? markdown.length;
    const nextMarkdown = markdown.slice(0, start) + value + markdown.slice(end);
    const nextSelection = start + value.length;

    pushEditorHistory({
      value: markdown,
      selectionStart: start,
      selectionEnd: end,
    });
    setMarkdown(nextMarkdown);
    focusEditor(nextSelection);
  }

  function handleUploadImageClick() {
    imageInputRef.current?.click();
  }

  function handlePostTypeChange(event) {
    const nextPostType = event.target.value;

    setPostType(nextPostType);

    if (nextPostType !== "problem") {
      setRelatedProblemId("");
      setRelatedProblem(null);
      setProblemKeyword("");
    }
  }

  function handleProblemKeywordChange(event) {
    setProblemKeyword(event.target.value);
  }

  function handleSelectProblem(problem) {
    setRelatedProblemId(String(problem.id));
    setRelatedProblem(problem);
    setProblemKeyword(`${problem.id}. ${problem.title}`);
  }

  function handleClearRelatedProblem() {
    setRelatedProblemId("");
    setRelatedProblem(null);
    setProblemKeyword("");
  }

  async function handleImageUpload(event) {
    const files = Array.from(event.target.files ?? []);

    if (!files.length) {
      return;
    }

    const invalidFile = files.find((file) => !file.type.startsWith("image/"));

    if (invalidFile) {
      setMessage("이미지 파일만 업로드할 수 있습니다.");
      event.target.value = "";
      return;
    }

    const oversizedFile = files.find((file) => file.size > IMAGE_UPLOAD_MAX_BYTES);

    if (oversizedFile) {
      setMessage("이미지는 3MB 이하만 업로드할 수 있습니다.");
      event.target.value = "";
      return;
    }

    try {
      const imageMarkdownList = await Promise.all(
        files.map(async (file) => {
          const dataUrl = await readImageAsDataUrl(file);
          const altText = file.name.replace(/\.[^.]+$/, "") || "업로드 이미지";

          return `![${altText}](${dataUrl})`;
        }),
      );

      insertMarkdownAtCursor(`\n\n${imageMarkdownList.join("\n\n")}\n\n`);
      setMessage(`${files.length}개 이미지를 본문에 추가했습니다.`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      event.target.value = "";
    }
  }

  async function handleSubmit() {
    setIsSaving(true);
    setMessage("");

    try {
      const post = await createBoardPost({
        title,
        markdown,
        relatedProblemId: isProblemPostType ? relatedProblemId : "",
        type: postType,
      });
      navigate(`/community/posts/${post.id}`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <main className="community-write-page">
      <section className="community-write-hero">
        <p className="community-write-hero__eyebrow">Community Editor</p>
        <h1>게시글 작성</h1>
        <p>
          마크다운으로 풀이 과정을 남기고, 실행 가능한 코드블록은 미리보기에서
          바로 확인할 수 있습니다.
        </p>
      </section>

      <section className="community-write-shell">
        <label className="community-title-field">
          <span>제목</span>
          <input
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="게시글 제목을 입력하세요."
          />
        </label>

        <div className="community-write-meta-fields">
          <label>
            <span>글 종류</span>
            <select
              value={postType}
              onChange={handlePostTypeChange}
            >
              {BOARD_POST_TYPES.map((type) => (
                <option value={type.key} key={type.key}>
                  {type.label}
                </option>
              ))}
            </select>
          </label>

          {isProblemPostType && (
            <div className="community-related-problem-field">
              <span>관련 문제</span>
              <div className="community-problem-search">
                <div className="community-problem-search__input">
                  <svg aria-hidden="true" fill="none" viewBox="0 0 24 24">
                    <circle cx="11" cy="11" r="7" />
                    <path d="m16 16 4 4" />
                  </svg>
                  <input
                    value={problemKeyword}
                    onChange={handleProblemKeywordChange}
                    placeholder="문제 번호 또는 제목 검색"
                    aria-label="관련 문제 검색"
                  />
                </div>

                {relatedProblem && (
                  <div className="community-selected-problem">
                    <span>
                      #{relatedProblem.id} {relatedProblem.title}
                    </span>
                    <button
                      type="button"
                      onClick={handleClearRelatedProblem}
                      aria-label="관련 문제 제거"
                    >
                      ×
                    </button>
                  </div>
                )}

                {!relatedProblem && (
                  <div className="community-problem-results">
                    {isSearchingProblems ? (
                      <p>문제를 검색하는 중입니다.</p>
                    ) : problemResults.length === 0 ? (
                      <p>검색된 문제가 없습니다.</p>
                    ) : (
                      problemResults.map((problem) => (
                        <button
                          type="button"
                          onClick={() => handleSelectProblem(problem)}
                          key={problem.id}
                        >
                          <strong>
                            {problem.id}. {problem.title}
                          </strong>
                          <small>{problem.tier}</small>
                        </button>
                      ))
                    )}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        <MarkdownToolbar
          viewMode={viewMode}
          onChangeViewMode={setViewMode}
          onInsert={handleInsert}
          onUploadImage={handleUploadImageClick}
          onSubmit={handleSubmit}
          isSaving={isSaving}
        />

        <input
          ref={imageInputRef}
          className="community-image-input"
          type="file"
          accept="image/*"
          multiple
          onChange={handleImageUpload}
          aria-label="이미지 업로드"
        />

        {message && <p className="community-write-message">{message}</p>}

        <div
          className={`community-editor-grid community-editor-grid--${viewMode}`}
        >
          <section className="community-editor-pane community-editor-pane--write">
            <textarea
              ref={textareaRef}
              value={markdown}
              onChange={handleMarkdownChange}
              onKeyDown={handleMarkdownKeyDown}
              spellCheck="false"
              aria-label="마크다운 본문"
            />
          </section>

          <section className="community-editor-pane community-editor-pane--preview">
            <MarkdownPreview
              markdown={markdown}
              onRunSnippet={setActiveSnippet}
            />
          </section>
        </div>
      </section>

      {activeSnippet && (
        <CodeRunModal
          snippet={activeSnippet}
          onClose={() => setActiveSnippet(null)}
        />
      )}
    </main>
  );
}

export default CommunityWritePage;
