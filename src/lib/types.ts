export interface Family {
  id: string;
  code: string;
  default_amount_ml: number;
  feeding_interval_minutes: number;
  feeding_span_minutes: number;
  day_break_hour: number;
  current_formula: string;
  chart_rolling_days: number;
  created_at: string;
}

export interface Feeding {
  id: string;
  family_id: string;
  /** ml of formula, or kcal when is_food is true */
  amount_ml: number;
  time: string;
  is_estimate: boolean;
  is_food: boolean;
  vitamin_d: boolean;
  probiotics: boolean;
  omega3: boolean;
  formula: string;
  created_at: string;
}

export interface NewFeeding {
  /** ml of formula, or kcal when is_food is true */
  amount_ml: number;
  time: Date;
  is_estimate: boolean;
  is_food: boolean;
  vitamin_d: boolean;
  probiotics: boolean;
  omega3: boolean;
}

export type SleepKind = 'sleep' | 'wake';

export interface SleepEvent {
  id: string;
  family_id: string;
  kind: SleepKind;
  time: string;
  is_estimate: boolean;
  created_at: string;
}

export interface NewSleepEvent {
  kind: SleepKind;
  time: Date;
  is_estimate: boolean;
}
