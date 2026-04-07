import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';
import { CartItem } from './cart.service';

export interface Order {
  id: string;
  date: string;
  total: number;
  items: CartItem[];
  status: 'Pending' | 'Accepted' | 'Preparing' | 'OutForDelivery' | 'Delivered' | 'Rejected';
  creditUsed: number;
  amountDue: number;
  isCustomMeal?: boolean;
  subscriptionId?: string;
  agentId?: string;
  deliveryTime?: string;
}

@Injectable({
  providedIn: 'root'
})
export class OrderService {
  private orders: Order[] = [
    {
      id: 'ORD-3310',
      date: '2026-04-06T12:30:00',
      total: 180,
      items: [],
      status: 'OutForDelivery',
      creditUsed: 20,
      amountDue: 160,
      agentId: 'agent-1',
      deliveryTime: '12-15 mins'
    },
    {
      id: 'ORD-8921',
      date: '2026-04-06T11:45:00',
      total: 150,
      items: [],
      status: 'Preparing',
      creditUsed: 0,
      amountDue: 150,
      agentId: 'agent-2'
    },
    {
      id: 'ORD-7742',
      date: '2026-03-28T10:15:00',
      total: 120,
      items: [],
      status: 'Delivered',
      creditUsed: 50,
      amountDue: 70,
      agentId: 'agent-1'
    }
  ];

  private ordersSubject = new BehaviorSubject<Order[]>(this.orders);
  public orders$ = this.ordersSubject.asObservable();

  constructor() { }

  addOrder(order: Order) {
    this.orders.unshift(order);
    this.ordersSubject.next([...this.orders]);
  }

  getOrders(): Order[] {
    return this.orders;
  }

  getOrderById(id: string): Order | undefined {
    return this.orders.find(o => o.id === id);
  }

  updateOrderStatus(id: string, status: Order['status']) {
    const order = this.orders.find(o => o.id === id);
    if (order) {
      order.status = status;
      this.ordersSubject.next([...this.orders]);
    }
  }
}
