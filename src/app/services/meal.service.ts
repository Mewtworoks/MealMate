import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';

export interface Meal {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  agentId: string;
  category: string;
  type: 'Veg' | 'Non-Veg';
  spiceLevel?: 'Mild' | 'Medium' | 'Hot';
  calories?: number;
  protein?: number;      // grams
  carbs?: number;        // grams
  fat?: number;          // grams
  fiber?: number;        // grams
  isAvailable?: boolean;
  prepTime?: string;
  portionSize?: string;
  ingredients?: string;   // comma-separated
  allergens?: string;     // comma-separated
}

export interface Agent {
  id: string;
  name: string;
  rating: number;
  distance: string;
  speciality: string;
}

@Injectable({
  providedIn: 'root'
})
export class MealService {
  private agents: Agent[] = [
    { id: 'a1', name: 'Usha\'s Kitchen', rating: 4.8, distance: '1.2 km', speciality: 'North Indian' },
    { id: 'a2', name: 'Maa Ki Rasoi', rating: 4.9, distance: '0.8 km', speciality: 'Tiffin Specialist' },
    { id: 'a3', name: 'Annapurna', rating: 4.6, distance: '2.5 km', speciality: 'Sattvic Food' }
  ];

  private mealsSubject = new BehaviorSubject<Meal[]>([]);
  meals$ = this.mealsSubject.asObservable();

  constructor(private http: HttpClient) {
    this.refreshMeals();
  }

  mapMealImage(imageUrl: string, name: string): string {
    const url = imageUrl || '';
    if (url.includes('dal_makhani')) return 'assets/onboarding/dal_makhani.png';
    if (url.includes('paneer_tikka')) return 'assets/onboarding/paneer_tikka.png';
    if (url.includes('veg_pulao')) return 'assets/onboarding/veg_pulao.png';
    if (url.includes('masala_dosa')) return 'assets/onboarding/veg_pulao.png';
    if (url.includes('mango_lassi')) return 'assets/onboarding/salad_bowl.png';
    if (url.includes('dal_chawal')) return 'assets/onboarding/dal_chawal.png';
    if (url.includes('palak_paneer') || url.includes('palak-paneer')) return 'assets/onboarding/palak_paneer.png';

    const lower = (name || '').toLowerCase();
    if (lower.includes('dal') && lower.includes('makhani')) return 'assets/onboarding/dal_makhani.png';
    if (lower.includes('dal') || lower.includes('chawal')) return 'assets/onboarding/dal_chawal.png';
    if (lower.includes('paneer') && lower.includes('tikka')) return 'assets/onboarding/paneer_tikka.png';
    if (lower.includes('paneer')) return 'assets/onboarding/palak_paneer.png';
    if (lower.includes('pulao') || lower.includes('dosa') || lower.includes('rice') || lower.includes('biryani')) return 'assets/onboarding/veg_pulao.png';
    if (lower.includes('lassi') || lower.includes('drink') || lower.includes('mango')) return 'assets/onboarding/salad_bowl.png';
    if (lower.includes('salad')) return 'assets/onboarding/salad_bowl.png';

    return url || 'assets/onboarding/dal_makhani.png';
  }

  async refreshMeals(category?: string) {
    let url = `${environment.apiUrl}/meals`;
    if (category) url += `?category=${category}`;
    
    try {
      const backendMeals: any[] = await firstValueFrom(this.http.get<any[]>(url));
      const mappedMeals: Meal[] = backendMeals.map(m => ({
        id: m.id || m.Id,
        name: m.name || m.Name,
        description: m.description || m.Description || '',
        price: m.price || m.Price,
        image: this.mapMealImage(m.imageUrl || m.ImageUrl, m.name || m.Name),
        agentId: m.agentId || m.AgentId,
        category: m.category || m.Category,
        type: (m.isVeg || m.IsVeg) ? 'Veg' : 'Non-Veg',
        isAvailable: m.isAvailable !== undefined ? m.isAvailable : m.IsAvailable,
        calories: m.calories || m.Calories || 0,
        protein: m.protein || m.Protein || 0,
        carbs: m.carbs || m.Carbs || 0,
        fat: m.fat || m.Fat || 0,
        fiber: m.fiber || m.Fiber || 0,
        spiceLevel: m.spiceLevel || m.SpiceLevel || 'Medium',
        prepTime: m.prepTime || m.PrepTime || '25 min',
        portionSize: m.portionSize || m.PortionSize || '350g',
        ingredients: m.ingredients || m.Ingredients || '',
        allergens: m.allergens || m.Allergens || ''
      }));
      this.mealsSubject.next(mappedMeals);
      return mappedMeals;
    } catch (e) {
      console.error('Error fetching meals', e);
      return [];
    }
  }

