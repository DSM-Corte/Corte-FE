import { useEffect, useState } from "react";
import { createTestCase, deleteTestCase, listTestCases, updateTestCase } from "../../api/AdminApi";
import Button from "../../components/common/Button";

function createEmptyCase(position) {
  return { input: "", expectedOutput: "", publicExample: false, position: String(position) };
}

// 한 케이스의 입력칸. 새 케이스와 기존 케이스 수정에 같이 쓴다
function TestCaseFields({ value, onChange }) {
  return (
    <div className="admin-case__fields">
      <label>
        입력
        <textarea className="input admin-case__textarea" value={value.input}
          onChange={(event) => onChange({ ...value, input: event.target.value })} />
      </label>
      <label>
        기대 출력
        <textarea className="input admin-case__textarea" value={value.expectedOutput}
          onChange={(event) => onChange({ ...value, expectedOutput: event.target.value })} />
      </label>
      <div className="admin-case__options">
        <label>
          순서
          <input className="input" type="number" min="0" required value={value.position}
            onChange={(event) => onChange({ ...value, position: event.target.value })} />
        </label>
        <label className="admin-case__check">
          <input type="checkbox" checked={value.publicExample}
            onChange={(event) => onChange({ ...value, publicExample: event.target.checked })} />
          공개 예제(사용자에게 보임)
        </label>
      </div>
    </div>
  );
}

function toRequest(value) {
  return {
    input: value.input,
    expectedOutput: value.expectedOutput,
    publicExample: value.publicExample,
    position: Number(value.position),
  };
}

// 문제 수정 화면 아래의 테스트케이스 관리. 관리자에게는 숨김 케이스까지 온다
function AdminTestCaseSection({ problemId }) {
  // { loading } → { cases } 또는 { error }
  const [result, setResult] = useState({ loading: true });
  const [reloadCount, setReloadCount] = useState(0);
  const [newCase, setNewCase] = useState(createEmptyCase(0));
  const [editingId, setEditingId] = useState(null);
  const [editingCase, setEditingCase] = useState(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    listTestCases(problemId).then(
      (page) => {
        if (ignore) return;
        // 서버 정렬과 상관없이 순서(position) → ID 순으로 보여준다
        const cases = [...page.content].sort((a, b) => a.position - b.position || a.id - b.id);
        setResult({ cases });
      },
      (error) => {
        if (!ignore) setResult({ error: error.message });
      },
    );

    return () => {
      ignore = true;
    };
  }, [problemId, reloadCount]);

  function reload() {
    setReloadCount((count) => count + 1);
  }

  // 저장·삭제 요청 하나를 처리한다. 처리 중에는 다른 버튼을 막고, 실패하면 입력값을 그대로 둔다
  async function run(action, successMessage) {
    if (busy) return false;
    setBusy(true);
    setMessage("");

    try {
      await action();
      setMessage(successMessage);
      reload();
      return true;
    } catch (error) {
      setMessage(error.message);
      return false;
    } finally {
      setBusy(false);
    }
  }

  async function handleCreate(event) {
    event.preventDefault();
    const ok = await run(() => createTestCase(problemId, toRequest(newCase)), "테스트케이스를 추가했습니다.");

    if (ok) {
      setNewCase(createEmptyCase(Number(newCase.position) + 1));
    }
  }

  async function handleUpdate(event) {
    event.preventDefault();
    const ok = await run(() => updateTestCase(problemId, editingId, toRequest(editingCase)), "테스트케이스를 저장했습니다.");

    if (ok) {
      setEditingId(null);
      setEditingCase(null);
    }
  }

  function handleDelete(testCase) {
    if (!window.confirm(`순서 ${testCase.position} 테스트케이스를 삭제할까요?`)) return;
    run(() => deleteTestCase(problemId, testCase.id), "테스트케이스를 삭제했습니다.");
  }

  function startEdit(testCase) {
    setEditingId(testCase.id);
    setEditingCase({
      input: testCase.input,
      expectedOutput: testCase.expectedOutput,
      publicExample: testCase.publicExample,
      position: String(testCase.position),
    });
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel__head">
        <h2>테스트케이스</h2>
        {result.cases && <span>{result.cases.length}개 (문제당 최대 100개)</span>}
      </div>
      <p className="admin-hint">
        채점은 출력이 바이트 단위로 정확히 같아야 정답입니다. 기대 출력 끝의 줄바꿈까지 확인해 주세요.
      </p>

      {message && <p className="admin-message" role="status">{message}</p>}
      {result.loading && <p role="status">테스트케이스를 불러오는 중입니다.</p>}
      {result.error && (
        <div className="admin-error" role="alert">
          <p>{result.error}</p>
          <Button variant="ghost" size="small" type="button" onClick={reload}>다시 불러오기</Button>
        </div>
      )}
      {result.cases && result.cases.length === 0 && <p>아직 테스트케이스가 없습니다.</p>}

      {result.cases && result.cases.length > 0 && (
        <ul className="admin-case-list">
          {result.cases.map((testCase) => (
            <li className="admin-case" key={testCase.id}>
              {editingId === testCase.id ? (
                <form onSubmit={handleUpdate}>
                  <TestCaseFields value={editingCase} onChange={setEditingCase} />
                  <div className="admin-form__actions">
                    <Button type="submit" size="small" loading={busy}>저장</Button>
                    <Button variant="ghost" size="small" type="button" disabled={busy}
                      onClick={() => { setEditingId(null); setEditingCase(null); }}>
                      취소
                    </Button>
                  </div>
                </form>
              ) : (
                <>
                  <div className="admin-case__summary">
                    <strong>순서 {testCase.position}</strong>
                    <span className={testCase.publicExample ? "admin-badge" : "admin-badge admin-badge--hidden"}>
                      {testCase.publicExample ? "공개" : "숨김"}
                    </span>
                  </div>
                  <div className="admin-case__io">
                    <pre aria-label="입력">{testCase.input}</pre>
                    <pre aria-label="기대 출력">{testCase.expectedOutput}</pre>
                  </div>
                  <div className="admin-form__actions">
                    <Button variant="ghost" size="small" type="button" disabled={busy || editingId !== null}
                      onClick={() => startEdit(testCase)}>
                      수정
                    </Button>
                    <Button variant="ghost" size="small" type="button" disabled={busy || editingId !== null}
                      onClick={() => handleDelete(testCase)}>
                      삭제
                    </Button>
                  </div>
                </>
              )}
            </li>
          ))}
        </ul>
      )}

      <form className="admin-case admin-case--new" onSubmit={handleCreate}>
        <h3>새 테스트케이스</h3>
        <TestCaseFields value={newCase} onChange={setNewCase} />
        <div className="admin-form__actions">
          <Button type="submit" size="small" loading={busy}>추가</Button>
        </div>
      </form>
    </section>
  );
}

export default AdminTestCaseSection;
