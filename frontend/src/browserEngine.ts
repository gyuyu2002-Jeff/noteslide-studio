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

// 透過使用者填寫的 Gemini API 執行精準視覺文字定位 (直接提取座標與真實文字，媲美原版 DeckEdit)
export async function runGeminiVisionOcr(
  imgDataUrl: string,
  width: number,
  height: number,
  slideIndex: number,
  apiKey: string
): Promise<SlideData> {
  const base64Data = imgDataUrl.includes(',') ? imgDataUrl.split(',')[1] : imgDataUrl;

  const prompt = `You are a professional presentation OCR layout extractor.
Extract all visible text lines/elements from this slide.
For each text element, provide:
1. "text": The exact text content (in traditional Chinese or English).
2. "box": 2D normalized bounding box [ymin, xmin, ymax, xmax] where values are integers between 0 and 1000.
3. "color": Hex color code of the text (e.g. "#FFFFFF", "#FACC15").
4. "fontSize": Estimated font size in points (e.g. 16, 24, 48).

Return ONLY a JSON array of objects:
[
  {"text": "績優主管", "box": [120, 300, 250, 700], "color": "#FFFFFF", "fontSize": 48},
  {"text": "經驗分享", "box": [270, 300, 380, 700], "color": "#FFFFFF", "fontSize": 48}
]`;

  const response = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${apiKey}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({
      contents: [
        {
          parts: [
            { text: prompt },
            { inlineData: { mimeType: 'image/jpeg', data: base64Data } }
          ]
        }
      ],
      generationConfig: {
        responseMimeType: 'application/json',
        temperature: 0.1
      }
    })
  });

  if (!response.ok) {
    const err = await response.json();
    throw new Error(err.error?.message || 'Gemini API 調用失敗');
  }

  const result = await response.json();
  const textRaw = result.candidates?.[0]?.content?.parts?.[0]?.text || '[]';
  const parsed = JSON.parse(textRaw);

  const textBoxes: TextBoxItem[] = parsed.map((item: any, idx: number) => {
    // box [ymin, xmin, ymax, xmax] normalized 0~1000
    const [ymin, xmin, ymax, xmax] = item.box || [0, 0, 100, 100];
    const x0 = (xmin / 1000) * width;
    const y0 = (ymin / 1000) * height;
    const x1 = (xmax / 1000) * width;
    const y1 = (ymax / 1000) * height;

    return {
      id: `gemini_slide_${slideIndex}_txt_${idx}_${Date.now()}`,
      text: item.text || '',
      box: [
        [x0, y0],
        [x1, y0],
        [x1, y1],
        [x0, y1]
      ],
      confidence: 0.99,
      fontSize: item.fontSize || Math.max(16, Math.round((y1 - y0) * 0.7)),
      color: item.color || '#FFFFFF',
      align: 'left',
      bold: true
    };
  });

  return {
    slideIndex,
    width,
    height,
    bgImageBase64: imgDataUrl,
    textBoxes
  };
}

// 瀏覽器端純本地 OCR 辨識 (Tesseract.js chi_tra + eng)
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

  const ret: any = await worker.recognize(
    imgDataUrl,
    {},
    {
      blocks: true,
      hocr: true,
      tsv: true
    }
  );
  await worker.terminate();

  const textBoxes: TextBoxItem[] = [];
  let boxIdx = 0;

  if (ret.data?.blocks && ret.data.blocks.length > 0) {
    for (const b of ret.data.blocks) {
      if (!b.paragraphs) continue;
      for (const p of b.paragraphs) {
        if (!p.lines) continue;
        for (const line of p.lines) {
          const cleanText = (line.text || '').trim();
          if (!cleanText) continue;

          const bbox = line.bbox;
          if (!bbox) continue;

          const x0 = bbox.x0;
          const y0 = bbox.y0;
          const x1 = bbox.x1;
          const y1 = bbox.y1;

          const boxCoords = [
            [x0, y0],
            [x1, y0],
            [x1, y1],
            [x0, y1]
          ];

          const h = Math.abs(y1 - y0);
          const fontSize = Math.max(14, Math.min(54, Math.round(h * 0.75)));

          textBoxes.push({
            id: `browser_slide_${slideIndex}_txt_${boxIdx++}_${Date.now()}`,
            text: cleanText,
            box: boxCoords,
            confidence: Number(((line.confidence || 80) / 100).toFixed(2)),
            fontSize,
            color: '#FFFFFF',
            align: 'left',
            bold: false
          });
        }
      }
    }
  }

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

      const cleanColor = (tb.color || '#FFFFFF').replace('#', '');

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
