import { Injectable } from '@angular/core';
import { environment } from '../../environments/environment';

export interface ChatMessage {
  role: 'user' | 'model' | 'system';
  content: string;
}

@Injectable({
  providedIn: 'root',
})
export class Gemini {
  // Groq's OpenAI-compatible chat completions API. Multiple candidates to
  // fall back across if one is rate-limited (mirrors the previous
  // multi-model Gemini strategy). Verified against this account's actual
  // available models via GET https://api.groq.com/openai/v1/models —
  // Groq has renamed/retired the llama-3.x and gemma2 IDs that used to
  // be standard, so don't reuse those without re-checking that endpoint.
  private modelCandidates = [
    'openai/gpt-oss-120b',
    'openai/gpt-oss-20b',
    'qwen/qwen3.8-27b'
  ];

  private async chatCompletion(model: string, messages: { role: string; content: string }[], maxTokens = 1000): Promise<string> {
    const res = await fetch('https://api.groq.com/openai/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${environment.groqApiKey}`
      },
      body: JSON.stringify({
        model,
        messages,
        max_tokens: maxTokens
      })
    });

    if (!res.ok) {
      const errBody = await res.text();
      throw new Error(`${res.status}: ${errBody}`);
    }

    const data = await res.json();
    return data.choices?.[0]?.message?.content ?? '';
  }

  async getChatResponse(userMessage: string, history: ChatMessage[], context: any): Promise<string> {
    const systemPrompt = `You are MealMantra, the smart AI culinary assistant for MealMate. Mix Hindi/English smoothly. Keep responses within 3 lines.
Context: User ${context.userName}, Wallet ₹${context.wallet?.balance}, Today's meal: ${context.subscription?.todaysMeal || 'None'}.
Available: ${(context.meals || []).map((m: any) => m.name).join(', ')}.
Rules: Never recommend outside the list. Always mention prices.`.trim();

    const messages = [
      { role: 'system', content: systemPrompt },
      ...history
        .filter(m => m.role !== 'system')
        .map(m => ({ role: m.role === 'model' ? 'assistant' : 'user', content: m.content })),
      { role: 'user', content: userMessage }
    ];

    for (const modelName of this.modelCandidates) {
      try {
        return await this.chatCompletion(modelName, messages);
      } catch (error: any) {
        const errTxt = error.message || '';
        console.warn(`Fallback: ${modelName} failed.`, errTxt);
        if (errTxt.includes('404') || errTxt.includes('429') || errTxt.includes('quota') || errTxt.includes('rate_limit')) {
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
      const prompt = `Return JSON array of 2 IDs from this list for "${userPref}": ${JSON.stringify(availableMeals.map(m => ({ id: m.id, name: m.name })))}. Respond with ONLY the JSON array, no other text.`;
      const resText = await this.chatCompletion(this.modelCandidates[0], [{ role: 'user', content: prompt }]);
      const ids = JSON.parse(resText.match(/\[.*\]/s)?.[0] || '[]');
      return availableMeals.filter(m => ids.includes(m.id)).slice(0, 2);
    } catch {
      return availableMeals.slice(0, 2);
    }
  }

  async getAiHealthInsight(selectedMeals: any[]): Promise<string> {
    return "Balanced choices lead to a healthier lifestyle!";
  }

  // Generic one-shot text generation, for callers that need a raw prompt
  // answered rather than a full chat exchange (e.g. HealthService's Mia tips).
  async generateText(prompt: string): Promise<string> {
    for (const modelName of this.modelCandidates) {
      try {
        return await this.chatCompletion(modelName, [{ role: 'user', content: prompt }]);
      } catch (error: any) {
        const errTxt = error.message || '';
        console.warn(`Fallback: ${modelName} failed.`, errTxt);
        if (errTxt.includes('404') || errTxt.includes('429') || errTxt.includes('quota') || errTxt.includes('rate_limit')) {
          continue;
        }
        throw error;
      }
    }
    throw new Error('All Groq model candidates failed.');
  }

  async generateInsights(data: string): Promise<string[]> {
    return ["Maa Ki Rasoi is trending.", "High demand for lunch thalis.", "Orders up 10% today."];
  }
}
