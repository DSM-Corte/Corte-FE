import Button from "../common/Button";
import CodeMirrorEditor from "./CodeMirrorEditor";

function CodeEditorPanel({
  code,
  language,
  languageOptions,
  isRunning,
  isSubmitting,
  runLabel = "예제 실행",
  submitLabel = "제출",
  onChangeCode,
  onChangeLanguage,
  onRunExamples,
  onSubmit,
  draftStatus,
  draftBusy,
  draftReadOnly,
  draftLanguageLocked,
  onRetryDraft,
  onRetrySave,
}) {
  return (
    <article className="submit-editor-panel">
      <div className="submit-toolbar">
        <label className="submit-language">
          <span>언어</span>
          <select
            className="input"
            value={language}
            disabled={draftBusy || draftLanguageLocked}
            onChange={(event) => onChangeLanguage(event.target.value)}
          >
            {languageOptions.map((option) => (
              <option value={option.key} key={option.key}>
                {option.label}
              </option>
            ))}
          </select>
        </label>

        <div className="submit-toolbar__actions">
          {(onRetryDraft || onRetrySave) && (
            <Button type="button" variant="pearl" size="medium" onClick={onRetryDraft ?? onRetrySave}>
              {onRetryDraft ? "다시 불러오기" : "저장 재시도"}
            </Button>
          )}
          <Button
            type="button"
            variant="pearl"
            size="medium"
            loading={isRunning}
            disabled={isSubmitting || draftBusy}
            onClick={onRunExamples}
          >
            {runLabel}
          </Button>
          <Button
            type="button"
            size="medium"
            loading={isSubmitting}
            disabled={isRunning || draftBusy}
            onClick={onSubmit}
          >
            {submitLabel}
          </Button>
        </div>
      </div>

      {draftStatus && <p role="status">{draftStatus}</p>}
      <CodeMirrorEditor
        value={code}
        language={language}
        onChange={onChangeCode}
        readOnly={draftReadOnly}
      />
    </article>
  );
}

export default CodeEditorPanel;
