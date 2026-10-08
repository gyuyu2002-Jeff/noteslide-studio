import React, { useRef, useState, useEffect } from 'react';
import {
  UploadCloud,
  FileText,
  Image as ImageIcon,
  Sparkles,
  CheckCircle2,
  ShieldCheck,
  Zap,
  KeyRound,
  ExternalLink,
  ChevronDown,
  ChevronUp,
  Info
} from 'lucide-react';

interface FileUploadProps {
  onFileSelected: (file: File, apiConfig: { apiType: string; apiKey: string; baseUrl: string }) => void;
  isLoading: boolean;
  progressText: string;
}

export const FileUpload: React.FC<FileUploadProps> = ({ onFileSelected, isLoading, progressText }) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // API 設定狀態 (僅儲存在使用者的瀏覽器 localStorage 中，不入伺服器庫)
  const [showApiSettings, setShowApiSettings] = useState(false);
  const [apiType, setApiType] = useState<'none' | 'gemini' | 'openai'>('none');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');

  // 讀取瀏覽器端快取配置
  useEffect(() => {
    const savedType = localStorage.getItem('noteslide_api_type') as 'none' | 'gemini' | 'openai';
    const savedKey = localStorage.getItem('noteslide_api_key');
    const savedUrl = localStorage.getItem('noteslide_base_url');
    if (savedType) setApiType(savedType);
    if (savedKey) setApiKey(savedKey);
    if (savedUrl) setBaseUrl(savedUrl);
  }, []);

  const handleSaveApiConfig = (type: 'none' | 'gemini' | 'openai', key: string, url: string) => {
    setApiType(type);
    setApiKey(key);
    setBaseUrl(url);
    localStorage.setItem('noteslide_api_type', type);
    localStorage.setItem('noteslide_api_key', key);
    localStorage.setItem('noteslide_base_url', url);
  };

  const handleClearApiKey = () => {
    setApiKey('');
    setApiType('none');
    localStorage.removeItem('noteslide_api_key');
    localStorage.removeItem('noteslide_api_type');
  };

  const submitFile = (file: File) => {
    onFileSelected(file, {
      apiType: apiType === 'none' ? '' : apiType,
      apiKey: apiKey.trim(),
      baseUrl: baseUrl.trim()
    });
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      submitFile(e.dataTransfer.files[0]);
    }
  };

  const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      submitFile(e.target.files[0]);
    }
  };

  return (
    <div className="w-full max-w-4xl mx-auto flex flex-col items-center">
      {/* 標題區 */}
      <div className="text-center my-6">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-violet-500/10 text-violet-400 text-sm font-medium mb-4 border border-violet-500/20">
          <Sparkles className="w-4 h-4" />
          <span>NoteSlide Studio・高精度投影片重構與文字提取</span>
        </div>
        <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight text-white mb-4">
          將 NotebookLM 投影片轉換為<br />
          <span className="bg-gradient-to-r from-violet-400 via-purple-300 to-indigo-400 bg-clip-text text-transparent">
            完全可編輯的 PowerPoint
          </span>
        </h1>
        <p className="text-gray-400 text-base max-w-2xl mx-auto">
          3x 高解析取樣 + 自適應對比度增強，鎖定繁中與英文字元排版座標，一鍵重構為真正的 .pptx 簡報檔案。
        </p>
      </div>

      {/* 拖放上傳框 */}
      <div
        onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => !isLoading && fileInputRef.current?.click()}
        className={`w-full relative rounded-2xl border-2 border-dashed transition-all duration-200 cursor-pointer p-8 flex flex-col items-center justify-center min-h-[260px] ${
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
              <p className="text-xs text-gray-400">正在執行 RapidOCR 3x 超取樣與影像增強辨識</p>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center gap-3 text-center">
            <div className="w-16 h-16 rounded-2xl bg-gradient-to-tr from-violet-600 to-indigo-600 p-3.5 shadow-lg shadow-violet-500/30 flex items-center justify-center text-white">
              <UploadCloud className="w-8 h-8" />
            </div>
            <div>
              <p className="text-lg font-bold text-white mb-1">
                點擊選擇檔案，或直接將檔案拖放到此處
              </p>
              <p className="text-xs text-gray-400">
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

      {/* 🔐 自訂 AI API 增強設定 (折疊面板) */}
      <div className="w-full mt-5 bg-gray-900/60 border border-gray-800 rounded-xl overflow-hidden backdrop-blur-md">
        <button
          type="button"
          onClick={() => setShowApiSettings(!showApiSettings)}
          className="w-full px-5 py-3 flex items-center justify-between text-left text-xs font-semibold text-gray-300 hover:text-white transition"
        >
          <div className="flex items-center gap-2">
            <KeyRound className="w-4 h-4 text-violet-400" />
            <span>進階選項：連接專屬 AI API Vision 二次校準 (選填)</span>
            {apiKey ? (
              <span className="bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 text-[10px] px-2 py-0.5 rounded-full font-mono">
                已設定 {apiType.toUpperCase()}
              </span>
            ) : (
              <span className="text-gray-500 text-[11px] font-normal">（預設使用本機 RapidOCR 免金鑰辨識）</span>
            )}
          </div>
          {showApiSettings ? <ChevronUp className="w-4 h-4 text-gray-400" /> : <ChevronDown className="w-4 h-4 text-gray-400" />}
        </button>

        {showApiSettings && (
          <div className="p-5 border-t border-gray-800/80 bg-gray-950/40 text-xs space-y-4">
            <div className="flex items-start gap-2 text-gray-400 bg-violet-950/20 border border-violet-500/20 p-3 rounded-lg">
              <ShieldCheck className="w-4 h-4 text-violet-400 shrink-0 mt-0.5" />
              <div className="space-y-1">
                <p className="font-semibold text-violet-300">隱私與安全性保證：</p>
                <p className="text-[11px] leading-relaxed">
                  您的 API Key <strong>僅保存在您目前的個人瀏覽器 (Local Storage)</strong>，絕對不會上傳到任何伺服器儲存或日誌。發起辨識時僅作為單次請求記憶體傳參，使用完畢立即銷毀。
                </p>
              </div>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
              <div>
                <label className="block text-gray-300 font-medium mb-1">AI 服務供應商</label>
                <select
                  value={apiType}
                  onChange={(e) => handleSaveApiConfig(e.target.value as any, apiKey, baseUrl)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white focus:outline-none focus:border-violet-500"
                >
                  <option value="none">不使用外部 API (純本地 RapidOCR)</option>
                  <option value="gemini">Google Gemini (Gemini 2.5 Flash - 推薦)</option>
                  <option value="openai">OpenAI / 相容架構 (GPT-4o mini)</option>
                </select>
              </div>

              <div className="md:col-span-2">
                <label className="block text-gray-300 font-medium mb-1">API Key</label>
                <div className="flex items-center gap-2">
                  <input
                    type="password"
                    placeholder={apiType === 'gemini' ? 'AIzaSy...' : apiType === 'openai' ? 'sk-proj-...' : '無須填寫'}
                    value={apiKey}
                    disabled={apiType === 'none'}
                    onChange={(e) => handleSaveApiConfig(apiType, e.target.value, baseUrl)}
                    className="flex-1 bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-violet-500 disabled:opacity-40"
                  />
                  {apiKey && (
                    <button
                      type="button"
                      onClick={handleClearApiKey}
                      className="px-2.5 py-2 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs shrink-0"
                    >
                      清除
                    </button>
                  )}
                </div>
              </div>
            </div>

            {apiType === 'openai' && (
              <div>
                <label className="block text-gray-300 font-medium mb-1">Base URL (自訂轉發端點，選填)</label>
                <input
                  type="text"
                  placeholder="https://api.openai.com/v1"
                  value={baseUrl}
                  onChange={(e) => handleSaveApiConfig(apiType, apiKey, e.target.value)}
                  className="w-full bg-gray-900 border border-gray-700 rounded-lg px-3 py-2 text-white font-mono focus:outline-none focus:border-violet-500"
                />
              </div>
            )}

            {/* 官方取得教學連結 */}
            <div className="flex flex-wrap items-center gap-4 text-[11px] text-gray-400 pt-1 border-t border-gray-800">
              <span className="flex items-center gap-1">
                <Info className="w-3.5 h-3.5 text-gray-500" />
                如何取得免費 API Key：
              </span>
              <a
                href="https://aistudio.google.com/app/apikey"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400 hover:underline inline-flex items-center gap-0.5"
              >
                <span>Google AI Studio (每月免費高額度)</span>
                <ExternalLink className="w-3 h-3" />
              </a>
              <a
                href="https://platform.openai.com/api-keys"
                target="_blank"
                rel="noopener noreferrer"
                className="text-violet-400 hover:underline inline-flex items-center gap-0.5"
              >
                <span>OpenAI API Keys</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* 亮點特性清單 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-5 w-full mt-6">
        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-gray-900/40 border border-gray-800">
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-400 shrink-0">
            <ShieldCheck className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-xs">隱私端對端保密</h3>
            <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
              API Key 僅存在個人瀏覽器，單次記憶體傳遞即焚，無伺服器留存。
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-gray-900/40 border border-gray-800">
          <div className="p-2 rounded-lg bg-violet-500/10 text-violet-400 shrink-0">
            <Zap className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-xs">3x 超取樣 + 對比強化</h3>
            <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
              自適應 CLAHE 銳化與超高解析度渲染，極致提高繁體細劃辨識度。
            </p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-3.5 rounded-xl bg-gray-900/40 border border-gray-800">
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-400 shrink-0">
            <CheckCircle2 className="w-4 h-4" />
          </div>
          <div>
            <h3 className="font-semibold text-white text-xs">原生 PPTX 文字方塊</h3>
            <p className="text-[11px] text-gray-400 mt-0.5 leading-relaxed">
              還原微軟原生文字框，標題與內文均可自由選取換色與修改文案。
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
