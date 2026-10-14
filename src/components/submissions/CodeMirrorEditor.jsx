import CodeMirror from "@uiw/react-codemirror";
import { acceptCompletion, autocompletion } from "@codemirror/autocomplete";
import { indentWithTab } from "@codemirror/commands";
import { javascript } from "@codemirror/lang-javascript";
import { python } from "@codemirror/lang-python";
import { oneDark } from "@codemirror/theme-one-dark";
import { keymap } from "@codemirror/view";
import { useMemo } from "react";

const completionKeymap = keymap.of([
  {
    key: "Tab",
    run: acceptCompletion,
  },
  indentWithTab,
]);

function getLanguageExtensions(language) {
  if (language === "python") {
    return [python()];
  }

  return [javascript()];
}

function CodeMirrorEditor({ value, language, onChange }) {
  const extensions = useMemo(
    () => [
      autocompletion({ defaultKeymap: false }),
      completionKeymap,
      ...getLanguageExtensions(language),
    ],
    [language],
  );

  return (
    <div className="code-editor-shell">
      <CodeMirror
        value={value}
        height="var(--editor-height)"
        theme={oneDark}
        extensions={extensions}
        basicSetup={{
          autocompletion: false,
          bracketMatching: true,
          closeBrackets: true,
          foldGutter: true,
          highlightActiveLine: true,
          highlightActiveLineGutter: true,
          highlightSelectionMatches: true,
          lineNumbers: true,
        }}
        className="code-editor"
        aria-label="제출 코드"
        onChange={onChange}
      />
    </div>
  );
}

export default CodeMirrorEditor;
