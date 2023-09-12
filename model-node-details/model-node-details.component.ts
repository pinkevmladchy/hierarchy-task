import {ChangeDetectorRef, Component, Input, OnInit} from '@angular/core';
import {EntityType} from '@shared/models/entity-type.models';
import {UntypedFormBuilder, UntypedFormGroup, Validators} from '@angular/forms';
import {Store} from '@ngrx/store';
import {AppState} from '@core/core.state';
import {PageComponent} from '@shared/components/page.component';
import {MatTableDataSource} from '@angular/material/table';
import {MatTabChangeEvent} from '@angular/material/tabs';
import {ValueType, valueTypesMap} from '@shared/models/constants';
import {MatDialog} from '@angular/material/dialog';
import {TranslateService} from '@ngx-translate/core';
import {
  AdditionalFieldsTypes,
  CustomCellActionDescriptor,
  EditableModelAdditionalField,
  FcModelNode,
  ModelAdditionalField,
  ModelElementType, ModelEntityValueType, ModelEntityValueTypesMap,
  ModelUserDefaultRole
} from '@home/components/widget/lib/settings/data-models/model-node.models';
import {
  ModelNodeDetailsAddFieldComponent
} from '@home/components/widget/lib/settings/data-models/model-node-details/model-node-details-add-field/model-node-details-add-field.component';
import {MatSlideToggleChange} from '@angular/material/slide-toggle';
import {uniqueValueValidator} from '@home/components/widget/lib/settings/data-models/data-models.utils';


@Component({
  selector: 'tb-model-node-details',
  templateUrl: './model-node-details.component.html',
  styleUrls: ['./model-node-details.component.scss']
})
export class ModelNodeDetailsComponent extends PageComponent implements OnInit {
  @Input() modelNode: FcModelNode;
  @Input() modelNodesSavedNamesList: string[];

  entityType = EntityType;
  modelElementType = ModelElementType;

  modelNodeFormGroup: UntypedFormGroup;

  public cellActionDescriptors: Array<CustomCellActionDescriptor<ModelAdditionalField>> = [
    {
      name: this.translate.instant('action.delete'),
      icon: 'delete',
      isEnabled: entity => true,
      onAction: ($event, index, field) => {
        $event.preventDefault();
        this.deleteAdditionalField(index);
      }
    },
    {
      name: this.translate.instant('action.edit'),
      icon: 'edit',
      isEnabled: entity => true,
      onAction: ($event, index, field) => {
        $event.preventDefault();
        this.editAdditionalField(index, field);
      }
    }
  ];

  public additionalFieldsTableSchema: { singleName: string; multipleName: string; type: AdditionalFieldsTypes; fields: string[] }[] = [];
  public modelElementTypes: ModelElementType[] = Object.values(ModelElementType).filter(type => type !== ModelElementType.TENANT);

  public currentDataSource = new MatTableDataSource<ModelAdditionalField>();
  displayedColumns = [];

  public currentTabType: AdditionalFieldsTypes | null = null;
  public AdditionalFields = AdditionalFieldsTypes;

  valueTypes = ModelEntityValueTypesMap;

  public valueTypeEnum = ModelEntityValueType;

  constructor(protected store: Store<AppState>,
              private fb: UntypedFormBuilder,
              public dialog: MatDialog,
              private cdr: ChangeDetectorRef,
              public translate: TranslateService) {
    super(store);
  }

  ngOnInit(): void {
    this.initAdditionalFields();
    this.buildForm();
  }

  public onChangeModelNodeType() {
    this.modelNode.type = this.modelNodeFormGroup.value.type;
    this.initAdditionalFields();
    this.processSpecialControls();
    this.processAllNodeSpecialFields();
  }

  public onChangeModelNodeSelfRegistration(event: MatSlideToggleChange) {
    this.modelNode.isUserSelfRegistration = event.checked;
  }

  public onChangeModelNodeName() {
    this.modelNode.name = this.modelNodeFormGroup.value.name;
  }

  public addField() {
    this.dialog.open<ModelNodeDetailsAddFieldComponent, EditableModelAdditionalField,
      EditableModelAdditionalField>(ModelNodeDetailsAddFieldComponent, {
      disableClose: true,
      panelClass: [],
      data: {
        type: this.currentTabType,
        field: {name: ''}
      }
    }).afterClosed().subscribe(
      (data) => {
        if (data) {
          this.modelNode.additionalFields[data.type].push(data.field);
          this.updateCurrentDataSource();
        }
      }
    );
    // this.updateCurrentDataSource();
  }

