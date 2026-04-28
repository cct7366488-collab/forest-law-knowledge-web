# ============================================================
#  收工.ps1 — 一鍵同步：GitHub + Obsidian + Google Drive
# ============================================================
#  用途：把本地修改一次同步到三個地方（含刪除同步）
#    1. GitHub               — git add -A / commit / push（自動處理刪除）
#    2. Obsidian secondbrain — 鏡像 .md 檔（會刪除目的端多餘的舊檔）
#    3. Google Drive 備份    — robocopy /MIR 完整鏡像（會刪除目的端多餘檔案）
#
#  用法：
#    cd 專案根目錄; .\tools\收工.ps1                 # 自動產生 commit 訊息
#    cd 專案根目錄; .\tools\收工.ps1 "修正影片路徑"    # 指定 commit 訊息
#
#  或在任何路徑執行（需先載入 $PROFILE 中的「收工」函式）：
#    收工
#    收工 "修正影片路徑"
# ============================================================

param(
  [string]$Message = ""
)

$ErrorActionPreference = "Continue"  # 原生命令 (git/robocopy) 的 stderr 在 PS 5.1 會誤觸 ErrorRecord，故不用 Stop

# 路徑常數
$ProjectRoot   = "C:\Users\cct\森林經營專業知識網\林業政策與相關法規"
$ObsidianDir   = "G:\我的雲端硬碟\secondbrain\60-教學與演講\林業政策與法規"
$GoogleDriveDir = "G:\我的雲端硬碟\林業政策與法規知識網"

function Write-Step($num, $title) {
  Write-Host ""
  Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkCyan
  Write-Host " [$num] $title" -ForegroundColor Cyan
  Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor DarkCyan
}

# ---------- 開場 ----------
$startTime = Get-Date
Write-Host ""
Write-Host "🌲 收工同步腳本啟動  $(Get-Date -Format 'yyyy-MM-dd HH:mm:ss')" -ForegroundColor Green
Write-Host "   專案：$ProjectRoot" -ForegroundColor Gray

if (-not (Test-Path $ProjectRoot)) {
  Write-Host "❌ 找不到專案根目錄：$ProjectRoot" -ForegroundColor Red
  exit 1
}

Set-Location $ProjectRoot

# ============================================================
#  Step 1: GitHub
# ============================================================
Write-Step "1/3" "GitHub  →  forest-law-knowledge-web"

$gitStatus = git status --porcelain
if (-not $gitStatus) {
  Write-Host "  ℹ 無變更，跳過 commit。" -ForegroundColor Yellow
} else {
  $changeCount = ($gitStatus | Measure-Object).Count
  Write-Host "  變更檔案：$changeCount 筆" -ForegroundColor Gray

  # 自動產生 commit 訊息（若使用者未指定）
  if ([string]::IsNullOrWhiteSpace($Message)) {
    $Message = "更新內容 ($(Get-Date -Format 'yyyy-MM-dd HH:mm'))"
  }

  git add -A
  git commit -m $Message | Out-Null
  if ($LASTEXITCODE -ne 0) {
    Write-Host "  ❌ commit 失敗（exit $LASTEXITCODE）" -ForegroundColor Red
    return
  }
  Write-Host "  ✓ commit: $Message" -ForegroundColor Green
}

Write-Host "  推送到遠端..." -ForegroundColor Gray
# 注意：不可用 2>&1，PS 5.1 會把 git 的 stderr 進度訊息當成 ErrorRecord
git push origin main
if ($LASTEXITCODE -eq 0) {
  Write-Host "  ✓ GitHub 同步完成" -ForegroundColor Green
} else {
  Write-Host "  ❌ git push 失敗（exit $LASTEXITCODE）" -ForegroundColor Red
  return
}

# ============================================================
#  Step 2: Obsidian (僅 .md，鏡像模式)
# ============================================================
Write-Step "2/3" "Obsidian secondbrain  →  60-教學與演講/林業政策與法規"

