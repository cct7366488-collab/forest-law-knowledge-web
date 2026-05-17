# 林業政策與法規知識網（Forest Law Knowledge Web）

> 基於 NotebookLM「森林經營管理相關法規」之互動式教材  
> 整合大學林業科系講義、正式課本文章、NotebookLM 產生之簡報投影片、互動題庫，以及科普文章。

🌐 **線上瀏覽**：https://cct7366488-collab.github.io/forest-law-knowledge-web/

---

## 課程架構（10 單元）

| 單元 | 主題 | 核心法規 |
|---|---|---|
| 1 | 森林法制總論 | 憲法、森林法 §1-5、臺灣森林經營管理方案 |
| 2 | 森林法與施行細則 | 森林法全文、施行細則、貴重木公告 |
| 3 | 保安林制度 | 16 種類型、解除審核、伐期齡表 |
| 4 | 林產物處分與伐採查驗 | 處分規則、疏伐規範、查驗印 |
| 5 | 獎勵造林 2.0 | 堆疊式獎勵金、最高 60 萬/公頃 |
| 6 | 林下經濟 | 9 項品項、臺灣山茶、審查流程 |
| 7 | 森林遊樂與自然保護 | 4 大分區、檢舉獎金、森林保護辦法 |
| 8 | 森林與土地利用管制 | 國土計畫法、水保法、山坡地條例 |
| 9 | 原住民族林業權益 | 原基法、共管會、採取規則 |
| 10 | 氣候變遷與森林碳匯 | 淨零目標、造林碳匯方法學 |

---

## 內容組成

- **講義**：10 單元、34 部核心法規，含學習目標與課後思考
- **課本文章**：敘述式教科書，適合深度自學
- **黑板風簡報**：由 NotebookLM 產生，每單元配示意圖（PDF / PPTX）
- **AI 影片簡介**：每單元一支由 NotebookLM 產生的中文影片
- **互動題庫**：100 選擇題即時批改 + 30 申論題要點
- **案例分析器**：輸入真實案例自動產出結構化法律見解
- **34 部法規清單**：森林核心法規架構速查
- **科普文章**：白話版森林法規入門

---

## 目錄結構

```
.
├── website/                          # 互動式網站（GitHub Pages 入口）
│   ├── index.html                    # 首頁
│   ├── unit-01.html ~ unit-10.html   # 10 個單元頁
│   ├── reader.html                   # Markdown 閱讀器（含列印/存為 PDF）
│   ├── case-analysis.html            # 案例分析器
│   └── assets/
│       ├── css/                      # 樣式表
│       ├── js/                       # 互動腳本（含畫筆、筆記、題庫）
│       ├── slides/                   # NotebookLM 簡報（PDF/PPTX）
│       ├── videos/                   # AI 影片簡介（MP4）
│       └── resources/                # Markdown 來源檔與題庫 JSON
├── 00_法規清單與架構.md                  # 34 部法規清單
├── 01_講義_林業政策與相關法規_完整版.md       # 完整講義（10 單元）
├── 02_課本文章_林業政策與相關法規_完整版.md    # 完整課本（10 單元）
├── 03_題庫.json                      # 互動題庫資料（130 題）
└── 04_科普文章_森林法規入門.md            # 白話版科普文章
```

---

## 使用方式

### 線上瀏覽
直接訪問 GitHub Pages：https://cct7366488-collab.github.io/forest-law-knowledge-web/

### 本地執行
```bash
git clone https://github.com/cct7366488-collab/forest-law-knowledge-web.git
cd forest-law-knowledge-web/website
# 用任何靜態檔伺服器執行，例如：
python -m http.server 8000
# 然後在瀏覽器打開 http://localhost:8000
```

---

## 教師後臺與 Firebase（v2.0，2026-05-17）

教師內容管理由 **Firebase Auth（Google 登入）+ Firestore** 提供，取代舊版寫死密碼。

### 後臺入口

- 網址：`/admin.html`（線上：https://cct7366488-collab.github.io/forest-law-knowledge-web/admin.html ）
- 登入：以授權 Google 帳號點「以 Google 登入」。
- 角色：
  - **Owner**：`cct7366488@gmail.com`（信任根，硬編碼於 Firestore Rules）。可管理影片、申論要點、**教師白名單**。
  - **教師**：在 `forest-law_teachers` 白名單內的帳號。可管理影片、申論要點（不可改白名單）。
- 新增教師：Owner 於後臺「教師白名單管理」輸入對方 Google Email 即可，無需改程式或重部署。

### 後臺功能

| 功能 | 說明 | 學生端 |
|------|------|--------|
| 補充影片 | 各單元設定 YouTube；全體學生同步看到同一支 | 公開可讀 |
| 申論參考要點 | 各單元申論題標準答案/評分要點 | **不可讀取**（不在公開 HTML，僅授權教師可取） |
| 教師白名單 | Owner 增刪授權教師 | 不適用 |

### 本地 → 雲端對應表（Cloud.md〔陸、四〕必備）

寄宿共用專案 `forestry-teaching`（Spark 免費方案），以 `forest-law_` 前綴命名空間隔離。

| 內容 | Firestore 路徑 | 讀 | 寫 |
|------|---------------|----|----|
| 補充影片 | `forest-law_videos/{unit-01..10}` | 公開 | 授權教師 |
| 申論參考要點 | `forest-law_essays/{unit-01..10}` | 授權教師 | 授權教師 |
| 站台設定 | `forest-law_settings/{doc}` | 公開 | 授權教師 |
| 教師白名單 | `forest-law_teachers/{email}` | 已登入 | 僅 Owner |

- Web config（`assets/js/firebase-config.js`）為用戶端公開識別碼，非機密；安全邊界由 Firestore Rules 強制。
- Firestore Rules 權威部署來源：`C:\Users\cct\firebase-teaching-tools\firestore.rules`（共用專案，亦含投票工具）；本 repo `firebase/firestore.rules` 為版控副本。

### 首次啟用須在 Firebase Console 完成

1. Authentication → Sign-in method → 啟用 **Google** provider。
2. Authentication → Settings → Authorized domains → 加入 `cct7366488-collab.github.io`、`localhost`。

---

## 資料來源與致謝

- **NotebookLM 筆記本**：森林經營管理相關法規（165 份 source，本站篩選 34 部森林核心法規）
- **全國法規資料庫**：https://law.moj.gov.tw
- **農業部林業及自然保育署**：https://www.forest.gov.tw
- **原住民族委員會**：https://www.cip.gov.tw
- **環境部**：https://www.moenv.gov.tw

---

## 免責聲明

⚠️ 本站內容僅供教學研究使用。正式引用條文或辦理申請時，請以全國法規資料庫之最新公布版本為準。

---

## 授權

教育與研究用途自由使用。資料原始出處請參考各該政府機關之公開資訊。
