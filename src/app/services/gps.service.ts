import { Injectable } from '@angular/core';
import { Subject } from 'rxjs';

export interface LocationPoint {
  latitude: number;
  longitude: number;
  accuracy: number;
  speed: number;
  timestamp: number;
  status: 'Accepted' | 'Filtered' | 'Smoothed';
  mode: 'VEHICLE' | 'WALKING' | 'STATIONARY';
}

@Injectable({
  providedIn: 'root'
})
export class GpsService {
  private locationBuffer: LocationPoint[] = [];
  private heartbeatBuffer: LocationPoint[] = [];
  private lastLocation: LocationPoint | null = null;
  private lastSentLocation: LocationPoint | null = null;
  
  public locationUpdates$ = new Subject<LocationPoint>();
  public isOnline: boolean = true;
  
  constructor() {
    this.checkNetworkStatus();
  }

  private checkNetworkStatus() {
    // Basic mock network check
    this.isOnline = navigator.onLine;
    window.addEventListener('online', () => this.isOnline = true);
    window.addEventListener('offline', () => this.isOnline = false);
  }

  public startTracking(userId: string) {
    const cordova = (window as any).cordova;
    if (cordova && cordova.plugins && cordova.plugins.BackgroundLocation) {
      cordova.plugins.BackgroundLocation.start({
        apiUrl: 'https://api.fieldsales.com/location-sync',
        userId: userId
      });
    } else {
      console.warn('Cordova BackgroundLocation plugin not found, using simulation.');
      this.simulateLocationUpdates();
    }
  }

  public stopTracking(lastLat: number, lastLng: number) {
    const cordova = (window as any).cordova;
    if (cordova && cordova.plugins && cordova.plugins.BackgroundLocation) {
      cordova.plugins.BackgroundLocation.stop(lastLat, lastLng);
    }
    // Save session info end_time (HH:mm)
    const now = new Date();
    const endTime = `${now.getHours().toString().padStart(2, '0')}:${now.getMinutes().toString().padStart(2, '0')}`;
    console.log(`Session ended at ${endTime}. Final coordinate: ${lastLat}, ${lastLng}`);
  }

  public isSyncing(callback: (syncing: boolean) => void) {
    const cordova = (window as any).cordova;
    if (cordova && cordova.plugins && cordova.plugins.BackgroundLocation) {
      cordova.plugins.BackgroundLocation.isSyncing((result: any) => {
        callback(result === 1);
      });
    } else {
      callback(false);
    }
  }

  // --- Filter Algorithm (The real logic from prompt) ---
  public processNewLocation(newLat: number, newLng: number, accuracy: number, speed: number) {
    const newPoint: LocationPoint = {
      latitude: newLat,
      longitude: newLng,
      accuracy: accuracy,
      speed: speed,
      timestamp: Date.now(),
      status: 'Accepted',
      mode: 'STATIONARY'
    };

    // Step 1 - Accuracy check
    if (accuracy > 20) {
      console.log('Filtered: Accuracy > 20m');
      this.notifyUpdate({ ...newPoint, status: 'Filtered' });
      return;
    }

    // Step 2 - Major outlier check (buffer max 8)
    if (this.locationBuffer.length > 0) {
      const avg = this.calculateBufferAverage();
      const distToAvg = this.getDistance(newLat, newLng, avg.lat, avg.lng);
      if (distToAvg > 400) {
        console.log(`Filtered: Outlier detected (${distToAvg.toFixed(1)}m from avg)`);
        this.notifyUpdate({ ...newPoint, status: 'Filtered' });
        return;
      }
    }

    // Step 3 - Speed-based mode detection
    if (speed > 5) {
      newPoint.mode = 'VEHICLE';
    } else if (speed > 0.8) {
      newPoint.mode = 'WALKING';
    } else {
      newPoint.mode = 'STATIONARY';
    }

    // Step 4 - Small jitter check (< 10m)
    if (this.lastLocation) {
      const distFromLast = this.getDistance(newLat, newLng, this.lastLocation.latitude, this.lastLocation.longitude);
      if (distFromLast < 10) {
        if (newPoint.mode === 'STATIONARY') {
          console.log('Skipping: Stationary jitter < 10m');
          return; // Skip update
        } else {
          // SMOOTH coordinate
          newPoint.latitude = 0.8 * this.lastLocation.latitude + 0.2 * newLat;
          newPoint.longitude = 0.8 * this.lastLocation.longitude + 0.2 * newLng;
          newPoint.status = 'Smoothed';
        }
      }
    }

    // Update location buffer
    this.locationBuffer.push(newPoint);
    if (this.locationBuffer.length > 8) this.locationBuffer.shift();

    // Step 5 - Min send distance (5m)
    if (!this.lastSentLocation || this.getDistance(newPoint.latitude, newPoint.longitude, this.lastSentLocation.latitude, this.lastSentLocation.longitude) >= 5) {
      this.handleLocationSync(newPoint);
      this.lastSentLocation = newPoint;
    }

    this.lastLocation = newPoint;
    this.notifyUpdate(newPoint);
    this.handleHeartbeat(newPoint);
  }

  private handleLocationSync(point: LocationPoint) {
    if (this.isOnline) {
      // Sync SQLite data (simulated) then send current
      console.log('SYNC: Online. Sending point to server...');
    } else {
      // Save to SQLite locations table (simulated)
      console.log(`SYNC: Offline. Saving point ${point.timestamp} to SQLite (Qboid.db)...`);
    }
  }

  private handleHeartbeat(point: LocationPoint) {
    this.heartbeatBuffer.push(point);
    if (this.heartbeatBuffer.length > 60) this.heartbeatBuffer.shift();

    // Outlier in heartbeat clears it
    if (this.heartbeatBuffer.length > 1) {
      const prev = this.heartbeatBuffer[this.heartbeatBuffer.length - 2];
      if (this.getDistance(point.latitude, point.longitude, prev.latitude, prev.longitude) > 400) {
        console.log('Noise detected: Clearing heartbeat buffer.');
        this.heartbeatBuffer = [point];
      }
    }
  }

  private notifyUpdate(point: LocationPoint) {
    this.locationUpdates$.next(point);
  }

  private calculateBufferAverage() {
    const sumLat = this.locationBuffer.reduce((s, p) => s + p.latitude, 0);
    const sumLng = this.locationBuffer.reduce((s, p) => s + p.longitude, 0);
    return { lat: sumLat / this.locationBuffer.length, lng: sumLng / this.locationBuffer.length };
  }

  private getDistance(lat1: number, lon1: number, lat2: number, lon2: number) {
    const R = 6371e3; // metres
    const φ1 = lat1 * Math.PI / 180;
    const φ2 = lat2 * Math.PI / 180;
    const Δφ = (lat2 - lat1) * Math.PI / 180;
    const Δλ = (lon2 - lon1) * Math.PI / 180;
    const a = Math.sin(Δφ / 2) * Math.sin(Δφ / 2) + Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
    return R * c;
  }

  private simulateLocationUpdates() {
    let lat = 12.9716;
    let lng = 77.5946;
    setInterval(() => {
      // Create some minor jitter and movement
      lat += (Math.random() - 0.5) * 0.0001; 
      lng += (Math.random() - 0.5) * 0.0001;
      const accuracy = 10 + Math.random() * 15; // Random accuracy 10-25m
      const speed = 2 + Math.random() * 8; // Random speed 2-10 m/s
      this.processNewLocation(lat, lng, accuracy, speed);
    }, 2000);
  }
}
