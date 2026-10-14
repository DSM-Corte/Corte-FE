import { Link } from "react-router";
import { ACCEPTED_RESULT } from "../../api/SubmissionApi";
import Button from "../common/Button";

function formatMemory(memoryKb) {
  if (!memoryKb) {
    return "-";
  }

  return `${(memoryKb / 1024).toFixed(1)} MB`;
}

function SubmitResultModal({ problemId, submission, onClose }) {
  if (!submission) {
    return null;
  }

  const isAccepted = submission.result === ACCEPTED_RESULT;

  return (
    <div className="submit-modal" role="presentation">
      <section
        className={`submit-modal__dialog ${isAccepted ? "is-accepted" : "is-failed"}`}
        role="dialog"
        aria-modal="true"
        aria-labelledby="submit-result-title"
      >
        <div className="submit-modal__badge" aria-hidden="true">
          {isAccepted ? "✓" : "!"}
        </div>
        <p className="submit-modal__eyebrow">제출 결과</p>
        <h2 id="submit-result-title">{submission.result}</h2>
        <p className="submit-modal__message">
          제출 기록에 저장되었습니다.
        </p>

        <dl className="submit-modal__stats">
          <div>
            <dt>언어</dt>
            <dd>{submission.language}</dd>
          </div>
          <div>
            <dt>실행 시간</dt>
            <dd>{submission.runtimeMs}ms</dd>
          </div>
          <div>
            <dt>메모리</dt>
            <dd>{formatMemory(submission.memoryKb)}</dd>
          </div>
        </dl>

        <div className="submit-modal__actions">
          <Link
            to={`/submissions?problemId=${encodeURIComponent(problemId)}`}
            className="button button--contained button--md"
          >
            <span className="button_text">확인</span>
          </Link>
          <Button
            type="button"
            variant="pearl"
            size="medium"
            onClick={onClose}
          >
            계속 수정
          </Button>
          {isAccepted && (
            <Link
              to={`/code-review/new?submissionId=${encodeURIComponent(submission.id)}`}
              className="button button--pearl button--md"
            >
              <span className="button_text">코드 리뷰받기</span>
            </Link>
          )}
          <Link
            to={`/problems/${problemId}`}
            className="submit-modal__text-link"
          >
            문제로 돌아가기
          </Link>
        </div>
      </section>
    </div>
  );
}

export default SubmitResultModal;
