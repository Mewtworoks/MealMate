import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AiInsightsPage } from './ai-insights.page';

describe('AiInsightsPage', () => {
  let component: AiInsightsPage;
  let fixture: ComponentFixture<AiInsightsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AiInsightsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
