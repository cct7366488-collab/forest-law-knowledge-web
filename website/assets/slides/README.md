# 教學簡報目錄

本目錄預留放置 NotebookLM 產生的 10 份 pptx 檔案。

## ⏳ 目前狀態

**NotebookLM 認證過期**,待執行 `nlm login` 後由 Claude 自動產生。

## 📋 檔案命名規則

```
unit-01.pptx  - 單元 1 森林法制總論
unit-02.pptx  - 單元 2 森林法與施行細則
unit-03.pptx  - 單元 3 保安林制度
unit-04.pptx  - 單元 4 林產物處分與伐採查驗
unit-05.pptx  - 單元 5 獎勵造林 2.0
unit-06.pptx  - 單元 6 林下經濟
unit-07.pptx  - 單元 7 森林遊樂與自然保護
unit-08.pptx  - 單元 8 森林與土地利用管制
unit-09.pptx  - 單元 9 原住民族林業權益
unit-10.pptx  - 單元 10 氣候變遷與森林碳匯
```

## 🔧 NotebookLM 自動產生流程(認證恢復後)

1. **建立新筆記本**:`notebook_create("林業政策教學簡報專用")`
2. **上傳講義**:`source_add(source_type="file", file_path="01_講義_林業政策與相關法規_完整版.md")`
3. **為每單元產生簡報**(共 10 次):
   ```
   studio_create(
     notebook_id="...",
     artifact_type="slide_deck",
     slide_format="detailed_deck",
     source_ids=[...],
     custom_prompt="""
     以「黑板 + 白粉筆」視覺風格,為單元 X『<單元標題>』產生教學投影片。
     要求:
     1. 深綠色背景模擬黑板,白色字模擬粉筆
     2. 每張投影片聚焦一個觀念,避免文字過多
     3. 專有名詞(如『貴重木』、『保安林』、『疏伐』等)附示意圖
     4. 最後一張投影片預留「教學影片」位,顯示「此處將嵌入 YouTube 影片」
     5. 內容需與《01_講義_林業政策與相關法規_完整版.md》中的單元 X 完全一致
     """,
     confirm=True
   )
   ```
4. **下載 pptx**:`download_artifact(artifact_type="slide_deck", output_path="website/assets/slides/unit-01.pptx", slide_deck_format="pptx")`

## 🎨 黑板白粉筆風格參考

- 背景色:深綠 `#1e3a2f`
- 文字色:粉筆白 `#f4f1de`
- 強調色:粉筆黃 `#e9c46a`
- 字體:手寫風(Noto Sans TC、IBM Plex Sans 等)
