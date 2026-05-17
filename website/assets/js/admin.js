/* ========================================================================
   admin.js — 教師後臺控制器
   ------------------------------------------------------------------------
   狀態機：loading → (login | denied | dash)
   dash 區塊：影片管理、申論要點管理、教師白名單管理（Owner only）
   所有寫入最終由 Firestore Rules 強制授權；此處僅負責 UI 與便利性。
   ======================================================================== */
(function () {
  'use strict';

  var UNITS = [
    ['unit-01', '單元 1 · 森林法制總論'],
    ['unit-02', '單元 2 · 森林法與施行細則'],
    ['unit-03', '單元 3 · 保安林制度'],
    ['unit-04', '單元 4 · 林產物處分與伐採查驗'],
    ['unit-05', '單元 5 · 獎勵造林 2.0'],
    ['unit-06', '單元 6 · 林下經濟'],
    ['unit-07', '單元 7 · 森林遊樂與自然保護'],
    ['unit-08', '單元 8 · 森林與土地利用管制'],
    ['unit-09', '單元 9 · 原住民族林業權益'],
    ['unit-10', '單元 10 · 氣候變遷與森林碳匯']
  ];

  var state = { access: null };

  function $(id) { return document.getElementById(id); }
  function show(id, on) { var el = $(id); if (el) el.style.display = on ? '' : 'none'; }
  function esc(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }
  function ts() { return firebase.firestore.FieldValue.serverTimestamp(); }

  /* ---------- 登入 / 登出 ---------- */
  window.flAdminLogin = function () {
    show('adm-login-err', false);
    window.flLogin().catch(function (err) {
      var el = $('adm-login-err');
      if (el) { el.textContent = '登入失敗：' + (err && err.message ? err.message : err); el.style.display = ''; }
    });
  };
  window.flAdminLogout = function () { window.flLogout(); };

  /* ---------- 狀態切換 ---------- */
  function render(access) {
    state.access = access;
    show('adm-loading', false);
    show('adm-login', false);
    show('adm-denied', false);
    show('adm-dash', false);
    show('adm-logout', access.authed);

    if (!access.authed) { show('adm-login', true); return; }
    if (!access.teacher) {
      $('adm-denied-email').textContent = access.email || '';
      show('adm-denied', true);
      return;
    }
    $('adm-email').textContent = access.email;
    var badge = $('adm-role-badge');
    badge.textContent = access.owner ? 'Owner' : '教師';
    badge.className = 'adm-badge' + (access.owner ? ' adm-badge-owner' : '');
    show('adm-dash', true);
    show('adm-wl-card', access.owner);

    buildVideos();
    buildEssayUnitPicker();
    loadQuizInfo();
    if (access.owner) loadTeachers();
  }

  /* ---------- 區塊 B2：完整題庫 ---------- */
  var QUIZ_DOC = 'bank';

  function quizSummary(obj) {
    var mcq = 0, essay = 0, units = 0;
    if (obj && Array.isArray(obj.units)) {
      units = obj.units.length;
      obj.units.forEach(function (u) {
        if (Array.isArray(u.mcq)) mcq += u.mcq.length;
        if (Array.isArray(u.essay)) essay += u.essay.length;
      });
    }
    return { units: units, mcq: mcq, essay: essay };
  }

  function loadQuizInfo() {
    var box = $('adm-quiz-info');
    box.textContent = '⏳ 載入中…';
    window.fbDb.collection(FL_COL_QUIZ).doc(QUIZ_DOC).get().then(function (s) {
      if (!s.exists || !s.data().json) {
        box.innerHTML = '⚠️ 尚未匯入題庫。請選擇本機 <code>03_題庫.json</code> 後按「匯入 / 覆蓋題庫」。';
        return;
      }
      var d = s.data();
      var sm = quizSummary(JSON.parse(d.json));
      var who = d.updatedBy ? esc(d.updatedBy) : '—';
      box.innerHTML = '✅ 已匯入：' + sm.units + ' 單元 · ' + sm.mcq +
        ' 選擇題 · ' + sm.essay + ' 申論題（最後更新者：' + who + '）';
    }).catch(function (e) {
      box.innerHTML = '<span class="adm-err">讀取失敗：' + esc(e.code || e.message) + '</span>';
    });
  }

  window.flImportQuiz = function () {
    var st = $('adm-quiz-status');
    var fileEl = $('adm-quiz-file');
    var f = fileEl.files && fileEl.files[0];
    if (!f) { st.textContent = '❌ 請先選擇 JSON 檔'; return; }
    st.textContent = '⏳ 讀檔中…';
    var reader = new FileReader();
    reader.onload = function () {
      var raw = String(reader.result || '');
      var obj;
      try { obj = JSON.parse(raw); }
      catch (err) { st.textContent = '❌ JSON 解析失敗：' + err.message; return; }
      if (!obj || !obj.title || !Array.isArray(obj.units)) {
        st.textContent = '❌ 格式不符（需含 title 與 units 陣列）';
        return;
      }
      var sm = quizSummary(obj);
      st.textContent = '⏳ 上傳中…';
      window.fbDb.collection(FL_COL_QUIZ).doc(QUIZ_DOC).set({
        json: raw,
        title: obj.title,
        units: sm.units,
        mcqCount: sm.mcq,
        essayCount: sm.essay,
        updatedBy: state.access.email,
        updatedAt: ts()
      }).then(function () {
        st.textContent = '✅ 已匯入（' + sm.units + ' 單元 / ' +
          sm.mcq + ' 選擇 / ' + sm.essay + ' 申論）';
        fileEl.value = '';
        loadQuizInfo();
      }).catch(function (e) { st.textContent = '❌ ' + (e.code || e.message); });
    };
    reader.onerror = function () { st.textContent = '❌ 讀檔失敗'; };
    reader.readAsText(f, 'utf-8');
  };

  window.flDownloadQuiz = function () {
    var st = $('adm-quiz-status');
    st.textContent = '⏳ 取得中…';
    window.fbDb.collection(FL_COL_QUIZ).doc(QUIZ_DOC).get().then(function (s) {
      if (!s.exists || !s.data().json) { st.textContent = '⚠️ 尚未匯入題庫'; return; }
      var blob = new Blob([s.data().json], { type: 'application/json;charset=utf-8' });
      var a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = '03_題庫.json';
      document.body.appendChild(a);
      a.click();
      setTimeout(function () { document.body.removeChild(a); URL.revokeObjectURL(a.href); }, 500);
      st.textContent = '✅ 已下載';
    }).catch(function (e) { st.textContent = '❌ ' + (e.code || e.message); });
  };

  /* ---------- 區塊 A：影片 ---------- */
  function buildVideos() {
    var box = $('adm-videos');
    box.innerHTML = '';
    UNITS.forEach(function (u) {
      var row = document.createElement('div');
      row.className = 'adm-row';
      row.innerHTML =
        '<span class="adm-row-label">' + esc(u[1]) + '</span>' +
        '<input type="text" id="vid-' + u[0] + '" placeholder="YouTube 網址或影片 ID（留白＝移除）">' +
        '<button class="adm-btn adm-btn-ghost" data-u="' + u[0] + '">儲存</button>' +
        '<span class="adm-row-status" id="vidst-' + u[0] + '"></span>';
      box.appendChild(row);
      row.querySelector('button').addEventListener('click', function () { saveVideo(u[0]); });
      window.fbDb.collection(FL_COL_VIDEOS).doc(u[0]).get().then(function (s) {
        if (s.exists && s.data().url) $('vid-' + u[0]).value = s.data().url;
      }).catch(function (e) { console.warn(e); });
    });
  }

  function saveVideo(unitId) {
    var raw = ($('vid-' + unitId).value || '').trim();
    var st = $('vidst-' + unitId);
    st.textContent = '⏳';
    var ref = window.fbDb.collection(FL_COL_VIDEOS).doc(unitId);
    var op;
    if (!raw) {
      op = ref.delete();
    } else {
      var vid = window.flYouTubeId(raw);
      op = ref.set({
        url: raw,
        videoId: vid || '',
        updatedBy: state.access.email,
        updatedAt: ts()
      });
    }
    op.then(function () { st.textContent = '✅ 已儲存'; })
      .catch(function (e) { st.textContent = '❌ ' + (e.code || e.message); });
  }

  /* ---------- 區塊 B：申論要點 ---------- */
  function buildEssayUnitPicker() {
    var sel = $('adm-essay-unit');
    if (sel.options.length) { flLoadEssays(); return; }
    UNITS.forEach(function (u) {
      var o = document.createElement('option');
      o.value = u[0]; o.textContent = u[1];
      sel.appendChild(o);
    });
    flLoadEssays();
  }

  function essayBlockEl(heading, points) {
    var d = document.createElement('div');
    d.className = 'adm-row adm-essay-block';
    d.style.flexDirection = 'column';
    d.style.alignItems = 'stretch';
    d.innerHTML =
      '<input type="text" class="adm-essay-heading" placeholder="申論題目（可留白）" value="' + esc(heading || '') + '">' +
      '<textarea placeholder="每行一個參考要點…">' + esc((points || []).join('\n')) + '</textarea>' +
      '<div class="adm-essay-tools"><button class="adm-btn adm-btn-danger">刪除此則</button></div>';
    d.querySelector('button').addEventListener('click', function () { d.remove(); });
    return d;
  }

  window.flAddEssayBlock = function () {
    $('adm-essays').appendChild(essayBlockEl('', []));
  };

  window.flLoadEssays = function () {
    var unitId = $('adm-essay-unit').value;
    var box = $('adm-essays');
    box.innerHTML = '<p class="adm-muted">⏳ 載入中…</p>';
    window.fbDb.collection(FL_COL_ESSAYS).doc(unitId).get().then(function (s) {
      box.innerHTML = '';
      var blocks = (s.exists && Array.isArray(s.data().blocks)) ? s.data().blocks : [];
      if (!blocks.length) { box.appendChild(essayBlockEl('', [])); return; }
      blocks.forEach(function (b) { box.appendChild(essayBlockEl(b.heading, b.points)); });
    }).catch(function (e) {
      box.innerHTML = '<p class="adm-err">讀取失敗：' + esc(e.code || e.message) + '</p>';
    });
  };

  window.flSaveEssays = function () {
    var unitId = $('adm-essay-unit').value;
    var st = $('adm-essay-status');
    st.textContent = '⏳ 儲存中…';
    var blocks = [];
    $('adm-essays').querySelectorAll('.adm-essay-block').forEach(function (el) {
      var heading = el.querySelector('.adm-essay-heading').value.trim();
      var points = el.querySelector('textarea').value
        .split('\n').map(function (x) { return x.trim(); }).filter(Boolean);
      if (heading || points.length) blocks.push({ heading: heading, points: points });
    });
    window.fbDb.collection(FL_COL_ESSAYS).doc(unitId).set({
      blocks: blocks,
      updatedBy: state.access.email,
      updatedAt: ts()
    }).then(function () {
      st.textContent = '✅ 已儲存（' + blocks.length + ' 則）';
    }).catch(function (e) {
      st.textContent = '❌ ' + (e.code || e.message);
    });
  };

  /* ---------- 區塊 C：教師白名單（Owner only） ---------- */
  window.flAddTeacher = function () {
    var input = $('adm-wl-email');
    var email = (input.value || '').trim().toLowerCase();
    var st = $('adm-wl-status');
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) { st.textContent = '❌ Email 格式不正確'; return; }
    if (email === FOREST_LAW_OWNER_EMAIL) { st.textContent = '⚠️ Owner 為信任根，不需加入白名單'; return; }
    st.textContent = '⏳ 新增中…';
    window.fbDb.collection(FL_COL_TEACHERS).doc(email).set({
      email: email, role: 'teacher',
      addedBy: state.access.email, addedAt: ts()
    }).then(function () {
      input.value = ''; st.textContent = '✅ 已新增 ' + email; loadTeachers();
    }).catch(function (e) { st.textContent = '❌ ' + (e.code || e.message); });
  };

  function removeTeacher(email) {
    var st = $('adm-wl-status');
    st.textContent = '⏳ 移除中…';
    window.fbDb.collection(FL_COL_TEACHERS).doc(email).delete().then(function () {
      st.textContent = '✅ 已移除 ' + email; loadTeachers();
    }).catch(function (e) { st.textContent = '❌ ' + (e.code || e.message); });
  }

  function loadTeachers() {
    var box = $('adm-wl-list');
    box.innerHTML = '<p class="adm-muted">⏳ 載入中…</p>';
    window.fbDb.collection(FL_COL_TEACHERS).get().then(function (qs) {
      box.innerHTML = '';
      var n = 0;
      qs.forEach(function (doc) {
        n++;
        var email = doc.id;
        var row = document.createElement('div');
        row.className = 'adm-row adm-wl-item';
        row.innerHTML =
          '<span class="adm-wl-email">' + esc(email) + '</span>' +
          '<button class="adm-btn adm-btn-danger">移除</button>';
        row.querySelector('button').addEventListener('click', function () {
          if (window.confirm('確定移除教師 ' + email + ' 的後臺權限？')) removeTeacher(email);
        });
        box.appendChild(row);
      });
      if (!n) box.innerHTML = '<p class="adm-muted">目前白名單為空（僅 Owner 可操作）。</p>';
    }).catch(function (e) {
      box.innerHTML = '<p class="adm-err">讀取失敗：' + esc(e.code || e.message) + '</p>';
    });
  }

  /* ---------- 啟動 ---------- */
  window.flOnAuth(render);
})();
