import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AgentDashboardPage } from './agent-dashboard.page';

describe('AgentDashboardPage', () => {
  let component: AgentDashboardPage;
  let fixture: ComponentFixture<AgentDashboardPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AgentDashboardPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
