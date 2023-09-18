import {Component, EventEmitter, Input, Output} from '@angular/core';
import {LoadNodesCallback, NavTreeEditCallbacks} from "@shared/components/nav-tree.component";
import {ModelElementType} from "@home/components/widget/lib/settings/data-models/model-node.models";
import {getCurrentAuthState} from "@core/auth/auth.selectors";
import {EntityType} from "@shared/models/entity-type.models";
import {Store} from "@ngrx/store";
import {AppState} from "@core/core.state";
import {EntityRelationsQuery, EntitySearchDirection} from "@shared/models/relation.models";
import {EntityRelationService} from "@core/http/entity-relation.service";

@Component({
  selector: 'tb-data-model-hierarchy-tree',
  templateUrl: './data-model-hierarchy-tree.component.html',
  styleUrls: ['./data-model-hierarchy-tree.component.scss']
})
export class DataModelHierarchyTreeComponent {
  @Input() schemaTree: any[];
  @Input() realDataSchemaTree: any[];
  @Output() isRealDataExist = new EventEmitter<boolean>();
  public nodeEditCallbacks: NavTreeEditCallbacks = {};

  constructor(private store: Store<AppState>,
              private relationService: EntityRelationService,) {

  }
  public loadNodes: LoadNodesCallback = (node, cb) => {
    let entityArray = [];
    if(this.realDataSchemaTree?.length) {
      this.getEntities(this.realDataSchemaTree[0], entityArray);
      if(entityArray.length) {
        cb(entityArray);
        this.isRealDataExist.emit(true);
      } else {
        this.isRealDataExist.emit(false);
      }
    } else if (this.schemaTree.length) {
      this.schemaTree.forEach(customer => {
        this.getChildrenRequest(customer, entityArray).then(res => {
          if(entityArray.length) {
            cb(entityArray);
            this.isRealDataExist.emit(true);
          } else {
            this.isRealDataExist.emit(false);
          }
        });
      });
    }
  };

  public getEntities(parent, array) {
    parent.children.forEach(child => {
      child.entities.forEach(entity => {
        let newEntity = {
          icon: false,
          data: {
            id: entity.id,
          },
          children: [],
          text: this.materialIconByEntityType(entity.id.entityType) + entity.name,
          id: entity.id.id,
          parent: parent.type === EntityType.TENANT ? '#' : entity.parent
        }
        array.push(newEntity)
      })
      this.getEntities(child, array);
    })
  }

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
}
