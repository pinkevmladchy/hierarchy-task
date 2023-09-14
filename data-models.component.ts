import {
  ChangeDetectorRef,
  Component,
  HostBinding,
  HostListener,
  Input,
  OnInit,
  ViewChild
} from '@angular/core';
import {FlowchartConstants, NgxFlowchartComponent, UserCallbacks} from 'ngx-flowchart';
import {Observable, of} from 'rxjs';
import {DELETE} from '@angular/cdk/keycodes';
import {select, Store} from '@ngrx/store';
import {AppState} from '@core/core.state';
import {MatDialog, MatDialogConfig} from '@angular/material/dialog';
import {deepClone} from '@core/utils';
import {WidgetContext} from '@home/models/widget-component.models';
import {LoadNodesCallback, NavTreeEditCallbacks, NavTreeNode} from '@shared/components/nav-tree.component';
import {Customer} from '@shared/models/customer.model';
import {CustomerService} from '@core/http/customer.service';
import {EntityRelationService} from '@core/http/entity-relation.service';
import {PageLink} from '@shared/models/page/page-link';
import {EntityRelationsQuery, EntitySearchDirection} from '@shared/models/relation.models';
import {AttributeService} from '@core/http/attribute.service';
import {getCurrentAuthState} from '@core/auth/auth.selectors';
import {AttributeScope} from '@shared/models/telemetry/telemetry.models';
import {EntityType} from '@shared/models/entity-type.models';
import {EntityId} from '@shared/models/id/entity-id';
import {
  AdditionalFieldsTypes, AddModelEdgeDialogData, AddModelNodeDialogData,
  FCDataModel,
  FcModelNode, ModelAdditionalFieldsObj,
  ModelElementType, SavedInAttributeModel
} from '@home/components/widget/lib/settings/data-models/model-node.models';
import {delay, share} from 'rxjs/operators';
import {selectIsLoading} from '@core/interceptors/load.selectors';
import {
  AddModelNodeDialogComponent
} from '@home/components/widget/lib/settings/data-models/add-model-node-dialog.component';
import {FcEdge} from "ngx-flowchart/lib/ngx-flowchart.models";
import {
  AddModelEdgeDialogComponent
} from "@home/components/widget/lib/settings/data-models/add-model-edge-dialog.component";
import {DataModelsService} from "@home/components/widget/lib/settings/data-models/data-models.service";
import {ImportExportService} from "@home/components/import-export/import-export.service";
import {Dashboard} from "@shared/models/dashboard.models";
import {ConfirmDialogComponent} from "@shared/components/dialog/confirm-dialog.component";
import {DashboardService} from "@core/http/dashboard.service";
import {AlertDialogComponent} from "@shared/components/dialog/alert-dialog.component";
import { EntityGroupService } from '@app/core/public-api';
import {EntityGroup, EntityGroupConfiguration} from "@shared/models/entity-group.models";
import {result} from "lodash";

export type ModelTreeNode = Omit<NavTreeNode, 'children'> & {
  name?: string;
  children?: ModelTreeNode[];
};

export const extendTreeNode = (tree: NavTreeNode[]): ModelTreeNode[] => {
  return tree.map(node => {
    const newNode: ModelTreeNode = {
      ...node,
      children: extendTreeNode(node.children as NavTreeNode[])
    };
    return newNode;
  });
};

export interface HierarchyParentNavTreeNode extends Omit<NavTreeNode, 'children'> {
  name: string;
  type?: string;
  parent?: string;
  children?: ModelTreeNode[];
  data: any;
}


@Component({
  selector: 'tb-data-models',
  templateUrl: './data-models.component.html',
  styleUrls: ['./data-models.component.scss']
})
export class DataModelsComponent implements OnInit {
  @Input()
  ctx: WidgetContext;

  @HostBinding('attr.tabindex')

  @ViewChild('dateModelChainCanvas', {static: true}) dateModelChainCanvas: NgxFlowchartComponent;

  isLoading$: Observable<boolean>;
  public modelChanged = false;
  public savedModel?: FCDataModel;

  flowchartConstants = FlowchartConstants;

  // private currentNode?: FcNode;

  nodeTypesFlowchartSelected = [];
  nodeTypesModel: FCDataModel = {
    nodes: [],
    edges: []
  };

