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
  isAvailable?: boolean;
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
        image: m.imageUrl || m.ImageUrl || 'assets/onboarding/dal_makhani.png',
        agentId: m.agentId || m.AgentId,
        category: m.category || m.Category,
        type: (m.isVeg || m.IsVeg) ? 'Veg' : 'Non-Veg',
        isAvailable: m.isAvailable !== undefined ? m.isAvailable : m.IsAvailable
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
      isAvailable: true
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
        image: m.imageUrl || m.ImageUrl || 'assets/onboarding/dal_makhani.png',
        agentId: m.agentId || m.AgentId,
        category: m.category || m.Category,
        type: (m.isVeg || m.IsVeg) ? 'Veg' : 'Non-Veg',
        isAvailable: m.isAvailable !== undefined ? m.isAvailable : m.IsAvailable
      }));
    } catch (e) {
      return [];
    }
  }

  getAIPicks(): Meal[] {
    const current = this.mealsSubject.value;
    return current.slice(0, 2);
  }
}
