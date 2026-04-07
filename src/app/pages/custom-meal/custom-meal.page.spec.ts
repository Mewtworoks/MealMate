import { ComponentFixture, TestBed } from '@angular/core/testing';
import { CustomMealPage } from './custom-meal.page';

describe('CustomMealPage', () => {
  let component: CustomMealPage;
  let fixture: ComponentFixture<CustomMealPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(CustomMealPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
