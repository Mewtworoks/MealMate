import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AgentEarningsPage } from './agent-earnings.page';

describe('AgentEarningsPage', () => {
  let component: AgentEarningsPage;
  let fixture: ComponentFixture<AgentEarningsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AgentEarningsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
