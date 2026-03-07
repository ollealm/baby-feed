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
  amount_ml: number;
  time: string;
  is_estimate: boolean;
  vitamin_d: boolean;
  probiotics: boolean;
  formula: string;
  created_at: string;
}

export interface NewFeeding {
  amount_ml: number;
  time: Date;
  is_estimate: boolean;
  vitamin_d: boolean;
  probiotics: boolean;
}
