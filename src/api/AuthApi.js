const USER_STORAGE_KEY = "cotre_mock_users";
const SESSION_STORAGE_KEY = "cotre_mock_session";
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

function saveUsers(users) {
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(users));
}

function encodeBase64Url(value) {
  const bytes = new TextEncoder().encode(value);
  const binary = Array.from(bytes, (byte) => String.fromCharCode(byte)).join("");

  return window
    .btoa(binary)
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
}

function createAccessToken(user) {
  const header = encodeBase64Url(JSON.stringify({ alg: "mock", typ: "JWT" }));
  const payload = encodeBase64Url(
    JSON.stringify({
      sub: user.id,
      email: user.email,
      name: user.name,
      iat: Math.floor(Date.now() / 1000),
    }),
  );
  const signature = encodeBase64Url(
    `${user.id}:${Date.now()}:${Math.random().toString(36).slice(2)}`,
  );

  return `${header}.${payload}.${signature}`;
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

  if (!emailPattern.test(normalizedEmail)) {
    throw createAuthError("올바른 이메일 주소를 입력해주세요.", "INVALID_EMAIL");
  }

  return normalizedEmail;
}

function assertPassword(password) {
  if (String(password ?? "").length < 6) {
    throw createAuthError("비밀번호는 6자 이상이어야 합니다.", "WEAK_PASSWORD");
  }
}

export async function signup({ name, email, password, passwordConfirm }) {
  await delay();

  const trimmedName = String(name ?? "").trim();
  const normalizedEmail = assertEmail(email);

  if (!trimmedName) {
    throw createAuthError("이름을 입력해주세요.", "EMPTY_NAME");
  }

  assertPassword(password);

  if (password !== passwordConfirm) {
    throw createAuthError("비밀번호가 서로 일치하지 않습니다.", "PASSWORD_MISMATCH");
  }

  const users = getStoredUsers();
  const isDuplicated = users.some((user) => normalize(user.email) === normalizedEmail);

  if (isDuplicated) {
    throw createAuthError("이미 가입된 이메일입니다.", "DUPLICATED_EMAIL");
  }

  const nextUser = {
    id: `user-${Date.now()}`,
    name: trimmedName,
    email: normalizedEmail,
    password,
    createdAt: new Date().toISOString(),
  };

  saveUsers([...users, nextUser]);

  return {
    user: sanitizeUser(nextUser),
  };
}

export async function login({ email, password, remember = false }) {
  await delay();

  const normalizedEmail = assertEmail(email);

  if (!password) {
    throw createAuthError("비밀번호를 입력해주세요.", "EMPTY_PASSWORD");
  }

  const users = getStoredUsers();
  const user = users.find((storedUser) => normalize(storedUser.email) === normalizedEmail);

  if (!user || user.password !== password) {
    throw createAuthError(
      "이메일 또는 비밀번호가 올바르지 않습니다.",
      "INVALID_CREDENTIALS",
    );
  }

  const session = {
    userId: user.id,
    remember,
    accessToken: createAccessToken(user),
    signedInAt: new Date().toISOString(),
  };

  window.localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  saveAccessToken(session.accessToken, remember);

  return {
    accessToken: session.accessToken,
    user: sanitizeUser(user),
    session,
  };
}

export async function logout() {
  await delay(100);
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  clearAccessToken();
}

export async function getCurrentUser() {
  await delay(100);

  const rawSession = window.localStorage.getItem(SESSION_STORAGE_KEY);

  if (!rawSession) {
    return undefined;
  }

  try {
    const session = JSON.parse(rawSession);
    const user = getStoredUsers().find((storedUser) => storedUser.id === session.userId);
    return user ? sanitizeUser(user) : undefined;
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    clearAccessToken();
    return undefined;
  }
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

  const user = getStoredUsers().find((storedUser) => storedUser.id === id);

  return user ? sanitizeUser(user) : undefined;
}

export function getCurrentUserId() {
  const rawSession = window.localStorage.getItem(SESSION_STORAGE_KEY);

  if (!rawSession || !getAuthToken()) {
    return "";
  }

  try {
    const session = JSON.parse(rawSession);
    return session.userId ?? "";
  } catch {
    window.localStorage.removeItem(SESSION_STORAGE_KEY);
    clearAccessToken();
    return "";
  }
}

export function getAuthToken() {
  return (
    getCookie(ACCESS_TOKEN_COOKIE_KEY) ||
    window.localStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) ||
    window.sessionStorage.getItem(ACCESS_TOKEN_STORAGE_KEY) ||
    ""
  );
}

export function isAuthenticated() {
  return Boolean(getAuthToken());
}

export function resetMockAuth() {
  window.localStorage.setItem(USER_STORAGE_KEY, JSON.stringify(seedUsers));
  window.localStorage.removeItem(SESSION_STORAGE_KEY);
  clearAccessToken();
}
