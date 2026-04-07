import { Injectable } from '@angular/core';

export interface Agent {
  id: number;
  name: string;
  photo: string;
  distanceKm: number;
  ordersClosed: number;
  creditUsed: number;
  status: 'Good' | 'Average' | 'Low';
}

@Injectable({
  providedIn: 'root'
})
export class DataService {

  private agents: Agent[] = [
    { id: 1, name: 'Alex Rivera', photo: 'assets/avatars/alex.png', distanceKm: 42.5, ordersClosed: 24, creditUsed: 1250, status: 'Good' },
    { id: 2, name: 'Sarah Chen', photo: 'assets/avatars/sarah.png', distanceKm: 31.2, ordersClosed: 18, creditUsed: 980, status: 'Good' },
    { id: 3, name: 'Mike Johnson', photo: 'assets/avatars/mike.png', distanceKm: 18.9, ordersClosed: 12, creditUsed: 1450, status: 'Average' },
    { id: 4, name: 'Jordan Smith', photo: 'assets/avatars/jordan.png', distanceKm: 12.4, ordersClosed: 5, creditUsed: 600, status: 'Low' }
  ];

  constructor() { }

  getAgents(): Agent[] {
    return this.agents;
  }
}
