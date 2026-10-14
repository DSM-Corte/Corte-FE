const SUBMISSION_STORAGE_KEY = "cotre_mock_submissions";

export function getStoredSubmissions() {
  const rawSubmissions = window.localStorage.getItem(SUBMISSION_STORAGE_KEY);

  if (!rawSubmissions) {
    return [];
  }

  try {
    return JSON.parse(rawSubmissions);
  } catch {
    window.localStorage.removeItem(SUBMISSION_STORAGE_KEY);
    return [];
  }
}

export function saveSubmissions(submissions) {
  window.localStorage.setItem(SUBMISSION_STORAGE_KEY, JSON.stringify(submissions));
}

export function getUserSubmissions(userId) {
  if (!userId) {
    return [];
  }

  return getStoredSubmissions().filter(
    (submission) => submission.userId === userId,
  );
}