  flowchartSelected = [];
  model: FCDataModel = {nodes: [], edges: []};

  nextNodeID!: number;
  nextConnectorID!: number;
  inputConnectorId: number;
  schemaTree: any[];

  public nodeEditCallbacks: NavTreeEditCallbacks = {};
  public showTree = false;

  editCallbacks: UserCallbacks = {
    edgeDoubleClick: (event, edge) => {
      console.log('Edge double clicked.');
    },
    edgeEdit: (event, edge: FcEdge) => {
      console.log('edge', edge);
      this.processModelEdge(edge, 'edit');
    },
    edgeMouseOver: event => {
      console.log('mouserover');
    },
    isValidEdge: (source, destination) => source.type === FlowchartConstants.rightConnectorType && destination.type === FlowchartConstants.leftConnectorType,
    createEdge: (event, edge) => {
      edge.label = 'New relation';
      this.processModelEdge(edge, 'add');
      return of(edge);
    },
    dropNode: (event, node) => {
      this.processModelNode(node as FcModelNode, 'add');
    },
    edgeAdded: edge => {
      console.log('edge added');
      console.log(edge);
    },
    nodeRemoved: node => {
      console.log('node removed');
      console.log(node);
    },
    edgeRemoved: edge => {
      console.log('edge removed');
      console.log(edge);
    },
    nodeCallbacks: {
      doubleClick:  (event, node) => {
        this.processModelNode(node as FcModelNode, 'edit');
      },
      nodeEdit: (event, node) => {
        this.processModelNode(node as FcModelNode, 'edit');
      }
    }
  };

  public customersList: Customer[] = [];
  private tenantId!: EntityId;
  private generatedDashboardId!: string | null;
  private generatedDashboardGroupdId!: string | null;

  constructor(public dialog: MatDialog,
              private cdr: ChangeDetectorRef,
              private attributeService: AttributeService,
              private customerService: CustomerService,
              private relationService: EntityRelationService,
              private dataModelsService: DataModelsService,
              private dashboardService: DashboardService,
              private entityGroupService: EntityGroupService,
              private importExportService: ImportExportService,
              private store: Store<AppState>) {
    this.isLoading$ = this.store.pipe(delay(0), select(selectIsLoading), share());
    this.initData();
  }

  ngOnInit() {
    this.initTenantId();

    const pageLink = new PageLink(100);
    this.customerService.getCustomers(pageLink).subscribe(res => this.customersList = res.data);
    this.getSavedModelFromTenantAttribute();
  }

  public onModelChanged() {
    this.modelChanged = true;
  }

  private initData() {
    const types = [
      //{name: 'Tenant', type: ModelElementType.TENANT},
      {name: 'Customer', type: ModelElementType.CUSTOMER},
      {name: 'Asset', type: ModelElementType.ASSET},
      {name: 'Device', type: ModelElementType.DEVICE}
    ];
    const additionalFields: ModelAdditionalFieldsObj = {};
    Object.values(AdditionalFieldsTypes).forEach(f => {
      additionalFields[f] = [];
    });
    for (let i = 0; i < types.length; i++) {
      const node: FcModelNode = {
        name: types[i].name,
        type: types[i].type,
        added: false,
        id: (i + 1) + '',
        x: 50,
        y: 100 * (i + 1),
        connectors: [
          {
            type: FlowchartConstants.leftConnectorType,
            id: (i * 2 + 1) + ''
          },
          {
            type: FlowchartConstants.rightConnectorType,
            id: (i * 2 + 2) + ''
          }
        ],
        additionalFields
      };
      this.nodeTypesModel.nodes.push(node);
    }
  }

  @HostListener('keydown.control.a', ['$event'])
  public onCtrlA(event: KeyboardEvent) {
    this.dateModelChainCanvas.modelService.selectAll();
  }

  @HostListener('keydown.esc', ['$event'])
  public onEsc(event: KeyboardEvent) {
    this.dateModelChainCanvas.modelService.deselectAll();
  }

  @HostListener('keydown', ['$event'])
  public onKeydown(event: KeyboardEvent) {
    if (event.keyCode === DELETE) {
      this.dateModelChainCanvas.modelService.deleteSelected();
    }
  }

