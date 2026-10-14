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
}) {
  return (
    <article className="submit-editor-panel">
      <div className="submit-toolbar">
        <label className="submit-language">
          <span>언어</span>
          <select
            className="input"
            value={language}
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
          <Button
            type="button"
            variant="pearl"
            size="medium"
            loading={isRunning}
            disabled={isSubmitting}
            onClick={onRunExamples}
          >
            {runLabel}
          </Button>
          <Button
            type="button"
            size="medium"
            loading={isSubmitting}
            disabled={isRunning}
            onClick={onSubmit}
          >
            {submitLabel}
          </Button>
        </div>
      </div>

      <CodeMirrorEditor
        value={code}
        language={language}
        onChange={onChangeCode}
      />
    </article>
  );
}

export default CodeEditorPanel;
