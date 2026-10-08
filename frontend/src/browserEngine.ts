import * as pdfjsLib from 'pdfjs-dist';
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/${pdfjsLib.version}/pdf.worker.min.mjs`;

import { createWorker } from 'tesseract.js';
import pptxgen from 'pptxgenjs';
import type { SlideData, TextBoxItem } from './types';

// 渲染 PDF 單頁為高品質 Image (Canvas -> base64)
export async function renderPdfPageToDataUrl(pdfDoc: any, pageNum: number): Promise<{ dataUrl: string; width: number; height: number }> {
  const page = await pdfDoc.getPage(pageNum);
  const viewport = page.getViewport({ scale: 2.5 });

  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d')!;
  canvas.width = viewport.width;
  canvas.height = viewport.height;

  const renderContext: any = {
    canvasContext: ctx,
    viewport: viewport,
    canvas: canvas
  };

  await page.render(renderContext).promise;
  const dataUrl = canvas.toDataURL('image/jpeg', 0.9);
  return { dataUrl, width: viewport.width, height: viewport.height };
}

// 瀏覽器端純本地 OCR 辨識 (支援繁體中文 chi_tra + 英文 eng)
export async function runBrowserOcr(
  imgDataUrl: string,
  width: number,
  height: number,
  slideIndex: number,
  onProgress?: (progress: number) => void
): Promise<SlideData> {
  const worker = await createWorker(['chi_tra', 'eng'], 1, {
    logger: m => {
      if (m.status === 'recognizing text' && onProgress) {
        onProgress(Math.round(m.progress * 100));
      }
    }
  });

  const ret: any = await worker.recognize(imgDataUrl);
  await worker.terminate();

  const textBoxes: TextBoxItem[] = [];

  const lines = ret.data?.lines || [];
  lines.forEach((line: any, idx: number) => {
    const cleanText = (line.text || '').trim();
    if (!cleanText) return;

    const { x0, y0, x1, y1 } = line.bbox;
    const boxCoords = [
      [x0, y0],
      [x1, y0],
      [x1, y1],
      [x0, y1]
    ];

    const h = Math.abs(y1 - y0);
    const fontSize = Math.max(12, Math.min(54, Math.round(h * 0.75)));

    textBoxes.push({
      id: `browser_slide_${slideIndex}_txt_${idx}_${Date.now()}`,
      text: cleanText,
      box: boxCoords,
      confidence: Number(((line.confidence || 80) / 100).toFixed(2)),
      fontSize,
      color: '#111827',
      align: 'left',
      bold: false
    });
  });

  return {
    slideIndex,
    width,
    height,
    bgImageBase64: imgDataUrl,
    textBoxes
  };
}

// 瀏覽器端直接產生並下載 PPTX
export async function exportPptxInBrowser(slides: SlideData[], title: string = 'NoteSlide_Presentation') {
  const pres = new pptxgen();
  pres.layout = 'LAYOUT_16x9';

  const slideW = 10;
  const slideH = 5.625;

  slides.forEach((slideData) => {
    const slide = pres.addSlide();

    if (slideData.bgImageBase64) {
      slide.addImage({
        data: slideData.bgImageBase64,
        x: 0,
        y: 0,
        w: slideW,
        h: slideH
      });
    }

    const origW = slideData.width || 1920;
    const origH = slideData.height || 1080;
    const scaleX = slideW / origW;
    const scaleY = slideH / origH;

    slideData.textBoxes.forEach((tb) => {
      if (!tb.text) return;

      const xs = tb.box.map(p => p[0]);
      const ys = tb.box.map(p => p[1]);
      const minX = Math.min(...xs);
      const maxX = Math.max(...xs);
      const minY = Math.min(...ys);
      const maxY = Math.max(...ys);

      const x = minX * scaleX;
      const y = minY * scaleY;
      const w = Math.max((maxX - minX) * scaleX, 0.8);
      const h = Math.max((maxY - minY) * scaleY, 0.3);

      const cleanColor = (tb.color || '#111827').replace('#', '');

      slide.addText(tb.text, {
        x,
        y,
        w,
        h,
        fontSize: Math.max(10, Math.min(48, Math.round(tb.fontSize * scaleY * 1.1))),
        color: cleanColor,
        bold: !!tb.bold,
        align: tb.align || 'left',
        fontFace: 'Microsoft JhengHei',
        margin: 0
      });
    });
  });

  await pres.writeFile({ fileName: `${title}.pptx` });
}
