import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Meal {
  id: string;
  name: string;
  description: string;
  price: number;
  image: string;
  agentId: string;
  category: 'Breakfast' | 'Lunch' | 'Dinner' | 'Snacks';
  type: 'Veg' | 'Non-Veg';
  spiceLevel: 'Mild' | 'Medium' | 'Hot';
  calories: number;
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
  private meals: Meal[] = [
    { 
      id: 'm1', name: 'Dal Makhani Bowl', description: 'Creamy black lentils with 2 butter rotis & salad', 
      price: 120, image: 'assets/onboarding/dal_makhani.png', agentId: 'a1', category: 'Lunch', 
      type: 'Veg', spiceLevel: 'Medium', calories: 450 
    },
    { 
      id: 'm2', name: 'Paneer Tikka Box', description: 'Classic paneer tikka with lachha paratha & mint chutney', 
      price: 130, image: 'assets/onboarding/paneer_tikka.png', agentId: 'a2', category: 'Lunch', 
      type: 'Veg', spiceLevel: 'Medium', calories: 500 
    },
    { 
      id: 'm3', name: 'Veg Pulao Special', description: 'Fragrant basmati pulao with vegetables & raita', 
      price: 110, image: 'assets/onboarding/veg_pulao.png', agentId: 'a1', category: 'Dinner', 
      type: 'Veg', spiceLevel: 'Mild', calories: 400 
    },
    { 
      id: 'm4', name: 'Lite MealBox', description: 'Assorted light Indian meal for energy', 
      price: 100, image: 'assets/onboarding/veg_pulao.png', agentId: 'a3', category: 'Breakfast', 
      type: 'Veg', spiceLevel: 'Medium', calories: 380 
    }
  ];

  private agents: Agent[] = [
    { id: 'a1', name: 'Usha\'s Kitchen', rating: 4.8, distance: '1.2 km', speciality: 'North Indian' },
    { id: 'a2', name: 'Maa Ki Rasoi', rating: 4.9, distance: '0.8 km', speciality: 'Tiffin Specialist' },
    { id: 'a3', name: 'Annapurna', rating: 4.6, distance: '2.5 km', speciality: 'Sattvic Food' }
  ];

  constructor() { }

  getMeals(): Meal[] {
    return this.meals;
  }

  getAgents(): Agent[] {
    return this.agents;
  }

  getAgentById(id: string): Agent | undefined {
    return this.agents.find(a => a.id === id);
  }

  getMealsByAgent(agentId: string): Meal[] {
    return this.meals.filter(m => m.agentId === agentId);
  }

  // AI-inspired meal suggestion placeholder
  getAIPicks(): Meal[] {
    return [this.meals[0], this.meals[3]];
  }
}
