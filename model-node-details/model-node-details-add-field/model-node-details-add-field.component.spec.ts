import { ComponentFixture, TestBed } from '@angular/core/testing';

import { ModelNodeDetailsAddFieldComponent } from './model-node-details-add-field.component';

describe('ModelNodeDetailsAddFieldComponent', () => {
  let component: ModelNodeDetailsAddFieldComponent;
  let fixture: ComponentFixture<ModelNodeDetailsAddFieldComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ ModelNodeDetailsAddFieldComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(ModelNodeDetailsAddFieldComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
