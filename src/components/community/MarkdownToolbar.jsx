import Button from "../common/Button";

const toolbarGroups = [
  [
    { key: "h1", label: "H1", title: "큰 제목" },
    { key: "h2", label: "H2", title: "중간 제목" },
    { key: "h3", label: "H3", title: "작은 제목" },
  ],
  [
    { key: "bold", label: "B", title: "굵게" },
    { key: "italic", label: "I", title: "기울임" },
    { key: "divider", label: "─", title: "구분선" },
  ],
  [
    { key: "link", label: "Link", title: "링크" },
    { key: "image", label: "Img", title: "이미지" },
    { key: "code", label: "</>", title: "코드블록" },
  ],
  [
    { key: "list", label: "List", title: "목록" },
    { key: "quote", label: "\"", title: "인용" },
  ],
];

function MarkdownToolbar({
  viewMode,
  onChangeViewMode,
  onInsert,
  onSubmit,
  onUploadImage,
  isSaving,
}) {
  return (
    <div className="board-editor-toolbar" aria-label="마크다운 편집 도구">
      <div className="board-editor-toolbar__tools">
        {toolbarGroups.map((group, groupIndex) => (
          <div className="board-editor-toolbar__group" key={groupIndex}>
            {group.map((tool) => (
              <button
                type="button"
                className="board-editor-tool"
                title={tool.title}
                aria-label={tool.title}
                onClick={() =>
                  tool.key === "image" ? onUploadImage() : onInsert(tool.key)
                }
                key={tool.key}
              >
                {tool.label}
              </button>
            ))}
          </div>
        ))}
      </div>

      <div className="board-editor-toolbar__actions">
        <div className="board-editor-view-toggle" role="tablist" aria-label="작성 보기">
          <button
            type="button"
            className={viewMode === "editor" ? "is-active" : ""}
            aria-selected={viewMode === "editor"}
            role="tab"
            onClick={() => onChangeViewMode("editor")}
          >
            Editor
          </button>
          <button
            type="button"
            className={viewMode === "preview" ? "is-active" : ""}
            aria-selected={viewMode === "preview"}
            role="tab"
            onClick={() => onChangeViewMode("preview")}
          >
            Preview
          </button>
        </div>

        <Button
          type="button"
          size="medium"
          loading={isSaving}
          onClick={onSubmit}
          className="board-editor-submit"
        >
          제출하기
        </Button>
      </div>
    </div>
  );
}

export default MarkdownToolbar;
