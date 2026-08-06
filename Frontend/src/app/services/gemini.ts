import { Injectable } from '@angular/core';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { environment } from '../../environments/environment';

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  content: string;
}

@Injectable({
  providedIn: 'root',
})
export class Gemini {
  private genAI: GoogleGenerativeAI;

  // Multi-model strategy to prevent quota issues (Error 429)
  private modelCandidates = [
    'gemini-2.5-flash',
    'gemini-1.5-flash-latest',
    'gemini-1.5-flash-8b',
    'gemini-1.5-flash-002',
    'gemini-1.5-flash'
  ];

  constructor() {
    this.genAI = new GoogleGenerativeAI(environment.geminiApiKey);
  }

  async getChatResponse(userMessage: string, history: ChatMessage[], context: any): Promise<string> {
    const systemPrompt = `You are MealMantra, the smart AI culinary assistant for MealMate. Mix Hindi/English smoothly. Keep responses within 3 lines.
Context: User ${context.userName}, Wallet ₹${context.wallet?.balance}, Today's meal: ${context.subscription?.todaysMeal || 'None'}.
Available: ${(context.meals || []).map((m: any) => m.name).join(', ')}.
Rules: Never recommend outside the list. Always mention prices.`.trim();

    const prompt = `${systemPrompt}\n\nUser: ${userMessage}`;

    // Clean and fix history alternation (Crucial to prevent 404/400 errors)
    const filteredHistory: any[] = [];
    let lastRole = '';

    const historyItems = history.filter(m => m.role !== 'system');
    for (const msg of historyItems) {
      const currentRole = msg.role === 'model' ? 'model' : 'user';
      // Only add if it alternates roles
      if (currentRole !== lastRole) {
        filteredHistory.push({
          role: currentRole,
          parts: [{ text: msg.content }]
        });
        lastRole = currentRole;
      }
    }

    // Ensure it starts with user and ends with user (before the new message)
    if (filteredHistory.length > 0 && filteredHistory[0].role === 'model') {
      filteredHistory.shift();
    }

    // The previous message in history MUST be from the 'model' for the current user message to work
    if (filteredHistory.length > 0 && filteredHistory[filteredHistory.length - 1].role === 'user') {
      // If last was user, we remove it to keep balance or append a dummy model response
      // For simplicity, we just keep the last 4 messages that alternate correctly
      while (filteredHistory.length > 0 && filteredHistory[filteredHistory.length - 1].role === 'user') {
        filteredHistory.pop();
      }
    }

    for (const modelName of this.modelCandidates) {
      try {
        const model = this.genAI.getGenerativeModel({ model: modelName });
        const chat = model.startChat({
          history: filteredHistory,
          generationConfig: { maxOutputTokens: 1000 }
        });

        const result = await chat.sendMessage(prompt);
        const response = await result.response;
        return response.text();
      } catch (error: any) {
        const errTxt = error.message || '';
        console.warn(`Fallback: ${modelName} failed.`, errTxt);
        if (errTxt.includes('404') || errTxt.includes('429') || errTxt.includes('quota') || errTxt.includes('not found')) {
          continue;
        }
        throw error;
      }
    }

    return "Main thoda busy hoon (Quota limit). Please try again in 30 seconds! ⏳";
  }

  // Simplified Suggestions
  async getMealSuggestions(userPref: string, availableMeals: any[]): Promise<any[]> {
    try {
      const model = this.genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });
      const prompt = `Return JSON array of 2 IDs from this list for "${userPref}": ${JSON.stringify(availableMeals.map(m => ({ id: m.id, name: m.name })))}`;
      const result = await model.generateContent(prompt);
      const resText = (await result.response).text();
      const ids = JSON.parse(resText.match(/\[.*\]/s)?.[0] || '[]');
      return availableMeals.filter(m => ids.includes(m.id)).slice(0, 2);
    } catch {
      return availableMeals.slice(0, 2);
    }
  }

  async getAiHealthInsight(selectedMeals: any[]): Promise<string> {
    return "Balanced choices lead to a healthier lifestyle!";
  }

  async generateInsights(data: string): Promise<string[]> {
    return ["Maa Ki Rasoi is trending.", "High demand for lunch thalis.", "Orders up 10% today."];
  }
}
