import { useState } from 'react';
import type { SlideData, ProcessFileResponse } from './types';
import { FileUpload } from './components/FileUpload';
import { SlideThumbnailList } from './components/SlideThumbnailList';
import { SlideCanvasEditor } from './components/SlideCanvasEditor';
import { Download, RefreshCw, Presentation } from 'lucide-react';
import confetti from 'canvas-confetti';

export function App() {
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [filename, setFilename] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progressText, setProgressText] = useState<string>('');

  // 處理上傳並呼叫後端 RapidOCR 解析 (可帶入使用者專屬 API 配置)
  const handleFileSelected = async (file: File, apiConfig: { apiType: string; apiKey: string; baseUrl: string }) => {
    setIsLoading(true);
    setProgressText(`正在載入 ${file.name} 並執行 3x 超解析光柵化與神經網路文字偵測...`);

    const formData = new FormData();
    formData.append('file', file);
    if (apiConfig.apiType && apiConfig.apiKey) {
      formData.append('api_type', apiConfig.apiType);
      formData.append('api_key', apiConfig.apiKey);
      if (apiConfig.baseUrl) {
        formData.append('base_url', apiConfig.baseUrl);
      }
    }

    try {
      const res = await fetch('/api/process-file', {
        method: 'POST',
        body: formData,
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || '檔案解析失敗');
      }

      const data: ProcessFileResponse = await res.json();
      setSlides(data.slides);
      setCurrentSlideIndex(0);
      setFilename(file.name.replace(/\.[^/.]+$/, ''));
      
      confetti({
        particleCount: 50,
        spread: 60,
        origin: { y: 0.6 }
      });
    } catch (error: any) {
      alert(`錯誤: ${error.message}`);
    } finally {
      setIsLoading(false);
      setProgressText('');
    }
  };

  // 匯出真正可編輯的 PPTX
  const handleExportPptx = async () => {
    if (slides.length === 0) return;
    setIsExporting(true);

    try {
      const res = await fetch('/api/export-pptx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: filename || 'noteslide_presentation',
          slides: slides,
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.detail || 'PPTX 匯出失敗');
      }

      const blob = await res.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = downloadUrl;
      link.download = `${filename || 'noteslide_presentation'}.pptx`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(downloadUrl);

      confetti({
        particleCount: 100,
        spread: 70,
        origin: { y: 0.5 },
      });
    } catch (error: any) {
      alert(`匯出失敗: ${error.message}`);
    } finally {
      setIsExporting(false);
    }
  };

  // 重置回首頁
  const handleReset = () => {
    if (window.confirm('確定要放棄當前投影片並重新上傳嗎？')) {
      setSlides([]);
      setCurrentSlideIndex(0);
      setFilename('');
    }
  };

  // 更新當前頁面的投影片資料
  const handleUpdateSlide = (updatedSlide: SlideData) => {
    setSlides((prev) =>
      prev.map((s, idx) => (idx === currentSlideIndex ? updatedSlide : s))
    );
  };

  // 刪除指定投影片
  const handleDeleteSlide = (index: number) => {
    if (slides.length <= 1) return;
    const newSlides = slides.filter((_, idx) => idx !== index);
    setSlides(newSlides);
    if (currentSlideIndex >= newSlides.length) {
      setCurrentSlideIndex(newSlides.length - 1);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0d0f17] text-gray-100">
      {/* 導航標頭 */}
      <header className="h-14 border-b border-gray-800 bg-gray-950/80 px-6 flex items-center justify-between z-30 shrink-0 backdrop-blur-md">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-violet-600 to-indigo-600 flex items-center justify-center font-bold text-white shadow-md shadow-violet-500/20">
              <Presentation className="w-4 h-4" />
            </div>
            <div className="flex flex-col">
              <span className="font-bold text-base tracking-tight text-white flex items-center gap-1.5">
                NoteSlide Studio <span className="text-[10px] bg-violet-500/20 text-violet-400 border border-violet-500/30 px-1.5 py-0.2 rounded font-mono">v1.1</span>
              </span>
              <span className="text-[10px] text-gray-400">NotebookLM to Editable PowerPoint</span>
            </div>
          </div>
        </div>

        {/* 頂部操作區 */}
        <div className="flex items-center gap-3">
          {slides.length > 0 && (
            <>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white px-3 py-1.5 rounded-lg hover:bg-gray-800/80 transition"
              >
                <RefreshCw className="w-3.5 h-3.5" />
                <span>重新上傳</span>
              </button>

              <button
                onClick={handleExportPptx}
                disabled={isExporting}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-gradient-to-r from-violet-600 to-indigo-600 hover:from-violet-500 hover:to-indigo-500 text-white text-xs font-semibold shadow-lg shadow-violet-500/25 transition disabled:opacity-50"
              >
                {isExporting ? (
                  <div className="w-3.5 h-3.5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
                ) : (
                  <Download className="w-4 h-4" />
                )}
                <span>下載可編輯 PowerPoint (.pptx)</span>
              </button>
            </>
          )}

          <a
            href="https://github.com/gyuyu2002-Jeff/noteslide-studio"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1.5 text-xs text-gray-400 hover:text-white transition px-2.5 py-1.5 rounded-lg bg-gray-900 border border-gray-800 hover:border-gray-700 ml-2"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            <span>GitHub</span>
          </a>
        </div>
      </header>

      {/* 主內容區 */}
      <main className="flex-1 flex overflow-hidden">
        {slides.length === 0 ? (
          <div className="flex-1 overflow-y-auto p-6 flex flex-col justify-center">
            <FileUpload
              onFileSelected={handleFileSelected}
              isLoading={isLoading}
              progressText={progressText}
            />
          </div>
        ) : (
          <div className="flex-1 flex h-full overflow-hidden">
            {/* 左側投影片清單 */}
            <SlideThumbnailList
              slides={slides}
              currentIndex={currentSlideIndex}
              onSelectSlide={setCurrentSlideIndex}
              onDeleteSlide={handleDeleteSlide}
            />

            {/* 中間/右側畫布與屬性編輯器 */}
            {slides[currentSlideIndex] && (
              <SlideCanvasEditor
                slide={slides[currentSlideIndex]}
                onUpdateSlide={handleUpdateSlide}
              />
            )}
          </div>
        )}
      </main>
    </div>
  );
}

export default App;