  async addMeal(mealData: any) {
    const payload = {
      name: mealData.name,
      description: mealData.description,
      price: mealData.price,
      category: mealData.category,
      imageUrl: mealData.image,
      isVeg: mealData.type === 'Veg',
      agentId: mealData.agentId,
      isAvailable: true,
      calories: mealData.calories || 0,
      protein: mealData.protein || 0,
      carbs: mealData.carbs || 0,
      fat: mealData.fat || 0,
      fiber: mealData.fiber || 0,
      spiceLevel: mealData.spiceLevel || 'Medium',
      prepTime: mealData.prepTime || '25 min',
      portionSize: mealData.portionSize || '350g',
      ingredients: mealData.ingredients || '',
      allergens: mealData.allergens || ''
    };
    
    const res = await firstValueFrom(this.http.post(`${environment.apiUrl}/meals`, payload));
    this.refreshMeals();
    return res;
  }

  getAgents(): Agent[] {
    return this.agents;
  }

  getAgentById(id: string): Agent | undefined {
    return this.agents.find(a => a.id === id);
  }

  getMeals(): Meal[] {
    return this.mealsSubject.value;
  }

  async getMealsByAgent(agentId: string) {
    try {
      const backendMeals: any[] = await firstValueFrom(this.http.get<any[]>(`${environment.apiUrl}/meals/agent/${agentId}`));
      return backendMeals.map(m => ({
        id: m.id || m.Id,
        name: m.name || m.Name,
        description: m.description || m.Description || '',
        price: m.price || m.Price,
        image: this.mapMealImage(m.imageUrl || m.ImageUrl, m.name || m.Name),
        agentId: m.agentId || m.AgentId,
        category: m.category || m.Category,
        type: (m.isVeg || m.IsVeg) ? 'Veg' : 'Non-Veg',
        isAvailable: m.isAvailable !== undefined ? m.isAvailable : m.IsAvailable,
        calories: m.calories || m.Calories || 0,
        protein: m.protein || m.Protein || 0,
        carbs: m.carbs || m.Carbs || 0,
        fat: m.fat || m.Fat || 0,
        fiber: m.fiber || m.Fiber || 0,
        spiceLevel: m.spiceLevel || m.SpiceLevel || 'Medium',
        prepTime: m.prepTime || m.PrepTime || '25 min',
        portionSize: m.portionSize || m.PortionSize || '350g',
        ingredients: m.ingredients || m.Ingredients || '',
        allergens: m.allergens || m.Allergens || ''
      }));
    } catch (e) {
      return [];
    }
  }

  getAIPicks(): Meal[] {
    const current = this.mealsSubject.value;
    return current.slice(0, 2);
  }

  async updateMeal(meal: any) {
    const payload = {
      name: meal.name,
      description: meal.description,
      price: meal.price,
      category: meal.category,
      imageUrl: meal.image,
      isVeg: meal.type === 'Veg',
      agentId: meal.agentId,
      isAvailable: meal.isAvailable !== false,
      calories: meal.calories || 0,
      protein: meal.protein || 0,
      carbs: meal.carbs || 0,
      fat: meal.fat || 0,
      fiber: meal.fiber || 0,
      spiceLevel: meal.spiceLevel || 'Medium',
      prepTime: meal.prepTime || '25 min',
      portionSize: meal.portionSize || '350g',
      ingredients: meal.ingredients || '',
      allergens: meal.allergens || ''
    };
    await firstValueFrom(this.http.put(`${environment.apiUrl}/meals/${meal.id}`, payload));
    this.refreshMeals();
  }

  async deleteMeal(id: string) {
    await firstValueFrom(this.http.delete(`${environment.apiUrl}/meals/${id}`));
    this.refreshMeals();
  }
}

