import os
import io
import base64
import uuid
import numpy as np
from PIL import Image
from typing import List, Optional
from fastapi import FastAPI, UploadFile, File, Form, HTTPException
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

app = FastAPI(title="NoteSlide Studio API", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# 初始化 RapidOCR 辨識引擎
ocr_engine = RapidOCR()

TEMP_DIR = os.path.join(os.path.dirname(__file__), "temp_outputs")
os.makedirs(TEMP_DIR, exist_ok=True)

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


def process_image_with_ocr(pil_img: Image.Image, slide_index: int) -> SlideData:
    width, height = pil_img.size
    img_np = np.array(pil_img.convert("RGB"))
    
    ocr_result, _ = ocr_engine(img_np)
    
    text_boxes: List[TextBoxItem] = []
    if ocr_result:
        for idx, item in enumerate(ocr_result):
            box, text, score = item
            box_coords = [[float(p[0]), float(p[1])] for p in box]
            h = abs(box[2][1] - box[0][1])
            est_font_size = max(10, min(64, round(h * 0.7)))

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
            
    buffered = io.BytesIO()
    pil_img.save(buffered, format="JPEG", quality=90)
    img_b64 = "data:image/jpeg;base64," + base64.b64encode(buffered.getvalue()).decode("utf-8")
    
    return SlideData(
        slideIndex=slide_index,
        width=width,
        height=height,
        bgImageBase64=img_b64,
        textBoxes=text_boxes
    )


@app.post("/api/process-file")
async def process_file(file: UploadFile = File(...)):
    filename = file.filename.lower()
    content = await file.read()
    
    slides: List[SlideData] = []
    
    try:
        if filename.endswith(".pdf"):
            pdf = pdfium.PdfDocument(content)
            total_pages = len(pdf)
            for page_index in range(min(total_pages, 50)):
                page = pdf[page_index]
                bitmap = page.render(scale=2.0)
                pil_img = bitmap.to_pil()
                slide_data = process_image_with_ocr(pil_img, page_index)
                slides.append(slide_data)
        elif any(filename.endswith(ext) for ext in [".png", ".jpg", ".jpeg", ".webp", ".gif"]):
            pil_img = Image.open(io.BytesIO(content))
            slide_data = process_image_with_ocr(pil_img, 0)
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

# 掛載前端打包靜態目錄
frontend_dist = os.path.join(os.path.dirname(__file__), "dist")
if os.path.exists(frontend_dist):
    app.mount("/", StaticFiles(directory=frontend_dist, html=True), name="frontend")
