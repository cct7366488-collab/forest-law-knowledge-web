/*
 * 林業案例分析器 (Case Analyzer)
 * -------------------------------------------------
 * 功能:
 *   讀取 assets/data/law-knowledge.json 後,以關鍵字/正規式比對使用者
 *   輸入之案件描述,產出結構化法律見解(議題 / 適用法條 / 分析 / 結論)。
 *
 * 重要:本分析器僅供教學示範,產出結果不具法律效力,正式引用請以
 *     全國法規資料庫及專業律師/技師意見為準。
 */

(function(){
  'use strict';

  var KB_URL = 'assets/data/law-knowledge.json';
  var kbPromise = null;

  function loadKB() {
    if (kbPromise) return kbPromise;
    kbPromise = fetch(KB_URL + '?v=' + Date.now()).then(function(r){
      if (!r.ok) throw new Error('無法載入知識庫: ' + r.status);
      return r.json();
    });
    return kbPromise;
  }

  // 將使用者輸入正規化: 半形空白/繁簡體基本對照,避免因為字形差異漏掉比對
  function normalize(str) {
    if (!str) return '';
    return String(str)
      .replace(/\s+/g, ' ')
      .trim();
  }

  // 依關鍵字或 regex 比對
  function matchRule(caseText, rule) {
    var hits = [];
    for (var i = 0; i < rule.keywords.length; i++) {
      var kw = rule.keywords[i];
      try {
        // 關鍵字若含 regex 特殊字元,直接當成正規式使用
        var isRegex = /[.*+?^${}()|[\]\\]/.test(kw);
        var re = isRegex ? new RegExp(kw) : new RegExp(kw.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'));
        if (re.test(caseText)) hits.push(kw);
      } catch (e) { /* 忽略無效 regex */ }
    }
    return hits;
  }

  // 主分析函式
  function analyzeCase(caseText) {
    return loadKB().then(function(kb){
      var text = normalize(caseText);
      if (!text) {
        return { ok: false, error: '請輸入案件描述' };
      }

      var matched = [];
      for (var i = 0; i < kb.rules.length; i++) {
        var rule = kb.rules[i];
        var hits = matchRule(text, rule);
        if (hits.length > 0) {
          matched.push({ rule: rule, hits: hits, score: hits.length });
        }
      }

      // 依命中關鍵字數排序(高到低)
      matched.sort(function(a, b){ return b.score - a.score; });

      return {
        ok: true,
        caseText: text,
        matched: matched,
        kb: kb,
        generatedAt: new Date().toISOString()
      };
    });
  }

  // 輸出為 HTML(供頁面直接注入)
  function renderHTML(result) {
    if (!result.ok) {
      return '<div class="ca-error">⚠️ ' + (result.error || '分析失敗') + '</div>';
    }
    if (!result.matched.length) {
      return (
        '<div class="ca-no-match">' +
          '<h3>🤔 未能比對到明確的法規議題</h3>' +
          '<p>您的案件描述未觸發任何關鍵字規則。建議:</p>' +
          '<ul>' +
            '<li>加入更具體的地點(保安林、國有林、私有林)</li>' +
            '<li>說明涉及的行為(砍伐、採取、開發、造林、碳匯申請⋯⋯)</li>' +
            '<li>若涉及特定樹種,請明確指出(如紅檜、牛樟、臺灣山茶)</li>' +
            '<li>參考左側「案例範本」試試看</li>' +
          '</ul>' +
        '</div>'
      );
    }

    var html = '';

    // 0. 案件摘要
    html += '<div class="ca-block ca-summary">';
    html += '<h3>📄 案件摘要</h3>';
    html += '<blockquote>' + escapeHTML(result.caseText) + '</blockquote>';
    html += '<p class="ca-meta">分析時間:' + new Date(result.generatedAt).toLocaleString('zh-TW') +
            ' · 命中 <strong>' + result.matched.length + '</strong> 項議題</p>';
    html += '</div>';

    // 1. 爭點識別(摘要所有議題 topic)
    html += '<div class="ca-block ca-issues">';
    html += '<h3>🎯 爭點識別</h3>';
    html += '<ol class="ca-issue-list">';
    for (var i = 0; i < result.matched.length; i++) {
      var r = result.matched[i].rule;
      html += '<li>' +
        '<strong>' + escapeHTML(r.topic) + '</strong>' +
        ' <span class="ca-unit-tag">單元 ' + r.unit + '</span>' +
        '<p>' + escapeHTML(r.issue) + '</p>' +
      '</li>';
    }
    html += '</ol>';
    html += '</div>';

    // 2. 每個議題的詳細分析
    for (var j = 0; j < result.matched.length; j++) {
      var m = result.matched[j];
      var rule = m.rule;
      html += '<div class="ca-block ca-detail">';
      html += '<h3>📘 議題 ' + (j + 1) + ':' + escapeHTML(rule.topic) + '</h3>';

      // 適用法條
      html += '<h4>⚖️ 適用法條</h4>';
      html += '<ul class="ca-provisions">';
      for (var k = 0; k < rule.provisions.length; k++) {
        var p = rule.provisions[k];
        html += '<li>' +
          '<strong>《' + escapeHTML(p.law) + '》' + escapeHTML(p.article) + '</strong>' +
          '<p>' + escapeHTML(p.text) + '</p>' +
        '</li>';
      }
      html += '</ul>';

      // 法律分析
      html += '<h4>🔍 法律分析</h4>';
      html += '<p class="ca-analysis">' + escapeHTML(rule.analysis) + '</p>';

      // 結論與建議
      html += '<h4>✅ 結論與建議</h4>';
      html += '<p class="ca-conclusion">' + escapeHTML(rule.conclusion) + '</p>';

      // 命中關鍵字
      html += '<div class="ca-hits">命中關鍵字:';
      for (var h = 0; h < m.hits.length; h++) {
        html += '<span class="ca-tag">' + escapeHTML(m.hits[h]) + '</span>';
      }
      html += '</div>';

      // 延伸閱讀
      html += '<div class="ca-further">' +
        '📚 延伸閱讀:<a href="unit-' + pad2(rule.unit) + '.html">前往單元 ' + rule.unit + '</a></div>';

      html += '</div>';
    }

    // 3. 綜合結論
    html += '<div class="ca-block ca-final">';
    html += '<h3>📝 綜合法律見解</h3>';
    html += '<p>本案經比對林業政策與法規知識庫,共識別出 <strong>' + result.matched.length + '</strong> 項可能之法規議題。' +
            '上述分析僅為教學示範,實務上個案應綜合考量:</p>';
    html += '<ul>' +
      '<li><strong>事實證據</strong> — 地籍圖、權狀、照片、錄影、證人證詞</li>' +
      '<li><strong>土地屬性</strong> — 公/私有、林業用地、保安林、原民地區等</li>' +
      '<li><strong>行為主體</strong> — 個人、法人、政府機關、原住民族部落</li>' +
      '<li><strong>行為態樣</strong> — 故意或過失、作為或不作為、初犯或累犯</li>' +
      '<li><strong>程序面向</strong> — 是否踐行申請、通報、諮商同意等前置程序</li>' +
      '</ul>';
    html += '<div class="ca-disclaimer">⚠️ <strong>免責聲明</strong>:本分析器基於關鍵字比對產生,僅作為教學與初步研判用途,不構成法律意見。正式處理請諮詢執業律師、林業技師或主管機關(林業保育署各地分署)。</div>';
    html += '</div>';

    return html;
  }

  function escapeHTML(s) {
    return String(s || '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;');
  }

  function pad2(n) { return (n < 10 ? '0' : '') + n; }

  // 匯出 API
  window.ForestCaseAnalyzer = {
    analyze: analyzeCase,
    render: renderHTML,
    loadKB: loadKB
  };
})();
