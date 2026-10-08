import { useRef, useState, useEffect } from 'react';
import type { SlideData, TextBoxItem } from '../types';
import {
  Plus,
  Trash2,
  Bold,
  AlignLeft,
  AlignCenter,
  AlignRight,
  Palette,
  Eye,
  EyeOff,
  Move
} from 'lucide-react';

interface SlideCanvasEditorProps {
  slide: SlideData;
  onUpdateSlide: (updatedSlide: SlideData) => void;
}

export const SlideCanvasEditor: React.FC<SlideCanvasEditorProps> = ({
  slide,
  onUpdateSlide,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const [selectedBoxId, setSelectedBoxId] = useState<string | null>(null);
  const [scale, setScale] = useState<number>(1);
  const [showOriginalOverlay, setShowOriginalOverlay] = useState<boolean>(true);
  const [isDragging, setIsDragging] = useState<boolean>(false);
  const [dragOffset, setDragOffset] = useState<{ x: number; y: number }>({ x: 0, y: 0 });

  // 監聽畫布大小縮放比例
  useEffect(() => {
    const updateScale = () => {
      if (containerRef.current && slide.width > 0) {
        const containerWidth = containerRef.current.clientWidth - 48; // padding
        const containerHeight = containerRef.current.clientHeight - 48;
        const scaleW = containerWidth / slide.width;
        const scaleH = containerHeight / slide.height;
        setScale(Math.min(scaleW, scaleH, 1.2));
      }
    };

    updateScale();
    window.addEventListener('resize', updateScale);
    return () => window.removeEventListener('resize', updateScale);
  }, [slide.width, slide.height]);

  const selectedBox = slide.textBoxes.find((b) => b.id === selectedBoxId) || null;

  // 更新當前選取的文字方塊屬性
  const updateSelectedBox = (fields: Partial<TextBoxItem>) => {
    if (!selectedBoxId) return;
    const updatedBoxes = slide.textBoxes.map((b) => {
      if (b.id === selectedBoxId) {
        return { ...b, ...fields };
      }
      return b;
    });
    onUpdateSlide({ ...slide, textBoxes: updatedBoxes });
  };

  // 刪除選取的文字方塊
  const deleteSelectedBox = () => {
    if (!selectedBoxId) return;
    const updatedBoxes = slide.textBoxes.filter((b) => b.id !== selectedBoxId);
    onUpdateSlide({ ...slide, textBoxes: updatedBoxes });
    setSelectedBoxId(null);
  };

  // 新增文字方塊
  const handleAddTextBox = () => {
    const newBox: TextBoxItem = {
      id: `custom_txt_${Date.now()}`,
      text: '點擊此處輸入新文字',
      box: [
        [slide.width * 0.3, slide.height * 0.4],
        [slide.width * 0.7, slide.height * 0.4],
        [slide.width * 0.7, slide.height * 0.4 + 40],
        [slide.width * 0.3, slide.height * 0.4 + 40],
      ],
      confidence: 1.0,
      fontSize: 24,
      color: '#111827',
      align: 'left',
      bold: true,
    };
    onUpdateSlide({ ...slide, textBoxes: [...slide.textBoxes, newBox] });
    setSelectedBoxId(newBox.id);
  };

  // 拖曳文字方塊位置
  const handleBoxMouseDown = (e: React.MouseEvent, box: TextBoxItem) => {
    e.stopPropagation();
    setSelectedBoxId(box.id);
    setIsDragging(true);

    const minX = Math.min(...box.box.map((p) => p[0]));
    const minY = Math.min(...box.box.map((p) => p[1]));

    setDragOffset({
      x: e.clientX - minX * scale,
      y: e.clientY - minY * scale,
    });
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isDragging || !selectedBox) return;

    const minX = Math.min(...selectedBox.box.map((p) => p[0]));
    const minY = Math.min(...selectedBox.box.map((p) => p[1]));
    const w = Math.max(...selectedBox.box.map((p) => p[0])) - minX;
    const h = Math.max(...selectedBox.box.map((p) => p[1])) - minY;

    const newMinX = (e.clientX - dragOffset.x) / scale;
    const newMinY = (e.clientY - dragOffset.y) / scale;

    const updatedBoxCoords = [
      [newMinX, newMinY],
      [newMinX + w, newMinY],
      [newMinX + w, newMinY + h],
      [newMinX, newMinY + h],
    ];

    updateSelectedBox({ box: updatedBoxCoords });
  };

  const handleMouseUp = () => {
    setIsDragging(false);
  };

  return (
    <div
      className="flex-1 flex flex-col h-full bg-[#0b0d14] relative overflow-hidden select-none"
      onMouseMove={handleMouseMove}
      onMouseUp={handleMouseUp}
    >
      {/* 頂部快捷編輯工具列 */}
      <div className="h-14 bg-gray-900/90 border-b border-gray-800 px-6 flex items-center justify-between z-10 backdrop-blur-md">
        <div className="flex items-center gap-2">
          <button
            onClick={handleAddTextBox}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-violet-600 hover:bg-violet-500 text-white text-xs font-medium transition shadow-sm"
          >
            <Plus className="w-4 h-4" />
            <span>新增文字框</span>
          </button>

          <div className="h-4 w-px bg-gray-800 mx-2" />

          {/* 屬性調整 (若有選取文字方塊) */}
          {selectedBox ? (
            <div className="flex items-center gap-2">
              {/* 字級調整 */}
              <div className="flex items-center gap-1 bg-gray-800/80 px-2 py-1 rounded-md border border-gray-700">
                <span className="text-xs text-gray-400">字級</span>
                <input
                  type="number"
                  min={8}
                  max={96}
                  value={selectedBox.fontSize}
                  onChange={(e) => updateSelectedBox({ fontSize: Number(e.target.value) || 16 })}
                  className="w-12 bg-transparent text-xs text-white text-center font-mono focus:outline-none"
                />
                <span className="text-xs text-gray-400">pt</span>
              </div>

              {/* 粗體 */}
              <button
                onClick={() => updateSelectedBox({ bold: !selectedBox.bold })}
                className={`p-1.5 rounded-md border text-xs transition ${
                  selectedBox.bold
                    ? 'bg-violet-500/20 border-violet-500 text-violet-300'
                    : 'bg-gray-800/80 border-gray-700 text-gray-400 hover:text-white'
                }`}
                title="粗體"
              >
                <Bold className="w-4 h-4" />
              </button>

              {/* 對齊方式 */}
              <div className="flex items-center bg-gray-800/80 p-0.5 rounded-md border border-gray-700">
                <button
                  onClick={() => updateSelectedBox({ align: 'left' })}
                  className={`p-1 rounded ${selectedBox.align === 'left' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}
                  title="靠左對齊"
                >
                  <AlignLeft className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => updateSelectedBox({ align: 'center' })}
                  className={`p-1 rounded ${selectedBox.align === 'center' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}
                  title="置中對齊"
                >
                  <AlignCenter className="w-3.5 h-3.5" />
                </button>
                <button
                  onClick={() => updateSelectedBox({ align: 'right' })}
                  className={`p-1 rounded ${selectedBox.align === 'right' ? 'bg-violet-600 text-white' : 'text-gray-400 hover:text-white'}`}
                  title="靠右對齊"
                >
                  <AlignRight className="w-3.5 h-3.5" />
                </button>
              </div>

              {/* 顏色選擇 */}
              <div className="flex items-center gap-1 bg-gray-800/80 px-2 py-1 rounded-md border border-gray-700">
                <Palette className="w-3.5 h-3.5 text-gray-400" />
                <input
                  type="color"
                  value={selectedBox.color || '#111827'}
                  onChange={(e) => updateSelectedBox({ color: e.target.value })}
                  className="w-5 h-5 rounded cursor-pointer bg-transparent border-0"
                />
              </div>

              {/* 刪除 */}
              <button
                onClick={deleteSelectedBox}
                className="p-1.5 rounded-md bg-rose-500/10 border border-rose-500/30 text-rose-400 hover:bg-rose-500/20 text-xs transition"
                title="刪除所選文字框"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>
          ) : (
            <span className="text-xs text-gray-500 italic">點擊投影片上的任一文字框以進行調整或編輯文字</span>
          )}
        </div>

        {/* 顯示原版覆蓋開關 */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowOriginalOverlay(!showOriginalOverlay)}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-gray-800 hover:bg-gray-700 text-gray-300 text-xs font-medium border border-gray-700 transition"
          >
            {showOriginalOverlay ? <Eye className="w-3.5 h-3.5 text-violet-400" /> : <EyeOff className="w-3.5 h-3.5 text-gray-400" />}
            <span>{showOriginalOverlay ? '隱藏背景底圖' : '顯示背景底圖'}</span>
          </button>
        </div>
      </div>

      {/* 主畫布區域 */}
      <div
        ref={containerRef}
        onClick={() => setSelectedBoxId(null)}
        className="flex-1 flex items-center justify-center p-6 overflow-auto"
      >
        <div
          style={{
            width: `${slide.width * scale}px`,
            height: `${slide.height * scale}px`,
          }}
          className="relative bg-white shadow-2xl rounded-sm transition-all duration-75 border border-gray-700/50"
        >
          {/* 原圖背景 */}
          {showOriginalOverlay && slide.bgImageBase64 && (
            <img
              src={slide.bgImageBase64}
              alt="Slide Background"
              className="absolute inset-0 w-full h-full object-fill pointer-events-none"
            />
          )}

          {/* 覆蓋的文字方塊清單 */}
          {slide.textBoxes.map((tb) => {
            const xs = tb.box.map((p) => p[0]);
            const ys = tb.box.map((p) => p[1]);
            const minX = Math.min(...xs);
            const maxX = Math.max(...xs);
            const minY = Math.min(...ys);
            const maxY = Math.max(...ys);

            const isSelected = tb.id === selectedBoxId;

            return (
              <div
                key={tb.id}
                onMouseDown={(e) => handleBoxMouseDown(e, tb)}
                style={{
                  left: `${minX * scale}px`,
                  top: `${minY * scale}px`,
                  width: `${Math.max((maxX - minX) * scale, 40)}px`,
                  minHeight: `${Math.max((maxY - minY) * scale, 20)}px`,
                  fontSize: `${tb.fontSize * scale}px`,
                  color: tb.color || '#111827',
                  textAlign: tb.align || 'left',
                  fontWeight: tb.bold ? 'bold' : 'normal',
                }}
                className={`absolute group cursor-move transition-colors rounded ${
                  isSelected
                    ? 'ring-2 ring-violet-500 bg-white/95 shadow-lg z-20'
                    : 'bg-white/80 hover:bg-white/95 border border-dashed border-violet-400/40 hover:border-violet-500 z-10'
                }`}
              >
                {/* 實體輸入或顯示文字 */}
                {isSelected ? (
                  <textarea
                    autoFocus
                    value={tb.text}
                    onChange={(e) => updateSelectedBox({ text: e.target.value })}
                    className="w-full h-full bg-transparent p-1 resize-none outline-none overflow-hidden font-sans"
                    rows={Math.max(1, tb.text.split('\n').length)}
                  />
                ) : (
                  <div className="p-1 break-words font-sans whitespace-pre-wrap leading-tight">
                    {tb.text}
                  </div>
                )}

                {/* 選取時的控制把手 */}
                {isSelected && (
                  <div className="absolute -top-6 left-0 bg-violet-600 text-[10px] text-white px-1.5 py-0.5 rounded shadow pointer-events-none flex items-center gap-1 font-mono">
                    <Move className="w-2.5 h-2.5" />
                    可拖曳移動
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
