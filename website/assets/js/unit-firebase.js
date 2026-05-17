/* ========================================================================
   unit-firebase.js — 單元頁的 Firebase 整合
   ------------------------------------------------------------------------
   1. 補充影片:由 forest-law_videos/{unitId} 公開讀取並渲染播放器
      (全體學生同步看到教師於後臺設定的同一支影片)。
   2. 申論參考要點:僅「授權教師」(Firebase 登入且在白名單)可讀取
      forest-law_essays/{unitId},動態注入 .fl-essay-slot;
      學生端 DOM 完全不含此內容(內容保護)。
   3. 模式按鈕:教師→Google 登入;學生→登出。
   依賴載入順序:firebase compat → firebase-config.js → auth.js → 本檔。
   ======================================================================== */
(function () {
  'use strict';

  function unitId() {
    var n = window.UNIT_ID;
    if (!n) return null;
    return 'unit-' + String(n).padStart(2, '0');
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }

  /* ---------- 補充影片(公開) ---------- */
  function renderVideo() {
    var uid = unitId();
    var slot = document.getElementById('video-slot-1');
    if (!uid || !slot || !window.fbDb) return;
    window.fbDb.collection(FL_COL_VIDEOS).doc(uid).get().then(function (s) {
      if (!s.exists) return;
      var d = s.data() || {};
      var vid = d.videoId || window.flYouTubeId(d.url || '');
      if (!vid) return;
      slot.innerHTML =
        '<iframe class="video-iframe" src="https://www.youtube.com/embed/' +
        encodeURIComponent(vid) + '" title="教學影片" ' +
        'allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope" ' +
        'allowfullscreen></iframe>';
    }).catch(function (e) { console.warn('[forest-law] 影片讀取失敗', e); });
  }

  /* ---------- 申論要點(僅授權教師) ---------- */
  function clearEssaySlots() {
    var slots = document.querySelectorAll('.fl-essay-slot');
    for (var i = 0; i < slots.length; i++) slots[i].innerHTML = '';
  }

  function renderEssays() {
    var uid = unitId();
    var slots = document.querySelectorAll('.fl-essay-slot');
    if (!uid || !slots.length || !window.fbDb) return;
    window.fbDb.collection(FL_COL_ESSAYS).doc(uid).get().then(function (s) {
      if (!s.exists) return;
      var blocks = (s.data() && s.data().blocks) || [];
      blocks.forEach(function (b, i) {
        if (i >= slots.length) return;
        var pts = (b.points || []).map(function (p) {
          return '<li>' + escapeHtml(p) + '</li>';
        }).join('');
        slots[i].innerHTML =
          '<div class="fl-essay-points">' +
          '<strong>💡 教師提供之參考要點:</strong>' +
          (b.heading ? '<div class="fl-essay-h">' + escapeHtml(b.heading) + '</div>' : '') +
          '<ul>' + pts + '</ul></div>';
      });
    }).catch(function (e) {
      console.warn('[forest-law] 申論要點讀取失敗(可能未授權)', e);
    });
  }

  /* ---------- 啟動 ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    renderVideo();

    var tBtn = document.getElementById('mode-teacher');
    var sBtn = document.getElementById('mode-student');

    if (tBtn) tBtn.onclick = function () {
      var cur = window.fbAuth && window.fbAuth.currentUser;
      window.flCheckAccess(cur).then(function (a) {
        if (a.teacher) { if (window.showToast) showToast('✅ 已是授權教師'); return; }
        window.flLogin().then(function (u) {
          if (!u) return;
          window.flCheckAccess(u).then(function (acc) {
            if (!acc.teacher && window.showToast) showToast('⛔ 此帳號未授權教師後臺');
          });
        }).catch(function (err) {
          if (window.showToast) showToast('登入失敗:' + (err && err.message ? err.message : err));
        });
      });
    };

    if (sBtn) sBtn.onclick = function () {
      window.flLogout();
      if (typeof setMode === 'function') setMode('student', { silent: true });
      if (window.showToast) showToast('👩‍🎓 已切換至學生(已登出教師)');
    };
  });

  if (window.flOnAuth) {
    window.flOnAuth(function (access) {
      if (access.teacher) {
        if (typeof setMode === 'function') setMode('teacher', { silent: true });
        renderEssays();
        var tBtn = document.getElementById('mode-teacher');
        if (tBtn) tBtn.textContent = '👨‍🏫 教師(' + (access.owner ? 'Owner' : '已授權') + ')';
      } else {
        clearEssaySlots();
        if (typeof setMode === 'function') setMode('student', { silent: true });
      }
    });
  }
})();
