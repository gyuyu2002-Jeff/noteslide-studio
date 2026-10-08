import os
import io
import json
import base64
import uuid
import cv2
import numpy as np
from PIL import Image
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, Header, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import FileResponse, StreamingResponse
from fastapi.staticfiles import StaticFiles
from pydantic import BaseModel
import pypdfium2 as pdfium
from rapidocr_onnxruntime import RapidOCR
from pptx import Presentation
from pptx.util import Inches, Pt
from pptx.dml.color import RGBColor
from pptx.enum.text import PP_ALIGN

app = FastAPI(title="NoteSlide Studio API", version="1.1.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化 RapidOCR 引擎 (啟用方向微調與字元框最佳化)
ocr_engine = RapidOCR()

class TextBoxItem(BaseModel):
    id: str
    text: str
    box: List[List[float]] # [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
    confidence: float
    fontSize: Optional[float] = 16
    color: Optional[str] = "#111827"
    align: Optional[str] = "left" # left, center, right
    bold: Optional[bool] = False

class SlideData(BaseModel):
    slideIndex: int
    width: int
    height: int
    bgImageBase64: str
    textBoxes: List[TextBoxItem]

class ExportPptxRequest(BaseModel):
    title: Optional[str] = "NoteSlide_Presentation"
    slides: List[SlideData]


def preprocess_image_for_ocr(img_rgb: np.ndarray) -> np.ndarray:
    """
    圖像前處理增強：
    1. 自適應對比度增強 (CLAHE on L-channel)
    2. 適度微銳化處理，增強繁體中文文字輪廓，避免字劃沾黏
    """
    try:
        lab = cv2.cvtColor(img_rgb, cv2.COLOR_RGB2LAB)
        l, a, b = cv2.split(lab)
        clahe = cv2.createCLAHE(clipLimit=2.0, tileGridSize=(8, 8))
        cl = clahe.apply(l)
        enhanced_lab = cv2.merge((cl, a, b))
        enhanced_rgb = cv2.cvtColor(enhanced_lab, cv2.COLOR_LAB2RGB)

        # 溫和銳化濾波器
        kernel = np.array([[0, -0.3, 0],
                           [-0.3, 2.2, -0.3],
                           [0, -0.3, 0]], dtype=np.float32)
        sharpened = cv2.filter2D(enhanced_rgb, -1, kernel)
        return cv2.addWeighted(enhanced_rgb, 0.4, sharpened, 0.6, 0)
    except Exception:
        return img_rgb


def call_ai_vision_refinement(img_pil: Image.Image, text_boxes: List[TextBoxItem], api_type: str, api_key: str, base_url: Optional[str] = None):
    """
    透過使用者提供的臨時 API Key（安全端對端傳輸，不保留在伺服器），
    對低信心度字元進行 Vision 語意校對。
    """
    if not api_key:
        return text_boxes

    try:
        if api_type == "gemini":
            from google import genai
            client = genai.Client(api_key=api_key)
            
            # 準備低信心度或需校正清單
            targets = [{"index": idx, "original": tb.text} for idx, tb in enumerate(text_boxes) if tb.confidence < 0.95 or len(tb.text) <= 4]
            if not targets:
                return text_boxes

            prompt = (
                "You are an expert OCR corrector for Chinese and English presentations. "
                "Here is a slide image and the initial OCR extracted texts with their indexes: \n"
                f"{json.dumps(targets, ensure_ascii=False)}\n\n"
                "Please inspect the actual text on the image and correct any typo or misidentified Chinese/English characters. "
                "Return ONLY a valid JSON array of objects with 'index' and 'corrected' text. Example: [{'index': 0, 'corrected': '正確文字'}]"
            )

            buffered = io.BytesIO()
            img_pil.save(buffered, format="JPEG", quality=85)
            img_bytes = buffered.getvalue()

            response = client.models.generate_content(
                model="gemini-2.5-flash",
                contents=[
                    prompt,
                    genai.types.Part.from_bytes(data=img_bytes, mime_type="image/jpeg")
                ]
            )

            res_text = response.text.strip()
            # 提取 JSON 區塊
            if "```json" in res_text:
                res_text = res_text.split("```json")[1].split("```")[0].strip()
            elif "```" in res_text:
                res_text = res_text.split("```")[1].split("```")[0].strip()

            corrections = json.loads(res_text)
            for item in corrections:
                target_idx = item.get("index")
                corrected_str = item.get("corrected")
                if target_idx is not None and target_idx < len(text_boxes) and corrected_str:
                    text_boxes[target_idx].text = str(corrected_str).strip()
                    text_boxes[target_idx].confidence = 1.0

        elif api_type == "openai":
            import openai
            client = openai.OpenAI(api_key=api_key, base_url=base_url if base_url else None)
            buffered = io.BytesIO()
            img_pil.save(buffered, format="JPEG", quality=85)
            img_b64 = base64.b64encode(buffered.getvalue()).decode("utf-8")

            targets = [{"index": idx, "original": tb.text} for idx, tb in enumerate(text_boxes) if tb.confidence < 0.95 or len(tb.text) <= 4]
            if not targets:
                return text_boxes

            prompt = (
                "You are an expert OCR corrector for Chinese and English presentations. "
                f"Initial OCR text: {json.dumps(targets, ensure_ascii=False)}\n"
                "Inspect the image, correct typos or misrecognized characters. "
                "Output ONLY a JSON array: [{'index': 0, 'corrected': 'correct text'}]"
            )

            resp = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[
                    {
                        "role": "user",
                        "content": [
                            {"type": "text", "text": prompt},
                            {"type": "image_url", "image_url": {"url": f"data:image/jpeg;base64,{img_b64}"}}
                        ]
                    }
                ],
                temperature=0.1
            )
            raw = resp.choices[0].message.content.strip()
            if "```json" in raw:
                raw = raw.split("```json")[1].split("```")[0].strip()
            elif "```" in raw:
                raw = raw.split("```")[1].split("```")[0].strip()
            corrections = json.loads(raw)
            for item in corrections:
                idx = item.get("index")
                corrected_str = item.get("corrected")
                if idx is not None and idx < len(text_boxes) and corrected_str:
                    text_boxes[idx].text = str(corrected_str).strip()
                    text_boxes[idx].confidence = 1.0
    except Exception as e:
        print(f"[AI Vision Refinement Error] {str(e)}")
    
    return text_boxes


