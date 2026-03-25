export interface SeoChipSection {
  id: string;
  label: string;
  chips: string[];
}

export interface SeoForm {
  targetAge: string[];
  language: string;
  category: string[];
  format: string[];
  situation: string[];
  region: string;
  strategy: string;
  customRequest: string;
}

export interface SeoOutput {
  seoScore: number;
  titles: string[];
  mainKeywords: string[];
  longTailKeywords: string[];
  description: string;
  tags: string[];
  uploadTimes: { day: string; time: string }[];
  claudeInstruction: string;
}
