import { ComponentFixture, TestBed } from '@angular/core/testing';

import { TbModelNodeDetailsComponent } from './tb-model-node-details.component';

describe('TbModelNodeDetailsComponent', () => {
  let component: TbModelNodeDetailsComponent;
  let fixture: ComponentFixture<TbModelNodeDetailsComponent>;

  beforeEach(async () => {
    await TestBed.configureTestingModule({
      declarations: [ TbModelNodeDetailsComponent ]
    })
    .compileComponents();

    fixture = TestBed.createComponent(TbModelNodeDetailsComponent);
    component = fixture.componentInstance;
    fixture.detectChanges();
  });

  it('should create', () => {
    expect(component).toBeTruthy();
  });
});
