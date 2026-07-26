import { ComponentFixture, TestBed } from '@angular/core/testing';
import { GpsTrackingPage } from './gps-tracking.page';

describe('GpsTrackingPage', () => {
  let component: GpsTrackingPage;
  let fixture: ComponentFixture<GpsTrackingPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(GpsTrackingPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
