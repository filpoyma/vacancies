export type TTelegramDialogType = "group" | "supergroup" | "channel";

/** Configured Telegram source (resolved to telegramId at runtime). */
export interface ISourceConfig {
  /** Stable Telegram chat id, e.g. "-100123456789" */
  id?: string;
  username?: string;
  /** Display name for dev matching when id is unknown */
  name?: string;
}

export interface ISalaryFilterConfig {
  min: number;
  currency: string;
}

export interface IFiltersConfig {
  roles: string[];
  skills: string[];
  excludedKeywords: string[];
  salary: ISalaryFilterConfig;
  remoteOnly: boolean;
  minMatchScore: number;
}

export interface INotificationsConfig {
  /** Reserved for future use (e.g. Saved Messages). MVP uses targetTitle group. */
  target: string;
  /** Supergroup title for matched vacancies */
  targetTitle: string;
}

export type TApplyProfileId = "frontend" | "fullstack";

export interface IApplyProfileConfig {
  resumePath: string;
}

export interface IApplyConfig {
  enabled: boolean;
  confirmCommand: string;
  sendToCommand: string;
  profiles: Record<TApplyProfileId, IApplyProfileConfig>;
  coverLetterPath: string;
}

export interface ITelegramConfig {
  sources: ISourceConfig[];
}

export interface IAiConfig {
  /** Extra instructions for the OpenRouter vacancy analyzer (natural language). */
  candidateProfilePrompt?: string;
}

export interface IAppConfig {
  telegram: ITelegramConfig;
  filters: IFiltersConfig;
  notifications: INotificationsConfig;
  apply: IApplyConfig;
  ai?: IAiConfig;
}
