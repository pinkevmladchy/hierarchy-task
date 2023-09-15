import {Injectable} from '@angular/core';
import {
  ModelAdditionalField,
  ModelElementType,
  ModelEntityValueType
} from '@home/components/widget/lib/settings/data-models/model-node.models';
import {CustomerService} from '@core/http/customer.service';
import {Customer} from '@shared/models/customer.model';
import {TenantId} from '@shared/models/id/tenant-id';
import {bufferCount, concatMap, forkJoin, from, mergeMap, Observable, of, switchMap} from 'rxjs';
import {AssetService} from '@core/http/asset.service';
import {Asset} from '@shared/models/asset.models';
import {DeviceService} from '@core/http/device.service';
import {Device} from '@shared/models/device.models';
import {AttributeService} from "@core/http/attribute.service";
import {delay, tap} from "rxjs/operators";
import {EntityId} from "@shared/models/id/entity-id";
import {AttributeData, AttributeScope, LatestTelemetry} from "@shared/models/telemetry/telemetry.models";
import {EntityRelationService} from "@core/http/entity-relation.service";
import {EntityRelation, RelationTypeGroup} from "@shared/models/relation.models";

@Injectable({
  providedIn: 'root'
})
export class DataModelAutoGeneratorService {
  tenantId!: TenantId;
  schemaTree: any[];
  createEntitiesNumber = 1;

  customersCounter = 1;
  assetCounter = 1;
  deviceCounter = 1;
  attributeCounter = 1;
  relationsCounter = 1;

  entitiesObservables: EntitiesObservable[] = [];
  additionalElementsObservables: {attributes?: Observable<any>[];
    telemetries: Observable<any>[];
  } = {attributes: [], telemetries: []};
  relationObservables: Observable<any>[] = [];

  constructor(private customerService: CustomerService,
              private assetService: AssetService,
              private deviceService: DeviceService,
              private attributeService: AttributeService,
              private entityRelationService: EntityRelationService) { }

  public autoGenerateHierarchyData(schemaTree: any[], tenantId: TenantId, numberEntities: number) {
    console.log('TREE', schemaTree);
    this.createEntitiesNumber = numberEntities;
    this.tenantId = tenantId;
    this.schemaTree = schemaTree;
    this.recursiveMoveToTree(this.createEntitiesObservables.bind(this), [ModelElementType.TENANT]);
    this.executeRequestsList();
  }

  private executeRequestsList() {
    const entityObservables = this.entitiesObservables.map(el => el.obs);

    const observables = [
      entityObservables,
      this.additionalElementsObservables.attributes,
      this.additionalElementsObservables.telemetries,
      this.relationObservables
    ];
console.log('START')

      forkJoin(entityObservables).pipe(
        tap(() => {
          this.createAdditionalItemsObservables();
          this.createDemoRelations();
        }),
        switchMap(() => {
         return  this.additionalElementsObservables.attributes.length ? forkJoin(this.additionalElementsObservables.attributes) : of(null);
        }),
        switchMap(() => {
          return this.additionalElementsObservables.telemetries.length
            ? forkJoin(this.additionalElementsObservables.telemetries) : of(null);
        }),
        switchMap(() => {
          return this.relationObservables.length ? forkJoin(this.relationObservables) : of(null);
        })
      ).subscribe(data => {
        console.log('FINISHED');
      });
    }

  private createEntitiesObservables(treeEl: any, parent: any) {
    if (treeEl.type === ModelElementType.CUSTOMER) {
      for (let i = 1; i <= this.calculateCountOfElementForCreate(treeEl.level); i++) {
        this.addCustomerEntityObs(treeEl);
      }
    }
    if (treeEl.type === ModelElementType.ASSET) {
      for (let i = 0; i < this.calculateCountOfElementForCreate(treeEl.level); i++) {
        this.addAssetEntityObs(treeEl);
      }
    }
    if (treeEl.type === ModelElementType.DEVICE) {
      for (let i = 0; i < this.calculateCountOfElementForCreate(treeEl.level); i++) {
        this.addDeviceEntityObs(treeEl);
      }
    }
  }
  private createAdditionalItemsObservables() {
    const callBack = (treeEl: any, parent: any) => {
      if (!treeEl.entities) {
        return;
      }
      treeEl.entities.forEach(el=> {
        if (treeEl.data.attributes?.length) {
          treeEl.entities.forEach(entity => {
            const attributesArray: Array<AttributeData> = treeEl.data.attributes.map(attribute => {
              return {key: attribute.name, value: this.createDemoAttributeValue(attribute)};
            });
            this.additionalElementsObservables.attributes
              .push(this.attributeService.saveEntityAttributes(entity.id, AttributeScope.SERVER_SCOPE, attributesArray));
          });
          console.log('ATTRIBUTES', this.additionalElementsObservables.attributes)
        }

        if (treeEl.data.telemetries?.length) {
          treeEl.data.telemetries.forEach(telemetry => {
            treeEl.entities.forEach(entity => {
              const telemetriesArray: Array<AttributeData> = treeEl.data.telemetries.map(telemetry => {
                return {key: telemetry.name, value: this.createDemoTelemetry(treeEl.data.telemetries)};
              });
              this.additionalElementsObservables.telemetries
                .push(this.attributeService.saveEntityTimeseries(entity.id, LatestTelemetry.LATEST_TELEMETRY, telemetriesArray));
            });
            });
        }
      });
    };
    this.recursiveMoveToTree(callBack, [ModelElementType.TENANT]);
  }

