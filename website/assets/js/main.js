/* ========================================
   林業政策與法規知識網 - 主邏輯
   版本:v2.0 · 2026-05-17
   ----------------------------------------
   v2.0 變更:
   - 移除寫死教師密碼與 sessionStorage 軟性驗證(改由 Firebase Auth)。
   - setMode 僅負責「視覺」切換;真正的教師授權由 Firebase Auth +
     Firestore Rules 決定,並由 unit-firebase.js 驅動。
   - 移除 localStorage 影片邏輯;補充影片改由 Firestore 集中供應
     (見 unit-firebase.js)。
   ======================================== */

// ========== 模式切換(僅視覺;授權見 unit-firebase.js / Firebase) ==========
function setMode(mode, opts) {
  opts = opts || {};
  document.body.dataset.mode = mode;

  document.querySelectorAll('.mode-btn').forEach(b => b.classList.remove('active'));
  const targetBtn = document.getElementById('mode-' + mode);
  if (targetBtn) targetBtn.classList.add('active');

  if (!opts.silent) {
    showToast(mode === 'teacher' ? '🛠️ 教師檢視' : '👩‍🎓 學生檢視');
  }
}

window.addEventListener('DOMContentLoaded', () => {
  // 預設一律學生(唯讀);若為授權教師,unit-firebase.js 會在
  // Firebase 驗證後自動切換為教師檢視。
  setMode('student', { silent: true });

  // 標記當前單元
  const path = location.pathname.split('/').pop();
  document.querySelectorAll('.unit-link').forEach(link => {
    if (link.getAttribute('href') === path) {
      link.classList.add('active');
    }
  });

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
