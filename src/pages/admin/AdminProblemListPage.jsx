import { useEffect, useState } from "react";
import { Link } from "react-router";
import { deleteProblem, formatDifficulty, listProblems } from "../../api/AdminApi";
import { ApiError } from "../../api/apiClient";
import Button from "../../components/common/Button";

const PAGE_SIZE = 20;

function AdminProblemListPage() {
  const [page, setPage] = useState(0);
  // { loading } → { data } 또는 { error }
  const [result, setResult] = useState({ loading: true });
  const [reloadCount, setReloadCount] = useState(0);
  const [deletingId, setDeletingId] = useState(null);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    listProblems(page, PAGE_SIZE).then(
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
  }, [page, reloadCount]);

  function reload() {
    setResult({ loading: true });
    setReloadCount((count) => count + 1);
  }

  async function handleDelete(problem) {
    if (!window.confirm(`#${problem.id} ${problem.title} 문제를 삭제할까요? 되돌릴 수 없습니다.`)) {
      return;
    }

    setDeletingId(problem.id);
    setMessage("");

    try {
      await deleteProblem(problem.id);
      setMessage(`#${problem.id} 문제를 삭제했습니다.`);
      reload();
    } catch (error) {
      // 제출 기록이 있는 문제는 서버가 409(J003)로 막는다
      if (error instanceof ApiError && error.status === 409) {
        setMessage("제출 기록이 있는 문제는 삭제할 수 없습니다.");
      } else {
        setMessage(error.message);
      }
    } finally {
      setDeletingId(null);
    }
  }

  const data = result.data;

  return (
    <section className="admin-panel">
      <div className="admin-panel__head">
        <h2>문제 관리</h2>
        <Link to="/admin/problems/new" className="admin-primary-link">
          새 문제
        </Link>
      </div>

      {message && <p className="admin-message" role="status">{message}</p>}

      {result.loading && <p role="status">문제를 불러오는 중입니다.</p>}

      {result.error && (
        <div className="admin-error" role="alert">
          <p>{result.error}</p>
          <Button variant="ghost" size="small" type="button" onClick={reload}>
            다시 불러오기
          </Button>
        </div>
      )}

      {data && data.content.length === 0 && <p>등록된 문제가 없습니다.</p>}

      {data && data.content.length > 0 && (
        <>
          <div className="admin-table-wrap">
            <table className="admin-table">
              <thead>
                <tr>
                  <th scope="col">번호</th>
                  <th scope="col">제목</th>
                  <th scope="col">난이도</th>
                  <th scope="col">분류</th>
                  <th scope="col">태그</th>
                  <th scope="col">관리</th>
                </tr>
              </thead>
              <tbody>
                {data.content.map((problem) => (
                  <tr key={problem.id}>
                    <td>#{problem.id}</td>
                    <td>
                      <Link to={`/problems/${problem.id}`}>{problem.title}</Link>
                    </td>
                    <td>{formatDifficulty(problem.difficulty)}</td>
                    <td>{problem.category}</td>
                    <td>{(problem.tags ?? []).join(", ")}</td>
                    <td className="admin-table__actions">
                      <Link to={`/admin/problems/${problem.id}/edit`}>수정</Link>
                      <Button
                        variant="ghost"
                        size="small"
                        type="button"
                        loading={deletingId === problem.id}
                        disabled={deletingId !== null}
                        onClick={() => handleDelete(problem)}
                      >
                        삭제
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav className="admin-pagination" aria-label="문제 페이지">
            <Button
              variant="ghost"
              size="small"
              type="button"
              disabled={page === 0}
              onClick={() => {
                setResult({ loading: true });
                setPage(page - 1);
              }}
            >
              이전
            </Button>
            <span>
              {page + 1} / {Math.max(1, data.totalPages)} 페이지 · 전체 {data.totalElements}개
            </span>
            <Button
              variant="ghost"
              size="small"
              type="button"
              disabled={page + 1 >= data.totalPages}
              onClick={() => {
                setResult({ loading: true });
                setPage(page + 1);
              }}
            >
              다음
            </Button>
          </nav>
        </>
      )}
    </section>
  );
}

export default AdminProblemListPage;
