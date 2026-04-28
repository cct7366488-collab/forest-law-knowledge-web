/* ================================================================
 * slides.js — 以 PDF.js 在單元頁內播放教學簡報(手動切頁)
 * ----------------------------------------------------------------
 *  依賴:全域變數 pdfjsLib(來自 pdf.min.js CDN)、UNIT_ID(數字)
 *  DOM 期望:
 *    #slide-canvas      <canvas>   — 渲染投影片
 *    #slide-page-cur    <span>     — 目前頁數
 *    #slide-page-total  <span>     — 總頁數
 *    #slide-btn-prev    <button>   — 上一頁
 *    #slide-btn-next    <button>   — 下一頁
 *    #slide-btn-first   <button>   — 第一頁(可選)
 *    #slide-btn-last    <button>   — 最後一頁(可選)
 *    #slide-loading     元素       — 載入中提示
 * ================================================================ */

(function () {
  'use strict';

  // 全域狀態
  const state = {
    pdfDoc: null,
    pageNum: 1,
    pageCount: 0,
    pageRendering: false,
    pageNumPending: null,
    scale: 1.4,
    canvas: null,
    ctx: null,
  };

  /** 取得目前單元對應的 PDF 路徑 */
  function getPdfPath() {
    const id = typeof UNIT_ID !== 'undefined' ? UNIT_ID : 1;
    const padded = String(id).padStart(2, '0');
    return `assets/slides/unit-${padded}.pdf`;
  }

  /** 計算黑板色的背景繪製 */
  function drawBackground(ctx, w, h) {
    ctx.fillStyle = '#1e3a2f';
    ctx.fillRect(0, 0, w, h);
  }

  /** 繪製指定頁面 */
  function renderPage(num) {
    if (!state.pdfDoc) return;
    state.pageRendering = true;

    state.pdfDoc.getPage(num).then(function (page) {
      // 依 16:9 stage 的寬高自動縮放,讓簡報 contain 在舞台內
      const stage = state.canvas.parentElement; // .slide-viewer-stage (16:9)
      const stageW = Math.max(320, stage.clientWidth - 8);
      const stageH = Math.max(180, stage.clientHeight - 8);
      const viewport1 = page.getViewport({ scale: 1 });
      const scaleByW = stageW / viewport1.width;
      const scaleByH = stageH / viewport1.height;
      const scale = Math.min(scaleByW, scaleByH); // contain 不超出 16:9 邊界
      state.scale = scale;
      const viewport = page.getViewport({ scale });

      const outputScale = window.devicePixelRatio || 1;
      state.canvas.width = Math.floor(viewport.width * outputScale);
      state.canvas.height = Math.floor(viewport.height * outputScale);
      state.canvas.style.width = Math.floor(viewport.width) + 'px';
      state.canvas.style.height = Math.floor(viewport.height) + 'px';

      // 先畫黑板底色(避免白邊閃爍)
      drawBackground(state.ctx, state.canvas.width, state.canvas.height);

      const transform =
        outputScale !== 1 ? [outputScale, 0, 0, outputScale, 0, 0] : null;

      const renderContext = {
        canvasContext: state.ctx,
        transform: transform,
        viewport: viewport,
        background: '#1e3a2f',
      };

      const renderTask = page.render(renderContext);
      renderTask.promise.then(function () {
        state.pageRendering = false;
        hideLoading();
        if (state.pageNumPending !== null) {
          renderPage(state.pageNumPending);
          state.pageNumPending = null;
        }
      });

      // 更新頁碼顯示
      const curEl = document.getElementById('slide-page-cur');
      if (curEl) curEl.textContent = num;
    });
  }

  function queueRenderPage(num) {
    if (state.pageRendering) {
      state.pageNumPending = num;
    } else {
      renderPage(num);
    }
  }

  function onPrevPage() {
    if (state.pageNum <= 1) return;
    state.pageNum--;
    queueRenderPage(state.pageNum);
    updateButtons();
  }

  function onNextPage() {
    if (!state.pdfDoc || state.pageNum >= state.pdfDoc.numPages) return;
    state.pageNum++;
    queueRenderPage(state.pageNum);
    updateButtons();
  }

  function onFirstPage() {
    if (!state.pdfDoc || state.pageNum === 1) return;
    state.pageNum = 1;
    queueRenderPage(state.pageNum);
    updateButtons();
  }

  function onLastPage() {
    if (!state.pdfDoc || state.pageNum === state.pdfDoc.numPages) return;
    state.pageNum = state.pdfDoc.numPages;
    queueRenderPage(state.pageNum);
    updateButtons();
  }

  function updateButtons() {
    const prev = document.getElementById('slide-btn-prev');
    const next = document.getElementById('slide-btn-next');
    const first = document.getElementById('slide-btn-first');
    const last = document.getElementById('slide-btn-last');
    if (prev) prev.disabled = state.pageNum <= 1;
    if (first) first.disabled = state.pageNum <= 1;
    if (next) next.disabled = !state.pdfDoc || state.pageNum >= state.pdfDoc.numPages;
    if (last) last.disabled = !state.pdfDoc || state.pageNum >= state.pdfDoc.numPages;
  }

  function showLoading(msg) {
    const el = document.getElementById('slide-loading');
    if (el) {
      el.style.display = 'block';
      if (msg) el.textContent = msg;
    }
  }

  function hideLoading() {
    const el = document.getElementById('slide-loading');
    if (el) el.style.display = 'none';
  }

  function showError(msg) {
    const el = document.getElementById('slide-loading');
    if (el) {
      el.style.display = 'block';
      el.innerHTML =
        '<span style="color:#c44;">⚠️ ' +
        msg +
        '</span><br><small style="color:#888;">如瀏覽器無法顯示,請改用下方 ⬇️ 下載 PPTX</small>';
    }
  }

  /** 初始化 */
  function init() {
    state.canvas = document.getElementById('slide-canvas');
    if (!state.canvas) return; // 此頁沒有簡報區,跳過
    state.ctx = state.canvas.getContext('2d');

    if (typeof pdfjsLib === 'undefined') {
      showError('PDF.js 未載入,請檢查網路連線');
      return;
    }

    // 設定 worker(CDN)
    pdfjsLib.GlobalWorkerOptions.workerSrc =
      'https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js';

    const path = getPdfPath();
    showLoading('📥 載入簡報中...');

    const loadingTask = pdfjsLib.getDocument(path);
    loadingTask.promise
      .then(function (pdfDoc) {
        state.pdfDoc = pdfDoc;
        state.pageCount = pdfDoc.numPages;
        const totalEl = document.getElementById('slide-page-total');
        if (totalEl) totalEl.textContent = pdfDoc.numPages;
        renderPage(state.pageNum);
        updateButtons();
      })
      .catch(function (err) {
        console.error('[slides] PDF 載入失敗:', err);
        showError('簡報載入失敗 — ' + (err.message || err));
      });

    // 按鈕事件
    const prev = document.getElementById('slide-btn-prev');
    const next = document.getElementById('slide-btn-next');
    const first = document.getElementById('slide-btn-first');
    const last = document.getElementById('slide-btn-last');
    if (prev) prev.addEventListener('click', onPrevPage);
    if (next) next.addEventListener('click', onNextPage);
    if (first) first.addEventListener('click', onFirstPage);
    if (last) last.addEventListener('click', onLastPage);

    // 鍵盤快捷鍵(僅當焦點在簡報分頁時作用)
    document.addEventListener('keydown', function (e) {
      // 必須在 tab-content-slide 為 active 時才處理
      const slideTab = document.getElementById('tab-content-slide');
      if (!slideTab || !slideTab.classList.contains('active')) return;
      // 忽略在輸入框的按鍵
      const tag = (e.target && e.target.tagName) || '';
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft' || e.key === 'PageUp') {
        onPrevPage();
        e.preventDefault();
      } else if (e.key === 'ArrowRight' || e.key === 'PageDown' || e.key === ' ') {
        onNextPage();
        e.preventDefault();
      } else if (e.key === 'Home') {
        onFirstPage();
        e.preventDefault();
      } else if (e.key === 'End') {
        onLastPage();
        e.preventDefault();
      }
    });

    // 視窗縮放時重新渲染
    let resizeTimer;
    window.addEventListener('resize', function () {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(function () {
        if (state.pdfDoc) renderPage(state.pageNum);
      }, 200);
    });
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // 暴露給 main.js 的 switchTab() 使用(切到簡報分頁時重算尺寸)
  window.slideViewerRelayout = function () {
    if (state.pdfDoc) {
      setTimeout(function () {
        renderPage(state.pageNum);
      }, 50);
    }
  };
})();
