import {Component, Inject, OnDestroy, OnInit} from '@angular/core';
import {Observable, Subscription} from 'rxjs';
import {select, Store} from '@ngrx/store';
import {AppState} from '@core/core.state';
import {delay, share} from 'rxjs/operators';
import {selectIsLoading} from '@core/interceptors/load.selectors';
import {MAT_DIALOG_DATA, MatDialogRef} from '@angular/material/dialog';
import {FormArray, FormGroup, UntypedFormBuilder, UntypedFormGroup, Validators} from '@angular/forms';
import {ValueType, valueTypesMap} from '@shared/models/constants';
import {
  AdditionalFieldsTypes,
  ModelAdditionalField, ModelEntityValueType, ModelEntityValueTypesMap
} from '@home/components/widget/lib/settings/data-models/model-node.models';

@Component({
  selector: 'tb-model-node-details-add-field',
  templateUrl: './model-node-details-add-field.component.html',
  styleUrls: ['./model-node-details-add-field.component.scss']
})
export class ModelNodeDetailsAddFieldComponent implements OnInit, OnDestroy {
  public isLoading$: Observable<boolean>;

  public modelNodeAdditionalFieldForm!: UntypedFormGroup;

  public currentFieldType!: AdditionalFieldsTypes;

  public AdditionalFields = AdditionalFieldsTypes;

  valueTypes = ModelEntityValueTypesMap;
  valueTypeKeys = Object.keys(ModelEntityValueType);
  public valueTypeEnum = ModelEntityValueType;

  public labelNames: {[key in AdditionalFieldsTypes]: string} = {
    [AdditionalFieldsTypes.ATTRIBUTES]: 'Attribute',
    [AdditionalFieldsTypes.ROLES]: 'Role',
    [AdditionalFieldsTypes.TELEMETRIES]: 'Telemetry'
  };

  public formGroups!: {[key in AdditionalFieldsTypes]: FormGroup};

  public field: ModelAdditionalField;

  private subs = new Subscription();
  public isEnum = false;
  public isRequired = false;

  constructor(
    protected store: Store<AppState>,
    private fb: UntypedFormBuilder,
    public dialogRef: MatDialogRef<ModelNodeDetailsAddFieldComponent>,
    @Inject(MAT_DIALOG_DATA) public data: {type: AdditionalFieldsTypes; field: ModelAdditionalField}) {

    this.isLoading$ = this.store.pipe(delay(0), select(selectIsLoading), share());
    this.currentFieldType = data.type;
    this.field = data.field;
  }

  ngOnInit() {
    this.setFormGroups();
    this.buildForm();
    this.isEnum = this.field.isEnum;
    this.isRequired = this.field.isRequired;

    this.subs.add(
      this.modelNodeAdditionalFieldForm.get('name').valueChanges.subscribe(() => {
        this.modelNodeAdditionalFieldForm.get('name').markAsTouched();
        this.modelNodeAdditionalFieldForm.updateValueAndValidity();
      })
    );
  }

  ngOnDestroy() {
    this.subs.unsubscribe();
  }

  public cancel() {
    this.dialogRef.close();
  }

  public save() {
    this.dialogRef.close({type: this.currentFieldType, field: this.modelNodeAdditionalFieldForm.value});
  }

  private buildForm() {
    this.modelNodeAdditionalFieldForm = this.formGroups[this.currentFieldType];
  }

  private setFormGroups() {
    const nameControl = this.fb.control(this.field?.name || '',
      [Validators.required, Validators.pattern('(.|\\s)*\\S(.|\\s)*'), Validators.maxLength(255)],);

    this.formGroups = {
      [AdditionalFieldsTypes.ROLES]: this.fb.group({}),
      [AdditionalFieldsTypes.TELEMETRIES]: this.fb.group({}),
      [AdditionalFieldsTypes.ATTRIBUTES]: this.fb.group({
        type: this.field.type || [ModelEntityValueType.STRING],
        isEnum: [this.field?.isEnum || false],
        isRequired: [this.field?.isRequired || false],
        enumOptions: [this.field?.enumOptions || []]
      })
    };

    this.formGroups[this.currentFieldType].addControl('name', nameControl);
  }

  public addOption(e) {
    const enumOptions = this.modelNodeAdditionalFieldForm.get('enumOptions');
    enumOptions.value.push(e.value);
    enumOptions.updateValueAndValidity();
    e.chipInput!.clear();
  }

  public handleEnumChecked(e) {
    this.isEnum = e.checked;
    this.modelNodeAdditionalFieldForm.get('name').markAsTouched();
  }

  public handleRequiredChecked(e) {
    this.isRequired = e.checked;
    this.modelNodeAdditionalFieldForm.get('name').markAsTouched();
  }

  public removeOption(index) {
    const enumOptions = this.modelNodeAdditionalFieldForm.get('enumOptions') as FormArray;
    enumOptions.removeAt(index);
  }
}
