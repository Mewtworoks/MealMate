import { Component, OnInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { IonicModule } from '@ionic/angular';
import { Router } from '@angular/router';
import { DataService, Agent } from '../../services/data.service';
import { Gemini } from '../../services/gemini';
import { OrderService, Order } from '../../services/order.service';

@Component({
  selector: 'app-supervisor-dashboard',
  templateUrl: './supervisor-dashboard.page.html',
  styleUrls: ['./supervisor-dashboard.page.scss'],
  standalone: false
})
export class SupervisorDashboardPage implements OnInit {
  agents: Agent[] = [];
  recentOrders: Order[] = [];
  summaryMetrics = {
    totalAgents: 0,
    ordersClosed: 0,
    totalDistance: '0 km',
    creditUsed: '$0'
  };
  sortedAgentsForChart: Agent[] = [];
  maxDistance: number = 1;
  insights: string[] = [];
  isLoadingInsights: boolean = true;

  constructor(
    private dataService: DataService,
    private gemini: Gemini,
    private router: Router,
    private orderService: OrderService
  ) { }

  ngOnInit() {
    this.loadDashboardData();
    this.loadTeamOrders();
  }

  loadTeamOrders() {
    this.orderService.orders$.subscribe(orders => {
      this.recentOrders = orders.slice(0, 5); // Show last 5
    });
  }

  goToGps() {
    this.router.navigate(['/gps-tracking']);
  }

  async loadDashboardData() {
    this.agents = this.dataService.getAgents();
    this.calculateMetrics();
    this.prepareChartData();
    await this.fetchAIInsights();
  }

  calculateMetrics() {
    this.summaryMetrics.totalAgents = this.agents.length;
    this.summaryMetrics.ordersClosed = this.agents.reduce((sum, a) => sum + a.ordersClosed, 0);
    const totalDist = this.agents.reduce((sum, a) => sum + a.distanceKm, 0);
    this.summaryMetrics.totalDistance = totalDist > 1000 ? (totalDist / 1000).toFixed(1) + 'k km' : totalDist.toFixed(1) + ' km';
    const totalCredit = this.agents.reduce((sum, a) => sum + a.creditUsed, 0);
    this.summaryMetrics.creditUsed = '$' + totalCredit.toLocaleString();
  }

  prepareChartData() {
    this.sortedAgentsForChart = [...this.agents].sort((a, b) => b.distanceKm - a.distanceKm);
    this.maxDistance = Math.max(...this.agents.map(a => a.distanceKm), 1);
  }

  getBarWidth(distance: number): string {
    return (distance / this.maxDistance * 100) + '%';
  }

  async fetchAIInsights() {
    this.isLoadingInsights = true;
    
    // Check if we have valid insights in the session cache first
    const cached = sessionStorage.getItem('last_insights');
    if (cached) {
      console.log('Using cached AI insights to save quota.');
      this.insights = JSON.parse(cached);
      this.isLoadingInsights = false;
      return;
    }

    const summaryString = this.agents.map(a => 
      `Agent ${a.name} traveled ${a.distanceKm}km and closed ${a.ordersClosed} orders.`
    ).join(' ') + ` Total team distance: ${this.summaryMetrics.totalDistance}. Total orders: ${this.summaryMetrics.ordersClosed}.`;

    this.insights = await this.gemini.generateInsights(summaryString);
    this.isLoadingInsights = false;
  }

  getStatusColor(status: string): string {
    switch (status) {
      case 'Good': return 'success';
      case 'Average': return 'warning';
      case 'Low': return 'danger';
      default: return 'medium';
    }
  }

  getOrderStatusColor(status: string): string {
    return this.orderService.getStatusColor(status);
  }

  getBarColor(index: number): string {
    const colors = ['#2D60FF', '#34C759', '#703EFF', '#FF9500'];
    return colors[index % colors.length];
  }
}
