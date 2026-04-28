/* ================================================================
 * reader.js — Markdown 文件閱讀器
 * ----------------------------------------------------------------
 *  用法:reader.html?src=assets/resources/XX.md&title=可選標題
 *  依賴:
 *    - marked.js (CDN,全域 window.marked) — Markdown 渲染
 *    - html2pdf.js (CDN,全域 window.html2pdf) — 存為 PDF
 *  功能:
 *    - 抓取指定的 .md 檔,用 marked.js 轉成 HTML
 *    - 自動產生章節目錄(TOC)
 *    - 設定頁面標題
 *    - 錨點捲動
 *    - 🖨 列印:透過隱藏 iframe 呼叫系統列印對話框
 *    - 💾 存為 PDF:使用 html2pdf.js 直接下載 PDF 檔案
 * ================================================================ */

(function () {
  'use strict';

  /** 從 URL 取得參數 */
  function getQuery(name) {
    const params = new URLSearchParams(location.search);
    return params.get(name) || '';
  }

  /** 解析 src,做安全限制:僅允許 assets/resources/ 底下的檔案 */
  function sanitizeSrc(src) {
    if (!src) return null;
    // 禁止絕對路徑、protocol、向上脫出
    if (/^([a-z]+:)?\/\//i.test(src)) return null;
    if (src.startsWith('/')) src = src.replace(/^\/+/, '');
    if (src.includes('..')) return null;
    // 僅允許 assets/resources/ 開頭
    if (!src.startsWith('assets/resources/')) return null;
    // 僅允許 .md
    if (!/\.md$/i.test(src)) return null;
    return src;
  }

  /** 顯示錯誤 */
  function showError(msg) {
    const el = document.getElementById('reader-content');
    if (el) {
      el.innerHTML =
        '<div class="reader-error"><strong>⚠️ 無法載入文件</strong><br>' +
        msg +
        '</div>';
    }
  }

  /** 設定頁面標題 */
  function setTitle(t) {
    const el = document.getElementById('reader-title');
    if (el) el.textContent = t;
    document.title = t + ' | 林業政策與法規知識網';
  }

  /** 建立章節目錄(TOC)並插在內容上方 */
  function buildToc(root) {
    const headings = Array.from(root.querySelectorAll('h1, h2, h3, h4'));
    if (headings.length < 3) return; // 章節太少不產生

    const toc = document.createElement('nav');
    toc.className = 'reader-toc';
    const title = document.createElement('div');
    title.className = 'reader-toc-title';
    title.textContent = '📖 章節目錄';
    toc.appendChild(title);

    const list = document.createElement('ul');
    headings.forEach(function (h, i) {
      // 給每個標題加 id(便於錨點)
      if (!h.id) {
        h.id = 'sec-' + i + '-' + (h.textContent || '').trim().slice(0, 20).replace(/\s+/g, '-');
      }
      const li = document.createElement('li');
      li.className = 'toc-' + h.tagName.toLowerCase();
      const a = document.createElement('a');
      a.href = '#' + h.id;
      a.textContent = h.textContent;
      li.appendChild(a);
      list.appendChild(li);
    });
    toc.appendChild(list);

    // 插在第一個標題之後(保留主標題在最上方)
    const firstH1 = root.querySelector('h1');
    if (firstH1 && firstH1.nextSibling) {
      firstH1.parentNode.insertBefore(toc, firstH1.nextSibling);
    } else {
      root.insertBefore(toc, root.firstChild);
    }
  }

  /** 主流程 */
  async function init() {
    const rawSrc = getQuery('src');
    const queryTitle = getQuery('title');

    const src = sanitizeSrc(rawSrc);
    if (!src) {
      showError('無效的文件路徑(僅允許 assets/resources/*.md)。');
      setTitle('❌ 錯誤');
      return;
    }

    if (queryTitle) setTitle(queryTitle);
    else setTitle('📖 載入中...');

    if (typeof marked === 'undefined') {
      showError('Markdown 渲染引擎(marked.js)未載入,請檢查網路。');
      return;
    }

    // 設定 marked 選項
    marked.setOptions({
      gfm: true,
      breaks: false,
      headerIds: true,
      mangle: false,
      pedantic: false,
    });

    try {
      const res = await fetch(src, { cache: 'no-cache' });
      if (!res.ok) {
        throw new Error('HTTP ' + res.status + ' ' + res.statusText);
      }
      const md = await res.text();
      const html = marked.parse(md);
      const content = document.getElementById('reader-content');
      content.innerHTML = html;

      // 若沒指定標題,則用第一個 h1 的文字
      if (!queryTitle) {
        const h1 = content.querySelector('h1');
        if (h1) setTitle(h1.textContent);
        else setTitle('📖 文件閱讀');
      }

      // 產生目錄
      buildToc(content);

      // 把所有外部連結(http/https)設成在新分頁開啟,並加上 rel="noopener"
      // 避免在 reader.html 內部被目前頁面攔截,並提升安全性
      Array.from(content.querySelectorAll('a[href]')).forEach(function (a) {
        const href = a.getAttribute('href') || '';
        if (/^https?:\/\//i.test(href)) {
          a.setAttribute('target', '_blank');
          a.setAttribute('rel', 'noopener noreferrer');
        }
      });

      // 處理錨點(若 URL 帶 hash)
      if (location.hash) {
        setTimeout(function () {
          const target = document.querySelector(location.hash);
          if (target) target.scrollIntoView({ behavior: 'smooth', block: 'start' });
        }, 100);
      }

      // 讓內部的 [#] 錨點連結捲動而不是跳轉
      content.addEventListener('click', function (e) {
        const a = e.target.closest && e.target.closest('a[href^="#"]');
        if (a) {
          e.preventDefault();
          const id = a.getAttribute('href').slice(1);
          const t = document.getElementById(id);
          if (t) {
            t.scrollIntoView({ behavior: 'smooth', block: 'start' });
            history.replaceState(null, '', '#' + id);
          }
        }
      });
    } catch (err) {
      console.error('[reader] 載入失敗:', err);
      showError('讀取文件失敗 — ' + (err.message || err));
      setTitle('❌ 載入失敗');
    }
  }

  /* ----------------------------------------------------------------
   * 共用工具:檢查內容是否已載入
   * ---------------------------------------------------------------- */
  function isContentReady() {
    const content = document.getElementById('reader-content');
    if (!content || !content.innerHTML.trim()) return false;
    if (content.querySelector('.reader-loading, .reader-error')) return false;
    return true;
  }

  function getTitleText() {
    return (document.getElementById('reader-title') || {}).textContent || '文件';
  }

  function escapeHtml(s) {
    return String(s == null ? '' : s)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
  }

  /** 產生列印/PDF 用的完整 HTML 字串(內嵌所有樣式,A4 版式) */
  function buildPrintDocHTML(titleText, contentHTML) {
    const now = new Date().toLocaleString('zh-TW');
    const safeTitle = escapeHtml(titleText);
    return (
'<!DOCTYPE html><html lang="zh-TW"><head><meta charset="UTF-8"><title>' + safeTitle + '</title>' +
'<style>' +
'@page { size: A4; margin: 18mm 16mm; }' +
'* { box-sizing: border-box; }' +
'html,body { margin:0; padding:0; background:#fff; color:#222; font-family:"Noto Sans TC","PingFang TC","Microsoft JhengHei",sans-serif; font-size:11pt; line-height:1.75; }' +
'.pr-header { border-bottom: 3px double #1e3a2f; padding-bottom:10px; margin-bottom:18px; }' +
'.pr-header h1 { margin:0 0 6px; font-size:18pt; color:#1e3a2f; }' +
'.pr-meta { font-size:10pt; color:#666; }' +
'article h1 { font-size:20pt; color:#1e3a2f; margin:20px 0 12px; page-break-after: avoid; border-bottom:3px solid #e9c46a; padding-bottom:6px; }' +
'article h2 { font-size:15pt; color:#1e3a2f; margin:18px 0 10px; padding-bottom:5px; border-bottom:2px solid #e9c46a; page-break-after: avoid; }' +
'article h3 { font-size:13pt; color:#2d5a3f; margin:14px 0 8px; padding-left:8px; border-left:4px solid #e9c46a; page-break-after: avoid; }' +
'article h4 { font-size:11pt; color:#2d5a3f; margin:12px 0 6px; page-break-after: avoid; }' +
'article p { margin:0 0 10px; text-align:justify; }' +
'article ul, article ol { margin:0 0 10px; padding-left:22px; }' +
'article li { margin-bottom:4px; }' +
'article strong { color:#1e3a2f; font-weight:700; }' +
'article blockquote { background:#f8f5e6; border-left:4px solid #e9c46a; padding:8px 12px; margin:10px 0; border-radius:3px; page-break-inside: avoid; }' +
'article code { background:#f0f0ea; padding:1px 5px; border-radius:2px; font-family:Consolas,"Courier New",monospace; font-size:10pt; }' +
'article pre { background:#f0f0ea; padding:10px 14px; border-radius:4px; overflow-x:auto; font-size:10pt; page-break-inside: avoid; }' +
'article pre code { background:none; padding:0; }' +
'article table { border-collapse:collapse; width:100%; margin:10px 0; font-size:10pt; page-break-inside: avoid; }' +
'article th, article td { border:1px solid #999; padding:6px 10px; text-align:left; vertical-align:top; }' +
'article th { background:#e9c46a; color:#1e3a2f; font-weight:700; }' +
'article a { color:#1e3a2f; text-decoration: underline; }' +
'article hr { border:0; border-top:1px solid #ccc; margin:14px 0; }' +
'.reader-toc { background:#faf6e6; border:1px solid #e0d9c6; border-left:4px solid #e9c46a; padding:12px 16px; margin:0 0 20px; border-radius:4px; page-break-after: always; }' +
'.reader-toc-title { font-weight:700; color:#1e3a2f; margin-bottom:6px; font-size:12pt; }' +
'.reader-toc ul { list-style:none; padding-left:0; margin:0; font-size:10pt; line-height:1.8; }' +
'.reader-toc li.toc-h3 { padding-left:16px; font-size:9.5pt; color:#5a4a2a; }' +
'.reader-toc li.toc-h4 { padding-left:32px; font-size:9pt; color:#7a6a4a; }' +
'.reader-toc a { color:#2d6a4f; text-decoration:none; }' +
'.pr-footer { margin-top:20px; padding-top:10px; border-top:1px solid #ccc; font-size:9pt; color:#888; text-align:center; }' +
'</style></head><body>' +
'<div class="pr-header">' +
  '<h1>' + safeTitle + '</h1>' +
  '<div class="pr-meta">產生時間:' + now + ' · 來源:林業政策與法規知識網</div>' +
'</div>' +
'<article>' + contentHTML + '</article>' +
'<div class="pr-footer">本文件由林業政策與法規知識網閱讀器產生,僅供教學研究參考。</div>' +
'</body></html>'
    );
  }

  /* ----------------------------------------------------------------
   * 🖨 列印按鈕 — 透過隱藏 iframe 呼叫系統印表機對話框
   * ----------------------------------------------------------------
   * 策略:建立一個離畫面的 A4 大小 iframe,把完整文件寫入後呼叫
   *      iframe.contentWindow.print()。
   *      - 不會被 popup blocker 擋
   *      - 瀏覽器會開啟原生列印對話框,可選擇實體印表機或「另存為 PDF」
   *      - 不影響主頁面顯示
   * ---------------------------------------------------------------- */
  function setupPrintButton() {
    const btn = document.getElementById('reader-btn-print');
    if (!btn) return;

    btn.addEventListener('click', function () {
      if (!isContentReady()) {
        alert('⚠️ 文件尚未載入完成,請稍候再試。');
        return;
      }

      const titleText = getTitleText();
      const contentHTML = document.getElementById('reader-content').innerHTML;
      const docHTML = buildPrintDocHTML(titleText, contentHTML);

      // 移除可能殘留的 iframe
      const existing = document.getElementById('reader-print-frame');
      if (existing) existing.parentNode.removeChild(existing);

      const printFrame = document.createElement('iframe');
      printFrame.id = 'reader-print-frame';
      printFrame.style.cssText =
        'position:fixed;left:-10000px;top:0;width:210mm;height:297mm;border:0;opacity:0;pointer-events:none;';
      document.body.appendChild(printFrame);

      let printed = false;
      const triggerPrint = function () {
        if (printed) return;
        try {
          const fdoc = printFrame.contentWindow.document;
          if (!fdoc || !fdoc.querySelector('article')) return;
        } catch (e) { return; }
        printed = true;
        setTimeout(function () {
          try {
            printFrame.contentWindow.focus();
            printFrame.contentWindow.print();
          } catch (err) {
            alert('列印失敗:' + (err.message || err));
          }
          // 延遲清除 iframe,讓列印對話框能完成
          setTimeout(function () {
            if (printFrame.parentNode) printFrame.parentNode.removeChild(printFrame);
          }, 2000);
        }, 300);
      };

      printFrame.addEventListener('load', triggerPrint);

      // 用 document.open/write/close 寫入(較相容)
      try {
        const fdoc = printFrame.contentWindow.document;
        fdoc.open();
        fdoc.write(docHTML);
        fdoc.close();
      } catch (err) {
        // 若 document.write 被阻擋,改用 srcdoc
        printFrame.srcdoc = docHTML;
      }
    });
  }

  /* ----------------------------------------------------------------
   * 💾 存為 PDF 按鈕 — 透過隱藏 iframe 觸發列印對話框
   * ----------------------------------------------------------------
   * 策略:建立隱藏 iframe,寫入排版 HTML,呼叫 iframe 的列印對話框。
   *      使用者在列印對話框中選擇「另存為 PDF」即可下載。
   *      不使用 window.open,避免被瀏覽器的彈出視窗封鎖器攔截。
   * ---------------------------------------------------------------- */
  function setupSavePdfButton() {
    const btn = document.getElementById('reader-btn-savepdf');
    if (!btn) return;

    btn.addEventListener('click', function () {
      if (!isContentReady()) {
        alert('⚠️ 文件尚未載入完成,請稍候再試。');
        return;
      }

      var titleText = getTitleText();
      var contentHTML = document.getElementById('reader-content').innerHTML;
      var docHTML = buildPrintDocHTML(titleText, contentHTML);

      // 使用隱藏 iframe 觸發列印,避免彈出視窗被封鎖
      var oldFrame = document.getElementById('savepdf-iframe');
      if (oldFrame) oldFrame.remove();

      var iframe = document.createElement('iframe');
      iframe.id = 'savepdf-iframe';
      iframe.style.cssText = 'position:fixed;top:-9999px;left:-9999px;width:210mm;height:297mm;border:none;';
      document.body.appendChild(iframe);

      iframe.addEventListener('load', function () {
        setTimeout(function () {
          iframe.contentWindow.print();
        }, 300);
      });

      iframe.srcdoc = docHTML;
    });
  }

  function onReady() {
    init();
    setupPrintButton();
    setupSavePdfButton();
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', onReady);
  } else {
    onReady();
  }
})();
