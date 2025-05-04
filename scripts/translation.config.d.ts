interface KeyNaming {
  separator: string;
  case: string;
  maxLength: number;
}

interface Extraction {
  minLength: number;
  maxLength: number;
  includeComments: boolean;
  includeJSX: boolean;
  includeProps: boolean;
}

interface TranslationConfig {
  sourceLang: string;
  targetLangs: string[];
  ignorePaths: string[];
  ignorePatterns: RegExp[];
  keyNaming: KeyNaming;
  extraction: Extraction;
}

declare const config: TranslationConfig;

export default config; 