import { Injectable } from '@angular/core';
import {
  ModelElementType,
  ModelEntityValueType
} from '@home/components/widget/lib/settings/data-models/model-node.models';
import {CustomerService} from '@core/http/customer.service';
import {Customer} from '@shared/models/customer.model';
import {TenantId} from "@shared/models/id/tenant-id";

@Injectable({
  providedIn: 'root'
})
export class DataModelAutoGeneratorService {
  tenantId!: TenantId;
  customersCount = 1;

  constructor(private customerService: CustomerService) { }

  public autoGenerateHierarchyData(schemaTree: any[], tenantId: TenantId) {
    this.tenantId = tenantId;
    console.log('TREE', schemaTree);
    const printNamesRecursive = (el) => {
      if (Array.isArray(el)) {
        el.forEach(item => printNamesRecursive(item));
      } else if (typeof el === 'object') {
         this.createFields(el, schemaTree);
        if (el.children && Array.isArray(el.children)) {
          el.children.forEach(child => printNamesRecursive(child));
        }
      }
    };
    printNamesRecursive(printNamesRecursive(schemaTree));
  }

  private createFields(el, schemaTree: any[]) {
    const parentId = this.findTreeElementById(schemaTree, el.parent);
    if (el.type === ModelElementType.CUSTOMER) {
      console.log('customer');
      this.addCustomerEntity();
      console.log('parent', this.findTreeElementById(schemaTree, el.parent));
    }
    if (el.type === ModelElementType.ASSET) {
      console.log('asset');
    }
    if (el.type === ModelElementType.DEVICE) {
      console.log('device');
    }

    // if (el.data.attributes?.length) {
    //   el.data.attributes.forEach(a => {
    //     if (a.enumOptions) {
    //
    //     }
    //     if (a.type === ModelEntityValueType.STRING) {
    //       console.log(el.name, ' attribute string');
    //     }
    //   });
    // }
  }

  private addCustomerEntity() {
    const newCustomer: Omit<Customer, 'customerId'> = {
      title: 'Customer ' + this.customersCount,
      email: `customer-email${this.customersCount}@site.net`,
      address: '',
      phone: '',
      city: '',
      address2: '',
      zip: '',
      country: '',
      tenantId: this.tenantId,
      state: ''
    };
    this.customersCount++;
    // this.customerService.saveCustomer(newCustomer).subscribe(customer => {
    //   console.log(customer);
    // });
  }

  private addRelation(parentId: string, elementId: string) {

  }



  private findTreeElementById(obj, targetId) {
    if (Array.isArray(obj)) {
      for (const item of obj) {
        const result = this.findTreeElementById(item, targetId);
        if (result) {
          return result;
        }
      }
    } else if (typeof obj === 'object') {
      if (obj.id === targetId) {
        return obj;
      }
      if (obj.children && Array.isArray(obj.children)) {
        for (const child of obj.children) {
          const result = this.findTreeElementById(child, targetId);
          if (result) {
            return result;
          }
        }
      }
    }
    return null;
  }
}
