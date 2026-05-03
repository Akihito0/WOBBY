/**
 * BMI and Health Calculations Utility
 * Using Harris-Benedict equation for BMR (Basal Metabolic Rate)
 */

export interface BMIResult {
  bmi: number;
  category: 'underweight' | 'normal' | 'overweight' | 'obese';
  categoryLabel: string;
  categoryColor: string;
}

export interface BMRResult {
  bmr: number;
  dailyCalories: {
    sedentary: number;
    lightly_active: number;
    moderately_active: number;
    very_active: number;
    extremely_active: number;
  };
}

/**
 * Calculate BMI (Body Mass Index)
 * @param weight - Weight in kg
 * @param heightCm - Height in cm
 * @returns BMI result with category
 */
export const calculateBMI = (weight: number, heightCm: number): BMIResult => {
  const heightInMeters = heightCm / 100;
  const bmi = Math.round((weight / (heightInMeters * heightInMeters)) * 10) / 10;

  let category: 'underweight' | 'normal' | 'overweight' | 'obese';
  let categoryLabel: string;
  let categoryColor: string;

  if (bmi < 18.5) {
    category = 'underweight';
    categoryLabel = 'Underweight';
    categoryColor = '#3498db';
  } else if (bmi < 25) {
    category = 'normal';
    categoryLabel = 'Normal';
    categoryColor = '#2ecc71';
  } else if (bmi < 30) {
    category = 'overweight';
    categoryLabel = 'Overweight';
    categoryColor = '#f39c12';
  } else {
    category = 'obese';
    categoryLabel = 'Obese';
    categoryColor = '#e74c3c';
  }

  return { bmi, category, categoryLabel, categoryColor };
};

/**
 * Calculate BMR using Harris-Benedict equation
 * @param weight - Weight in kg
 * @param heightCm - Height in cm
 * @param age - Age in years
 * @param gender - 'male' or 'female'
 * @returns BMR and estimated daily calories for various activity levels
 */
export const calculateBMR = (
  weight: number,
  heightCm: number,
  age: number,
  gender: string
): BMRResult => {
  let bmr: number;

  if (gender?.toLowerCase() === 'male' || gender?.toLowerCase() === 'm') {
    // Men: BMR = 88.362 + (13.397 × weight) + (4.799 × height) - (5.677 × age)
    bmr = 88.362 + 13.397 * weight + 4.799 * heightCm - 5.677 * age;
  } else {
    // Women: BMR = 447.593 + (9.247 × weight) + (3.098 × height) - (4.330 × age)
    bmr = 447.593 + 9.247 * weight + 3.098 * heightCm - 4.330 * age;
  }

  bmr = Math.round(bmr);

  // Calculate daily calories based on activity level
  const dailyCalories = {
    sedentary: Math.round(bmr * 1.2), // Little or no exercise
    lightly_active: Math.round(bmr * 1.375), // Exercise 1-3 days/week
    moderately_active: Math.round(bmr * 1.55), // Exercise 3-5 days/week
    very_active: Math.round(bmr * 1.725), // Exercise 6-7 days/week
    extremely_active: Math.round(bmr * 1.9), // Physical job/exercise twice per day
  };

  return { bmr, dailyCalories };
};

/**
 * Convert weight between kg and lb
 */
export const convertWeight = {
  kgToLb: (kg: number) => Math.round(kg * 2.20462 * 100) / 100,
  lbToKg: (lb: number) => Math.round((lb / 2.20462) * 100) / 100,
};

/**
 * Convert height between cm and inches
 */
export const convertHeight = {
  cmToIn: (cm: number) => Math.round((cm / 2.54) * 100) / 100,
  inToCm: (inches: number) => Math.round(inches * 2.54 * 100) / 100,
};

/**
 * Get BMI interpretation and recommendations
 */
export const getBMIRecommendations = (bmi: number): string => {
  if (bmi < 18.5) {
    return 'You may be underweight. Consider consulting a healthcare provider for personalized advice.';
  } else if (bmi < 25) {
    return 'You are at a healthy weight. Maintain regular exercise and balanced nutrition.';
  } else if (bmi < 30) {
    return 'You may be overweight. Consider increasing physical activity and adjusting your diet.';
  } else {
    return 'You may be obese. Consult with a healthcare provider for guidance on weight management.';
  }
};