if (-not (Test-Path $ObsidianDir)) {
  New-Item -ItemType Directory -Force -Path $ObsidianDir | Out-Null
  Write-Host "  建立目錄：$ObsidianDir" -ForegroundColor Gray
}

# 鏡像所有專案根目錄的 .md → Obsidian（不含子目錄）
# /MIR 會刪除目的端多餘的檔案
$obsResult = robocopy $ProjectRoot $ObsidianDir *.md /LEV:1 /XF "MOC*.md" /R:1 /W:1 /NFL /NDL /NP /NJH /NJS

# 但要保留我們手動建立的 MOC 索引檔（不刪），所以採用另一種策略：
# 步驟：先列舉專案 .md，覆蓋複製；再清掉目的端對應的舊 .md（除了 MOC 與不存在於來源的）
$srcMd = Get-ChildItem -Path $ProjectRoot -Filter "*.md" -File | Select-Object -ExpandProperty Name
foreach ($f in $srcMd) {
  Copy-Item -Path "$ProjectRoot\$f" -Destination $ObsidianDir -Force
  Write-Host "  ✓ 同步：$f" -ForegroundColor Gray
}

# 刪除目的端「來源不再有」的 .md（保留 MOC 開頭的索引檔）
$dstMd = Get-ChildItem -Path $ObsidianDir -Filter "*.md" -File
foreach ($d in $dstMd) {
  if (($d.Name -notlike "*MOC*") -and ($srcMd -notcontains $d.Name)) {
    Remove-Item $d.FullName -Force
    Write-Host "  ✗ 刪除過期：$($d.Name)" -ForegroundColor DarkYellow
  }
}

Write-Host "  ✓ Obsidian 同步完成（保留 MOC 索引）" -ForegroundColor Green

# ============================================================
#  Step 3: Google Drive 完整鏡像
# ============================================================
Write-Step "3/3" "Google Drive  →  林業政策與法規知識網（完整鏡像）"

if (-not (Test-Path $GoogleDriveDir)) {
  New-Item -ItemType Directory -Force -Path $GoogleDriveDir | Out-Null
}

# /MIR = 鏡像（含刪除）；/XD = 排除目錄；/XF = 排除檔案
$rcOutput = robocopy $ProjectRoot $GoogleDriveDir `
  /MIR `
  /XD .git .claude tools `
  /XF *.tmp *.bak *.log `
  /R:1 /W:1 `
  /NFL /NDL /NP

# robocopy exit code: 0=無變更, 1=複製成功, 2=多餘檔被刪, 3=兩者皆有, >=8=錯誤
$rcExit = $LASTEXITCODE
$rcOutput | Select-Object -Last 8 | ForEach-Object { Write-Host "    $_" -ForegroundColor DarkGray }

if ($rcExit -ge 8) {
  Write-Host "  ❌ Google Drive 同步失敗（exit code: $rcExit）" -ForegroundColor Red
} else {
  Write-Host "  ✓ Google Drive 同步完成（exit code: $rcExit）" -ForegroundColor Green
}

# ============================================================
#  收尾
# ============================================================
$elapsed = (Get-Date) - $startTime
Write-Host ""
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host " 🎉 收工完成！耗時 $([math]::Round($elapsed.TotalSeconds,1)) 秒" -ForegroundColor Green
Write-Host "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━" -ForegroundColor Green
Write-Host "  • GitHub：    https://github.com/cct7366488-collab/forest-law-knowledge-web" -ForegroundColor Gray
Write-Host "  • Pages：     https://cct7366488-collab.github.io/forest-law-knowledge-web/" -ForegroundColor Gray
Write-Host "  • Obsidian：  $ObsidianDir" -ForegroundColor Gray
Write-Host "  • G-Drive：   $GoogleDriveDir" -ForegroundColor Gray
Write-Host ""
