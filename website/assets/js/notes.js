/* ================================================================
 * notes.js — 使用者筆記(本機儲存 + 匯出為檔案)
 * ----------------------------------------------------------------
 *  功能:
 *    1. 自動保存筆記到 localStorage(每 10 秒 + 失焦時)
 *    2. 按「💾 儲存」按鈕 → 彈出對話框
 *       - 讓使用者選擇檔案格式:PDF / Word(.doc)/ 純文字(.txt)
 *       - 讓使用者選擇儲存位置:
 *           a. 支援 File System Access API 的瀏覽器(Chrome/Edge)
 *              → 呼叫 window.showSaveFilePicker(),跳出原生儲存對話框,
 *                使用者可選擇磁碟、目錄、檔名
 *           b. 其他瀏覽器(Firefox/Safari)
 *              → 使用 <a download> 觸發下載(存到瀏覽器預設下載目錄)
 *    3. 仍然把筆記同步到 localStorage(下次回來時自動還原)
 *
 *  依賴:
 *    - html2pdf.js(產生 PDF 時動態載入,若頁面已載入則直接用)
 * ================================================================ */

(function () {
  'use strict';

  /* ---------- 基礎:localStorage 自動保存/還原 ---------- */
  function getKey() {
    return 'forest-law-notes-' + (window.UNIT_ID || 'global');
  }

  function loadNotes() {
    const el = document.getElementById('user-notes');
    if (!el) return;
    const saved = localStorage.getItem(getKey());
    if (saved) el.value = saved;
  }

  function silentPersist() {
    const el = document.getElementById('user-notes');
    if (!el) return;
    localStorage.setItem(getKey(), el.value || '');
  }

  // 每 10 秒自動儲存
  setInterval(silentPersist, 10000);
  // 失焦時也儲存一次
  window.addEventListener('DOMContentLoaded', function () {
    loadNotes();
    const el = document.getElementById('user-notes');
    if (el) el.addEventListener('blur', silentPersist);
  });

  /* ---------- 工具函式 ---------- */
  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  function getDateStr() {
    const d = new Date();
    const pad = function (n) { return String(n).padStart(2, '0'); };
    return d.getFullYear() + pad(d.getMonth() + 1) + pad(d.getDate()) +
           '_' + pad(d.getHours()) + pad(d.getMinutes());
  }

  function getPageTitle() {
    // 優先讀 window.UNIT_ID(例如 1、2…)→ "單元 1 筆記"
    if (window.UNIT_ID) return '單元 ' + window.UNIT_ID + ' 筆記';
    return '我的筆記';
  }

  /** 嘗試動態載入 html2pdf.js(若尚未載入) */
  function ensureHtml2Pdf() {
    return new Promise(function (resolve, reject) {
      if (typeof window.html2pdf !== 'undefined') return resolve();
      const existing = document.querySelector('script[data-html2pdf]');
      if (existing) {
        existing.addEventListener('load', function () { resolve(); });
        existing.addEventListener('error', function () { reject(new Error('html2pdf.js 載入失敗')); });
        return;
      }
      const s = document.createElement('script');
      s.src = 'https://cdn.jsdelivr.net/npm/html2pdf.js@0.10.1/dist/html2pdf.bundle.min.js';
      s.setAttribute('data-html2pdf', '1');
      s.onload = function () { resolve(); };
      s.onerror = function () { reject(new Error('html2pdf.js 載入失敗,請檢查網路')); };
      document.head.appendChild(s);
    });
  }

  /** 把筆記純文字轉成 HTML 段落 */
  function notesToHtml(notes, title) {
    const safeTitle = escapeHtml(title);
    const now = new Date().toLocaleString('zh-TW');
    const paragraphs = (notes || '').split(/\n{2,}/).map(function (p) {
      return '<p>' + escapeHtml(p).replace(/\n/g, '<br>') + '</p>';
    }).join('\n');
    return (
      '<div class="np-header">' +
        '<h1>' + safeTitle + '</h1>' +
        '<div class="np-meta">產生時間:' + now + ' · 來源:林業政策與法規知識網</div>' +
      '</div>' +
      '<div class="np-body">' + (paragraphs || '<p><em>(筆記為空)</em></p>') + '</div>' +
      '<div class="np-footer">本筆記由林業政策與法規知識網產生</div>'
    );
  }

  /* ---------- 檔案產生:PDF / Word / TXT ---------- */

  /** 產生 PDF — 透過隱藏 iframe 觸發列印對話框（使用者選「另存為 PDF」）*/
  function generatePdfViaprint(notes, title) {
    var htmlContent = notesToHtml(notes, title);
    var fullHTML = [
      '<!DOCTYPE html><html lang="zh-TW"><head><meta charset="UTF-8">',
      '<title>' + escapeHtml(title) + '</title>',
      '<style>',
      '@page { size: A4; margin: 18mm 16mm; }',
      '* { box-sizing: border-box; }',
      'body { margin:0; padding:40px 48px; background:#fff; color:#222; font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif; font-size:14px; line-height:1.85; }',
      '.np-header { border-bottom:3px double #1e3a2f; padding-bottom:10px; margin-bottom:18px; }',
      '.np-header h1 { margin:0 0 6px; font-size:22px; color:#1e3a2f; }',
      '.np-meta { font-size:12px; color:#666; }',
      '.np-body p { margin:0 0 12px; text-align:justify; word-break:break-word; }',
      '.np-body em { color:#888; }',
      '.np-footer { margin-top:22px; padding-top:10px; border-top:1px solid #ccc; font-size:11px; color:#888; text-align:center; }',
      '</style></head><body>',
      htmlContent,
      '</body></html>'
    ].join('\n');

    // 使用隱藏 iframe 觸發列印,避免彈出視窗被封鎖
    var oldFrame = document.getElementById('notes-savepdf-iframe');
    if (oldFrame) oldFrame.remove();

    var iframe = document.createElement('iframe');
    iframe.id = 'notes-savepdf-iframe';
    iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;';
    document.body.appendChild(iframe);

    iframe.addEventListener('load', function () {
      setTimeout(function () { iframe.contentWindow.print(); }, 300);
    });

    iframe.srcdoc = fullHTML;
  }

  /** 相容：原來呼叫 generatePdfBlob 的地方改用新方式 */
  async function generatePdfBlob(notes, title) {
    // 改為直接開新視窗列印,不再產生 Blob
    generatePdfViaprint(notes, title);
    // 回傳 null 讓呼叫端跳過 Blob 處理
    return null;
  }

  /** 產生 Word(.doc)Blob — 用 HTML + Word MIME 包裝 */
  function generateWordBlob(notes, title) {
    const html =
      '<html xmlns:o="urn:schemas-microsoft-com:office:office" ' +
            'xmlns:w="urn:schemas-microsoft-com:office:word" ' +
            'xmlns="http://www.w3.org/TR/REC-html40">' +
      '<head><meta charset="UTF-8"><title>' + escapeHtml(title) + '</title>' +
      '<!--[if gte mso 9]><xml>' +
      '<w:WordDocument><w:View>Print</w:View><w:Zoom>100</w:Zoom>' +
      '<w:DoNotOptimizeForBrowser/></w:WordDocument></xml><![endif]-->' +
      '<style>' +
      '@page WordSection1 { size: A4; margin: 2.5cm 2cm; mso-page-orientation: portrait; }' +
      'div.WordSection1 { page: WordSection1; }' +
      'body { font-family: "Microsoft JhengHei","Noto Sans TC","PingFang TC",sans-serif; font-size: 12pt; line-height: 1.75; }' +
      '.np-header { border-bottom: 2px solid #1e3a2f; padding-bottom: 8px; margin-bottom: 14px; }' +
      '.np-header h1 { font-size: 18pt; color: #1e3a2f; margin: 0 0 4px; }' +
      '.np-meta { font-size: 10pt; color: #666; }' +
      '.np-body p { margin: 0 0 10px; text-align: justify; }' +
      '.np-body em { color:#888; }' +
      '.np-footer { margin-top: 18px; padding-top: 8px; border-top: 1px solid #ccc; font-size: 9pt; color: #888; text-align: center; }' +
      '</style></head>' +
      '<body><div class="WordSection1">' + notesToHtml(notes, title) + '</div></body></html>';

    // 加上 BOM 讓 Word 正確辨識 UTF-8
    const bom = '\uFEFF';
    return new Blob([bom + html], { type: 'application/msword' });
  }

  /** 產生純文字 Blob */
  function generateTxtBlob(notes, title) {
    const now = new Date().toLocaleString('zh-TW');
    const content =
      title + '\n' +
      '產生時間:' + now + '\n' +
      '來源:林業政策與法規知識網\n' +
      '========================================\n\n' +
      (notes || '(筆記為空)') + '\n\n' +
      '----------------------------------------\n' +
      '本筆記由林業政策與法規知識網產生\n';
    return new Blob(['\uFEFF' + content], { type: 'text/plain;charset=utf-8' });
  }

  /* ---------- 檔案儲存:File System Access API + 下載 fallback ---------- */

  /**
   * 把 blob 存到本機。
   * 優先使用 window.showSaveFilePicker()(Chrome/Edge)讓使用者選擇磁碟/目錄/檔名。
   * 若不支援,則用 <a download> 下載到瀏覽器預設下載目錄。
   * 若瀏覽器設定為「每次下載前詢問位置」,此 fallback 也會跳出對話框。
   */
  async function saveBlobToDisk(blob, suggestedName, format) {
    // format: 'pdf' | 'doc' | 'txt'
    const pickerTypes = {
      pdf: {
        description: 'PDF 文件',
        accept: { 'application/pdf': ['.pdf'] }
      },
      doc: {
        description: 'Word 文件',
        accept: { 'application/msword': ['.doc'] }
      },
      txt: {
        description: '純文字檔',
        accept: { 'text/plain': ['.txt'] }
      }
    };

    // 方法 A:File System Access API(Chrome 86+ / Edge 86+)
    if (typeof window.showSaveFilePicker === 'function') {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: suggestedName,
          types: [pickerTypes[format]]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
        return { method: 'picker', name: handle.name };
      } catch (err) {
        // 使用者取消 → 直接中止,不做 fallback
        if (err && (err.name === 'AbortError' || err.code === 20)) {
          return { method: 'cancelled' };
        }
        // 其他錯誤 → 改走下載 fallback
        console.warn('[notes] showSaveFilePicker 失敗,改用下載 fallback:', err);
      }
    }

    // 方法 B:<a download> 下載(存到瀏覽器預設下載資料夾)
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = suggestedName;
    a.style.display = 'none';
    document.body.appendChild(a);
    a.click();
    setTimeout(function () {
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    }, 500);
    return { method: 'download', name: suggestedName };
  }

  /* ---------- 儲存對話框 UI ---------- */
  let saveDialog = null;

  function buildSaveDialog() {
    const d = document.createElement('div');
    d.className = 'notes-save-dialog';
    d.innerHTML =
      '<div class="nsd-mask"></div>' +
      '<div class="nsd-box" role="dialog" aria-modal="true" aria-label="儲存筆記">' +
        '<div class="nsd-title">💾 儲存筆記到本機</div>' +
        '<div class="nsd-desc">請選擇檔案格式,接著會開啟系統儲存對話框讓你選擇磁碟與資料夾位置。</div>' +
        '<div class="nsd-options">' +
          '<label class="nsd-opt"><input type="radio" name="nsd-format" value="pdf" checked>' +
            '<span class="nsd-opt-title">📄 PDF 檔(.pdf)</span>' +
            '<span class="nsd-opt-hint">適合列印、歸檔、跨平台閱讀</span>' +
          '</label>' +
          '<label class="nsd-opt"><input type="radio" name="nsd-format" value="doc">' +
            '<span class="nsd-opt-title">📝 Word 檔(.doc)</span>' +
            '<span class="nsd-opt-hint">可用 Microsoft Word / LibreOffice 編輯</span>' +
          '</label>' +
          '<label class="nsd-opt"><input type="radio" name="nsd-format" value="txt">' +
            '<span class="nsd-opt-title">📃 純文字(.txt)</span>' +
            '<span class="nsd-opt-hint">最簡單、體積最小、任何編輯器都能開</span>' +
          '</label>' +
        '</div>' +
        '<div class="nsd-actions">' +
          '<button type="button" class="nsd-btn nsd-btn-cancel">取消</button>' +
          '<button type="button" class="nsd-btn nsd-btn-save">儲存到本機</button>' +
        '</div>' +
        '<div class="nsd-status" aria-live="polite"></div>' +
      '</div>';

    d.querySelector('.nsd-mask').addEventListener('click', closeSaveDialog);
    d.querySelector('.nsd-btn-cancel').addEventListener('click', closeSaveDialog);
    d.querySelector('.nsd-btn-save').addEventListener('click', handleSaveClick);

    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape' && d.getAttribute('data-open') === '1') closeSaveDialog();
    });

    document.body.appendChild(d);
    return d;
  }

  function openSaveDialog() {
    if (!saveDialog) saveDialog = buildSaveDialog();
    saveDialog.setAttribute('data-open', '1');
    const status = saveDialog.querySelector('.nsd-status');
    if (status) status.textContent = '';
    const saveBtn = saveDialog.querySelector('.nsd-btn-save');
    if (saveBtn) { saveBtn.disabled = false; saveBtn.textContent = '儲存到本機'; }
  }

  function closeSaveDialog() {
    if (!saveDialog) return;
    saveDialog.removeAttribute('data-open');
  }

  async function handleSaveClick() {
    const notesEl = document.getElementById('user-notes');
    if (!notesEl) {
      alert('找不到筆記欄位。');
      return;
    }
    const notesText = notesEl.value || '';
    if (!notesText.trim()) {
      alert('⚠️ 筆記內容是空的,請先輸入一些文字再儲存。');
      return;
    }

    // 同時把筆記保存到 localStorage
    silentPersist();

    const formatEl = saveDialog.querySelector('input[name="nsd-format"]:checked');
    const format = formatEl ? formatEl.value : 'pdf';
    const title = getPageTitle();
    const baseName = title.replace(/[\\/:*?"<>|]/g, '') + '_' + getDateStr();
    const ext = format === 'doc' ? '.doc' : (format === 'txt' ? '.txt' : '.pdf');
    const suggestedName = baseName + ext;

    const saveBtn = saveDialog.querySelector('.nsd-btn-save');
    const statusEl = saveDialog.querySelector('.nsd-status');
    var origSaveBtnText = saveBtn.textContent;
    saveBtn.disabled = true;
    saveBtn.textContent = '⏳ 產生檔案中...';
    statusEl.textContent = '正在產生 ' + ext + ' 檔案...';

    try {
      let blob;
      if (format === 'pdf') {
        blob = await generatePdfBlob(notesText, title);
        if (!blob) {
          // PDF 改用列印對話框方式,已在新視窗開啟
          saveBtn.textContent = origSaveBtnText || '💾 儲存筆記';
          statusEl.textContent = '已在新視窗開啟列印對話框,請選「另存為 PDF」。';
          return;
        }
      } else if (format === 'doc') {
        blob = generateWordBlob(notesText, title);
      } else {
        blob = generateTxtBlob(notesText, title);
      }

      saveBtn.textContent = '⏳ 等待選擇儲存位置...';
      statusEl.textContent = '請在系統對話框選擇儲存位置。';

      const result = await saveBlobToDisk(blob, suggestedName, format);

      if (result.method === 'cancelled') {
        statusEl.textContent = '已取消儲存。';
        saveBtn.disabled = false;
        saveBtn.textContent = '儲存到本機';
        return;
      }

      if (result.method === 'picker') {
        statusEl.textContent = '✅ 已儲存為 ' + result.name;
      } else {
        statusEl.textContent = '✅ 已下載 ' + result.name + '(請到瀏覽器的下載資料夾查看)';
      }

      showToastSafe('💾 筆記已儲存為 ' + ext.toUpperCase().slice(1) + ' 檔');
      setTimeout(closeSaveDialog, 1200);
    } catch (err) {
      console.error('[notes] 儲存失敗:', err);
      statusEl.textContent = '❌ 儲存失敗:' + (err.message || err);
      saveBtn.disabled = false;
      saveBtn.textContent = '重試';
    }
  }

  function showToastSafe(msg) {
    if (typeof window.showToast === 'function') {
      try { window.showToast(msg); return; } catch (e) {}
    }
    // fallback:簡單 console + 視覺提示
    console.log('[notes]', msg);
  }

  /* ---------- 對外 API:覆寫 saveNotes() ---------- */
  window.saveNotes = function () {
    openSaveDialog();
  };

  // 方便除錯:暴露 silentPersist 讓外部可手動呼叫
  window.saveNotesSilent = silentPersist;
})();
