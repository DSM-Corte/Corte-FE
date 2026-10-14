import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router";
import { isAuthenticated } from "../api/AuthApi";
import { createCustomProblemSet } from "../api/ProblemSetApi";
import { getProblemCatalog } from "../api/ProblemApi";
import Button from "../components/common/Button";
import Input from "../components/common/Input";
import TierBadge from "../components/problems/TierBadge";
import "./ProblemSetsPage.css";

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function ProblemSetCreatePage() {
  const navigate = useNavigate();
  const [problems, setProblems] = useState([]);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [keyword, setKeyword] = useState("");
  const [selectedProblemIds, setSelectedProblemIds] = useState(() => new Set());
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    if (!isAuthenticated()) {
      navigate("/login", {
        replace: true,
        state: {
          from: "/problem-sets/new",
          message: "문제집을 만들려면 먼저 로그인해주세요.",
        },
      });
      return;
    }

    let ignore = false;

    async function fetchProblems() {
      const result = await getProblemCatalog();

      if (ignore) {
        return;
      }

      setProblems(result);
      setIsLoading(false);
    }

    fetchProblems();

    return () => {
      ignore = true;
    };
  }, [navigate]);

  const filteredProblems = useMemo(() => {
    const normalizedKeyword = normalize(keyword);

    if (!normalizedKeyword) {
      return problems;
    }

    return problems.filter(
      (problem) =>
        String(problem.id).includes(normalizedKeyword) ||
        normalize(problem.title).includes(normalizedKeyword) ||
        normalize(problem.tier).includes(normalizedKeyword) ||
        problem.tags.some((tag) => normalize(tag).includes(normalizedKeyword)),
    );
  }, [keyword, problems]);

  const selectedProblems = useMemo(() => {
    return problems.filter((problem) => selectedProblemIds.has(problem.id));
  }, [problems, selectedProblemIds]);

  function toggleProblem(problemId) {
    setSelectedProblemIds((currentProblemIds) => {
      const nextProblemIds = new Set(currentProblemIds);

      if (nextProblemIds.has(problemId)) {
        nextProblemIds.delete(problemId);
        return nextProblemIds;
      }

      nextProblemIds.add(problemId);
      return nextProblemIds;
    });
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");

    try {
      await createCustomProblemSet({
        title,
        description,
        problemIds: [...selectedProblemIds],
      });
      navigate("/problem-sets");
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <main className="problem-sets-state">문제집 생성 화면을 불러오는 중입니다.</main>;
  }

  return (
    <main className="problem-sets-page">
      <section className="problem-sets-hero problem-sets-hero--with-action">
        <div>
          <Link to="/problem-sets" className="problem-sets-back">
            문제집으로 돌아가기
          </Link>
          <p className="problem-sets-hero__eyebrow">New Problem Set</p>
          <h1>직접 고른 문제로 문제집을 만드세요</h1>
          <p>
            제목과 설명을 적고 풀고 싶은 문제를 선택하면 내 문제집 목록에 바로
            추가됩니다.
          </p>
        </div>
      </section>

      <form className="problem-set-create" onSubmit={handleSubmit}>
        <section className="problem-set-create-card">
          <h2>문제집 정보</h2>
          <label>
            <span>제목</span>
            <Input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="예: 그래프 복습 문제집"
              required
            />
          </label>
          <label>
            <span>설명</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="이 문제집을 어떤 목적으로 풀지 적어주세요."
            />
          </label>

          <div className="problem-set-create-summary">
            <span>선택한 문제</span>
            <strong>{selectedProblems.length.toLocaleString()}개</strong>
          </div>

          <div className="problem-set-selected-list">
            {selectedProblems.length === 0 ? (
              <p>아직 선택한 문제가 없습니다.</p>
            ) : (
              selectedProblems.map((problem) => (
                <button
                  type="button"
                  onClick={() => toggleProblem(problem.id)}
                  key={problem.id}
                >
                  #{problem.id} {problem.title}
                </button>
              ))
            )}
          </div>

          {message && <p className="problem-set-create-message">{message}</p>}

          <div className="problem-set-create-actions">
            <Link to="/problem-sets">취소</Link>
            <Button type="submit" loading={isSaving}>
              문제집 만들기
            </Button>
          </div>
        </section>

        <section className="problem-set-picker">
          <div className="problem-set-picker__head">
            <div>
              <h2>문제 선택</h2>
              <p>문제 번호, 제목, 난이도, 태그로 검색할 수 있습니다.</p>
            </div>
            <span>{filteredProblems.length.toLocaleString()}개</span>
          </div>

          <Input
            value={keyword}
            onChange={(event) => setKeyword(event.target.value)}
            placeholder="문제 검색"
            aria-label="문제집에 추가할 문제 검색"
          />

          <div className="problem-set-picker-list">
            {filteredProblems.map((problem) => {
              const isSelected = selectedProblemIds.has(problem.id);

              return (
                <button
                  type="button"
                  className={isSelected ? "is-selected" : ""}
                  onClick={() => toggleProblem(problem.id)}
                  key={problem.id}
                >
                  <span>#{problem.id}</span>
                  <strong>{problem.title}</strong>
                  <TierBadge tier={problem.tier} showName />
                  <small>{problem.tags.slice(0, 2).join(", ")}</small>
                </button>
              );
            })}
          </div>
        </section>
      </form>
    </main>
  );
}

export default ProblemSetCreatePage;
