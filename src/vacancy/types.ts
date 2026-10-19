export interface ISalaryInfo {
  min?: number;
  max?: number;
  currency?: string;
}

export interface IParsedVacancy {
  isVacancy: boolean;
  title?: string;
  company?: string;
  description: string;
  salary?: ISalaryInfo;
  location?: string;
  remote?: boolean;
  skills: string[];
  experience?: number;
  contact?: string;
  url?: string;
}

export interface IMatchResult {
  score: number;
  isRelevant: boolean;
  reasons: string[];
}

export interface IVacancyMatcher {
  match(vacancy: IParsedVacancy): Promise<IMatchResult>;
}

export interface IAnalysisResult {
  parsed: IParsedVacancy;
  match: IMatchResult;
  /** true when OpenRouter produced the result */
  usedAi?: boolean;
}

export interface IVacancyAnalyzer {
  analyze(rawText: string): Promise<IAnalysisResult>;
}
