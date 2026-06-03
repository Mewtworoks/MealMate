import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MealDetailPage } from './meal-detail.page';

describe('MealDetailPage', () => {
  let component: MealDetailPage;
  let fixture: ComponentFixture<MealDetailPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(MealDetailPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