def process_image_with_ocr(
    pil_img: Image.Image,
    slide_index: int,
    api_type: Optional[str] = None,
    api_key: Optional[str] = None,
    base_url: Optional[str] = None
) -> SlideData:
    width, height = pil_img.size
    img_rgb = np.array(pil_img.convert("RGB"))
    
    # 執行影像銳化與對比前處理
    processed_np = preprocess_image_for_ocr(img_rgb)
    
    # 調優 RapidOCR 檢測參數
    ocr_result, _ = ocr_engine(
        processed_np,
        use_det=True,
        use_cls=True,
        use_rec=True
    )
    
    text_boxes: List[TextBoxItem] = []
    if ocr_result:
        for idx, item in enumerate(ocr_result):
            box, text, score = item
            box_coords = [[float(p[0]), float(p[1])] for p in box]
            h = abs(box[2][1] - box[0][1])
            est_font_size = max(10, min(64, round(h * 0.72)))

            text_boxes.append(TextBoxItem(
                id=f"slide_{slide_index}_txt_{idx}_{uuid.uuid4().hex[:6]}",
                text=str(text).strip(),
                box=box_coords,
                confidence=round(float(score), 3),
                fontSize=est_font_size,
                color="#111827",
                align="left",
                bold=False
            ))

    # 若使用者在前端填入了專屬 API Key，則執行多模態語意二次校準
    if api_key and api_type in ["gemini", "openai"]:
        text_boxes = call_ai_vision_refinement(pil_img, text_boxes, api_type, api_key, base_url)
            
    # 原圖背景轉為高畫質 base64 提供畫布渲染
    buffered = io.BytesIO()
    pil_img.save(buffered, format="JPEG", quality=92)
    img_b64 = "data:image/jpeg;base64," + base64.b64encode(buffered.getvalue()).decode("utf-8")
    
    return SlideData(
        slideIndex=slide_index,
        width=width,
        height=height,
        bgImageBase64=img_b64,
        textBoxes=text_boxes
    )


