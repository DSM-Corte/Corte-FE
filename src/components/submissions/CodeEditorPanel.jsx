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
  onSaveDraft,
}) {
  return (
    <article className="submit-editor-panel">
      <div className="submit-toolbar">
        <label className="submit-language">
          <span>언어</span>
          <select
            className="input"
            value={language}
            disabled={draftBusy}
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
          {onSaveDraft && (
            <Button type="button" variant="pearl" size="medium" disabled={draftBusy} onClick={onSaveDraft}>
              임시저장
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
        readOnly={draftBusy}
      />
    </article>
  );
}

export default CodeEditorPanel;
