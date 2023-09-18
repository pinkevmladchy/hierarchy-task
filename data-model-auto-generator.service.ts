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
import {deepClone} from "@core/utils";

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
    this.resetProperties();

    this.createEntitiesNumber = numberEntities;
    this.tenantId = tenantId;
    this.schemaTree = deepClone(schemaTree);
    this.schemaTree[0].entities = [{id: tenantId}]; //tenant node doesn't have this field by default
    this.recursiveMoveToTree(this.createEntitiesObservables.bind(this), [ModelElementType.TENANT]);
    this.executeRequestsList();
    console.log('TREE 1', this.schemaTree);
  }

  private executeRequestsList() {
    const entityObservables = this.entitiesObservables.map(el => el.obs);

      forkJoin(entityObservables).pipe(
        tap(() => {
          this.createAdditionalItemsObservables();
          this.createDemoRelationsObservables();
          console.log('TREE 2', this.schemaTree);
        }),
        switchMap(() => {
          return this.relationObservables.length ? forkJoin(this.relationObservables) : of(null);
        }),
        switchMap(() => {
         return  this.additionalElementsObservables.attributes.length ? forkJoin(this.additionalElementsObservables.attributes) : of(null);
        }),
        switchMap(() => {
          return this.additionalElementsObservables.telemetries.length
            ? forkJoin(this.additionalElementsObservables.telemetries) : of(null);
        })
      ).subscribe(data => {
        console.log('FINISHED');
      });
    }

  private createEntitiesObservables(treeEl: any, parent: any) {
    treeEl.entities = [];
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
      treeEl.entities.forEach(entity => {
        if (treeEl.data.attributes?.length) {
          const attributesArray: Array<AttributeData> = treeEl.data.attributes.map(attribute => {
            return {key: attribute.name, value: this.createDemoAttributeValue(attribute)};
          });
          this.additionalElementsObservables.attributes
            .push(this.attributeService.saveEntityAttributes(entity.id, AttributeScope.SERVER_SCOPE, attributesArray));
        }

        if (treeEl.data.telemetries?.length) {
          treeEl.data.telemetries.forEach(telemetry => {
            this.additionalElementsObservables.telemetries
              .push(this.attributeService.saveEntityTimeseries(entity.id, 'timeseriesScope', this.createDemoTelemetry(telemetry)));
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

  private createDemoTelemetry(telemetry: any): AttributeData[] {
    const currentTime = Date.now();
    const oneHour = 60 * 60 * 1000;
    const oneWeek = 7 * 24 * oneHour;
    const result = [];

    for (let ts = currentTime - oneWeek; ts <= currentTime; ts += oneHour) {
      const demoTelemetry: AttributeData = {
        lastUpdateTs: ts,
        key: telemetry.name,
        value: this.randomIntFromInterval(1, 100)
      };
      result.push(demoTelemetry);
    }
    console.log('telemetry', result);
    return result;
  }

  private createDemoRelationEl(relationName: string, from: EntityId, to: EntityId): EntityRelation {
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
          return treeEl.entities.push(customer);
        })
      )});
  }

  private addDeviceEntityObs(treeEl: any) {
    const newDevice: Device = {
      name: `${treeEl.name} (${this.deviceCounter})`,
      type: 'default',
      label: `${treeEl.name} (${this.deviceCounter})`
    };
    this.deviceCounter++;
    this.entitiesObservables.push({treeEl, obs: this.deviceService.saveDevice(newDevice).pipe(
        tap(device => {
          return treeEl.entities.push(device);
        })
      )});
  }

  private addAssetEntityObs(treeEl: any) {
    const newAsset: Asset = {
      name: `${treeEl.name} (${this.assetCounter})`,
      type: 'default',
      label: `${treeEl.name} (${this.assetCounter})`
    };
    this.assetCounter++;
    this.entitiesObservables.push({treeEl, obs: this.assetService.saveAsset(newAsset).pipe(
        tap(asset => {
          return treeEl.entities.push(asset);
        })
      )});
  }

  private createDemoRelationsObservables() {
    const callBack = (treeEl, parent) => {
      if (!treeEl.entities) {
        return;
      }
      const parentEntities = [...parent.entities];
      const currentEntities = [...treeEl.entities];
      const parentEntitiesCount = parentEntities?.length;
      const entitiesCount = currentEntities?.length;
      const ratio = Math.floor(entitiesCount / parentEntitiesCount);

      parentEntities.forEach((parentEntity, idx) => {
        for (let i = 0; i < ratio; i++) {
          const newRelation = this.createDemoRelationEl(treeEl.data.relationType, parentEntity.id, currentEntities.shift().id);
          this.relationObservables.push(this.entityRelationService.saveRelation(newRelation));
        }
      });
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
    return  Math.pow(this.createEntitiesNumber, (treeLevel - 1));
  }
  private randomIntFromInterval(min: number, max: number) {
    return Math.floor(Math.random() * (max - min + 1) + min);
  }

  private randomDoubleFromInterval(min: number, max: number) {
    return Math.random() * (max - min) + min;
  }

  private resetProperties() {
    this.entitiesObservables = [];
    this.additionalElementsObservables = {attributes: [], telemetries: []};
    this.relationObservables = [];
    this.customersCounter = 1;
    this.assetCounter = 1;
    this.deviceCounter = 1;
    this.attributeCounter = 1;
  }
}

interface EntitiesObservable {treeEl: any; obs: Observable<any>}

