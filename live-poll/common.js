// 참여자 화면(index.html)과 발표자 화면(host.html)이 같이 쓰는 Firebase 연결과 작은 도우미들
import { initializeApp } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-app.js";
import { getAuth, signInAnonymously, onAuthStateChanged, connectAuthEmulator } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-auth.js";
import { getDatabase, ref, onValue, connectDatabaseEmulator } from "https://www.gstatic.com/firebasejs/10.12.2/firebase-database.js";
import { firebaseConfig } from "./firebase-config.js";

export const configured = Boolean(firebaseConfig.apiKey) && !firebaseConfig.apiKey.startsWith("YOUR_");

let app, auth, db;
if (configured) {
  app = initializeApp(firebaseConfig);
  auth = getAuth(app);
  db = getDatabase(app);
  // 로컬 테스트용: localStorage에 livepoll-emu=1 이 있으면 Firebase 에뮬레이터에 붙는다
  if (safeGet("livepoll-emu") === "1") {
    connectAuthEmulator(auth, "http://127.0.0.1:9099", { disableWarnings: true });
    connectDatabaseEmulator(db, "127.0.0.1", 9000);
  }
}
export { db };

// 익명 로그인. 같은 브라우저에서는 새로고침해도 같은 uid가 유지된다.
export function signIn() {
  return new Promise((resolve, reject) => {
    const stop = onAuthStateChanged(auth, (user) => {
      if (user) { stop(); resolve(user); }
    });
    signInAnonymously(auth).catch((err) => { stop(); reject(err); });
  });
}

export function explainError(err) {
  const code = (err && err.code) || "";
  if (code === "auth/operation-not-allowed" || code === "auth/admin-restricted-operation" || code === "auth/configuration-not-found")
    return "Firebase 콘솔에서 Authentication → 로그인 방법 → ‘익명’을 사용 설정해 주세요.";
  if (code === "auth/network-request-failed") return "인터넷 연결을 확인해 주세요.";
  if (/permission[_ ]denied/i.test(code + " " + (err && err.message))) return "권한이 없습니다.";
  return (err && err.message) || String(err);
}

// 연결이 끊기면 화면 위에 띠를 보여 준다 (행사장 와이파이가 흔들릴 때 대비)
export function watchConnection(bannerEl) {
  let everConnected = false;
  onValue(ref(db, ".info/connected"), (snap) => {
    if (snap.val() === true) everConnected = true;
    bannerEl.hidden = snap.val() === true || !everConnected;
  });
}

export function safeGet(key) {
  try { return localStorage.getItem(key); } catch { return null; }
}
export function safeSet(key, value) {
  try { localStorage.setItem(key, value); } catch { /* 사생활 보호 모드 등 */ }
}

// RTDB는 배열을 객체로 돌려줄 때가 있어서 항상 배열로 맞춘다
export function toList(val) {
  if (!val) return [];
  return (Array.isArray(val) ? val : Object.values(val)).filter((x) => x !== null && x !== undefined);
}

export function escapeHtml(s) {
  return String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));
}

export function joinUrl(code) {
  return new URL("./?code=" + encodeURIComponent(code), location.href).href;
}
