export const problemSetDefinitions = [
  {
    id: "starter",
    title: "입문 문제집",
    description: "입출력, 수학, 구현 감각을 빠르게 확인하는 첫 문제 묶음입니다.",
    filter: (problem) =>
      problem.tier.startsWith("Bronze") || problem.tags.includes("구현"),
  },
  {
    id: "dp",
    title: "DP 기초",
    description: "점화식과 상태 정의를 연습할 수 있는 다이나믹 프로그래밍 문제입니다.",
    filter: (problem) =>
      problem.tags.some((tag) => tag.includes("다이나믹") || tag === "DP"),
  },
  {
    id: "graph",
    title: "그래프 탐색",
    description: "DFS, BFS, 최단 경로처럼 그래프 감각이 필요한 문제를 모았습니다.",
    filter: (problem) =>
      problem.tags.some((tag) =>
        ["그래프", "너비 우선 탐색", "깊이 우선 탐색", "다익스트라"].includes(tag),
      ),
  },
  {
    id: "advanced",
    title: "고난도 도전",
    description: "Gold 이상 난이도의 문제로 풀이 전략과 구현 집중력을 점검합니다.",
    filter: (problem) =>
      ["Gold", "Platinum", "Emerald", "Diamond", "Master"].some((tier) =>
        problem.tier.startsWith(tier),
      ),
  },
];

export function getRecommendedProblemSet(id) {
  return problemSetDefinitions.find((definition) => definition.id === id);
}
