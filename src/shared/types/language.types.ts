export interface Language {
  code: string;
  name: string;
  isDefault: boolean;
}

export interface Translation {
  key: string;
  value: string;
  language: string;
}