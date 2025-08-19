// services/geminiService.js (With a New, Broader Mission)
import { GoogleGenerativeAI } from "@google/generative-ai";
import Constants from "expo-constants";

const API_KEY = Constants.expoConfig.extra.geminiApiKey;
const genAI = new GoogleGenerativeAI(API_KEY);
const model = genAI.getGenerativeModel({ model: "gemini-1.5-flash"});

/**
 * NEW MISSION: Detects ALL common allergens from an ingredient list.
 * @param {string} ingredientsText - The full string of ingredients from the product.
 * @returns {Promise<string[]>} A promise that resolves to an array of all detected allergen strings.
 */
export const detectAllergensInIngredients = async (ingredientsText) => {
    if (!ingredientsText) {
        return [];
    }

    // This is a comprehensive list of common allergens to guide the AI.
    const ALLERGY_REFERENCE_LIST = "Milk, Eggs, Peanuts, Tree nuts (like Almonds, Walnuts, Cashews), Soy, Wheat, Fish, Shellfish (like Shrimp, Crab, Lobster), Sesame, Mustard, Corn, Gelatin, Rice, Oats, Barley, Rye, Lentils, Chickpeas, Peas, Beans, Garlic, Onion, Tomatoes, Strawberries, Kiwi, Pineapple, Banana, Avocado, Mango, Apple, Peach, Melon, Grapes, Citrus fruits, Spices, Cinnamon, Coconut, Cocoa, Chocolate, Yeast, Vinegar";

    const prompt = `
        You are a food science expert. Your task is to analyze the following food ingredient list and identify every single ingredient that is a common allergen or is derived from one. Use the provided allergy reference list to guide you.

        Allergy Reference List: "${ALLERGY_REFERENCE_LIST}"
        
        Ingredient List to Analyze: "${ingredientsText}"

        Consider derivatives (e.g., 'casein' or 'whey' for 'milk', 'semolina' for 'wheat', 'lecithin' for 'soy').
        
        Respond ONLY with a valid JSON array of strings. Each string in the array must be an exact ingredient phrase from the provided "Ingredient List to Analyze".
        If no allergens are found in the list, you MUST return an empty array [].

        Example:
        Ingredient List to Analyze: "Enriched flour (wheat flour, niacin), sugar, vegetable oil (palm oil, canola oil), cocoa, milk powder, soy lecithin, natural flavor."
        Your Response: ["wheat flour", "milk powder", "soy lecithin"]
    `;

    try {
        const result = await model.generateContent(prompt);
        const response = result.response;
        const text = response.text();
        
        const cleanedText = text.replace(/```json/g, '').replace(/```/g, '').trim();
        const detected = JSON.parse(cleanedText);
        
        return Array.isArray(detected) ? detected : [];

    } catch (error) {
        console.error("Gemini API Error:", error);
        return []; // Return an empty array on failure
    }
};