  public addNewNode() {
    const nodeName = prompt('Enter a node name:', 'New node');
    if (!nodeName) {
      return;
    }

    const additionalFields: ModelAdditionalFieldsObj = Object.keys(AdditionalFieldsTypes)
      .map(name => ({ [name]: [] })) as ModelAdditionalFieldsObj;

    const newNode: FcModelNode = {
      name: nodeName,
      type: ModelElementType.ASSET,
      added: false,
      id: (this.nextNodeID++) + '',
      x: 200,
      y: 100,
      color: '#F15B26',
      connectors: [
        {
          id: (this.nextConnectorID++) + '',
          type: FlowchartConstants.leftConnectorType
        },
        {
          id: (this.nextConnectorID++) + '',
          type: FlowchartConstants.rightConnectorType
        }
      ],
      additionalFields
    };
    this.model.nodes.push(newNode);
  }

  public onSaveModel() {
    this.attributeService.saveEntityAttributes(this.tenantId, AttributeScope.SERVER_SCOPE,
      [{key: 'hierarchy-model', value: {generatedDashboardId: this.generatedDashboardId, model: JSON.stringify(this.model)}}])
      .subscribe(() => {
        this.setSavedModel();
        this.modelChanged = false;
      });
  }

  public onGenerateDashboard() {
    if (this.generatedDashboardId) {
      this.dashboardService.getDashboards([this.generatedDashboardId]).subscribe(dashboards => {
        if(dashboards.length){
          const dialogConfig: MatDialogConfig = {
            disableClose: false,
            data: {
              title: 'Should you update your previous dashboard or create a new one?',
              message: '',
              cancel: 'Create new',
              ok: 'Update previous'
            }
          };

          this.dialog.open(ConfirmDialogComponent, dialogConfig).afterClosed().subscribe((confirmed: boolean) => {
            if (confirmed) {
              this.generateManagementDashboard(this.generatedDashboardId);
            } else if (confirmed === false) {
              this.generateManagementDashboard(null);
            }
          });
        } else {
          this.generateManagementDashboard(null);
        };
      });
    } else {
      this.generateManagementDashboard(null);
    };
  };

  public onCancelChanges() {
    if (this.savedModel) {
      this.model.nodes = deepClone(this.savedModel.nodes);
      this.model.edges = deepClone(this.savedModel.edges);
      this.modelChanged = false;
    }
  }

  public onDeleteModel() {
    this.attributeService.saveEntityAttributes(this.tenantId, AttributeScope.SERVER_SCOPE,
        [{key: 'model', value: ''}])
        .subscribe(() => {
          this.createDefaultModel();
          this.setSavedModel();
        });
  }

  public activateWorkflow() {
    this.model.edges.forEach((edge) => {
      edge.active = !edge.active;
    });
    this.dateModelChainCanvas.modelService.detectChanges();
  }

  public deleteSelected() {
    this.dateModelChainCanvas.modelService.deleteSelected();
  }

  private createDefaultModel() {
    this.nextNodeID = 1;
    this.nextConnectorID = 1;

    this.model.nodes = [];
    this.model.edges = [];

    this.inputConnectorId = this.nextConnectorID++;

    this.model.nodes.push(
      {
        id: (this.nextNodeID++).toString(), // todo maybe change to number
        name: 'Tenant',
        type: ModelElementType.TENANT,
        readonly: true,
        added: true,
        additionalFields: {},
        x: 50,
        y: 100,
        connectors: [
          {
            type: FlowchartConstants.rightConnectorType,
            id: this.inputConnectorId + ''
          },
        ]
      }
    );
  }

  private processModelEdge(modelEdge: FcEdge, mode: 'add' | 'edit') {
    if (!this.checkCanCreateRelation(modelEdge)) {
      this.flowchartSelected = [modelEdge];
      setTimeout(() => {
        this.dateModelChainCanvas.modelService.edges.delete(modelEdge);
      }, 100);
      return;
    }

    const modelEdgeCopy = deepClone(modelEdge);
    const edgesNamesList = this.model.edges.map(edge => edge.label);
    const otherEdgesNamesList = mode === 'add' ? edgesNamesList : this.removeCurrentNameFromArray(edgesNamesList, modelEdge.label);
    this.dialog.open<AddModelEdgeDialogComponent, AddModelEdgeDialogData>(AddModelEdgeDialogComponent, {
      disableClose: true,
      panelClass: [],
      data: {
        edge: modelEdgeCopy,
        modelEdgesSavedNamesList: otherEdgesNamesList
      }
    }).afterClosed().subscribe((newModelEdge: FcEdge) => {
      if (newModelEdge) {
          if (mode === 'add') {
            modelEdge.label = newModelEdge.label;
          } else if (mode === 'edit') {
            modelEdge.label = newModelEdge.label;
          }
          this.modelChanged = true;
          this.dateModelChainCanvas.modelService.detectChanges();
          this.cdr.markForCheck();
      }
    });
  }

