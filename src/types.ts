export interface Shot {
  id: string;
  bean_name: string;
  roaster: string;
  origin?: string;
  bean_type: string;
  roast_level: string;
  grind_setting: string;
  dose: number;
  yield: number;
  yield_grams?: number;
  yield_ml?: number;
  time: number;
  rating: 'Great' | 'Good' | 'Okay' | 'Off' | 'Bad';
  notes: string;
  machine: string;
  grinder: string;
  brew_method?: string;
  photo_url?: string;
  created_at: string;
}

export interface Stats {
  total_shots: number;
  avg_rating: number;
}

export interface WeeklyData {
  day: string;
  count: number;
  avg_time: number;
}

export interface RatingDistribution {
  rating: string;
  count: number;
}

export interface Recipe {
  id: string;
  name: string;
  bean_name?: string;
  roaster?: string;
  origin?: string;
  bean_type?: string;
  roast_level?: string;
  grind_setting?: string;
  dose?: number;
  yield?: number;
  yield_grams?: number;
  yield_ml?: number;
  time?: number;
  brew_method?: string;
  rating?: number;
  created_at: string;
}

export interface Bean {
  id: string;
  name: string;
  roaster: string;
  origin?: string;
  roast_date?: string;
  roast_level: string;
  bean_type?: string;
  weight: number; // current weight in grams
  total_weight: number; // original weight in grams
  notes?: string;
  created_at: string;
}
