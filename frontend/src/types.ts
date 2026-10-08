export interface TextBoxItem {
  id: string;
  text: string;
  box: number[][]; // [[x1, y1], [x2, y2], [x3, y3], [x4, y4]]
  confidence: number;
  fontSize: number;
  color: string;
  align: 'left' | 'center' | 'right';
  bold?: boolean;
}

export interface SlideData {
  slideIndex: number;
  width: number;
  height: number;
  bgImageBase64: string;
  textBoxes: TextBoxItem[];
}

export interface ProcessFileResponse {
  success: boolean;
  filename: string;
  totalPages: number;
  slides: SlideData[];
}
