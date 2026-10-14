import { useEffect, useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router";
import { createCodeReview, getReviewableSubmission } from "../api/CodeReviewApi";
import Button from "../components/common/Button";
import "./CodeReviewPage.css";

function CodeReviewCreatePage() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const submissionId = searchParams.get("submissionId") ?? "";
  const [submission, setSubmission] = useState(null);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [message, setMessage] = useState("");
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    let ignore = false;

    async function fetchSubmission() {
      try {
        const nextSubmission = await getReviewableSubmission(submissionId);

        if (ignore) {
          return;
        }

        setSubmission(nextSubmission);
        setTitle(`${nextSubmission.problemTitle} 풀이 리뷰`);
        setDescription(
          "풀이 의도, 시간 복잡도, 막혔던 부분을 간단히 적어주세요.",
        );
      } catch (error) {
        if (!ignore) {
          setMessage(error.message);
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
      const review = await createCodeReview({
        submissionId,
        title,
        description,
      });
      navigate(`/code-review/${review.id}`);
    } catch (error) {
      setMessage(error.message);
    } finally {
      setIsSaving(false);
    }
  }

  if (isLoading) {
    return <main className="code-review-state">코드 리뷰 준비 중입니다.</main>;
  }

  if (!submission) {
    return (
      <main className="code-review-state">
        <p>{message || "리뷰 가능한 제출을 찾을 수 없습니다."}</p>
        <Link to="/problems">문제 목록으로 돌아가기</Link>
      </main>
    );
  }

  return (
    <main className="code-review-page">
      <section className="code-review-hero code-review-hero--compact">
        <p className="code-review-hero__eyebrow">New Review</p>
        <h1>{submission.problemTitle}</h1>
        <p>정답 제출 코드를 바탕으로 코드 리뷰를 생성합니다.</p>
      </section>

      <section className="code-review-create-shell">
        <form className="code-review-create-card" onSubmit={handleSubmit}>
          <label>
            <span>제목</span>
            <input
              value={title}
              onChange={(event) => setTitle(event.target.value)}
              placeholder="코드 리뷰 제목"
              required
            />
          </label>

          <label>
            <span>코드 설명</span>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              placeholder="풀이 아이디어, 복잡도, 고민한 부분을 적어주세요."
              required
            />
          </label>

          <div className="code-review-submission-preview">
            <span>{submission.language}</span>
            <strong>{submission.result}</strong>
            <small>
              {submission.runtimeMs}ms · {(submission.memoryKb / 1024).toFixed(1)} MB
            </small>
          </div>

          {message && <p className="code-review-message">{message}</p>}

          <div className="code-review-create-actions">
            <Link to={`/submissions?problemId=${encodeURIComponent(submission.problemId)}`}>
              취소
            </Link>
            <Button type="submit" loading={isSaving}>
              코드 리뷰받기
            </Button>
          </div>
        </form>
      </section>
    </main>
  );
}

export default CodeReviewCreatePage;
