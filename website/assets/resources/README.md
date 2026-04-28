# 資源卡位目錄

本目錄用於放置網站引用的原始教材檔案。網站 HTML 透過 `assets/resources/<檔名>` 引用。

## 🔗 需要複製的檔案

由於網站是純靜態檔案,無法直接引用上層目錄的檔案(除非配置伺服器允許跨層級存取)。請將以下檔案從上層目錄複製到本目錄:

**來源**(上層目錄):
```
C:\Users\cct\森林經營專業知識網\林業政策與相關法規\
├── 00_法規清單與架構.md
├── 01_講義_林業政策與相關法規_完整版.md
├── 02_課本文章_林業政策與相關法規_完整版.md
├── 03_題庫.json
└── 04_科普文章_森林法規入門.md
```

**目標**(本目錄):
```
C:\Users\cct\森林經營專業知識網\林業政策與相關法規\website\assets\resources\
├── 00_法規清單與架構.md
├── 01_講義_林業政策與相關法規_完整版.md
├── 02_課本文章_林業政策與相關法規_完整版.md
├── 03_題庫.json
└── 04_科普文章_森林法規入門.md
```

## 💡 複製指令

### Windows PowerShell
```powershell
cd "C:\Users\cct\森林經營專業知識網\林業政策與相關法規"
Copy-Item -Path "00_法規清單與架構.md","01_講義_林業政策與相關法規_完整版.md","02_課本文章_林業政策與相關法規_完整版.md","03_題庫.json","04_科普文章_森林法規入門.md" -Destination "website\assets\resources\"
```

### Windows CMD
```cmd
cd "C:\Users\cct\森林經營專業知識網\林業政策與相關法規"
copy "00_法規清單與架構.md" "website\assets\resources\"
copy "01_講義_林業政策與相關法規_完整版.md" "website\assets\resources\"
copy "02_課本文章_林業政策與相關法規_完整版.md" "website\assets\resources\"
copy 03_題庫.json "website\assets\resources\"
copy "04_科普文章_森林法規入門.md" "website\assets\resources\"
```

### Git Bash / Linux / macOS
```bash
cd "C:/Users/cct/森林經營專業知識網/林業政策與相關法規"
cp 00_法規清單與架構.md 01_講義_林業政策與相關法規_完整版.md 02_課本文章_林業政策與相關法規_完整版.md 03_題庫.json 04_科普文章_森林法規入門.md website/assets/resources/
```

## ⏳ 簡報檔案(slides)

NotebookLM 產生的 pptx 檔案請放置於同層的 `../slides/` 目錄:
```
website/assets/slides/
├── unit-01.pptx
├── unit-02.pptx
...
└── unit-10.pptx
```

目前 NotebookLM 認證過期,待執行 `nlm login` 後可由 Claude 自動產生。
