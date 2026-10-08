import { useState } from 'react';
import type { SlideData, ProcessFileResponse } from './types';
import { FileUpload } from './components/FileUpload';
import { SlideThumbnailList } from './components/SlideThumbnailList';
import { SlideCanvasEditor } from './components/SlideCanvasEditor';
import { Download, RefreshCw, Presentation, Sparkles } from 'lucide-react';
import confetti from 'canvas-confetti';
import { renderPdfPageToDataUrl, runBrowserOcr, exportPptxInBrowser } from './browserEngine';
import * as pdfjsLib from 'pdfjs-dist';

export function App() {
  const [slides, setSlides] = useState<SlideData[]>([]);
  const [currentSlideIndex, setCurrentSlideIndex] = useState<number>(0);
  const [filename, setFilename] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isExporting, setIsExporting] = useState<boolean>(false);
  const [progressText, setProgressText] = useState<string>('');

  const handleFileSelected = async (file: File, apiConfig: { apiType: string; apiKey: string; baseUrl: string }) => {
    setIsLoading(true);
    setProgressText(`正在載入 ${file.name}...`);

    const cleanBaseName = file.name.replace(/\.[^/.]+$/, '');
    setFilename(cleanBaseName);

    let processedViaBackend = false;
    try {
      const formData = new FormData();
      formData.append('file', file);
      if (apiConfig.apiType && apiConfig.apiKey) {
        formData.append('api_type', apiConfig.apiType);
        formData.append('api_key', apiConfig.apiKey);
        if (apiConfig.baseUrl) formData.append('base_url', apiConfig.baseUrl);
      }

      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 4000);

      const res = await fetch('/api/process-file', {
        method: 'POST',
        body: formData,
        signal: controller.signal
      });
      clearTimeout(timeoutId);

      if (res.ok) {
        const data: ProcessFileResponse = await res.json();
        setSlides(data.slides);
        setCurrentSlideIndex(0);
        processedViaBackend = true;
      }
    } catch {
      processedViaBackend = false;
    }

    if (!processedViaBackend) {
      try {
        const parsedSlides: SlideData[] = [];
        const isPdf = file.name.toLowerCase().endsWith('.pdf');

        if (isPdf) {
          setProgressText('正在解析 PDF 頁面...');
          const arrayBuffer = await file.arrayBuffer();
          const pdfDoc = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;
          const numPages = Math.min(pdfDoc.numPages, 30);

          for (let i = 1; i <= numPages; i++) {
            setProgressText(`正在渲染並辨識第 ${i} / ${numPages} 頁投影片...`);
            const { dataUrl, width, height } = await renderPdfPageToDataUrl(pdfDoc, i);
            const slide = await runBrowserOcr(dataUrl, width, height, i - 1, (pct) => {
              setProgressText(`正在執行瀏覽器端 OCR：第 ${i} 頁 (${pct}%)`);
            });
            parsedSlides.push(slide);
          }
        } else {
          setProgressText('正在讀取圖片並執行瀏覽器端 OCR...');
          const dataUrl = await new Promise<string>((resolve, reject) => {
            const reader = new FileReader();
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = reject;
            reader.readAsDataURL(file);
          });

          const img = new Image();
          await new Promise((resolve) => {
            img.onload = resolve;
            img.src = dataUrl;
          });

          const slide = await runBrowserOcr(dataUrl, img.width, img.height, 0, (pct) => {
            setProgressText(`正在辨識圖片文字 (${pct}%)`);
          });
          parsedSlides.push(slide);
        }

        setSlides(parsedSlides);
        setCurrentSlideIndex(0);
      } catch (err: any) {
        alert(`處理失敗: ${err.message || err}`);
        setIsLoading(false);
        return;
      }
    }

    setIsLoading(false);
    setProgressText('');
    confetti({
      particleCount: 50,
      spread: 60,
      origin: { y: 0.6 }
    });
  };

  const handleExportPptx = async () => {
    if (slides.length === 0) return;
    setIsExporting(true);

    let exportedViaBackend = false;
    try {
      const res = await fetch('/api/export-pptx', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: filename || 'noteslide_presentation',
          slides: slides,
        }),
      });

      if (res.ok) {
        const blob = await res.blob();
        const downloadUrl = window.URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = downloadUrl;
        link.download = `${filename || 'noteslide_presentation'}.pptx`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        window.URL.revokeObjectURL(downloadUrl);
        exportedViaBackend = true;
      }
    } catch {
      exportedViaBackend = false;
    }

    if (!exportedViaBackend) {
      try {
        await exportPptxInBrowser(slides, filename || 'noteslide_presentation');
      } catch (e: any) {
        alert(`匯出失敗: ${e.message || e}`);
        setIsExporting(false);
        return;
      }
    }

    setIsExporting(false);
    confetti({
      particleCount: 100,
      spread: 70,
      origin: { y: 0.5 },
    });
  };

  const handleReset = () => {
    if (window.confirm('確定要放棄當前投影片並重新上傳嗎？')) {
      setSlides([]);
      setCurrentSlideIndex(0);
      setFilename('');
    }
  };

  const handleUpdateSlide = (updatedSlide: SlideData) => {
    setSlides((prev) =>
      prev.map((s, idx) => (idx === currentSlideIndex ? updatedSlide : s))
    );
  };

  const handleDeleteSlide = (index: number) => {
    if (slides.length <= 1) return;
    const newSlides = slides.filter((_, idx) => idx !== index);
    setSlides(newSlides);
    if (currentSlideIndex >= newSlides.length) {
      setCurrentSlideIndex(newSlides.length - 1);
    }
  };

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-[#0a0d18] text-slate-100 selection:bg-indigo-500/30">
      {/* 頂部導航列 (iOS 懸浮導航條風格 + 毛玻璃效果) */}
      <header className="h-16 border-b border-white/5 bg-[#0e1222]/85 px-6 flex items-center justify-between z-30 shrink-0 backdrop-blur-xl">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-indigo-500 via-indigo-600 to-violet-600 flex items-center justify-center font-bold text-white shadow-lg shadow-indigo-500/25 border border-white/10">
            <Presentation className="w-4.5 h-4.5" />
          </div>
          <div className="flex flex-col">
            <div className="flex items-center gap-2">
              <span className="font-bold text-base tracking-tight text-white">
                NoteSlide Studio
              </span>
              <span className="inline-flex items-center gap-1 text-[10px] bg-indigo-500/15 text-indigo-300 border border-indigo-500/30 px-2 py-0.5 rounded-full font-mono font-medium">
                <Sparkles className="w-2.5 h-2.5" /> v2.0
              </span>
            </div>
            <span className="text-[11px] text-slate-400">NotebookLM to Editable PowerPoint</span>
          </div>
        </div>

        {/* 頂部操作按鈕區 */}
        <div className="flex items-center gap-2.5">
          {slides.length > 0 && (
            <>
              <button
                onClick={handleReset}
                className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white px-3.5 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 transition duration-150"
              >
                <RefreshCw className="w-3.5 h-3.5 text-slate-400" />
                <span>重新上傳</span>
              </button>

              <button
                onClick={handleExportPptx}
                disabled={isExporting}
                className="flex items-center gap-2 px-4.5 py-2 rounded-xl bg-gradient-to-r from-indigo-500 to-violet-600 hover:from-indigo-400 hover:to-violet-500 text-white text-xs font-semibold shadow-lg shadow-indigo-500/25 border border-white/10 transition duration-150 disabled:opacity-50"
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
            className="flex items-center gap-1.5 text-xs text-slate-300 hover:text-white transition px-3 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/5 ml-1"
          >
            <svg className="w-3.5 h-3.5 fill-current" viewBox="0 0 24 24">
              <path d="M12 0C5.37 0 0 5.37 0 12c0 5.31 3.435 9.795 8.205 11.385.6.105.825-.255.825-.57 0-.285-.015-1.23-.015-2.235-3.015.555-3.795-.735-4.035-1.41-.135-.345-.72-1.41-1.23-1.695-.42-.225-1.02-.78-.015-.795.945-.015 1.62.87 1.845 1.23 1.08 1.815 2.805 1.305 3.495.99.105-.78.42-1.305.765-1.605-2.67-.3-5.46-1.335-5.46-5.925 0-1.305.465-2.385 1.23-3.225-.12-.3-.54-1.53.12-3.18 0 0 1.005-.315 3.3 1.23.96-.27 1.98-.405 3-.405s2.04.135 3 .405c2.295-1.56 3.3-1.23 3.3-1.23.66 1.65.24 2.88.12 3.18.765.84 1.23 1.905 1.23 3.225 0 4.605-2.805 5.625-5.475 5.925.435.375.81 1.095.81 2.22 0 1.605-.015 2.895-.015 3.3 0 .315.225.69.825.57A12.02 12.02 0 0024 12c0-6.63-5.37-12-12-12z"/>
            </svg>
            <span>GitHub</span>
          </a>
        </div>
      </header>

      {/* 主工作區 (大氣底層漸層氛圍光) */}
      <main className="flex-1 flex overflow-hidden relative">
        <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[350px] bg-indigo-600/10 blur-[130px] rounded-full pointer-events-none" />

        {slides.length === 0 ? (
          <div className="flex-1 overflow-y-auto p-4 sm:p-8 flex flex-col justify-center relative z-10">
            <FileUpload
              onFileSelected={handleFileSelected}
              isLoading={isLoading}
              progressText={progressText}
            />
          </div>
        ) : (
          <div className="flex-1 flex h-full overflow-hidden relative z-10">
            <SlideThumbnailList
              slides={slides}
              currentIndex={currentSlideIndex}
              onSelectSlide={setCurrentSlideIndex}
              onDeleteSlide={handleDeleteSlide}
            />

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
