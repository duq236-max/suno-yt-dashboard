export interface CoverChipItem {
  label: string;
  value: string;
}

export interface CoverChipSection {
  id: string;
  label: string;
  chips: CoverChipItem[];
}

export interface CoverImageForm {
  mood: string[];
  color: string[];
  concept: string[];
  artStyle: string[];
  lighting: string[];
  timeSeason: string[];
  textStyle: string[];
  composition: string[];
  freeDescription: string;
  aspectRatio: '16:9' | '1:1' | '4:5' | '9:16';
}

export interface CoverImageOutput {
  claudeInstruction: string;
  geminiPrompt: string;
  conceptPreview: string;
}

export interface CoverImageHistory {
  id: string;
  prompt: string;
  imageUrl: string;
  style: string;
  createdAt: string;
}
