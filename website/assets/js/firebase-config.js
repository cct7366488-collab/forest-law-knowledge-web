/* ========================================================================
   firebase-config.js — Firebase 初始化（compat SDK）
   ------------------------------------------------------------------------
   說明：
   - 寄宿於共用專案 forestry-teaching（Spark 免費方案），本站所有
     Firestore collection 一律加 forest-law_ 前綴隔離（依 Cloud.md〔貳、二〕）。
   - 下列 web config 為「用戶端公開識別碼」，非機密金鑰；安全邊界由
     Firestore Security Rules 把關，故可進公開 repo。
   - 須搭配 compat SDK <script>（firebase-app/-auth/-firestore-compat.js）。
   ======================================================================== */

var FOREST_LAW_FIREBASE_CONFIG = {
  apiKey: 'AIzaSyAoYt2U3sJhV-E4VSua-ogR4nLNVFnaJEs',
  authDomain: 'forestry-teaching.firebaseapp.com',
  projectId: 'forestry-teaching',
  storageBucket: 'forestry-teaching.firebasestorage.app',
  messagingSenderId: '1008453248188',
  appId: '1:1008453248188:web:22d41220ac54313d599cb9'
};

// Owner 為白名單信任根，與 Firestore rules 內硬編碼值必須一致。
var FOREST_LAW_OWNER_EMAIL = 'cct7366488@gmail.com';

// Firestore collection 命名空間（與 rules 一致）
var FL_COL_VIDEOS = 'forest-law_videos';
var FL_COL_ESSAYS = 'forest-law_essays';
var FL_COL_TEACHERS = 'forest-law_teachers';
var FL_COL_SETTINGS = 'forest-law_settings';
var FL_COL_QUIZ = 'forest-law_quiz';

// 由 YouTube 完整網址或裸 ID 取出 11 碼影片 ID;取不到回傳 null。
window.flYouTubeId = function (input) {
  var s = String(input || '').trim();
  if (!s) return null;
  if (/^[A-Za-z0-9_-]{11}$/.test(s)) return s;
  var m = s.match(/(?:youtu\.be\/|v=|\/embed\/|\/shorts\/)([A-Za-z0-9_-]{11})/);
  return m ? m[1] : null;
};

(function initFirebase() {
  if (typeof firebase === 'undefined') {
    console.error('[forest-law] Firebase SDK 未載入,請確認 compat <script> 已在本檔前引入。');
    return;
  }
  if (!firebase.apps || !firebase.apps.length) {
    firebase.initializeApp(FOREST_LAW_FIREBASE_CONFIG);
  }
  window.fbAuth = firebase.auth();
  window.fbDb = firebase.firestore();
})();
