import React from 'react';
import type { SlideData } from '../types';
import { Layers, Trash2 } from 'lucide-react';

interface SlideThumbnailListProps {
  slides: SlideData[];
  currentIndex: number;
  onSelectSlide: (index: number) => void;
  onDeleteSlide: (index: number) => void;
}

export const SlideThumbnailList: React.FC<SlideThumbnailListProps> = ({
  slides,
  currentIndex,
  onSelectSlide,
  onDeleteSlide,
}) => {
  return (
    <div className="w-64 bg-gray-900/80 border-r border-gray-800 flex flex-col h-full">
      <div className="p-3 border-b border-gray-800 flex items-center justify-between">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-gray-400">
          <Layers className="w-3.5 h-3.5 text-violet-400" />
          <span>投影片頁面 ({slides.length})</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-3 space-y-3">
        {slides.map((slide, idx) => {
          const isSelected = idx === currentIndex;
          return (
            <div
              key={idx}
              onClick={() => onSelectSlide(idx)}
              className={`group relative rounded-xl border transition-all cursor-pointer p-1.5 ${
                isSelected
                  ? 'border-violet-500 bg-violet-500/10 shadow-lg shadow-violet-500/10 ring-2 ring-violet-500/30'
                  : 'border-gray-800 bg-gray-950/60 hover:border-gray-700 hover:bg-gray-800/40'
              }`}
            >
              {/* 投影片預覽小圖 */}
              <div className="aspect-video relative rounded-lg overflow-hidden bg-black/40 border border-gray-800/50">
                <img
                  src={slide.bgImageBase64}
                  alt={`Slide ${idx + 1}`}
                  className="w-full h-full object-cover"
                />
                <span className="absolute bottom-1 left-1 bg-black/70 backdrop-blur-xs text-[10px] font-mono text-gray-300 px-1.5 py-0.5 rounded">
                  #{idx + 1}
                </span>
                <span className="absolute bottom-1 right-1 bg-violet-950/80 text-[10px] text-violet-300 px-1 py-0.5 rounded">
                  {slide.textBoxes.length} 文字框
                </span>
              </div>

              {/* 刪除按鈕 */}
              {slides.length > 1 && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    onDeleteSlide(idx);
                  }}
                  className="absolute top-2 right-2 p-1 rounded-md bg-rose-500/80 hover:bg-rose-600 text-white opacity-0 group-hover:opacity-100 transition-opacity shadow-sm"
                  title="刪除此頁投影片"
                >
                  <Trash2 className="w-3 h-3" />
                </button>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
};
