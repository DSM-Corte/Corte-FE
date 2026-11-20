import { useRef, useState } from "react";
import { getAuthToken } from "../api/AuthApi";
import { createReplyReaction, deleteReplyReaction } from "../api/CodeReviewApi";

const reactions = [
  { type: "HEART", emoji: "❤️", label: "하트" },
  { type: "THUMBS_UP", emoji: "👍", label: "좋아요" },
  { type: "SMILE", emoji: "😄", label: "웃음" },
  { type: "CELEBRATION", emoji: "🎉", label: "축하" },
];

function isAdmin() {
  try {
    const payload = getAuthToken().split(".")[1].replaceAll("-", "+").replaceAll("_", "/");
    return JSON.parse(atob(payload)).role === "ADMIN";
  } catch {
    return false;
  }
}

function ReplyReactions({ requestId, reply, currentUserId, parentAuthorId, closed, onMutate }) {
  const [pending, setPending] = useState(false);
  const busy = useRef(false);
  const canCreate = isAdmin() || String(parentAuthorId) === String(currentUserId);

  async function toggle(type, mine) {
    if (busy.current || closed) return;
    busy.current = true;
    setPending(true);
    try {
      await onMutate(() => mine
        ? deleteReplyReaction(requestId, reply.id, mine.id)
        : createReplyReaction(requestId, reply.id, type));
    } finally {
      busy.current = false;
      setPending(false);
    }
  }

  return (
    <div className="review-reactions" role="group" aria-label="답글 이모티콘 반응" aria-busy={pending}>
      {reactions.map(({ type, emoji, label }) => {
        const mine = reply.reactions?.find((reaction) =>
          reaction.type === type && String(reaction.userId) === String(currentUserId));
        const count = reply.reactionCounts?.[type] ?? 0;
        return (
          <button key={type} type="button" disabled={pending || closed || (!mine && !canCreate)}
            aria-pressed={Boolean(mine)} aria-label={`${label} ${count}개, ${mine ? "내 반응 취소" : "반응 추가"}`}
            onClick={() => toggle(type, mine)}>
            <span aria-hidden="true">{emoji}</span><span>{count}</span>
          </button>
        );
      })}
    </div>
  );
}

export default ReplyReactions;