  private checkCanCreateRelation(modelEdge: FcEdge): boolean {
    console.log('modelEdge', modelEdge);

    const startNode = this.model.nodes.find(n => n.connectors.some(c => c.id === modelEdge.source));
    const endNode = this.model.nodes.find(n => n.connectors.some(c => c.id === modelEdge.destination));

    if ((startNode.type === ModelElementType.ASSET || startNode.type === ModelElementType.DEVICE)
      && endNode.type === ModelElementType.CUSTOMER) {
      this.dialog.open(AlertDialogComponent, {
        disableClose: true,
        panelClass: [],
        data: {
          title: 'You cannot connect a customer with this type',
          message: 'A customer can only be placed after a tenant or another customer',
          ok: 'OK'
        }
      });
      return false;
    }

    return true;
  }

  private processModelNode(modelNode: FcModelNode, mode: 'add' | 'edit') {
    const modelNodeCopy = deepClone(modelNode);
    const nodeNamesList = this.model.nodes.map(node => node.name);
    const otherNodeNamesList = mode === 'add' ? nodeNamesList : this.removeCurrentNameFromArray(nodeNamesList, modelNode.name);
    this.dialog.open<AddModelNodeDialogComponent, AddModelNodeDialogData>(AddModelNodeDialogComponent, {
      disableClose: true,
      panelClass: [],
      data: {
        modelNode: modelNodeCopy,
        modelNodesSavedNamesList: otherNodeNamesList
      }
    }).afterClosed().subscribe(
      (newModelNode: FcModelNode) => {
        if (newModelNode) {
         if (mode === 'add') {
           this.addModelNode(newModelNode);
         } else if (mode === 'edit') {
           this.editModelNode(newModelNode);
         }
          this.modelChanged = true;
          this.dateModelChainCanvas.modelService.detectChanges();
          this.cdr.markForCheck();
        }
      }
    );
  }

  removeCurrentNameFromArray(array: string[], name: string) {
    const index = array.indexOf(name);
    if (index !== -1) {
      array.splice(index, 1);
    }
    return array;
  }

  private addModelNode(newNode: FcModelNode) {
    newNode.added = true;
    newNode.id = (this.nextNodeID++) + '';
    newNode.connectors = [
      {
        id: (this.nextConnectorID++) + '',
        type: FlowchartConstants.leftConnectorType
      },
      {
        id: (this.nextConnectorID++) + '',
        type: FlowchartConstants.rightConnectorType
      }
    ];
    this.model.nodes.push(newNode);
  }

  private editModelNode(editedNode: FcModelNode) {
    this.model.nodes[this.model.nodes.findIndex(n => n.id === editedNode.id)] = editedNode;
  }

  private generateHierarchyTree() {
    const nodesArr: HierarchyParentNavTreeNode[] = [];
    if(this.model.nodes.length) {
      this.model.nodes.forEach(node => {
        const nodeLeftConnector = node.connectors.find(el => el.type === 'leftConnector');
        const newNode: HierarchyParentNavTreeNode = {
          id: node.id,
          name: node.name,
          type: node.type,
          data: {...node.additionalFields}
        };

        this.model.edges.forEach(edge => {
          if(edge.destination === nodeLeftConnector?.id) {
            const parent = this.model.nodes.find(node => {
              const nodeRConnector = node.connectors.find(el => el.type === 'rightConnector');
              if(nodeRConnector.id === edge.source) {
                return true;
              }
            });

            newNode.parent = parent ? parent.id : null;
            newNode.data.relationType = edge.label;
          }
        });
        nodesArr.push(newNode);
      });
    }
    return this.arrayToTree(nodesArr);
  }

  private setSavedModel() {
    this.savedModel = deepClone(this.model);
  }

