import { Link } from "react-router";
import {
  getLanguageLabel,
  getVerdictLabel,
  isPendingVerdict,
} from "../../api/JudgeApi";
import Button from "../common/Button";

function SubmitResultModal({ problemId, submission, onClose }) {
  if (!submission) {
    return null;
  }

  const isPending = isPendingVerdict(submission.verdict);
  const isAccepted = submission.verdict === "ACCEPTED";
  const toneClassName = isPending ? "is-pending" : isAccepted ? "is-accepted" : "is-failed";

  return (
    <div className="submit-modal" role="presentation">
      <section
        className={`submit-modal__dialog ${toneClassName}`}
        role="dialog"
        aria-modal="true"
        aria-busy={isPending}
        aria-labelledby="submit-result-title"
      >
        <p className="submit-modal__eyebrow">제출 #{submission.id}</p>
        <h2 id="submit-result-title" aria-live="polite">
          {getVerdictLabel(submission.verdict)}
        </h2>
        <p className="submit-modal__message">
          {isPending
            ? "채점 서버에서 테스트케이스를 실행하고 있습니다."
            : "채점이 끝났고 제출 기록에 저장되었습니다."}
        </p>

        <dl className="submit-modal__stats">
          <div>
            <dt>통과</dt>
            <dd>
              {submission.passedCount} / {submission.totalCount}
            </dd>
          </div>
          <div>
            <dt>실행 시간</dt>
            <dd>{isPending ? "-" : `${submission.runtimeMs}ms`}</dd>
          </div>
          {submission.language && (
            <div>
              <dt>언어</dt>
              <dd>{getLanguageLabel(submission.language)}</dd>
            </div>
          )}
        </dl>

        {submission.message && !isPending && (
          <pre className="submit-modal__detail">{submission.message}</pre>
        )}

        {!isPending && (
          <div className="submit-modal__actions">
            <Link
              to={`/submissions/${submission.id}`}
              className="button button--contained button--md"
            >
              <span className="button_text">제출 상세 보기</span>
            </Link>
            <Button type="button" variant="outline" size="medium" onClick={onClose}>
              계속 수정
            </Button>
            <Link to={`/problems/${problemId}`} className="submit-modal__text-link">
              문제로 돌아가기
            </Link>
          </div>
        )}
      </section>
    </div>
  );
}

export default SubmitResultModal;
