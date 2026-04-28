# 林業政策與法規知識網

> 基於 NotebookLM「森林經營管理相關法規」筆記本(165 份 source,篩選 34 部森林核心法規)所製作之大學林業科系教學用互動網站。

## 📁 檔案結構

```
林業政策與相關法規/
├── website/                        ← 本互動網站根目錄
│   ├── index.html                  ← 首頁(單元導覽 + 特色介紹)
│   ├── unit-01.html ~ unit-10.html ← 10 個單元頁面
│   ├── README.md                   ← 本檔案
│   └── assets/
│       ├── css/
│       │   ├── main.css            ← 主樣式(森林主題、RWD)
│       │   └── pen.css             ← 畫筆工具樣式
│       ├── js/
│       │   ├── main.js             ← 模式切換、搜尋、題庫批改、YouTube 嵌入
│       │   ├── pen.js              ← Canvas 畫筆工具(支援觸控)
│       │   └── notes.js            ← 筆記自動儲存(localStorage)
│       ├── resources/              ← 原始教材檔(由上層目錄複製)
│       │   ├── 00_法規清單與架構.md
│       │   ├── 01_講義_林業政策與相關法規_完整版.md
│       │   ├── 02_課本文章_林業政策與相關法規_完整版.md
│       │   ├── 03_題庫.json
│       │   └── 04_科普文章_森林法規入門.md
│       └── slides/                 ← NotebookLM 產出的 pptx(暫缺)
│           └── unit-01.pptx ~ unit-10.pptx
│
├── 00_法規清單與架構.md            ← 34 部核心法規樹狀圖
├── 01_講義_林業政策與相關法規_完整版.md  ← 完整講義(約 15,000 字)
├── 02_課本文章_林業政策與相關法規_完整版.md  ← 課本敘述版(約 18,000 字)
├── 03_題庫.json                     ← 130 題結構化題庫
└── 04_科普文章_森林法規入門.md      ← 白話科普版(約 7,000 字)
```

## 🚀 啟動方式

本站為純前端靜態網站,需透過簡單 HTTP 伺服器預覽(不能直接用 File Explorer 開啟,否則 iframe/fetch 會失敗)。

### 方法 1:Python http.server(已設定於 `.claude/launch.json`)

```bash
cd "C:\Users\cct\森林經營專業知識網"
python -m http.server 8000 --directory "林業政策與相關法規/website"
```

開啟瀏覽器:http://localhost:8000/

### 方法 2:Node http-server

```bash
npx http-server "C:\Users\cct\森林經營專業知識網\林業政策與相關法規\website" -p 8000
```

### 方法 3:VS Code Live Server 擴充套件

安裝 Live Server 擴充套件,右鍵 `index.html` → 「Open with Live Server」。

## ✨ 功能特色

### 三欄式版面
- **左側**:10 個單元導覽,目前單元高亮顯示
- **中間**:主內容區,5 個分頁(講義 / 課本 / 簡報 / 影片 / 題庫)
- **右側**:工具面板(搜尋、筆記、學習進度)

### 互動功能

| 功能 | 說明 | 快捷鍵 |
|---|---|---|
| **學生/教師模式切換** | 教師模式顯示備課提示與題庫解析 | - |
| **畫筆工具** | Canvas overlay,支援黑/紅/藍/綠/螢光黃、筆粗 1-20px | `Ctrl+P` 開關 / `Esc` 關閉 |
| **題庫即時批改** | 點擊答案立即顯示正確答案與解析 | - |
| **學習進度** | 自動記錄每單元答題數,顯示於右側工具面板 | - |
| **YouTube 嵌入** | 每單元可貼 YouTube URL 自動嵌入影片(最多 3 支) | - |
| **筆記自動儲存** | 每 10 秒自動儲存到 localStorage | - |
| **全文搜尋** | 即時搜尋單元名稱與頁面內容 | - |
| **響應式版面** | 行動裝置自動適應(760px / 1100px 斷點) | - |

### 資料持久化

所有用戶資料儲存於瀏覽器 **localStorage**,key 命名規則:
- `forest-law-mode`:學生/教師模式
- `forest-law-notes-{unit_id}`:單元筆記
- `forest-law-quiz-{unit_id}`:題庫答題結果
- `forest-law-video-{unit_id}-{slot}`:YouTube 影片 ID

**清除資料**:開啟瀏覽器開發者工具 → Application → Local Storage → 刪除。

## 📋 10 單元一覽

| 單元 | 主題 | 核心法規 |
|---|---|---|
| 1 | 森林法制總論 | 憲法、森林法§1-5、臺灣森林經營管理方案 |
| 2 | 森林法與施行細則 | 森林法全文、貴重木 12 種、樹木保護專章 |
| 3 | 保安林制度 | 保安林經營準則、施業方法、解除審核標準 |
| 4 | 林產物處分與伐採查驗 | 國有林林產物處分規則、疏伐作業規範 |
| 5 | 獎勵造林 2.0 | 獎勵輔導造林辦法(114 年新制) |
| 6 | 林下經濟 | 9 項品項審查作業要點 |
| 7 | 森林遊樂與自然保護 | 森林遊樂區辦法、自然保護區辦法、森林保護辦法 |
| 8 | 森林與土地利用管制 | 國土計畫法、水保法、山坡地條例、環評法 |
| 9 | 原住民族林業權益 | 原基法、採取規則、共管辦法 |
| 10 | 氣候變遷與森林碳匯 | 氣候變遷因應法、造林碳匯方法學 |

## ⏳ 待補項目

### 1. NotebookLM 教學簡報(10 份 PPTX)
**狀態**:⚠️ NotebookLM 認證過期,無法自動產生。

**恢復步驟**:
1. 在 terminal 執行:`nlm login`
2. 告訴 Claude 認證已恢復
3. Claude 會執行以下流程:
   - `notebook_create("林業政策教學簡報專用")`
   - `source_add(type="file", file_path="...01_講義_...md")`
   - 為每單元呼叫 `studio_create(artifact_type="slide_deck", custom_prompt="以黑板白粉筆風格,為單元 X 產生教學簡報,每個專有名詞配示意圖,預留 YouTube 影片位...")`
   - `download_artifact` 下載 10 份 pptx 到 `assets/slides/`

### 2. YouTube 教學影片
每單元預留了 1-3 個影片嵌入槽,使用者可在「影片」分頁貼上 YouTube URL 自動嵌入。

## 🔐 安全性與隱私

- 所有資料儲存於**本機瀏覽器**,不上傳任何伺服器
- 本站為**純靜態**,無任何後端 API 呼叫
- 本網站**不使用 Cookie**(除了 localStorage)

## 📄 授權

- **網站程式碼**:MIT License
- **教學內容**:CC BY-NC-SA 4.0(非商業性、相同方式分享)
- **法規條文**:引自全國法規資料庫,屬公開資訊

## 🙏 致謝

- NotebookLM 筆記本「森林經營管理相關法規」及其 165 份法規 source
- 農業部林業及自然保育署公開資料
- 全國法規資料庫 https://law.moj.gov.tw

---

**版本**:v1.0 · 2026-04-11
**製作**:基於 NotebookLM 筆記本內容,由 Claude 整合產出
