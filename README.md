# NoteSlide Studio 🎨

> 將 Google NotebookLM (Gemini Notebook) 投影片與 AI 簡報 PDF，高精度轉換為完全可編輯的 PowerPoint (.pptx) 檔案。

[![License: MIT](https://img.shields.io/badge/License-MIT-violet.svg)](https://opensource.org/licenses/MIT)
[![Python 3.10+](https://img.shields.io/badge/Python-3.10%2B-blue.svg)](https://www.python.org/)
[![React 19](https://img.shields.io/badge/React-19-61dafb.svg)](https://react.dev/)
[![FastAPI](https://img.shields.io/badge/FastAPI-0.100%2B-009688.svg)](https://fastapi.tiangolo.com/)

---

## 🌟 核心特色

1. **AI 神經網路文字偵測 (RapidOCR / PaddleOCR ONNX)**：
   * 針對繁體中文、簡體中文、英數混合內容深度優化。
   * 精準提取文字坐標邊界框 (Bounding Box)，自動計算適配字級大小。
2. **真正的 PowerPoint 文字方塊 (Native PPTX Shapes)**：
   * 輸出的不是死板圖片，而是微軟 Office 原生的向量文字方塊。
   * 每行字元、標題、說明皆可自由選取、修改文案、換色、換字型。
3. **線上視覺化投影片編輯器**：
   * 投影片分頁縮圖預覽與多頁切換。
   * 支援滑鼠拖曳移動文字方塊、即時改字、微調字級大小 (pt)、粗體、顏色與對齊。
   * 支援新增自訂文字方塊與刪除冗餘元素。
   * 原版投影片底圖自由切換比對。
4. **極致隱私保護**：
   * 支援本機與內部網路部署，所有文件運算均在您的私有環境完成，絕無資料外流或訓練風險。

---

## 🚀 快速開始

### 1. 安裝環境依賴 (Python & Node.js)

```bash
# 安裝後端 Python 依賴
pip install fastapi uvicorn python-multipart rapidocr-onnxruntime pypdfium2 pillow python-pptx
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

## 🛠️ 技術架構

- **前端 (Frontend)**:
  - React 19 + TypeScript
  - Vite 8 + Tailwind CSS v4
  - Lucide React (現代科技圖示庫)
  - Canvas Confetti
- **後端 (Backend)**:
  - Python FastAPI + Uvicorn
  - RapidOCR (PaddleOCR ONNX 引擎)
  - PyPDFium2 (高畫質 PDF 向量光柵渲染)
  - python-pptx (原生微軟 Office OpenXML 格式組裝)

---

## 📄 開源授權

本專案採用 [MIT License](LICENSE) 條款開源。
