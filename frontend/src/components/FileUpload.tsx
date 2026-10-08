import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, Image as ImageIcon, Sparkles, CheckCircle2, ShieldCheck, Zap } from 'lucide-react';

interface FileUploadProps {
  onFileSelected: (file: File) => void;
  isLoading: boolean;
  progressText: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelected, isLoading, progressText }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileSelected(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      onFileSelected(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
      {/* 標題區 */}
      <div className="text-center my-8">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 text-sm font-medium mb-4 border border-violet-500/20">
          <Sparkles className="w-4 h-4" />
          <span>NoteSlide Studio・智慧投影片重構與文字提取</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
          將 NotebookLM 投影片轉換為<br />
          <span className="bg-gradient-to-r from-violet-400 via-purple-300 to-indigo-400 bg-clip-text text-transparent">
            完全可編輯的 PowerPoint
          </span>
        </h1>
        <p className="text-gray-400 text-lg max-w-2xl mx-auto">
          專為 Google NotebookLM (Gemini Notebook) 與 AI 簡報 PDF 打造。自動解析多國語言、鎖定文字排版坐標，一鍵重構為真正的 .pptx 簡報檔案。
        </p>
      </div>

      {/* 拖放上傳框 */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`w-full relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer p-10 flex flex-col items-center justify-center min-h-[300px] ${
          isDragOver
            ? 'border-violet-500 bg-violet-500/10 scale-[1.01]'
            : 'border-gray-700 bg-gray-900/60 hover:border-violet-500/60 hover:bg-gray-900/80'
        } backdrop-blur-md shadow-2xl`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".pdf,image/png,image/jpeg,image/webp"
          className="hidden"
          onChange={handleChange}
          disabled={isLoading}
        />

        {isLoading ? (
          <div className="flex flex-col items-center gap-4">
            <div className="relative w-16 h-16">
              <div className="w-16 h-16 rounded-full border-4 border-violet-500/20 border-t-violet-500 animate-spin"></div>
              <Sparkles className="w-6 h-6 text-violet-400 absolute inset-0 m-auto animate-pulse" />
            </div>
            <div className="text-center">
              <p className="text-lg font-semibold text-white mb-1">{progressText || 'AI 正在分析投影片文字與版面結構...'}</p>
              <p className="text-sm text-gray-400">正在執行 RapidOCR 高精度神經網路辨識與幾何擬合</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-4 text-center">
            <div className="w-18 h-18 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 p-4 shadow-lg shadow-violet-500/30 flex items-center justify-center text-white">
              <UploadCloud className="w-9 h-9" />
            </div>
            <div>
              <p className="text-xl font-bold text-white mb-1">
                點擊選擇檔案，或直接將檔案拖放到此處
              </p>
              <p className="text-sm text-gray-400">
                支援 PDF 文件 (NotebookLM 導出)、PNG、JPG、WebP 圖片 (最大 50MB / 50 頁)
              </p>
            </div>
            <div className="flex items-center gap-4 mt-2">
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 bg-gray-800/80 px-2.5 py-1 rounded-md border border-gray-700/60">
                <FileText className="w-3.5 h-3.5 text-violet-400" />
                NotebookLM 簡報 PDF
              </span>
              <span className="inline-flex items-center gap-1.5 text-xs text-gray-400 bg-gray-800/80 px-2.5 py-1 rounded-md border border-gray-700/60">
                <ImageIcon className="w-3.5 h-3.5 text-indigo-400" />
                投影片截圖圖片
              </span>
            </div>
          </div>
        )}
      </div>

      {/* 亮點特性清單 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 w-full mt-10">
        <div className="flex items-start gap-3.5 p-4 rounded-xl bg-gray-900/40 border border-gray-800">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
            <ShieldCheck className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">隱私至上・無資料洩漏</h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              所有文件僅在您的私有環境處理，絕不上傳外部伺服器或被 AI 拿去二次訓練。
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 p-4 rounded-xl bg-gray-900/40 border border-gray-800">
          <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400 shrink-0">
            <Zap className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">真正 PowerPoint 可編輯文字</h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              輸出為標準 PPTX 檔案，每個標題與內文段落均為能任意選取、修改與換色的文字框。
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3.5 p-4 rounded-xl bg-gray-900/40 border border-gray-800">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
            <CheckCircle2 className="w-5 h-5" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-sm">繁中・英文全語言最佳化</h3>
            <p className="text-xs text-gray-400 mt-1 leading-relaxed">
              針對繁體中文排版與多段落項目符號精準調校，字體大小與對齊自動完美縮放。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
