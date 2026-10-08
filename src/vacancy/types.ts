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
