/* ========================================
   林業政策與法規知識網 - 主邏輯
   版本:v1.0 · 2026-04-11
   ======================================== */

// ========== 模式切換(學生/教師) ==========
/*
 * 教師模式切換必須輸入「教師密碼」(預設:forest-teacher-2026)
 * 密碼僅為軟性保護,避免學生在公用電腦上誤觸。
 * 管理員可於 localStorage 設定 'forest-law-teacher-pwd' 覆蓋。
 */
const TEACHER_PASSWORD_DEFAULT = 'forest-teacher-2026';

function getTeacherPassword() {
  return localStorage.getItem('forest-law-teacher-pwd') || TEACHER_PASSWORD_DEFAULT;
}

function isTeacherAuthenticated() {
  return sessionStorage.getItem('forest-law-teacher-auth') === '1';
}

function setMode(mode, opts) {
  opts = opts || {};
  // 切換至教師模式必須通過密碼驗證(除非 silent=true 用於初始化還原)
  if (mode === 'teacher' && !opts.silent && !isTeacherAuthenticated()) {
    const input = window.prompt(
      '🛠️ 切換至教師模式需輸入密碼:\n(學生請點「👩‍🎓 學生」即可正常閱讀)',
      ''
    );
    if (input === null) {
      // 使用者取消,退回原模式
      const prev = document.body.dataset.mode || 'student';
      document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
      const prevBtn = document.getElementById('mode-' + prev);
      if (prevBtn) prevBtn.classList.add('active');
      return;
    }
    if (input !== getTeacherPassword()) {
      showToast('❌ 密碼錯誤,已保留學生模式');
      // 退回學生模式
      setMode('student', { silent: true });
      return;
    }
    sessionStorage.setItem('forest-law-teacher-auth', '1');
  }

  if (mode === 'student') {
    // 登出教師模式:清除 session 驗證
    sessionStorage.removeItem('forest-law-teacher-auth');
  }

  document.body.dataset.mode = mode;
  localStorage.setItem('forest-law-mode', mode);

  // 更新按鈕狀態
  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  const targetBtn = document.getElementById('mode-' + mode);
  if (targetBtn) targetBtn.classList.add('active');

  // 顯示提示
  if (!opts.silent) {
    const label =
      mode === 'teacher'
        ? '🛠️ 已切換至教師模式 — 可編輯影片/備註/題庫'
        : '👩‍🎓 已切換至學生模式 — 唯讀';
    showToast(label);
  }
}

/**
 * 保護:學生模式下禁止執行需要教師權限的動作
 * 在任何「寫入操作」前呼叫:若為學生模式,阻擋並提示
 */
function requireTeacherMode(actionLabel) {
  if (document.body.dataset.mode !== 'teacher') {
    showToast('🔒 ' + (actionLabel || '此操作') + '需要教師模式');
    return false;
  }
  return true;
}

// 還原上次模式
window.addEventListener('DOMContentLoaded', () => {
  // 重要:頁面載入時不跳密碼框,一律以「已儲存的身份」還原。
  // 若儲存為 teacher 但 sessionStorage 未驗證(例如關掉瀏覽器重開),
  // 則降級為 student 模式以確保預設為唯讀狀態。
  let savedMode = localStorage.getItem('forest-law-mode') || 'student';
  if (savedMode === 'teacher' && !isTeacherAuthenticated()) {
    savedMode = 'student';
    localStorage.setItem('forest-law-mode', 'student');
  }
  setMode(savedMode, { silent: true });

  // 標記當前單元
  const path = location.pathname.split('/').pop();
  document.querySelectorAll('.unit-link').forEach(link => {
    if (link.getAttribute('href') === path) {
      link.classList.add('active');
    }
  });

  // 載入進度
  renderProgress();
});

