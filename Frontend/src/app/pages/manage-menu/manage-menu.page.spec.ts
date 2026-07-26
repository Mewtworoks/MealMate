import { ComponentFixture, TestBed } from '@angular/core/testing';
import { ManageMenuPage } from './manage-menu.page';

describe('ManageMenuPage', () => {
  let component: ManageMenuPage;
  let fixture: ComponentFixture<ManageMenuPage>;

  beforeEach(() => {
    fixture = TestBed.createComponent(ManageMenuPage);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
