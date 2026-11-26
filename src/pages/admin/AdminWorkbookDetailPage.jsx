import { useEffect, useState } from "react";
import { Link, useParams } from "react-router";
import { addWorkbookProblem, getWorkbook, removeWorkbookProblem, renameWorkbook } from "../../api/AdminApi";
import { ApiError } from "../../api/apiClient";
import Button from "../../components/common/Button";

function AdminWorkbookDetailPage() {
  const { id } = useParams();
  // { loading } → { workbook } 또는 { error }
  const [result, setResult] = useState({ loading: true });
  const [reloadCount, setReloadCount] = useState(0);
  const [name, setName] = useState("");
  const [problemId, setProblemId] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    getWorkbook(id).then(
      (workbook) => {
        if (ignore) return;
        setResult({ workbook });
        setName(workbook.name);
      },
      (error) => {
        if (!ignore) setResult({ error: error.message });
      },
    );

    return () => {
      ignore = true;
    };
  }, [id, reloadCount]);

  async function run(action, successMessage, conflictMessage) {
    if (busy) return false;
    setBusy(true);
    setMessage("");

    try {
      await action();
      setMessage(successMessage);
      setReloadCount((count) => count + 1);
      return true;
    } catch (error) {
      if (conflictMessage && error instanceof ApiError && error.status === 409) {
        setMessage(conflictMessage);
      } else if (error instanceof ApiError && error.status === 404) {
        setMessage("문제를 찾을 수 없습니다. 번호를 확인해 주세요.");
      } else {
        setMessage(error.message);
      }
      return false;
    } finally {
      setBusy(false);
    }
  }

  function handleRename(event) {
    event.preventDefault();
    const nextName = name.trim();
    if (!nextName) return;
    run(() => renameWorkbook(id, nextName), "이름을 바꿨습니다.");
  }

  async function handleAdd(event) {
    event.preventDefault();
    const ok = await run(
      () => addWorkbookProblem(id, Number(problemId)),
      `#${problemId} 문제를 넣었습니다.`,
      "이미 문제집에 있는 문제입니다.",
    );
    if (ok) setProblemId("");
  }

  function handleRemove(problem) {
    run(() => removeWorkbookProblem(id, problem.id), `#${problem.id} 문제를 뺐습니다.`);
  }

  if (result.loading) {
    return <section className="admin-panel"><p role="status">문제집을 불러오는 중입니다.</p></section>;
  }

  if (result.error) {
    return (
      <section className="admin-panel">
        <p className="admin-error" role="alert">{result.error}</p>
        <Link to="/admin/workbooks">문제집 목록으로</Link>
      </section>
    );
  }

  const { workbook } = result;

  return (
    <section className="admin-panel">
      <div className="admin-panel__head">
        <h2>{workbook.name}</h2>
        <Link to="/admin/workbooks">목록으로</Link>
      </div>

      <form className="admin-inline-form" onSubmit={handleRename}>
        <label>
          문제집 이름
          <input className="input" required value={name} onChange={(event) => setName(event.target.value)} />
        </label>
        <Button type="submit" size="small" variant="ghost" loading={busy}>이름 바꾸기</Button>
      </form>

      <form className="admin-inline-form" onSubmit={handleAdd}>
        <label>
          넣을 문제 번호
          <input className="input" type="number" min="1" required value={problemId}
            onChange={(event) => setProblemId(event.target.value)} />
        </label>
        <Button type="submit" size="small" loading={busy}>문제 넣기</Button>
      </form>

      {message && <p className="admin-message" role="status">{message}</p>}

      <h3>문제 {workbook.problemCount}개</h3>
      {workbook.problems.content.length === 0 ? (
        <p>아직 문제가 없습니다.</p>
      ) : (
        <ul className="admin-workbook-problems">
          {workbook.problems.content.map((problem) => (
            <li key={problem.id}>
              <Link to={`/problems/${problem.id}`}>#{problem.id} {problem.title}</Link>
              <Button variant="ghost" size="small" type="button" disabled={busy}
                onClick={() => handleRemove(problem)}>
                빼기
              </Button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}

export default AdminWorkbookDetailPage;