// ========== Toast 提示 ==========
function showToast(message) {
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = message;
  toast.style.cssText = `
    position: fixed;
    bottom: 80px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(45, 106, 79, 0.95);
    color: white;
    padding: 12px 24px;
    border-radius: 24px;
    font-size: 14px;
    z-index: 10001;
    box-shadow: 0 4px 20px rgba(0,0,0,0.2);
    animation: fadeInOut 2.5s ease forwards;
  `;
  document.body.appendChild(toast);
  setTimeout(() => toast.remove(), 2500);
}

// Toast 動畫
const style = document.createElement('style');
style.textContent = `
@keyframes fadeInOut {
  0% { opacity: 0; transform: translateX(-50%) translateY(10px); }
  15% { opacity: 1; transform: translateX(-50%) translateY(0); }
  85% { opacity: 1; transform: translateX(-50%) translateY(0); }
  100% { opacity: 0; transform: translateX(-50%) translateY(-10px); }
}
`;
document.head.appendChild(style);

// ========== 搜尋功能(關鍵字即時篩選) ==========
function searchContent(keyword) {
  const results = document.getElementById('search-results');
  results.innerHTML = '';

  if (!keyword || keyword.length < 2) return;

  // 搜尋單元卡片與導覽
  const matches = [];
  document.querySelectorAll('.unit-card, .unit-link').forEach(el => {
    if (el.textContent.includes(keyword)) {
      const title = el.querySelector('.unit-title')?.textContent
                 || el.textContent.trim().split('\n')[0];
      const href = el.getAttribute('href');
      if (href && !matches.find(m => m.href === href)) {
        matches.push({ title, href });
      }
    }
  });

  // 搜尋頁面內文(若在單元頁)
  const body = document.querySelector('.lecture-body');
  if (body) {
    const regex = new RegExp(keyword, 'gi');
    body.querySelectorAll('h2, h3, h4, p, li').forEach(el => {
      if (regex.test(el.textContent)) {
        const preview = el.textContent.substring(0, 80) + '...';
        matches.push({ title: preview, anchor: true, el });
      }
    });
  }

  if (matches.length === 0) {
    results.innerHTML = '<li style="color:#999">找不到相關內容</li>';
    return;
  }

  matches.slice(0, 10).forEach(m => {
    const li = document.createElement('li');
    if (m.href) {
      li.innerHTML = `🔗 <a href="${m.href}">${m.title}</a>`;
    } else if (m.anchor && m.el) {
      li.innerHTML = `📍 ${m.title}`;
      li.style.cursor = 'pointer';
      li.onclick = () => {
        m.el.scrollIntoView({ behavior: 'smooth', block: 'center' });
        m.el.style.background = '#fff176';
        setTimeout(() => m.el.style.background = '', 2000);
      };
    }
    results.appendChild(li);
  });
}

// ========== 分頁標籤切換 ==========
function switchTab(tabName) {
  document.querySelectorAll('.tab-btn').forEach(b => b.classList.remove('active'));
  document.querySelectorAll('.tab-content').forEach(c => c.classList.remove('active'));

  document.getElementById('tab-btn-' + tabName).classList.add('active');
  document.getElementById('tab-content-' + tabName).classList.add('active');

  // 切到簡報分頁時,觸發 PDF.js 重新依容器寬度渲染
  if (tabName === 'slide' && typeof window.slideViewerRelayout === 'function') {
    window.slideViewerRelayout();
  }
}

// ========== 題庫批改 ==========
function answerQuestion(questionId, optionIndex, correctAnswer) {
  const q = document.getElementById(questionId);
  if (!q || q.classList.contains('answered')) return;

  q.classList.add('answered');
  const options = q.querySelectorAll('.question-options li');
  const correctIndex = ['A', 'B', 'C', 'D'].indexOf(correctAnswer);

  options.forEach((opt, i) => {
    if (i === optionIndex) opt.classList.add('selected');
    if (i === correctIndex) opt.classList.add('correct');
    if (i === optionIndex && i !== correctIndex) opt.classList.add('wrong');
  });

  // 記錄答題結果
  saveQuizResult(questionId, optionIndex === correctIndex);
  updateQuizSummary();
}

