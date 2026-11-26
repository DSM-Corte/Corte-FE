import { useEffect, useState } from "react";
import { getMyGithub, saveMyGithub } from "../../api/AdminApi";
import Button from "../../components/common/Button";

// 관리자 본인의 풀이 저장 레포 연동 정보. 연동되면 처음 맞힌 문제의 풀이가 그 레포에 저장된다
function AdminGithubPage() {
  const [loadState, setLoadState] = useState({ loading: true });
  const [form, setForm] = useState({ installationId: "", owner: "", repo: "" });
  const [isLinked, setIsLinked] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    let ignore = false;

    getMyGithub().then(
      (link) => {
        if (ignore) return;
        setForm({
          installationId: link.installationId == null ? "" : String(link.installationId),
          owner: link.owner ?? "",
          repo: link.repo ?? "",
        });
        setIsLinked(link.installationId != null && Boolean(link.owner) && Boolean(link.repo));
        setLoadState({ done: true });
      },
      (error) => {
        if (!ignore) setLoadState({ error: error.message });
      },
    );

    return () => {
      ignore = true;
    };
  }, []);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  async function handleSubmit(event) {
    event.preventDefault();
    if (isSaving) return;

    setIsSaving(true);
    setMessage("");

    try {
      await saveMyGithub({
        installationId: Number(form.installationId),
        owner: form.owner.trim(),
        repo: form.repo.trim(),
      });
      setIsLinked(true);
      setMessage("연동 정보를 저장했습니다.");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  return (
    <section className="admin-panel">
      <div className="admin-panel__head">
        <h2>GitHub 연동</h2>
        {loadState.done && (
          <span className={isLinked ? "admin-badge" : "admin-badge admin-badge--hidden"}>
            {isLinked ? "연동됨" : "연동 안 됨"}
          </span>
        )}
      </div>
      <p className="admin-hint">
        GitHub App을 레포에 설치한 뒤 설치 ID와 레포 주인(owner), 레포 이름을 입력하세요.
        연동되면 처음 맞힌 문제의 풀이가 그 레포에 자동 저장됩니다.
      </p>

      {loadState.loading && <p role="status">연동 정보를 불러오는 중입니다.</p>}
      {loadState.error && <p className="admin-error" role="alert">{loadState.error}</p>}

      {loadState.done && (
        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="admin-form__grid">
            <label>
              설치 ID
              <input className="input" type="number" min="1" required value={form.installationId}
                onChange={(event) => updateField("installationId", event.target.value)} />
            </label>
            <label>
              owner
              <input className="input" required value={form.owner}
                onChange={(event) => updateField("owner", event.target.value)} />
            </label>
            <label>
              repo
              <input className="input" required value={form.repo}
                onChange={(event) => updateField("repo", event.target.value)} />
            </label>
          </div>
          {message && <p className="admin-message" role="status">{message}</p>}
          <div className="admin-form__actions">
            <Button type="submit" loading={isSaving}>저장</Button>
          </div>
        </form>
      )}
    </section>
  );
}

export default AdminGithubPage;