  public loadNodes: LoadNodesCallback = (node, cb) => {
    let entityArray = [];
    if (this.schemaTree.length) {
      this.schemaTree.forEach(customer => {
        this.getChildrenRequest(customer, entityArray).then(res => {
          cb(entityArray);
        });
      });
    }
  };

  async getChildrenRequest(parent, array, responseMap = {}) {
    try {
      if(parent.children) {
        const childPromises = parent.children.map(async (child) => {
          let response;

          if(parent.type === ModelElementType.TENANT) {
            const authState = getCurrentAuthState(this.store);
            const authUser = authState.authUser;
            const entityId = {id: authUser.tenantId, entityType: EntityType.TENANT};

            const relationFilter = {
              relType: child.data.relationType,
              entityType: child.type
            };

            const searchQuery = this.buildSearchQuery(relationFilter, entityId);
            response = await this.relationService.findInfoByQuery(searchQuery).toPromise();
            child.entities = [];

            for(const rel of response) {
              let newCustomer = {
                icon: false,
                data: {
                  id: rel.to,
                },
                children: [],
                text: this.materialIconByEntityType(rel.to.entityType) + rel.toName,
                id: rel.to.id,
                parent: '#'
              };
              if(!array.find(el => el.id === newCustomer.id)) {
                child.entities.push(newCustomer)
                array.push(newCustomer);
              }
            }
            responseMap[child.id] = response;
          } else {
            if(parent.entities?.length) {
              const relationFilter = {
                relType: child.data.relationType,
                entityType: child.type
              };
              for (const entity of parent.entities) {
                const searchQuery = this.buildSearchQuery(relationFilter, entity.data.id);
                response = await this.relationService.findInfoByQuery(searchQuery).toPromise();
                child.entities = [];

                for(const rel of response) {
                  let newCustomer = {
                    icon: false,
                    data: {
                      id: rel.to,
                    },
                    children: [],
                    text: this.materialIconByEntityType(rel.to.entityType) + rel.toName,
                    id: rel.to.id,
                    parent: searchQuery.parameters.rootId
                  };
                  if(!array.find(el => el.id === newCustomer.id)) {
                    child.entities.push(newCustomer)
                    array.push(newCustomer);
                  }
                }
              }
              this.getChildrenRequest(child, array)
              responseMap[child.id] = response;
            }
          }

          await this.getChildrenRequest(child, array, responseMap);
        });

        await Promise.all(childPromises);;
      }
    } catch(error) {
      console.error('Error for request', error)
    }
  }

  buildSearchQuery(rel, parentId) {
    const newSearchQuery: EntityRelationsQuery = {
      filters: [
        {
          relationType: rel.relType,
          entityTypes: []
        }
      ],
      parameters: {
        rootId: parentId.id,
        rootType: parentId.entityType,
        direction: EntitySearchDirection.FROM,
        maxLevel: 1
      }
    };

    return newSearchQuery;
  }

  private arrayToTree(array: HierarchyParentNavTreeNode[]) {
    const idToNodeMap: {[id: string]: HierarchyParentNavTreeNode} = {};

    array.forEach(node => {
      idToNodeMap[node.id] = {...node, children: []};
    });

    const rootNode = {children: []};

    Object.values(idToNodeMap).forEach(node => {
      const parentId = node.parent;
      if(!parentId) {
        rootNode.children.push(node);
      } else {
        if (!idToNodeMap[parentId].children) {
          idToNodeMap[parentId].children = [];
        }
        if(typeof idToNodeMap[parentId].children !== 'boolean') {
          idToNodeMap[parentId].children.push(node);
        }
      }
    });

    this.addLevels(rootNode.children[0], 0)
    return rootNode.children;
  }

  materialIconByEntityType(entityType: string): string {
    let materialIcon = 'insert_drive_file';
    switch (entityType) {
      case 'DEVICE':
        materialIcon = 'devices_other';
        break;
      case 'ASSET':
        materialIcon = 'domain';
        break;
      case 'CUSTOMER':
        materialIcon = 'supervisor_account';
        break;
      case 'TENANT':
        materialIcon = 'account_circle';
        break;
    }
    return '<mat-icon class="node-icon material-icons" role="img" aria-hidden="false">' + materialIcon + '</mat-icon>';
  }

  private initTenantId() {
    const authState = getCurrentAuthState(this.store);
    const authUser = authState.authUser;
    this.tenantId = {id: authUser.tenantId, entityType: EntityType.TENANT};
  }

