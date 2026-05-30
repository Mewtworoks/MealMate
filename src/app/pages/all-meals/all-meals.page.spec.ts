import { ComponentFixture, TestBed } from '@angular/core/testing';
import { AllMealsPage } from './all-meals.page';

describe('AllMealsPage', () => {
  let component: AllMealsPage;
  let fixture: ComponentFixture<AllMealsPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(AllMealsPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
