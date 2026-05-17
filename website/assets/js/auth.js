/* ========================================================================
   auth.js — Firebase Auth(Google 登入)+ 白名單/Owner 授權判定
   ------------------------------------------------------------------------
   對外 API(掛在 window):
     flLogin()                       Google 彈窗登入,回傳 Promise<user|null>
     flLogout()                      登出,回傳 Promise
     flOnAuth(cb)                    監聽登入狀態; cb(access) — access 見下
     flCheckAccess(user)             回傳 Promise<access>
        access = {
          authed:  bool,             是否已登入
          email:   string|null,
          owner:   bool,             是否為 Owner(白名單信任根)
          teacher: bool              是否為授權教師(owner 或在白名單文件內)
        }
   授權邏輯:
     - owner   = 已登入 && email 已驗證 && email === FOREST_LAW_OWNER_EMAIL
     - teacher = owner || 存在 forest-law_teachers/{email} 文件
   安全性:用戶端判定僅用於 UI 顯隱;真正寫入授權由 Firestore Rules 強制。
   ======================================================================== */

(function () {
  'use strict';

  function provider() {
    var p = new firebase.auth.GoogleAuthProvider();
    p.setCustomParameters({ prompt: 'select_account' });
    return p;
  }

  window.flLogin = function () {
    if (!window.fbAuth) return Promise.reject(new Error('Firebase 未初始化'));
    return window.fbAuth
      .signInWithPopup(provider())
      .then(function (res) { return res.user; })
      .catch(function (err) {
        if (err && (err.code === 'auth/popup-closed-by-user' ||
                    err.code === 'auth/cancelled-popup-request')) {
          return null; // 使用者自行取消,不視為錯誤
        }
        console.error('[forest-law] 登入失敗:', err);
        throw err;
      });
  };

  window.flLogout = function () {
    if (!window.fbAuth) return Promise.resolve();
    return window.fbAuth.signOut();
  };

  window.flCheckAccess = function (user) {
    var access = { authed: false, email: null, owner: false, teacher: false };
    if (!user || !user.email) return Promise.resolve(access);

    access.authed = true;
    access.email = user.email;

    var verified = user.emailVerified === true;
    if (verified && user.email === FOREST_LAW_OWNER_EMAIL) {
      access.owner = true;
      access.teacher = true;
      return Promise.resolve(access);
    }
    if (!verified) return Promise.resolve(access);

    return window.fbDb
      .collection(FL_COL_TEACHERS)
      .doc(user.email)
      .get()
      .then(function (snap) {
        if (snap.exists) access.teacher = true;
        return access;
      })
      .catch(function (err) {
        console.warn('[forest-law] 白名單查詢失敗(視為未授權):', err);
        return access;
      });
  };

  window.flOnAuth = function (cb) {
    if (!window.fbAuth) { cb({ authed: false, email: null, owner: false, teacher: false }); return; }
    window.fbAuth.onAuthStateChanged(function (user) {
      window.flCheckAccess(user).then(cb);
    });
  };
})();