  private addLevels(obj, parentLevel) {
    obj.level = parentLevel + 1;
    let maxLevel = obj.level;

    if (obj.children.length) {
      for (const child of obj.children) {
        const childMaxLevel = this.addLevels(child, obj.level);
        maxLevel = Math.max(maxLevel, childMaxLevel);
      }
    }

    if (parentLevel === 0) {
      obj.maxLevel = maxLevel;
    }

    return maxLevel;
  }

  private getSavedModelFromTenantAttribute() {
    this.attributeService.getEntityAttributes(this.tenantId,
      AttributeScope.SERVER_SCOPE, ['hierarchy-model']).subscribe(data => {
      const savedInAttributeModel = data[0]?.value as SavedInAttributeModel;
      if (savedInAttributeModel) {
        this.setGeneratedDashboardId(savedInAttributeModel.generatedDashboardId);
        const savedModel = JSON.parse(savedInAttributeModel.model);
        this.model.nodes = [];
        this.model.edges = [];
        this.model.nodes = savedModel.nodes;
        this.model.edges = savedModel.edges;
        this.setSavedModel();
        this.schemaTree = this.generateHierarchyTree();
        if(this.schemaTree.length) {
          this.showTree = true;
        }
        this.findNextSavedModelElementsId();
      } else {
        this.createDefaultModel();
      }
    });
  }

  private setGeneratedDashboardId(id: string | null) {
    this.dashboardService.getDashboards([id]).subscribe(dashboards => {
       if (dashboards.length) {
         this.generatedDashboardId = id;
       } else {
         this.generatedDashboardId = null;
       }
     });
  }

  private generateManagementDashboard(previousDashboardId: string | null) {
    this.generatedDashboardGroupdId = null;
    if(previousDashboardId){
      this.dashboardService.getDashboards([previousDashboardId]).subscribe(dashboards => {
        if(dashboards.length){
          this.generateDashboard(previousDashboardId);
        }
      });
    }
    else {
      this.generateDashboard(previousDashboardId);
    }
  }

  private generateDashboard(previousDashboardId: string | null){
    const tree: HierarchyParentNavTreeNode[] = this.generateHierarchyTree();
    this.modelChanged = false;
    this.dateModelChainCanvas.modelService.detectChanges();
    const dashboard = this.dataModelsService.createDashboard(tree, this.ctx, previousDashboardId);

    let dashboardGroupObject = {
      type: 'DASHBOARD',
      name: 'Management Dashboard',
      ownerId: this.tenantId,
    }

    this.entityGroupService.getEntityGroupsByOwnerId('TENANT' as EntityType, this.tenantId.id, 'DASHBOARD' as EntityType).subscribe(res=>{
      if(res.find(x=>x.name == 'Management Dashboard')){
        this.generatedDashboardGroupdId = res.find(x=>x.name == 'Management Dashboard').id.id;
      }
      if (this.generatedDashboardGroupdId){
        this.importExportService.processImportedDashboard(dashboard as Dashboard, null, this.generatedDashboardGroupdId).subscribe(newManagementDashboard => {
          this.generatedDashboardId = newManagementDashboard.id.id;
          this.changeDashboardIdForSavedModel();
        });
      } else {
        this.entityGroupService.saveEntityGroup(dashboardGroupObject as EntityGroup).subscribe((result)=>{
          this.importExportService.processImportedDashboard(dashboard as Dashboard, null, result.id.id).subscribe(newManagementDashboard => {
            this.generatedDashboardId = newManagementDashboard.id.id;
            this.changeDashboardIdForSavedModel();
          });
        })
      }
    })
  }

  private changeDashboardIdForSavedModel() {
    this.attributeService.saveEntityAttributes(this.tenantId, AttributeScope.SERVER_SCOPE,
      [{key: 'hierarchy-model', value: {generatedDashboardId: this.generatedDashboardId, model: JSON.stringify(this.savedModel)}}])
      .subscribe();
  }

  private findNextSavedModelElementsId() {
    this.nextNodeID = Math.max(...this.model.nodes.map(n => +n.id)) + 1;
    this.nextConnectorID = Math.max(...[].concat(...this.model.nodes.map(n => (n.connectors.map(c => +c.id))))) + 1;
  }

}
