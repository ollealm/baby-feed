export interface Nutrient {
  name: string;
  unit: string;
  category: 'macro' | 'fat' | 'vitamin' | 'mineral' | 'other';
}

export const NUTRIENTS: Nutrient[] = [
  { name: 'Energy', unit: 'kcal', category: 'macro' },
  { name: 'Protein', unit: 'g', category: 'macro' },
  { name: 'Fat', unit: 'g', category: 'macro' },
  { name: 'Saturated fat', unit: 'g', category: 'macro' },
  { name: 'Monounsaturated fat', unit: 'g', category: 'macro' },
  { name: 'Polyunsaturated fat', unit: 'g', category: 'macro' },
  { name: 'Carbohydrates', unit: 'g', category: 'macro' },
  { name: 'Sugars', unit: 'g', category: 'macro' },
  { name: 'Lactose', unit: 'g', category: 'macro' },
  { name: 'Fiber (GOS)', unit: 'g', category: 'macro' },
  { name: 'Linoleic acid', unit: 'mg', category: 'fat' },
  { name: 'Alpha-linolenic acid', unit: 'mg', category: 'fat' },
  { name: 'DHA', unit: 'mg', category: 'fat' },
  { name: 'ARA', unit: 'mg', category: 'fat' },
  { name: 'Vitamin A', unit: 'μg', category: 'vitamin' },
  { name: 'Vitamin D', unit: 'μg', category: 'vitamin' },
  { name: 'Vitamin E', unit: 'mg', category: 'vitamin' },
  { name: 'Vitamin K', unit: 'μg', category: 'vitamin' },
  { name: 'Vitamin C', unit: 'mg', category: 'vitamin' },
  { name: 'Thiamine (B1)', unit: 'mg', category: 'vitamin' },
  { name: 'Riboflavin (B2)', unit: 'mg', category: 'vitamin' },
  { name: 'Niacin (B3)', unit: 'mg', category: 'vitamin' },
  { name: 'Vitamin B6', unit: 'mg', category: 'vitamin' },
  { name: 'Folate', unit: 'μg', category: 'vitamin' },
  { name: 'Vitamin B12', unit: 'μg', category: 'vitamin' },
  { name: 'Biotin', unit: 'μg', category: 'vitamin' },
  { name: 'Pantothenic acid', unit: 'mg', category: 'vitamin' },
  { name: 'Sodium', unit: 'mg', category: 'mineral' },
  { name: 'Potassium', unit: 'mg', category: 'mineral' },
  { name: 'Chloride', unit: 'mg', category: 'mineral' },
  { name: 'Calcium', unit: 'mg', category: 'mineral' },
  { name: 'Phosphorus', unit: 'mg', category: 'mineral' },
  { name: 'Magnesium', unit: 'mg', category: 'mineral' },
  { name: 'Iron', unit: 'mg', category: 'mineral' },
  { name: 'Zinc', unit: 'mg', category: 'mineral' },
  { name: 'Copper', unit: 'μg', category: 'mineral' },
  { name: 'Manganese', unit: 'μg', category: 'mineral' },
  { name: 'Selenium', unit: 'μg', category: 'mineral' },
  { name: 'Iodine', unit: 'μg', category: 'mineral' },
  { name: 'Choline', unit: 'mg', category: 'other' },
  { name: 'Inositol', unit: 'mg', category: 'other' },
  { name: 'Taurine', unit: 'mg', category: 'other' },
  { name: 'L-carnitine', unit: 'mg', category: 'other' },
  { name: 'Nucleotides', unit: 'mg', category: 'other' },
];

// Values per 100ml of prepared formula
export const FORMULA_DATA: Record<string, Record<string, number>> = {
  'BabySemp 1': {
    'Energy': 66, 'Protein': 1.3, 'Fat': 3.5, 'Saturated fat': 1.3,
    'Monounsaturated fat': 1.4, 'Polyunsaturated fat': 0.6,
    'Carbohydrates': 7.0, 'Sugars': 6.9, 'Lactose': 6.8, 'Fiber (GOS)': 0.3,
    'Linoleic acid': 533, 'Alpha-linolenic acid': 59, 'DHA': 14, 'ARA': 6.9,
    'Vitamin A': 55.0, 'Vitamin D': 1.5, 'Vitamin E': 0.81, 'Vitamin K': 3.0,
    'Vitamin C': 11, 'Thiamine (B1)': 0.052, 'Riboflavin (B2)': 0.091, 'Niacin (B3)': 0.51,
    'Vitamin B6': 0.052, 'Folate': 12.0, 'Vitamin B12': 0.23, 'Biotin': 1.2,
    'Pantothenic acid': 0.33,
    'Sodium': 20, 'Potassium': 65, 'Chloride': 48, 'Calcium': 44.0,
    'Phosphorus': 26.0, 'Magnesium': 4.00, 'Iron': 0.40, 'Zinc': 0.40,
    'Copper': 50, 'Manganese': 5.2, 'Selenium': 2.6, 'Iodine': 13.0,
    'Choline': 20, 'Inositol': 4.0, 'Taurine': 4.6, 'L-carnitine': 0.98,
    'Nucleotides': 0.8,
  },
  'BabySemp 2': {
    'Energy': 69, 'Protein': 1.4, 'Fat': 3.4, 'Saturated fat': 1.2,
    'Monounsaturated fat': 1.3, 'Polyunsaturated fat': 0.6,
    'Carbohydrates': 8.0, 'Sugars': 7.9, 'Lactose': 7.8, 'Fiber (GOS)': 0.2,
    'Linoleic acid': 518, 'Alpha-linolenic acid': 57, 'DHA': 14, 'ARA': 3.5,
    'Vitamin A': 63.0, 'Vitamin D': 1.5, 'Vitamin E': 0.71, 'Vitamin K': 5.2,
    'Vitamin C': 13, 'Thiamine (B1)': 0.069, 'Riboflavin (B2)': 0.13, 'Niacin (B3)': 0.44,
    'Vitamin B6': 0.043, 'Folate': 24.8, 'Vitamin B12': 0.21, 'Biotin': 2.2,
    'Pantothenic acid': 0.41,
    'Sodium': 24, 'Potassium': 84.0, 'Chloride': 49.0, 'Calcium': 60.0,
    'Phosphorus': 36.0, 'Magnesium': 7.70, 'Iron': 1.0, 'Zinc': 0.43,
    'Copper': 51, 'Manganese': 15, 'Selenium': 2.5, 'Iodine': 17.0,
    'Choline': 19, 'Inositol': 3.7, 'Taurine': 5.9, 'L-carnitine': 1.5,
    'Nucleotides': 0,
  },
};

export function getKcalPer100ml(formula: string): number {
  return FORMULA_DATA[formula]?.['Energy'] ?? 67;
}

export const CATEGORIES = [
  { key: 'macro', label: 'Macronutrients' },
  { key: 'fat', label: 'Fatty Acids' },
  { key: 'vitamin', label: 'Vitamins' },
  { key: 'mineral', label: 'Minerals' },
  { key: 'other', label: 'Other' },
] as const;
