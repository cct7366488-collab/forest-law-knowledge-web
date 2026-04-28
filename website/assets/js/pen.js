/* ========================================
   畫筆工具 - Canvas Overlay
   支援:黑、紅、藍、綠、螢光黃;筆粗 1-20px;清除;開關
   ======================================== */

let penActive = false;
let penColor = '#000000';
let penWidth = 3;
let penHighlight = false;
let isDrawing = false;
let lastX = 0, lastY = 0;

const canvas = document.getElementById('pen-canvas');
const toolbar = document.getElementById('pen-toolbar');
let ctx = null;

function initCanvas() {
  if (!canvas) return;
  canvas.width = window.innerWidth;
  canvas.height = window.innerHeight;
  ctx = canvas.getContext('2d');
  ctx.lineCap = 'round';
  ctx.lineJoin = 'round';
}

initCanvas();
window.addEventListener('resize', () => {
  // 保存現有繪圖
  if (!ctx) return;
  const oldImg = ctx.getImageData(0, 0, canvas.width, canvas.height);
  initCanvas();
  ctx.putImageData(oldImg, 0, 0);
});

// ========== 開關畫筆 ==========
function togglePen() {
  penActive = !penActive;
  if (penActive) {
    canvas.classList.remove('hidden');
    toolbar.classList.remove('hidden');
    document.body.style.userSelect = 'none';
    showToast('✏️ 畫筆已開啟');
  } else {
    canvas.classList.add('hidden');
    toolbar.classList.add('hidden');
    document.body.style.userSelect = '';
    showToast('畫筆已關閉');
  }
}

// ========== 畫筆顏色 ==========
function setPenColor(color, isHighlight = false) {
  penColor = color;
  penHighlight = isHighlight;

  document.querySelectorAll('.pen-color').forEach(b => b.classList.remove('active'));
  event?.target?.classList.add('active');
}

// ========== 筆粗 ==========
function setPenWidth(w) {
  penWidth = parseInt(w);
}

// ========== 清除畫布 ==========
function clearCanvas() {
  if (!ctx) return;
  ctx.clearRect(0, 0, canvas.width, canvas.height);
  showToast('🗑️ 畫布已清除');
}

// ========== 繪圖事件 ==========
function getPointerPos(e) {
  const rect = canvas.getBoundingClientRect();
  if (e.touches && e.touches[0]) {
    return {
      x: e.touches[0].clientX - rect.left,
      y: e.touches[0].clientY - rect.top
    };
  }
  return { x: e.clientX - rect.left, y: e.clientY - rect.top };
}

function startDrawing(e) {
  if (!penActive || !ctx) return;
  e.preventDefault();
  isDrawing = true;
  const pos = getPointerPos(e);
  lastX = pos.x;
  lastY = pos.y;
}

function draw(e) {
  if (!isDrawing || !penActive || !ctx) return;
  e.preventDefault();
  const pos = getPointerPos(e);

  ctx.globalCompositeOperation = 'source-over';
  if (penHighlight) {
    ctx.globalAlpha = 0.4;
    ctx.lineWidth = penWidth * 3;
  } else {
    ctx.globalAlpha = 1;
    ctx.lineWidth = penWidth;
  }
  ctx.strokeStyle = penColor;

  ctx.beginPath();
  ctx.moveTo(lastX, lastY);
  ctx.lineTo(pos.x, pos.y);
  ctx.stroke();

  lastX = pos.x;
  lastY = pos.y;
}

function stopDrawing() {
  isDrawing = false;
}

if (canvas) {
  canvas.addEventListener('mousedown', startDrawing);
  canvas.addEventListener('mousemove', draw);
  canvas.addEventListener('mouseup', stopDrawing);
  canvas.addEventListener('mouseout', stopDrawing);

  canvas.addEventListener('touchstart', startDrawing, { passive: false });
  canvas.addEventListener('touchmove', draw, { passive: false });
  canvas.addEventListener('touchend', stopDrawing);
}

// ========== 鍵盤快捷鍵 ==========
document.addEventListener('keydown', (e) => {
  if (e.key === 'p' && (e.ctrlKey || e.metaKey)) {
    e.preventDefault();
    togglePen();
  }
  if (e.key === 'Escape' && penActive) {
    togglePen();
  }
});
