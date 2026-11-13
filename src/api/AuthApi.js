import { request } from "./apiClient";

// 아직 백엔드가 없는 기능(리더보드, 코드 리뷰 등)이 보여주는 다른 사용자 목록이다
const USER_STORAGE_KEY = "cotre_mock_users";
const SESSION_STORAGE_KEY = "cotre_session";
const ACCESS_TOKEN_STORAGE_KEY = "cotre_access_token";
const ACCESS_TOKEN_COOKIE_KEY = "cotre_access_token";

const seedUsers = [
  {
    id: "user-test",
    name: "cotrunner",
    email: "test@cotre.dev",
    password: "test1234",
    createdAt: "2024-01-01T00:00:00.000Z",
  },
];

function delay(ms = 250) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function getStoredUsers() {
  const rawUsers = window.localStorage.getItem(USER_STORAGE_KEY);

  if (!rawUsers) {
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(seedUsers));
    return seedUsers;
  }

  try {
    return JSON.parse(rawUsers);
  } catch {
    window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(seedUsers));
    return seedUsers;
  }
}

function decodeTokenPayload(token) {
  try {
    const base64 = token.split(".")[1].replaceAll("-", "+").replaceAll("_", "/");
    const binary = window.atob(base64);
    const bytes = Uint8Array.from(binary, (char) => char.charCodeAt(0));
    return JSON.parse(new TextDecoder().decode(bytes));
  } catch {
    return null;
  }
}

function isUsableToken(token) {
  const payload = token ? decodeTokenPayload(token) : null;

  return Boolean(
    payload?.sub &&
      typeof payload.exp === "number" &&
      payload.exp * 1000 > Date.now(),
  );
}

function setCookie(name, value, { maxAge } = {}) {
  const encodedName = encodeURIComponent(name);
  const encodedValue = encodeURIComponent(value);
  const maxAgePart = maxAge ? `; max-age=${maxAge}` : "";

  document.cookie = `${encodedName}=${encodedValue}; path=/; samesite=lax${maxAgePart}`;
}

function removeCookie(name) {
  document.cookie = `${encodeURIComponent(name)}=; path=/; max-age=0; samesite=lax`;
}

function getCookie(name) {
  const encodedName = `${encodeURIComponent(name)}=`;
  const cookie = document.cookie
    .split("; ")
    .find((item) => item.startsWith(encodedName));

  return cookie ? decodeURIComponent(cookie.slice(encodedName.length)) : "";
}

function saveAccessToken(token, remember) {
  window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);

  const storage = remember ? window.localStorage : window.sessionStorage;
  storage.setItem(ACCESS_TOKEN_STORAGE_KEY, token);
  setCookie(ACCESS_TOKEN_COOKIE_KEY, token, remember ? { maxAge: 60 * 60 * 24 * 7 } : {});
}

function clearAccessToken() {
  window.localStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  window.sessionStorage.removeItem(ACCESS_TOKEN_STORAGE_KEY);
  removeCookie(ACCESS_TOKEN_COOKIE_KEY);
}

function sanitizeUser(user) {
  const { password, ...safeUser } = user;
  void password;
  return safeUser;
}

function normalize(value) {
  return String(value ?? "").trim().toLowerCase();
}

function createAuthError(message, code) {
  const error = new Error(message);
  error.code = code;
  return error;
}

function assertEmail(email) {
  const normalizedEmail = normalize(email);
  const emailPattern = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!emailPattern.test(normalizedEmail) || normalizedEmail.length > 100) {
    throw createAuthError("올바른 이메일 주소를 입력해주세요.", "INVALID_EMAIL");
  }

  return normalizedEmail;
}

function assertPassword(password) {
  const length = String(password ?? "").length;

  if (length < 8 || length > 20) {
    throw createAuthError("비밀번호는 8자 이상 20자 이하여야 합니다.", "WEAK_PASSWORD");
  }
}

function getSession() {
  const rawSession = window.localStorage.getItem(SESSION_STORAGE_KEY);

  if (!rawSession) {
    return null;
  }

  try {
    return JSON.parse(rawSession);
  } catch {
    clearAuthSession();
    return null;
  }
}

function toUser(session) {
  return {
    id: session.userId,
    // 로그인 응답에 닉네임이 없어 이메일 앞부분을 이름으로 쓴다
    name: session.email.split("@")[0],
    email: session.email,
  };
}

export function clearAuthSession() {
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  clearAccessToken();
}

export async function signup({ name, email, password, passwordConfirm }) {
  const trimmedName = String(name ?? "").trim();
  const normalizedEmail = assertEmail(email);

  if (!trimmedName) {
    throw createAuthError("이름을 입력해주세요.", "EMPTY_NAME");
  }

  if (trimmedName.length > 20) {
    throw createAuthError("이름은 20자 이하여야 합니다.", "LONG_NAME");
  }

  assertPassword(password);

  if (password !== passwordConfirm) {
    throw createAuthError("비밀번호가 서로 일치하지 않습니다.", "PASSWORD_MISMATCH");
  }

  await request("/auth/signup", {
    method: "POST",
    body: { email: normalizedEmail, password, nickname: trimmedName },
  });

  return {
    user: { name: trimmedName, email: normalizedEmail },
  };
}

export async function login({ email, password, remember = false }) {
  const normalizedEmail = assertEmail(email);

  if (!password) {
    throw createAuthError("비밀번호를 입력해주세요.", "EMPTY_PASSWORD");
  }

  const { accessToken } = await request("/auth/login", {
    method: "POST",
    body: { email: normalizedEmail, password },
  });

  const session = {
    userId: decodeTokenPayload(accessToken)?.sub ?? "",
    email: normalizedEmail,
    remember,
    signedInAt: new Date().toISOString(),
  };

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  saveAccessToken(accessToken, remember);

  return {
    accessToken,
    user: toUser(session),
    session,
  };
}

export function clearAuthSession() {
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  clearAccessToken();
}

export async function logout() {
  clearAuthSession();
}

export async function getCurrentUser() {
  const session = getSession();

  if (!session || !isAuthenticated()) {
    return undefined;
  }

  return toUser(session);
}

export async function getUserById(id) {
  await delay(100);

  if (id === "ai-cotre") {
    return {
      id: "ai-cotre",
      name: "COTRE Review",
      email: "ai-review@cotre.local",
      createdAt: "2026-01-01T00:00:00.000Z",
    };
  }

  const session = getSession();

  if (session && session.userId === id) {
    return toUser(session);
  }

  const user = getStoredUsers().find((storedUser) => storedUser.id === id);

  return user ? sanitizeUser(user) : undefined;
}

export function getCurrentUserId() {
  if (!isAuthenticated()) {
    return "";
  }

  return getSession()?.userId ?? "";
}

export function getAuthToken() {
  const token =
    getCookie(ACCESS_TOKEN_COOKIE_KEY) ||
    window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) ||
    window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) ||
    "";

  return isUsableToken(token) ? token : "";
}

export function isAuthenticated() {
  return Boolean(getAuthToken());
}
