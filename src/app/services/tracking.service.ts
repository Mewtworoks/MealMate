import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

export interface Location {
  lat: number;
  lng: number;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class TrackingService {
  // Mock destination (Customer Location) - Fixed for the demo
  public readonly customerLocation: Location = {
    lat: 28.6139, 
    lng: 77.2090, 
    timestamp: Date.now()
  };

  // Agent location stream
  private agentLocation = new BehaviorSubject<Location>({
    lat: 28.6200, // Starting a bit away
    lng: 77.2200,
    timestamp: Date.now()
  });

  agentLocation$ = this.agentLocation.asObservable();

  private watchId: any;

  constructor() {}

  updateAgentLocation(lat: number, lng: number) {
    this.agentLocation.next({
      lat,
      lng,
      timestamp: Date.now()
    });
  }

  // Real GPS Tracking for Agent
  startAgentTracking() {
    if ('geolocation' in navigator) {
      if (this.watchId) navigator.geolocation.clearWatch(this.watchId);

      this.watchId = navigator.geolocation.watchPosition((pos) => {
        this.updateAgentLocation(pos.coords.latitude, pos.coords.longitude);
      }, (err) => {
        console.error('GPS Error:', err);
      }, {
        enableHighAccuracy: true,
        timeout: 5000,
        maximumAge: 0
      });
    }
  }

  stopAgentTracking() {
    if (this.watchId) {
      navigator.geolocation.clearWatch(this.watchId);
      this.watchId = null;
    }
  }

  // Helper for Testing on Desktop (Simulates real movement)
  startSimulation() {
    let step = 0;
    const totalSteps = 20;
    const startLat = 28.6200;
    const startLng = 77.2200;
    
    const interval = setInterval(() => {
      step++;
      const fraction = step / totalSteps;
      const curLat = startLat + (this.customerLocation.lat - startLat) * fraction;
      const curLng = startLng + (this.customerLocation.lng - startLng) * fraction;
      
      this.updateAgentLocation(curLat, curLng);
      
      if (step >= totalSteps) clearInterval(interval);
    }, 2000);
  }

  // Calculate distance in KM using Haversine formula
  getDistance(lat1: number, lon1: number, lat2: number, lon2: number): number {
    const R = 6371; // Radius of the earth in km
    const dLat = this.deg2rad(lat2 - lat1);
    const dLon = this.deg2rad(lon2 - lon1);
    const a =
      Math.sin(dLat / 2) * Math.sin(dLat / 2) +
      Math.cos(this.deg2rad(lat1)) * Math.cos(this.deg2rad(lat2)) *
      Math.sin(dLon / 2) * Math.sin(dLon / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c; // Distance in km
  }

  private deg2rad(deg: number) {
    return deg * (Math.PI / 180);
  }
}
