import { ComponentFixture, TestBed } from '@angular/core/testing';
import { SupervisorDashboardPage } from './supervisor-dashboard.page';

describe('SupervisorDashboardPage', () => {
  let component: SupervisorDashboardPage;
  let fixture: ComponentFixture<SupervisorDashboardPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(SupervisorDashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