@app.post("/api/process-file")
async def process_file(
    file: UploadFile = File(...),
    api_type: Optional[str] = Form(None),
    api_key: Optional[str] = Form(None),
    base_url: Optional[str] = Form(None)
):
    """
    接收檔案並處理。
    【安全性保障】：
    api_key 僅作為單次 HTTP 請求的記憶體暫態傳參，處理完立即釋放，絕不寫入資料庫、檔案或任何日誌記錄。
    """
    filename = file.filename.lower()
    content = await file.read()
    
    slides: List[SlideData] = []
    
    try:
        if filename.endswith(".pdf"):
            pdf = pdfium.PdfDocument(content)
            total_pages = len(pdf)
            for page_index in range(min(total_pages, 50)):
                page = pdf[page_index]
                # 優化 1：採用 scale=3.0 (高解析度 ~216 DPI 超取樣)，大幅提升繁體細劃辨識度
                bitmap = page.render(scale=3.0)
                pil_img = bitmap.to_pil()
                slide_data = process_image_with_ocr(
                    pil_img,
                    page_index,
                    api_type=api_type,
                    api_key=api_key,
                    base_url=base_url
                )
                slides.append(slide_data)
        elif any(filename.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".webp", ".gif"]):
            pil_img = Image.open(io.BytesIO(content))
            # 圖片若較小，智慧等比放大後增強
            w, h = pil_img.size
            if w < 1600:
                scale_factor = 1600.0 / w
                pil_img = pil_img.resize((int(w * scale_factor), int(h * scale_factor)), Image.Resampling.LANCZOS)
                
            slide_data = process_image_with_ocr(
                pil_img,
                0,
                api_type=api_type,
                api_key=api_key,
                base_url=base_url
            )
            slides.append(slide_data)
        else:
            raise HTTPException(status_code=400, detail="不支援的檔案格式，請上傳 PDF 或圖片檔 (PNG, JPG, WebP)")
            
        return {
            "success": True,
            "filename": file.filename,
            "totalPages": len(slides),
            "slides": slides
        }
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"解析失敗: {str(e)}")


@app.post("/api/export-pptx")
async def export_pptx(payload: ExportPptxRequest):
    try:
        prs = Presentation()
        prs.slide_width = Inches(13.333)
        prs.slide_height = Inches(7.5)
        blank_slide_layout = prs.slide_layouts[6]

        for slide_data in payload.slides:
            slide = prs.slides.add_slide(blank_slide_layout)
            
            if slide_data.bgImageBase64:
                header, encoded = slide_data.bgImageBase64.split(",", 1) if "," in slide_data.bgImageBase64 else ("", slide_data.bgImageBase64)
                img_bytes = base64.b64decode(encoded)
                img_stream = io.BytesIO(img_bytes)
                slide.shapes.add_picture(img_stream, Inches(0), Inches(0), width=prs.slide_width, height=prs.slide_height)

            orig_w = slide_data.width or 1920
            orig_h = slide_data.height or 1080
            scale_x = prs.slide_width / orig_w
            scale_y = prs.slide_height / orig_h

            for tb in slide_data.textBoxes:
                if not tb.text:
                    continue
                
                xs = [p[0] for p in tb.box]
                ys = [p[1] for p in tb.box]
                min_x, max_x = min(xs), max(xs)
                min_y, max_y = min(ys), max(ys)
                
                left_inch = Inches(min_x * scale_x / Inches(1))
                top_inch = Inches(min_y * scale_y / Inches(1))
                box_width = Inches(max((max_x - min_x) * scale_x / Inches(1), 0.8))
                box_height = Inches(max((max_y - min_y) * scale_y / Inches(1), 0.3))
                
                textbox_shape = slide.shapes.add_textbox(left_inch, top_inch, box_width, box_height)
                tf = textbox_shape.text_frame
                tf.word_wrap = True
                tf.margin_left = Inches(0.02)
                tf.margin_right = Inches(0.02)
                tf.margin_top = Inches(0.01)
                tf.margin_bottom = Inches(0.01)

                p = tf.paragraphs[0]
                p.text = tb.text
                
                target_pt = Pt(max(10, min(50, tb.fontSize * (prs.slide_height / orig_h) * 1.1)))
                p.font.size = target_pt
                p.font.name = "Microsoft JhengHei"
                p.font.bold = tb.bold or False
                
                hex_color = (tb.color or "#111827").lstrip("#")
                if len(hex_color) == 6:
                    r, g, b = tuple(int(hex_color[i:i+2], 16) for i in (0, 2, 4))
                    p.font.color.rgb = RGBColor(r, g, b)
                    
                if tb.align == "center":
                    p.alignment = PP_ALIGN.CENTER
                elif tb.align == "right":
                    p.alignment = PP_ALIGN.RIGHT
                else:
                    p.alignment = PP_ALIGN.LEFT

        output_stream = io.BytesIO()
        prs.save(output_stream)
        output_stream.seek(0)
        
        export_filename = f"{payload.title or 'noteslide_presentation'}.pptx"
        return StreamingResponse(
            output_stream,
            media_type="application/vnd.openxmlformats-officedocument.presentationml.presentation",
            headers={"Content-Disposition": f'attachment; filename="{export_filename}"'}
        )

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"匯出 PPTX 失敗: {str(e)}")

frontend_dist = os.path.join(os.path.dirname(__file__), "dist")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
