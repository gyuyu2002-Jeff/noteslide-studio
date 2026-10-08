# NoteSlide Studio 🎨

> 將 Google NotebookLM (Gemini Notebook) 投影片與 AI 簡報 PDF，高精度轉換為完全可編輯的 PowerPoint (.pptx) 檔案。

[![License: MIT](https://img.shields.io/badge/License-MIT-violet.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![React 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688.svg)](https://fastapi.tiangolo.com/)

---

## 🌟 核心特色

1. **3x 超高解析度光柵化 + 自適應對比度增強 (CLAHE)**：
   * 採用 3x (~216+ DPI) 超解析取樣，大幅提升繁體中文細劃（如「龜」、「鬱」、「體」）與細小註解的邊界清晰度。
   * 整合 OpenCV 影像銳化濾波器，克服漸層背景與半透明色塊對 OCR 造成的干擾。
2. **真正的 PowerPoint 文字方塊 (Native PPTX Shapes)**：
   * 輸出的不是死板圖片，而是微軟 Office 原生的向量文字方塊。
   * 每行字元、標題、說明皆可自由選取、修改文案、換色、換字型。
3. **可選配 AI Vision 二次語意校對 (端對端安全無痕)**：
   * 支援選填 Google Gemini 2.5 Flash 或 OpenAI GPT-4o mini API Key。
   * **最高安全防護**：金鑰僅存於使用者個人瀏覽器端（Local Storage），請求時僅作為單次記憶體傳遞，用完即焚，絕不寫入伺服器磁碟或紀錄檔。
4. **線上視覺化投影片編輯器**：
   * 投影片分頁縮圖預覽與多頁切換。
   * 支援滑鼠拖曳移動文字方塊、即時改字、微調字級大小 (pt)、粗體、顏色與對齊。
   * 支援新增自訂文字方塊與刪除冗餘元素。

---

## 🚀 快速開始

### 1. 安裝環境依賴 (Python & Node.js)

```bash
# 安裝後端 Python 依賴
pip install fastapi uvicorn python-multipart rapidocr-onnxruntime pypdfium2 pillow python-pptx opencv-python google-genai openai
```

### 2. 啟動服務

#### Windows 一鍵啟動：
直接雙擊根目錄下的：
👉 `啟動NoteSlide.bat`

#### 終端機指令啟動：
```bash
python -m uvicorn server:app --host 127.0.0.1 --port 8000 --reload
```
啟動後打開瀏覽器訪問：**http://127.0.0.1:8000** 即可開始使用！

---

## 🔐 如何連接自己的 AI API (教學與安全性保證)

### 為什麼需要連接 API？
NoteSlide Studio 預設採用**本機離線 RapidOCR** 進行即時辨識（無需金鑰、速度極快）。  
若您的投影片含有**極特殊專有名詞、藝術字體或手寫文字**，開啟此功能將會調用 AI Vision 模型進行自動糾錯與雙重校正。

### 安全性承諾（Security & Privacy First）
* 🛡️ **無雲端儲存**：API Key **絕不會**儲存在伺服器端或寫入資料庫。
* 🔒 **瀏覽器隔離**：僅保存在您當前設備的瀏覽器 `localStorage` 中。
* ⚡ **記憶體傳參**：向後端請求時僅暫存於記憶體，校對完成立即釋放銷毀。

### 取得免費 API Key 教學：
1. **Google Gemini (強烈推薦，每月高額免費)**：
   * 前往 [Google AI Studio](https://aistudio.google.com/app/apikey)。
   * 登入 Google 帳號後，點擊 **「Create API Key」**。
   * 複製金鑰並在 NoteSlide Studio 網頁展開「進階選項」，選擇「Google Gemini」並貼上即可。
2. **OpenAI (GPT-4o mini)**：
   * 前往 [OpenAI API Keys](https://platform.openai.com/api-keys)。
   * 登入後點擊 **「Create new secret key」** 並貼上。

---

## 📄 開源授權

本專案採用 [MIT License](LICENSE) 條款開源。
