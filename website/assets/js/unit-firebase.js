/* ========================================================================
   unit-firebase.js — 單元頁的 Firebase 整合
   ------------------------------------------------------------------------
   1. 補充影片:forest-law_videos/{unitId} 公開讀取並渲染播放器。
   2. 學生練習題:forest-law_quiz_public/{unitId} 公開讀取,動態渲染
      該單元選擇題(含解析,即時批改)與申論題(僅題目)。
   3. 申論參考要點:僅授權教師可讀 forest-law_essays/{unitId},
      注入各申論題下方 .fl-essay-slot;學生端 DOM 不含此內容。
   4. 模式按鈕:教師→Google 登入;學生→登出。
   載入順序:firebase compat → firebase-config.js → auth.js → 本檔。
   ======================================================================== */
(function () {
  'use strict';

  var quizReady = null;
  var lastAccess = { teacher: false };

  function unitId() {
    var n = window.UNIT_ID;
    if (!n) return null;
    return 'unit-' + String(n).padStart(2, '0');
  }

  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  }
  function attr(s) { return esc(s).replace(/"/g, '&quot;'); }

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

  /* ---------- 學生練習題(公開,由題庫衍生) ---------- */
  function renderQuiz() {
    var uid = unitId();
    var box = document.getElementById('fl-quiz');
    if (!uid || !box || !window.fbDb) return Promise.resolve();
    box.innerHTML = '<p style="color:#888;">⏳ 載入練習題…</p>';
    return window.fbDb.collection(FL_COL_QUIZ_PUBLIC).doc(uid).get().then(function (s) {
      if (!s.exists) {
        box.innerHTML = '<p style="color:#888;">本單元練習題尚未發佈,請稍後再回來。</p>';
        return;
      }
      var d = s.data() || {};
      var html = '';
      (d.mcq || []).forEach(function (q, i) {
        var qid = 'flq-' + esc(q.id || (uid + '-m' + i));
        var ans = String(q.answer || '').replace(/[^A-D]/g, '');
        html += '<div class="question" id="' + qid + '">' +
          '<div class="question-text">Q' + (i + 1) + '. ' + esc(q.q) + '</div>' +
          '<ul class="question-options">';
        (q.options || []).forEach(function (opt, oi) {
          html += '<li onclick="answerQuestion(\'' + qid + '\',' + oi + ',\'' + ans + '\')">' +
            esc(opt) + '</li>';
        });
        html += '</ul>';
        if (q.explain) {
          html += '<div class="question-explain">💡 ' + esc(q.explain) + '</div>';
        }
        html += '</div>';
      });
      (d.essay || []).forEach(function (e, i) {
        html += '<div class="essay-question">' +
          '<div class="question-text">申論 ' + (i + 1) + '. ' + esc(e.q) + '</div>' +
          '<textarea placeholder="請在此輸入你的答案…" ' +
          'style="width:100%;min-height:100px;padding:10px;border:1px solid #ccc;' +
          'border-radius:4px;font-family:inherit;"></textarea>' +
          '<div class="fl-essay-slot"></div>' +
          '</div>';
      });
      box.innerHTML = html || '<p style="color:#888;">本單元尚無題目。</p>';
      if (typeof window.updateQuizSummary === 'function') {
        try { window.updateQuizSummary(); } catch (x) {}
      }
    }).catch(function (e) {
      box.innerHTML = '<p style="color:#c0392b;">練習題載入失敗:' +
        esc(e.code || e.message) + '</p>';
    });
  }

  /* ---------- 申論參考要點(僅授權教師) ---------- */
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
          return '<li>' + esc(p) + '</li>';
        }).join('');
        slots[i].innerHTML =
          '<div class="fl-essay-points">' +
          '<strong>💡 教師提供之參考要點:</strong>' +
          '<ul>' + pts + '</ul></div>';
      });
    }).catch(function (e) {
      console.warn('[forest-law] 申論要點讀取失敗(可能未授權)', e);
    });
  }

  function syncEssayByAccess() {
    (quizReady || Promise.resolve()).then(function () {
      if (lastAccess.teacher) renderEssays();
      else clearEssaySlots();
    });
  }

  /* ---------- 啟動 ---------- */
  document.addEventListener('DOMContentLoaded', function () {
    renderVideo();
    quizReady = renderQuiz().then(function () { syncEssayByAccess(); });

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
      lastAccess = access || { teacher: false };
      if (access && access.teacher) {
        if (typeof setMode === 'function') setMode('teacher', { silent: true });
        var tBtn = document.getElementById('mode-teacher');
        if (tBtn) tBtn.textContent = '👨‍🏫 教師(' + (access.owner ? 'Owner' : '已授權') + ')';
      } else if (typeof setMode === 'function') {
        setMode('student', { silent: true });
      }
      syncEssayByAccess();
    });
  }
})();
