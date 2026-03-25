export interface ChipItem {
  emoji: string;
  label: string;
}

export interface ChipSection {
  id: string;
  label: string;
  chips: ChipItem[];
  multi: boolean;
}

export interface MusicGeneratorForm {
  genres: string[];
  moods: string[];
  vocals: string[];
  usage: string[];
  instruments: string[];
  bpm: string;
  targetAge: string;
  language: string;
  theme: string[];
  atmosphere: string[];
  production: string[];
  creativity: string;
  customRequest: string;
  shortsMode: boolean;
  model: 'flash' | 'pro';
  count: number;
}

export interface GeneratedSong {
  title: string;
  style: string;
  lyrics: string;
  bpm: number;
}

export interface MusicGenHistory {
  id: string;
  createdAt: string;
  form: Partial<MusicGeneratorForm>; // 생성 조건 요약
  songs: GeneratedSong[];
}
