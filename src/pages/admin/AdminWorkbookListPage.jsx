import { useEffect, useState } from "react";
import { Link } from "react-router";
import { createWorkbook, deleteWorkbook, listWorkbooks } from "../../api/AdminApi";
import Button from "../../components/common/Button";

function AdminWorkbookListPage() {
  // { loading } → { data } 또는 { error }
  const [result, setResult] = useState({ loading: true });
  const [reloadCount, setReloadCount] = useState(0);
  const [newName, setNewName] = useState("");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    // 관리자 화면은 문제집 수가 많지 않아 한 번에 100개까지 보여준다
    listWorkbooks(0, 100).then(
      (data) => {
        if (!ignore) setResult({ data });
      },
      (error) => {
        if (!ignore) setResult({ error: error.message });
      },
    );

    return () => {
      ignore = true;
    };
  }, [reloadCount]);

  async function run(action, successMessage) {
    if (busy) return false;
    setBusy(true);
    setMessage("");

    try {
      await action();
      setMessage(successMessage);
      setReloadCount((count) => count + 1);
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
    const name = newName.trim();
    if (!name) return;

    const ok = await run(() => createWorkbook(name), `"${name}" 문제집을 만들었습니다.`);
    if (ok) setNewName("");
  }

  function handleDelete(workbook) {
    if (!window.confirm(`"${workbook.name}" 문제집을 삭제할까요? 문제 자체는 지워지지 않습니다.`)) return;
    run(() => deleteWorkbook(workbook.id), `"${workbook.name}" 문제집을 삭제했습니다.`);
  }

  const data = result.data;

  return (
    <section className="admin-panel">
      <div className="admin-panel__head">
        <h2>문제집 관리</h2>
      </div>

      <form className="admin-inline-form" onSubmit={handleCreate}>
        <label>
          새 문제집 이름
          <input className="input" required value={newName} onChange={(event) => setNewName(event.target.value)} />
        </label>
        <Button type="submit" size="small" loading={busy}>만들기</Button>
      </form>

      {message && <p className="admin-message" role="status">{message}</p>}
      {result.loading && <p role="status">문제집을 불러오는 중입니다.</p>}
      {result.error && <p className="admin-error" role="alert">{result.error}</p>}
      {data && data.content.length === 0 && <p>등록된 문제집이 없습니다.</p>}

      {data && data.content.length > 0 && (
        <div className="admin-table-wrap">
          <table className="admin-table">
            <thead>
              <tr>
                <th scope="col">이름</th>
                <th scope="col">문제 수</th>
                <th scope="col">관리</th>
              </tr>
            </thead>
            <tbody>
              {data.content.map((workbook) => (
                <tr key={workbook.id}>
                  <td>{workbook.name}</td>
                  <td>{workbook.problemCount}</td>
                  <td className="admin-table__actions">
                    <Link to={`/admin/workbooks/${workbook.id}`}>문제 관리</Link>
                    <Button variant="ghost" size="small" type="button" disabled={busy}
                      onClick={() => handleDelete(workbook)}>
                      삭제
                    </Button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  );
}

export default AdminWorkbookListPage;
