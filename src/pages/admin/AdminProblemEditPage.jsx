import { useEffect, useState } from "react";
import { Link, useNavigate, useParams } from "react-router";
import {
  createProblem,
  formatDifficulty,
  getProblem,
  PROBLEM_DIFFICULTIES,
  updateProblem,
} from "../../api/AdminApi";
import { judgeLanguageOptions } from "../../api/JudgeApi";
import Button from "../../components/common/Button";
import ProblemStatement from "../../components/problems/ProblemStatement";
import AdminTestCaseSection from "./AdminTestCaseSection";

// 새 문제는 실제 문제 화면이 나눠 보여주는 제목줄 틀을 미리 채워 둔다
const DESCRIPTION_TEMPLATE = `문제 설명을 적어주세요.

입력
입력 형식을 적어주세요.

출력
출력 형식을 적어주세요.

예제 입력 1
\`\`\`
1 2
\`\`\`

예제 출력 1
\`\`\`
3
\`\`\``;

function createEmptyForm() {
  return {
    title: "",
    category: "",
    tags: "",
    difficulty: "UNRATED",
    timeLimitMs: "1000",
    memoryLimitMb: "256",
    languageMemoryLimits: {},
    description: DESCRIPTION_TEMPLATE,
  };
}

// 서버 응답 → 화면 입력값
function toForm(problem) {
  const languageMemoryLimits = {};

  Object.entries(problem.languageMemoryLimitsMb ?? {}).forEach(([language, limit]) => {
    languageMemoryLimits[language] = String(limit);
  });

  return {
    title: problem.title,
    category: problem.category,
    tags: (problem.tags ?? []).join(", "),
    difficulty: problem.difficulty ?? "UNRATED",
    timeLimitMs: String(problem.timeLimitMs),
    memoryLimitMb: String(problem.memoryLimitMb),
    languageMemoryLimits,
    description: problem.description,
  };
}

// 화면 입력값 → 서버 요청 본문. 비워 둔 언어별 메모리는 보내지 않는다(빈 객체면 서버가 언어별 설정을 지운다)
function toRequest(form) {
  const languageMemoryLimitsMb = {};

  Object.entries(form.languageMemoryLimits).forEach(([language, limit]) => {
    if (String(limit).trim()) {
      languageMemoryLimitsMb[language] = Number(limit);
    }
  });

  return {
    title: form.title.trim(),
    category: form.category.trim(),
    tags: form.tags.split(",").map((tag) => tag.trim()).filter(Boolean),
    difficulty: form.difficulty,
    timeLimitMs: Number(form.timeLimitMs),
    memoryLimitMb: Number(form.memoryLimitMb),
    languageMemoryLimitsMb,
    description: form.description,
  };
}

function AdminProblemEditPage() {
  const { id } = useParams();
  const isNew = !id;
  const navigate = useNavigate();
  const [form, setForm] = useState(createEmptyForm);
  const [loadState, setLoadState] = useState(isNew ? { done: true } : { loading: true });
  const [isSaving, setIsSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    if (isNew) {
      return undefined;
    }

    let ignore = false;

    getProblem(id).then(
      (problem) => {
        if (ignore) return;
        setForm(toForm(problem));
        setLoadState({ done: true });
      },
      (error) => {
        if (!ignore) setLoadState({ error: error.message });
      },
    );

    return () => {
      ignore = true;
    };
  }, [id, isNew]);

  function updateField(key, value) {
    setForm((current) => ({ ...current, [key]: value }));
  }

  function updateLanguageLimit(language, value) {
    setForm((current) => ({
      ...current,
      languageMemoryLimits: { ...current.languageMemoryLimits, [language]: value },
    }));
  }

  async function handleSubmit(event) {
    event.preventDefault();

    if (isSaving) {
      return;
    }

    setIsSaving(true);
    setMessage("");

    try {
      if (isNew) {
        const created = await createProblem(toRequest(form));
        // 테스트케이스를 이어서 넣을 수 있게 수정 화면으로 보낸다
        navigate(`/admin/problems/${created.id}/edit`, { replace: true });
        return;
      }

      const updated = await updateProblem(id, toRequest(form));
      setForm(toForm(updated));
      setMessage("저장했습니다.");
    } catch (error) {
      // 실패하면 입력값은 그대로 두고 서버 문구를 보여준다
      setMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  if (loadState.loading) {
    return <section className="admin-panel"><p role="status">문제를 불러오는 중입니다.</p></section>;
  }

  if (loadState.error) {
    return (
      <section className="admin-panel">
        <p className="admin-error" role="alert">{loadState.error}</p>
        <Link to="/admin/problems">문제 목록으로</Link>
      </section>
    );
  }

  return (
    <>
      <section className="admin-panel">
        <div className="admin-panel__head">
          <h2>{isNew ? "새 문제" : `#${id} 문제 수정`}</h2>
          <Link to="/admin/problems">목록으로</Link>
        </div>

        <form className="admin-form" onSubmit={handleSubmit}>
          <div className="admin-form__grid">
            <label>
              제목
              <input className="input" required maxLength={200} value={form.title}
                onChange={(event) => updateField("title", event.target.value)} />
            </label>
            <label>
              분류
              <input className="input" required maxLength={50} value={form.category}
                onChange={(event) => updateField("category", event.target.value)} />
            </label>
            <label>
              태그 (쉼표로 구분, 최대 10개)
              <input className="input" value={form.tags} placeholder="구현, 수학"
                onChange={(event) => updateField("tags", event.target.value)} />
            </label>
            <label>
              난이도
              <select className="input" value={form.difficulty}
                onChange={(event) => updateField("difficulty", event.target.value)}>
                {PROBLEM_DIFFICULTIES.map((difficulty) => (
                  <option value={difficulty} key={difficulty}>{formatDifficulty(difficulty)}</option>
                ))}
              </select>
            </label>
            <label>
              시간 제한 (ms)
              <input className="input" type="number" required min="1" value={form.timeLimitMs}
                onChange={(event) => updateField("timeLimitMs", event.target.value)} />
            </label>
            <label>
              메모리 제한 (MB)
              <input className="input" type="number" required min="1" value={form.memoryLimitMb}
                onChange={(event) => updateField("memoryLimitMb", event.target.value)} />
            </label>
          </div>

          <fieldset className="admin-form__languages">
            <legend>언어별 메모리 제한 (MB, 6~1024, 비우면 기본값)</legend>
            {judgeLanguageOptions.map((language) => (
              <label key={language.key}>
                {language.label}
                <input className="input" type="number" min="6" max="1024"
                  value={form.languageMemoryLimits[language.key] ?? ""}
                  onChange={(event) => updateLanguageLimit(language.key, event.target.value)} />
              </label>
            ))}
          </fieldset>

          <div className="admin-form__description">
            <label>
              설명
              <textarea className="input admin-form__textarea" required maxLength={20000}
                value={form.description}
                onChange={(event) => updateField("description", event.target.value)} />
            </label>
            <div className="admin-form__preview" aria-label="설명 미리보기">
              <p className="admin-form__preview-title">미리보기</p>
              <ProblemStatement description={form.description} />
            </div>
          </div>

          {message && <p className="admin-message" role="status">{message}</p>}

          <div className="admin-form__actions">
            <Button type="submit" loading={isSaving}>
              {isNew ? "문제 만들기" : "저장"}
            </Button>
          </div>
        </form>
      </section>

      {!isNew && <AdminTestCaseSection problemId={id} />}
    </>
  );
}

export default AdminProblemEditPage;
