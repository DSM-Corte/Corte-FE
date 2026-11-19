import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { createReviewRequest } from "../api/CodeReviewApi";
import {
  getLanguageLabel,
  getProblem,
  getSubmission,
  getVerdictLabel,
} from "../api/JudgeApi";
import Button from "../components/common/Button";
import "./CodeReviewPage.css";

const REQUEST_ERROR_MESSAGES = {
  R003: "본인의 제출만 리뷰를 요청할 수 있습니다.",
  R004: "제출 기록을 찾을 수 없습니다.",
  R005: "정답 처리된 제출만 리뷰를 요청할 수 있습니다.",
};

function CodeReviewCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const submissionId = searchParams.get("submissionId") ?? "";
  const [submission, setSubmission] = useState(null);
  const [problemTitle, setProblemTitle] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function fetchSubmission() {
      try {
        const nextSubmission = await getSubmission(submissionId);

        if (ignore) {
          return;
        }

        setSubmission(nextSubmission);
        // 제목은 화면 표시용이라 문제 조회가 실패해도 요청은 할 수 있다
        getProblem(nextSubmission.problemId)
          .then((problem) => !ignore && setProblemTitle(problem.title))
          .catch(() => {});
      } catch (error) {
        if (!ignore) {
          setMessage(
            [403, 404].includes(error.status)
              ? "제출 기록을 찾을 수 없습니다."
              : error.message,
          );
        }
      } finally {
        if (!ignore) {
          setIsLoading(false);
        }
      }
    }

    fetchSubmission();

    return () => {
      ignore = true;
    };
  }, [submissionId]);

  async function handleSubmit(event) {
    event.preventDefault();
    setIsSaving(true);
    setMessage("");

    try {
      const review = await createReviewRequest(submissionId);
      navigate(`/code-review/${review.id}`);
    } catch (error) {
      if (error.code === "R006") {
        setMessage("이미 이 제출로 리뷰를 요청했습니다. 목록에서 확인해주세요.");
      } else {
        setMessage(REQUEST_ERROR_MESSAGES[error.code] ?? error.message);
      }
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <main className="code-review-state">리뷰 요청을 준비 중입니다.</main>;
  }

  if (!submission) {
    return (
      <main className="code-review-state">
        <p>{message || "리뷰를 요청할 제출을 찾을 수 없습니다."}</p>
        <Link to="/submissions">제출 기록으로 돌아가기</Link>
      </main>
    );
  }

  return (
    <main className="code-review-page">
      <section className="code-review-hero code-review-hero--compact">
        <p className="code-review-hero__eyebrow">New Review</p>
        <h1>{problemTitle || `문제 #${submission.problemId}`}</h1>
        <p>정답 제출 코드를 그대로 올려 다른 사용자에게 리뷰를 요청합니다.</p>
      </section>

      <section className="code-review-create-shell">
        <form className="code-review-create-card" onSubmit={handleSubmit}>
          <div className="code-review-submission-preview">
            <span>{getLanguageLabel(submission.language)}</span>
            <strong>{getVerdictLabel(submission.verdict)}</strong>
            <small>제출 #{submission.id}</small>
          </div>

          {message && <p className="code-review-message">{message}</p>}

          <div className="code-review-create-actions">
            <Link to={`/submissions?problemId=${encodeURIComponent(submission.problemId)}`}>
              취소
            </Link>
            <Button type="submit" loading={isSaving}>
              리뷰 요청하기
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default CodeReviewCreatePage;
