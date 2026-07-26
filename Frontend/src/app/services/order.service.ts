import { Injectable } from '@angular/core';
import { HttpClient } from '@angular/common/http';
import { BehaviorSubject, firstValueFrom } from 'rxjs';
import { environment } from '../../environments/environment';
import { CartItem } from './cart.service';

export interface Order {
  id: string;
  displayId?: string;
  date: string;
  total: number;
  items: any[];
  status: 'Pending' | 'Accepted' | 'Preparing' | 'OutForDelivery' | 'Delivered' | 'Rejected';
  agentId?: string;
  customerId?: string;
  deliveryTime?: string;
  deliveryAddress?: string;
  subscriptionId?: string;
  creditUsed?: number;
  amountDue?: number;
  isCustomMeal?: boolean;
  customMealDetails?: string;
  customerName?: string;
  customerPhone?: string;
  distanceKm?: number;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private ordersSubject = new BehaviorSubject<Order[]>([]);
  public orders$ = this.ordersSubject.asObservable();

  constructor(private http: HttpClient) { }

  addOrder(order: Order) {
    const current = this.ordersSubject.value;
    this.ordersSubject.next([order, ...current]);
  }

  async placeOrder(orderPayload: any) {
    try {
      const res: any = await firstValueFrom(this.http.post(`${environment.apiUrl}/orders`, orderPayload));
      this.refreshUserOrders(orderPayload.customerId);
      return res;
    } catch (e) {
      console.error('Error placing order', e);
      throw e;
    }
  }

  async refreshUserOrders(userId: string) {
    try {
      const data: any[] = await firstValueFrom(this.http.get<any[]>(`${environment.apiUrl}/orders/user/${userId}`));
      const mappedOrders: Order[] = data.map(o => ({
        id: o.id || o.Id,
        displayId: o.displayId || o.DisplayId,
        date: o.date || o.Date || o.orderDate || o.OrderDate || o.createdAt || o.CreatedAt,
        total: o.total || o.Total || o.totalAmount || o.TotalAmount,
        items: o.items || o.Items || o.orderItems || o.OrderItems || [],
        status: o.status || o.Status || 'Pending',
        agentId: o.agentId || o.AgentId,
        customerId: o.customerId || o.CustomerId,
        deliveryAddress: o.deliveryAddress || o.DeliveryAddress,
        isCustomMeal: o.isCustomMeal || o.IsCustomMeal || false,
        customMealDetails: o.customMealDetails || o.CustomMealDetails,
        customerName: o.customerName || o.CustomerName || 'Guest',
        customerPhone: o.customerPhone || o.CustomerPhone || '',
        distanceKm: o.distanceKm || o.DistanceKm || 0
      }));
      this.ordersSubject.next(mappedOrders);
      return mappedOrders;
    } catch (e) {
      console.error('Error fetching user orders', e);
      return [];
    }
  }

  async refreshAgentOrders(agentId: string) {
    try {
      const data: any[] = await firstValueFrom(this.http.get<any[]>(`${environment.apiUrl}/orders/agent-orders/${agentId}`));
      const mappedOrders: Order[] = data.map(o => ({
        id: o.id || o.Id,
        displayId: o.displayId || o.DisplayId,
        date: o.date || o.Date || o.orderDate || o.OrderDate || o.createdAt || o.CreatedAt,
        total: o.total || o.Total || o.totalAmount || o.TotalAmount,
        items: o.items || o.Items || o.orderItems || o.OrderItems || [],
        status: o.status || o.Status || 'Pending',
        agentId: o.agentId || o.AgentId,
        customerId: o.customerId || o.CustomerId,
        deliveryAddress: o.deliveryAddress || o.DeliveryAddress,
        isCustomMeal: o.isCustomMeal || o.IsCustomMeal || false,
        customMealDetails: o.customMealDetails || o.CustomMealDetails,
        customerName: o.customerName || o.CustomerName || 'Guest',
        customerPhone: o.customerPhone || o.CustomerPhone || '',
        distanceKm: o.distanceKm || o.DistanceKm || 0
      }));
      this.ordersSubject.next(mappedOrders);
      return mappedOrders;
    } catch (e) {
      console.error('Error fetching agent orders', e);
      return [];
    }
  }

  async updateOrderStatus(orderId: string, status: string) {
    try {
      await firstValueFrom(this.http.patch(`${environment.apiUrl}/orders/${orderId}/status`, `"${status}"`, {
        headers: { 'Content-Type': 'application/json' }
      }));
      // Refresh logic would go here depending on context
    } catch (e) {
      console.error('Error updating status', e);
    }
  }

  getOrders(): Order[] {
    return this.ordersSubject.value;
  }

  async getOrderById(id: string): Promise<Order | undefined> {
    const localOrder = this.ordersSubject.value.find(o => o.id === id);
    if (localOrder) return localOrder;

    try {
      const o: any = await firstValueFrom(this.http.get<any>(`${environment.apiUrl}/orders/${id}`));
      return {
        id: o.id || o.Id,
        displayId: o.displayId || o.DisplayId,
        date: o.date || o.Date || o.orderDate || o.OrderDate || o.createdAt || o.CreatedAt,
        total: o.total || o.Total || o.totalAmount || o.TotalAmount,
        items: o.items || o.Items || o.orderItems || o.OrderItems || [],
        status: o.status || o.Status || 'Pending',
        agentId: o.agentId || o.AgentId,
        customerId: o.customerId || o.CustomerId,
        deliveryAddress: o.deliveryAddress || o.DeliveryAddress,
        isCustomMeal: o.isCustomMeal || o.IsCustomMeal || false,
        customMealDetails: o.customMealDetails || o.CustomMealDetails,
        customerName: o.customerName || o.CustomerName || 'Guest',
        customerPhone: o.customerPhone || o.CustomerPhone || '',
        distanceKm: o.distanceKm || o.DistanceKm || 0
      };
    } catch (e) {
      console.error('Error fetching order by id', e);
      return undefined;
    }
  }

  // --- UI Helper Functions ---
  
  getStatusColor(status: string): string {
    switch (status) {
      case 'Pending': return 'orange';
      case 'Accepted': return 'blue';
      case 'Preparing': return 'yellow';
      case 'OutForDelivery': return 'purple';
      case 'Delivered': return 'green';
      case 'Rejected': return 'red';
      default: return 'medium';
    }
  }

  getStatusIcon(status: string): string {
    switch (status) {
      case 'Pending': return 'time-outline';
      case 'Accepted': return 'checkmark-circle-outline';
      case 'Preparing': return 'flame-outline';
      case 'OutForDelivery': return 'bicycle-outline';
      case 'Delivered': return 'checkmark-done-circle-outline';
      case 'Rejected': return 'close-circle-outline';
      default: return 'ellipse-outline';
    }
  }

  getStatusLabel(status: string): string {
    switch (status) {
      case 'OutForDelivery': return 'On the way';
      case 'Pending': return 'Waiting';
      default: return status;
    }
  }

  getMealFallbackImage(index: number): string {
    const images = [
      'assets/onboarding/dal_makhani.png',
      'assets/onboarding/paneer_tikka.png',
      'assets/onboarding/veg_pulao.png',
      'assets/onboarding/healthy_salad.png',
      'assets/onboarding/dal_chawal.png'
    ];
    return images[index % images.length];
  }
}