function saveQuizResult(questionId, correct) {
  const key = 'forest-law-quiz-' + (window.UNIT_ID || 'unknown');
  const data = JSON.parse(localStorage.getItem(key) || '{}');
  data[questionId] = correct;
  localStorage.setItem(key, JSON.stringify(data));
}

function updateQuizSummary() {
  const key = 'forest-law-quiz-' + (window.UNIT_ID || 'unknown');
  const data = JSON.parse(localStorage.getItem(key) || '{}');
  const total = Object.keys(data).length;
  const correct = Object.values(data).filter(v => v).length;
  const summary = document.getElementById('quiz-summary');
  if (summary) {
    const rate = total > 0 ? Math.round(correct / total * 100) : 0;
    summary.innerHTML = `📊 已完成 ${total} / 10 題 · 答對 ${correct} 題 · 正確率 ${rate}%`;
  }

  // 更新進度
  renderProgress();
}

// ========== 學習進度顯示 ==========
function renderProgress() {
  const display = document.getElementById('progress-display');
  if (!display) return;

  const progress = [];
  for (let i = 1; i <= 10; i++) {
    const key = 'forest-law-quiz-' + i;
    const data = JSON.parse(localStorage.getItem(key) || '{}');
    const count = Object.keys(data).length;
    progress.push({ unit: i, count, max: 10 });
  }

  display.innerHTML = progress.map(p => `
    <div class="progress-item">
      <span>U${p.unit}</span>
      <span>${p.count}/${p.max}</span>
    </div>
    <div class="progress-bar">
      <div class="progress-fill" style="width:${p.count * 10}%"></div>
    </div>
  `).join('');
}

// ========== YouTube 嵌入處理 ==========
/**
 * 設定 YouTube 影片(寫入 localStorage 與 iframe)
 * - 學生模式下禁止寫入(只能讀取已存在的影片)
 * - 內部參數 _fromRestore=true 代表是啟動時還原,不做教師檢查
 */
function setVideoUrl(slot, url, _fromRestore) {
  // 還原以外的「手動輸入」需要教師權限
  if (!_fromRestore && !requireTeacherMode('編輯影片網址')) {
    // 回復 input 顯示上次儲存值
    const inputEl = document.getElementById('video-input-' + slot);
    const key = 'forest-law-video-' + (window.UNIT_ID || 'x') + '-' + slot;
    if (inputEl) inputEl.value = localStorage.getItem(key) || '';
    return;
  }

  const container = document.getElementById('video-slot-' + slot);
  if (!container) return;

  // 支援完整 URL 或 video ID
  let videoId = (url || '').trim();
  const match = videoId.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/);
  if (match) videoId = match[1];

  if (!videoId) {
    container.innerHTML = '<div class="video-placeholder">(尚未設定影片)</div>';
    return;
  }

  container.innerHTML = `
    <iframe class="video-iframe"
      src="https://www.youtube.com/embed/${videoId}"
      title="教學影片"
      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope"
      allowfullscreen></iframe>
  `;

  // 儲存(還原時不重寫)
  if (!_fromRestore) {
    const key = 'forest-law-video-' + (window.UNIT_ID || 'x') + '-' + slot;
    localStorage.setItem(key, videoId);
  }
}

// 還原 YouTube 影片(啟動時呼叫,不受模式保護)
function restoreVideos() {
  if (!window.UNIT_ID) return;
  for (let i = 1; i <= 3; i++) {
    const key = 'forest-law-video-' + window.UNIT_ID + '-' + i;
    const saved = localStorage.getItem(key);
    const input = document.getElementById('video-input-' + i);
    if (saved) {
      if (input) input.value = saved;
      setVideoUrl(i, saved, true /* _fromRestore */);
    }
  }
}

window.addEventListener('DOMContentLoaded', restoreVideos);