  private deleteAdditionalField(index: number) {
    const additionalFields = this.modelNode.additionalFields[this.currentTabType];
    this.modelNode.additionalFields[this.currentTabType] = additionalFields.filter((f, idx) => idx !== index);
    this.updateCurrentDataSource();
  }

  private editAdditionalField(index: number, field: ModelAdditionalField) {
    this.dialog.open<ModelNodeDetailsAddFieldComponent, EditableModelAdditionalField,
      EditableModelAdditionalField>(ModelNodeDetailsAddFieldComponent, {
      disableClose: true,
      panelClass: [],
      data: {
        type: this.currentTabType,
        field
      }
    }).afterClosed().subscribe(
      (data) => {
        if (data) {
          this.modelNode.additionalFields[data.type][index] = data.field;
          this.updateCurrentDataSource();
        }
      }
    );
  }

  public onSetCurrentDataSource(event: MatTabChangeEvent) {
    this.currentTabType = event.index === 0 ? null : this.additionalFieldsTableSchema[event.index - 1].type;
    if (this.currentTabType) {
      setTimeout(() => {
        this.updateCurrentDataSource();
      }, 200);

      this.displayedColumns = ['position', ...this.additionalFieldsTableSchema.find(f => f.type === this.currentTabType).fields, 'actions'];
      console.log('this.displayedColumns', this.displayedColumns);
    }
  }

  private updateCurrentDataSource() {
    this.currentDataSource.data = this.modelNode.additionalFields[this.currentTabType];
    console.log('currentDataSource', this.currentDataSource)
  }

  private buildForm() {
    this.modelNodeFormGroup = this.fb.group({
      name: [this.modelNode.name, [Validators.required, Validators.pattern('(.|\\s)*\\S(.|\\s)*'),
        Validators.maxLength(255), uniqueValueValidator(this.modelNodesSavedNamesList)],
      ],
      type: [this.modelNode.type],
    });
    this.processSpecialControls();
    console.log(this.modelNodeFormGroup);
  }

  private processSpecialControls() {
    this.modelNodeFormGroup.removeControl('selfRegistration');

    if (this.modelNode.type === ModelElementType.CUSTOMER) {
      const selfRegistrationControl = this.fb.control(this.modelNode?.isUserSelfRegistration || false,
        [Validators.required]);

      this.modelNodeFormGroup.addControl('selfRegistration', selfRegistrationControl);
    }
  }

  private processAllNodeSpecialFields() {
    delete this.modelNode.isUserSelfRegistration;

    if (this.modelNode.type === ModelElementType.CUSTOMER) {
      this.modelNode.isUserSelfRegistration = false;
    }
  }

  private initAdditionalFields() {
    switch (this.modelNode.type) {
      case ModelElementType.CUSTOMER:
        this.additionalFieldsTableSchema = [
          {singleName: 'role', multipleName: 'Roles', type: AdditionalFieldsTypes.ROLES, fields: ['name']},
          {
            singleName: 'attribute',
            multipleName: 'Attributes',
            type: AdditionalFieldsTypes.ATTRIBUTES,
            fields: ['name', 'type']
          },
        ];
        break;
      case ModelElementType.ASSET:
        this.additionalFieldsTableSchema = [
          {
            singleName: 'attribute',
            multipleName: 'Attributes',
            type: AdditionalFieldsTypes.ATTRIBUTES,
            fields: ['name', 'type']
          },
          {
            singleName: 'telemetry',
            multipleName: 'Telemetries',
            type: AdditionalFieldsTypes.TELEMETRIES,
            fields: ['name']
          },
        ];
        break;
      case ModelElementType.DEVICE:
        this.additionalFieldsTableSchema = [
          {
            singleName: 'attribute',
            multipleName: 'Attributes',
            type: AdditionalFieldsTypes.ATTRIBUTES,
            fields: ['name', 'type']
          },
          {
            singleName: 'telemetry',
            multipleName: 'Telemetries',
            type: AdditionalFieldsTypes.TELEMETRIES,
            fields: ['name']
          }
        ];
        break;
    }
  }
}
