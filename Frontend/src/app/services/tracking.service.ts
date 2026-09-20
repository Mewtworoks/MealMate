import { Injectable } from '@angular/core';

export interface Location {
  lat: number;
  lng: number;
  timestamp: number;
}

@Injectable({
  providedIn: 'root'
})
export class TrackingService {
  // TEMPORARY: hardcoded to Sarojini Nagar, New Delhi for testing the
  // delivery tracking flow reliably — real device/IP geolocation is
  // disabled below so this doesn't get silently overwritten by an
  // inaccurate fix. Revert to the geolocation-based version once
  // tracking is confirmed working.
  private _customerLocation: Location = {
    lat: 28.5745,
    lng: 77.1974,
    timestamp: Date.now()
  };

  get customerLocation(): Location {
    return this._customerLocation;
  }

  constructor() {
    // Real geolocation lookup disabled for now — see note above.
    // if ('geolocation' in navigator) {
    //   navigator.geolocation.getCurrentPosition(
    //     (pos) => {
    //       this._customerLocation = {
    //         lat: pos.coords.latitude,
    //         lng: pos.coords.longitude,
    //         timestamp: Date.now()
    //       };
    //     },
    //     () => { /* keep the fallback coordinate — permission denied or unavailable */ }
    //   );
    // }
  }

  // ══════════════════════════════════════════════════════════════════════
  // Delivery position: a pure function of wall-clock time, persisted to
  // localStorage. Any page — chef dashboard, customer tracking, a fresh
  // reload, a brand new tab — computes the exact same current position from
  // (startedAt, durationMs, start point, end point) without needing a JS
  // interval to have been continuously running in the background. This is
  // what makes movement keep progressing even when no tracking screen is
  // open, and stay correct immediately on reload rather than resetting.
  // ══════════════════════════════════════════════════════════════════════
  private static readonly DEMO_TRIP_DURATION_MS = 40000;

  private deliveryKey(orderId: string) {
    return `mm_delivery_${orderId}`;
  }

  beginDelivery(orderId: string, startLat: number, startLng: number, durationMs = TrackingService.DEMO_TRIP_DURATION_MS) {
    const record = {
      startLat,
      startLng,
      endLat: this.customerLocation.lat,
      endLng: this.customerLocation.lng,
      startedAt: Date.now(),
      durationMs
    };
    localStorage.setItem(this.deliveryKey(orderId), JSON.stringify(record));
  }

  getDeliverySnapshot(orderId: string): { lat: number; lng: number; arrived: boolean } | null {
    const raw = localStorage.getItem(this.deliveryKey(orderId));
    if (!raw) return null;

    try {
      const record = JSON.parse(raw);
      const fraction = Math.min(1, (Date.now() - record.startedAt) / record.durationMs);
      return {
        lat: record.startLat + (record.endLat - record.startLat) * fraction,
        lng: record.startLng + (record.endLng - record.startLng) * fraction,
        arrived: fraction >= 1
      };
    } catch {
      return null;
    }
  }

  endDelivery(orderId: string) {
    localStorage.removeItem(this.deliveryKey(orderId));
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
