import { ACCEPTED_RESULT, getSubmissionList } from "./SubmissionApi";

const GRASS_DAYS = 365;

function getDateKey(date) {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");

  return `${year}-${month}-${day}`;
}

// 백엔드 GET /api/users/me/grass 와 같은 모양으로 돌려준다
// [{ date: "2026-11-02", count: 2 }] 형태이고 1문제 이상 맞힌 날만 날짜 오름차순으로 담는다
// count는 그날 맞힌 서로 다른 문제 수다
// TODO: 로그인 연동 후 fetch("/api/users/me/grass")로 바꾼다
export async function getMyGrass() {
  const submissions = await getSubmissionList();

  const firstDay = new Date();
  firstDay.setHours(0, 0, 0, 0);
  firstDay.setDate(firstDay.getDate() - (GRASS_DAYS - 1));

  // 날짜별로 맞힌 문제 번호를 모은다
  const problemIdsByDate = {};

  for (const submission of submissions) {
    const submittedAt = new Date(submission.submittedAt);

    if (submission.result !== ACCEPTED_RESULT || submittedAt < firstDay) {
      continue;
    }

    const date = getDateKey(submittedAt);

    if (!problemIdsByDate[date]) {
      problemIdsByDate[date] = new Set();
    }

    problemIdsByDate[date].add(submission.problemId);
  }

  const grass = [];

  for (const date of Object.keys(problemIdsByDate).sort()) {
    grass.push({ date, count: problemIdsByDate[date].size });
  }

  return grass;
}