  private createDemoAttributeValue(attribute: ModelAdditionalField): any {
    let value!: any;
    if (attribute.enumOptions?.length) {
      value = attribute.enumOptions[0];
    } else {
      switch (attribute.type) {
        case ModelEntityValueType.BOOLEAN:
          value = false;
          break;
        case ModelEntityValueType.STRING:
          value = `Attribute name ${this.attributeCounter}`;
          this.attributeCounter++;
          break;
        case ModelEntityValueType.IMAGE:
          value = 'data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iMjQiIGhlaWdodD0iMjQiIHZpZXdCb3g9IjAgMCAyNCAyNCIgZmlsbD0ibm9uZSIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj4KPGNpcmNsZSBjeD0iMTIiIGN5PSIxMiIgcj0iMTIiIGZpbGw9InllbGxvdyIvPgo8L3N2Zz4K';
          break;
        case ModelEntityValueType.INTEGER:
          value = this.randomIntFromInterval(1, 10);
          break;
        case ModelEntityValueType.DOUBLE:
          value = this.randomDoubleFromInterval(1, 10);
          break;
        case ModelEntityValueType.JSON:
          value = {'json': 'yes'};
      }
    }
      return value;
  }

  private createDemoTelemetry(keyName: string): any {
    const formBody = (ts: number, keyName: string, type: string, weight: number) => {
      return {
        ts,
        values: {
          [keyName]: JSON.stringify({
            type,
            weight
          })
        }
      };
    };

    return [{key: keyName, value: 12}, {key: keyName, value: 21},
      {key: keyName, value: 14}, {key: keyName, value: 53}, {key: keyName, value: 2}];
  }

  private createDemoRelation(relationName: string, from: EntityId, to: EntityId): EntityRelation {
    return  {
      type: `${relationName}`,
      typeGroup: RelationTypeGroup.COMMON,
      from,
      to,
    };
  }

  private addCustomerEntityObs(treeEl: any) {
    const newCustomer: Omit<Customer, 'customerId'> = {
      title: `${treeEl.name} (${this.customersCounter})`,
      address: '',
      email: '',
      phone: '',
      city: '',
      address2: '',
      zip: '',
      country: '',
      tenantId: this.tenantId,
      state: '',
      additionalInfo: {
        email: `customer-email${this.customersCounter}@site.net`,
        userName: `${treeEl.name} (${this.customersCounter})`,
      }
    };
    this.customersCounter++;
    this.entitiesObservables.push({treeEl, obs: this.customerService.saveCustomer(newCustomer).pipe(
        tap(customer => {
          return !!treeEl.entities ? treeEl.entities.push(customer) : treeEl.entities = [customer];
        })
      )});
  }

  private addDeviceEntityObs(treeEl: any) {
    const newDevice: Device = {
      name: `${treeEl.name} ${this.deviceCounter}`,
      type: 'default',
      label: `Device label ${this.deviceCounter}`
    };
    this.deviceCounter++;
    this.entitiesObservables.push({treeEl, obs: this.deviceService.saveDevice(newDevice).pipe(
        tap(device => {
          return !!treeEl.entities ? treeEl.entities.push(device) : treeEl.entities = [device];
        })
      )});
  }

  private addAssetEntityObs(treeEl: any) {
    const newAsset: Asset = {
      name: `Asset name ${this.assetCounter}`,
      type: 'default',
      label: `Asset label ${this.assetCounter}`
    };
    this.assetCounter++;
    this.entitiesObservables.push({treeEl, obs: this.assetService.saveAsset(newAsset).pipe(
        tap(asset => {
          return !!treeEl.entities ? treeEl.entities.push(asset) : treeEl.entities = [asset];
        })
      )});
  }

  private createDemoRelations() {
    let unifierNameCounter = 1;
    const callBack = (treeEl, parent) => {
      if (!treeEl.entities) {
        return;
      }
      const parentEntitiesCount = parent.entities?.length || 1; // tenant don't has entities
      const entitiesCount = treeEl.entities?.length;
      const ratio = entitiesCount / parentEntitiesCount;
      treeEl.entities.forEach((el, idx)=> {
            let from!: EntityId;

            if (parent.type === ModelElementType.TENANT) {
              from = this.tenantId;
            } else {
              from = idx === 0 ?  parent.entities[0]?.id : parent.entities[Math.ceil(idx / ratio)]?.id;
            }
            const to = el.id;
            const newRelation = this.createDemoRelation(treeEl.data.relationType, from, to);
            this.relationObservables.push(this.entityRelationService.saveRelation(newRelation));
            unifierNameCounter++;
        }
      );
    };
    this.recursiveMoveToTree(callBack, [ModelElementType.TENANT]);
  }

  private recursiveMoveToTree(callback: (el: any, parent: any) => void, callBackTypeRestrictions: ModelElementType[] = []) {
    const getTreeElRecursive = (el: any, parent: any = null) => {
      if (Array.isArray(el)) {
        el.forEach(item => getTreeElRecursive(item, item));
      } else if (typeof el === 'object') {
        if (!callBackTypeRestrictions.includes(el.type)) {
          callback(el, parent);
        }
        if (el.children && Array.isArray(el.children)) {
          el.children.forEach(child => getTreeElRecursive(child, el));
        }
      }
    };
    getTreeElRecursive(this.schemaTree);
  }

  private calculateCountOfElementForCreate(treeLevel: number): number {
    console.log(treeLevel, Math.pow(this.createEntitiesNumber, (treeLevel - 1)));
    return  Math.pow(this.createEntitiesNumber, (treeLevel - 1));
  }
  private randomIntFromInterval(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  private randomDoubleFromInterval(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }
}

interface EntitiesObservable {treeEl: any; obs: Observable<any>}
