import { Injectable } from '@angular/core';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { environment } from '../../environments/environment';

@Injectable({
  providedIn: 'root',
})
export class Gemini {
  private genAI: GoogleGenerativeAI;
  private model: any;

  constructor() {
    this.genAI = new GoogleGenerativeAI(environment.geminiApiKey);
    this.model = this.genAI.getGenerativeModel({ model: 'gemini-2.0-flash' });
  }

  // Used by ShopPage for AI Picks
  async getMealSuggestions(userPref: string, availableMeals: any[]): Promise<any[]> {
    const prompt = `
      You are a nutrition-focused AI meal assistant for "MealMate".
      A user wants: "${userPref}"
      Available meals today: ${JSON.stringify(availableMeals)}
      
      Select the best 2 meals that match these preferences. 
      Return ONLY a JSON array of the meal IDs.
      Example: ["m1", "m3"]
    `;

    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      const text = response.text().trim();
      
      // Clean up potential markdown formatting
      const cleanJson = text.replace(/```json|```/g, '');
      const selectedIds = JSON.parse(cleanJson);
      
      return availableMeals.filter(m => selectedIds.includes(m.id));
    } catch (error: any) {
      console.warn('Gemini API Error (fallback to static picks):', error.message || error);
      // Fallback to first two meals
      return availableMeals.slice(0, 2);
    }
  }

  // Legacy support for Supervisor Dashboard
  async generateInsights(data: string): Promise<string[]> {
    return [
      "Wait times for Dal Makhani are slightly higher today.",
      "Maa Ki Rasoi has the highest rating this hour.",
      "Demand for lunch boxes is peaking early today."
    ];
  }

  async getAiHealthInsight(selectedMeals: any[]): Promise<string> {
    const prompt = `
      Based on these meals: ${JSON.stringify(selectedMeals)}, 
      provide one short (15 words max) encouraging health insight for the user.
    `;
    try {
      const result = await this.model.generateContent(prompt);
      const response = await result.response;
      return response.text();
    } catch {
      return "Balanced choices lead to a healthier lifestyle!";
    }
  }
}
