import {Injectable} from '@angular/core';
import {
  extendTreeNode,
  HierarchyParentNavTreeNode, ModelTreeNode,
} from '@home/components/widget/lib/settings/data-models/data-models.component';
import {WidgetContext} from '@home/models/widget-component.models';
import {Dashboard} from '@shared/models/dashboard.models';
import {AggregationType, QuickTimeInterval} from '@shared/models/time/time.models';
import {AliasFilterType, EntityAlias} from '@shared/models/alias.models';
import {AliasEntityType, EntityType} from '@shared/models/entity-type.models';
import {EntitySearchDirection} from '@shared/models/relation.models';
import {UtilsService} from '@core/services/utils.service';
import {NavTreeNode} from "@shared/components/nav-tree.component";
import {
  EntityKeyType,
  EntityKeyValueType,
  Filter,
  FilterPredicateType,
  StringOperation
} from "@shared/models/query/query.models";

@Injectable({
  providedIn: 'root'
})
export class DataModelsService {
  constructor(private utils: UtilsService) {}

  public createDashboard(hierarchyParentNavTreeNode: HierarchyParentNavTreeNode[], ctx: WidgetContext, previousDashboardId: string | null) {
    const result = this.generateDashboardJson(hierarchyParentNavTreeNode, ctx);

    if (previousDashboardId) {
      result.id = {entityType: EntityType.DASHBOARD, id: previousDashboardId};
    }

    return result;
  }

  private generateDashboardJson(json: HierarchyParentNavTreeNode[], ctx: WidgetContext) {
    const tenantChildren: ModelTreeNode[] = extendTreeNode(json[0].children);
    const newDashboard = this.crateEmptyDashboard();

    const setLevel = (currentLevel, previousLevel, hasChildren, stateName) => {
      const aliasId = this.utils.guid();
      const widgetId = this.utils.guid();
      let filterId = null;
      let size: WidgetSize;

      if (previousLevel.children.length === 2) {
        size = this.setWidgetSize(12, 12, 0, 0);
      } else if (previousLevel.children.length === 3) {
        size = this.setWidgetSize(8, 12, 0, 0);
      } else {
        size = this.setWidgetSize(24, 12, 0, 0);
      }

      if(currentLevel.type === EntityType.DEVICE) {
        filterId = this.utils.guid();
        newDashboard.configuration.filters[filterId] = setNewFilter(filterId, `${currentLevel.name} filter`, currentLevel.name)
      }

      if (currentLevel.level === 2) {
        newDashboard.configuration.entityAliases[aliasId] = setNewAlias(aliasId, previousLevel.type + ' ' + currentLevel.name, `selected${previousLevel.name.replaceAll(' ', '')}`, previousLevel.type, currentLevel.type, currentLevel.data.relationType);
        newDashboard.configuration.widgets[widgetId] = setNewWidget(aliasId, widgetId, hasChildren, '', currentLevel, filterId);
        newDashboard.configuration.states[stateName].layouts.main.widgets[widgetId] = size;
      } else {
        newDashboard.configuration.entityAliases[aliasId] = setNewAlias(aliasId, currentLevel.name, `selected${previousLevel.name.replaceAll(' ', '')}`, previousLevel.type, currentLevel.type, currentLevel.data.relationType);
        newDashboard.configuration.widgets[widgetId] = setNewWidget(aliasId, widgetId, hasChildren, `selected${previousLevel.name.replaceAll(' ', '')}`, currentLevel, filterId);
        newDashboard.configuration.states[stateName].layouts.main.widgets[widgetId] = size;
      }
    };

    const setChartLevel = (currentLevel, previousLevel, hasChildren, stateName) => {
      const aliasId = this.utils.guid();
      let size: WidgetSize;

      if (currentLevel.data.telemetries.length === 2) {
        size = this.setWidgetSize(12, 12, 0, 0);
      } else if (currentLevel.data.telemetries.length === 3) {
        size = this.setWidgetSize(8, 12, 0, 0);
      } else {
        size = this.setWidgetSize(24, 12, 0, 0);
      }

      newDashboard.configuration.entityAliases[aliasId] = setLineChartAlias(aliasId, `Selected ${currentLevel.name}`, `selected${currentLevel.name.replaceAll(' ', '')}`);

      currentLevel.data.telemetries.forEach(x=>{
        const widgetId = this.utils.guid();
        newDashboard.configuration.widgets[widgetId] = setNewLineChart(x.name, aliasId, widgetId, hasChildren, `selected${currentLevel.name.replaceAll(' ', '')}`, currentLevel);
        newDashboard.configuration.states[stateName].layouts.main.widgets[widgetId] = size;
      })
    };

    function setLineChartAlias(id, aliasName, stateEntityParamName): EntityAlias {
      return {
        id,
        alias: aliasName,
        filter: {
          type: AliasFilterType.stateEntity,
          resolveMultiple: false,
          stateEntityParamName: stateEntityParamName,
          defaultStateEntity: null
        }
      };
    }

    function setNewFilter(id, filterName, entityProfile): Filter {
      return {
        id,
        filter: filterName,
        keyFilters: [
          {
            key: {
              type: EntityKeyType.ENTITY_FIELD,
              key: "type"
            },
            valueType: EntityKeyValueType.STRING,
            predicates: [
              {
                keyFilterPredicate: {
                  operation: StringOperation.EQUAL,
                  value: {
                    defaultValue: entityProfile,
                    dynamicValue: null
                  },
                  ignoreCase: true,
                  type: FilterPredicateType.STRING
                },
                userInfo: {
                  editable: true,
                  label: '',
                  autogeneratedLabel: true,
                  order: 0
                }
              }
            ]
          }
        ],
        editable: true
      }
    }

    function setNewAlias(id, aliasName, stateEntityParamName, entityType, levelType: EntityType, relationType): EntityAlias {
      if (entityType === EntityType.TENANT) {
        return {
          id,
          alias: aliasName,
          filter: {
            type: AliasFilterType.relationsQuery,
            resolveMultiple: true,
            rootStateEntity: false,
            stateEntityParamName,
            defaultStateEntity: null,
            rootEntity: {
              entityType: AliasEntityType.CURRENT_TENANT,
              id: '13814000-1dd2-11b2-8080-808080808080'
            },
            direction: EntitySearchDirection.FROM,
            maxLevel: 1,
            fetchLastLevelOnly: false,
            filters: [
              {
                relationType: `${relationType}`,
                entityTypes: [
                  levelType
                ]
              }
            ]
          }
        };
      } else {
        return {
          id,
          alias: aliasName,
          filter: {
            type: AliasFilterType.relationsQuery,
            resolveMultiple: true,
            rootStateEntity: true,
            stateEntityParamName,
            defaultStateEntity: null,
            rootEntity: null,
            direction: EntitySearchDirection.FROM,
            maxLevel: 1,
            fetchLastLevelOnly: false,
            filters: [
              {
                relationType: `${relationType}`,
                entityTypes: [
                  levelType
                ]
              }
            ]
          }
        };
      }
    }

    function setNewState(name) {
      return {
        name,
        root: false,
        layouts: {
          main: {
            widgets: {},
            gridSettings: {
              backgroundColor: '#FFFFFF',
              columns: 24,
              margin: 10,
              backgroundSizeMode: '100%',
              outerMargin: true,
              autoFillHeight: true,
              backgroundImageUrl: null,
              mobileAutoFillHeight: false,
              mobileRowHeight: 70
            }
          }
        }
      };
    }

    const setCellCustomAction = (stateEntityParamName, needsObj) => {
      let html = '';
      let js = '';
      if (needsObj.type == 'CUSTOMER') {
        html = editCustomerHTML();
        js = editCustomerJs(stateEntityParamName, needsObj.data.relationType, needsObj.data.attributes);
      } else if (needsObj.type == 'DEVICE'){
        html = editDeviceHTML();
        js = editDeviceJs(stateEntityParamName, needsObj.data.relationType, needsObj.data.attributes);
      } else if (needsObj.type == 'ASSET'){
        html = editAssetHTML();
        js = editAssetJs(stateEntityParamName, needsObj.data.relationType, needsObj.data.attributes);
      } else if (needsObj.type == 'USER'){
        html = editUserHTML();
        js = editUserJS(stateEntityParamName, needsObj.data.relationType);
      }

      const array = [
        {
          name: 'Edit',
          icon: 'edit',
          useShowWidgetActionFunction: true,
          showWidgetActionFunction: `if(widgetContext.currentUser.authority === \'TENANT_ADMIN\') {\n    return true\n}\nlet $injector = widgetContext.$scope.$injector;\nlet userService = $injector.get(widgetContext.servicesMap.get(\'userService\'));\nuserService.getUserInfo(widgetContext.currentUser.userId).subscribe(res => {\n    return res.groups[0].name === \"Customer Administrators\";\n})`,
          type: 'customPretty',
          customHtml: html,
          customCss: '',
          customFunction: js,
          customResources: [],
          openInSeparateDialog: false,
          openInPopover: false,
          id: this.utils.guid()
        },
        {
          name: 'Delete',
          icon: 'delete',
          useShowWidgetActionFunction: true,
          showWidgetActionFunction: `if(widgetContext.currentUser.authority === \'TENANT_ADMIN\') {\n    return true\n}\nlet $injector = widgetContext.$scope.$injector;\nlet userService = $injector.get(widgetContext.servicesMap.get(\'userService\'));\nuserService.getUserInfo(widgetContext.currentUser.userId).subscribe(res => {\n    return res.groups[0].name === \"Customer Administrators\";\n})`,
          type: 'custom',
          customFunction: 'let $injector = widgetContext.$scope.$injector;\nlet dialogs = $injector.get(widgetContext.servicesMap.get(\'dialogs\'));\nlet assetService = $injector.get(widgetContext.servicesMap.get(\'assetService\'));\nlet deviceService = $injector.get(widgetContext.servicesMap.get(\'deviceService\'));\nlet customerService = $injector.get(widgetContext.servicesMap.get(\'customerService\'));\nlet userService = $injector.get(widgetContext.servicesMap.get(\'userService\'));\n\nopenDeleteEntityDialog();\n\nfunction openDeleteEntityDialog() {\n    let title = \'Delete \' + entityId.entityType.toLowerCase() + \' \' + entityName;\n    let content = \'Are you sure you want to delete the \' + entityId.entityType.toLowerCase() + \' \' + entityName + \'?\';\n    dialogs.confirm(title, content, \'Cancel\', \'Delete\').subscribe(\n        function(result) {\n            if (result) {\n                deleteEntity();\n            }\n        }\n    );\n}\n\nfunction deleteEntity() {\n    deleteEntityObservable(entityId).subscribe(\n        function success() {\n            widgetContext.updateAliases();\n        },\n        function fail() {\n            showErrorDialog();\n        }\n    );\n}\n\nfunction deleteEntityObservable(entityId) {\n    if (entityId.entityType == "ASSET") {\n        return assetService.deleteAsset(entityId.id);\n    } else if (entityId.entityType == "DEVICE") {\n        return deviceService.deleteDevice(entityId.id);\n    } else if(entityId.entityType == "CUSTOMER"){\n        return customerService.deleteCustomer(entityId.id);\n    } else if(entityId.entityType == "USER"){\n        return userService.deleteUser(entityId.id);\n    }\n}\n\nfunction showErrorDialog() {\n    let title = \'Error\';\n    let content = \'An error occurred while deleting the entity. Please try again.\';\n    dialogs.alert(title, content, \'CLOSE\').subscribe(\n        function(result) {}\n    );\n}',
          openInSeparateDialog: false,
          openInPopover: false,
          id: this.utils.guid()

        }
      ];

      return array;
    }

    function setHeaderCustomAction(stateEntityParamName, needsObj) {
      let html = '';
      let js = '';
      if (needsObj.type == 'CUSTOMER') {
        html = addCustomerHTML();
        js = addCustomerJs(stateEntityParamName, needsObj.data.relationType, needsObj.data.attributes);
      } else if (needsObj.type == 'DEVICE'){
        html = addDeviceHTML();
        js = addDeviceJs(stateEntityParamName, needsObj.data.relationType, needsObj.data.attributes);
      } else if (needsObj.type == 'ASSET'){
        html = addAssetHTML();
        js = addAssetJs(stateEntityParamName, needsObj.data.relationType, needsObj.data.attributes);
      } else if (needsObj.type === 'USER') {
        html = addUserHTML();
        js = addUserJs(stateEntityParamName, needsObj.data.relationType)
      }

      return [{
        name: 'Add new entity',
        icon: 'add',
        useShowWidgetActionFunction: true,
        showWidgetActionFunction: `if(widgetContext.currentUser.authority === \'TENANT_ADMIN\') {\n    return true\n}\nlet $injector = widgetContext.$scope.$injector;\nlet userService = $injector.get(widgetContext.servicesMap.get(\'userService\'));\nuserService.getUserInfo(widgetContext.currentUser.userId).subscribe(res => {\n    return res.groups[0].name === \"Customer Administrators\";\n})`,
        type: 'customPretty',
        customHtml: html,
        customCss: '',
        customFunction: js,
        customResources: [],
        openInSeparateDialog: false,
        openInPopover: false,
        id: 'f895085f-a79a-3959-9d7f-c7b2c6c516c4'
      }];
    }

    const setNewLineChart = (telemetryName, aliasId, id, haveChildren, stateEntityParamName, needsObj) =>{
      const testObj = {
        isSystemType: true,
        bundleAlias: "charts",
        typeAlias: "basic_timeseries",
        type: "timeseries",
        title: telemetryName,
        image: null,
        description: null,
        sizeX: 8,
        sizeY: 5,
        config: {
          datasources: [
            {
              type: "entity",
              name: 'selectedDevice',
              entityAliasId: aliasId,
              filterId: null,
              dataKeys: [
                {
                  name: telemetryName,
                  type: "timeseries",
                  label: telemetryName,
                  color: "#2196f3",
                  settings: {},
                  _hash: 0.7118945290963519
                }
              ],
              alarmFilterConfig: {
                statusList: [
                  "ACTIVE"
                ]
              },
              latestDataKeys: []
            }
          ],
          timewindow: {
            realtime: {
              timewindowMs: 60000
            }
          },
          showTitle: true,
          backgroundColor: "#fff",
          color: "rgba(0, 0, 0, 0.87)",
          padding: "8px",
          settings: {
            shadowSize: 4,
            fontColor: "#545454",
            fontSize: 10,
            xaxis: {
              showLabels: true,
              color: "#545454"
            },
            yaxis: {
              showLabels: true,
              color: "#545454"
            },
            grid: {
              color: "#545454",
              tickColor: "#DDDDDD",
              verticalLines: true,
              horizontalLines: true,
              outlineWidth: 1
            },
            legend: {
              show: true,
              position: "nw",
              backgroundColor: "#f0f0f0",
              backgroundOpacity: 0.85,
              labelBoxBorderColor: "rgba(1, 1, 1, 0.45)"
            },
            decimals: 1,
            stack: false,
            tooltipIndividual: false
          },
          title: telemetryName,
          dropShadow: true,
          enableFullscreen: true,
          titleStyle: {
            fontSize: '17px',
            fontWeight: 500,
            padding: '5px 10px 5px 10px',
            'font-family': 'Roboto'
          },
          useDashboardTimewindow: true,
          showTitleIcon: false,
          titleTooltip: "",
          widgetStyle: {
            'box-shadow': '0px 0px 10px 6px #0B11330A'
          },
          enableDataExport: false,
          widgetCss: "",
          pageSize: 1024,
          noDataDisplayMessage: "",
          showLegend: true,
          legendConfig: {
            direction: "column",
            position: "bottom",
            sortDataKeys: false,
            showMin: false,
            showMax: false,
            showAvg: true,
            showTotal: false,
            showLatest: false
          }
        },
        row: 0,
        col: 0,
        id
      }

      return testObj;
    }

    const setNewWidget = (aliasId, id, haveChildren, stateEntityParamName, needsObj, filterId) => {
      let dataKeys = [];
      needsObj.data.attributes.forEach(x=>{
        if(x.type != 'IMAGE'){
          dataKeys.push({
            "name": x.name,
            "type": "attribute",
            "label": x.name,
            "settings": {},
          })
        }
      })

      const testObj = {
        isSystemType: true,
        bundleAlias: 'cards',
        typeAlias: 'entities_table',
        type: 'latest',
        title: needsObj.name + ' List',
        image: null,
        description: null,
        sizeX: 7.5,
        sizeY: 6.5,
        config: {
          timewindow: {
            displayValue: '',
            selectedTab: 0,
            realtime: {
              realtimeType: 1,
              interval: 1000,
              timewindowMs: 86400000,
              quickInterval: 'CURRENT_DAY'
            },
            history: {
              historyType: 0,
              interval: 1000,
              timewindowMs: 60000,
              fixedTimewindow: {
                startTimeMs: 1693475227055,
                endTimeMs: 1693561627055
              },
              quickInterval: 'CURRENT_DAY'
            },
            aggregation: {
              type: 'NONE',
              limit: 200
            }
          },
          showTitle: true,
          backgroundColor: 'rgb(255, 255, 255)',
          color: 'rgba(0, 0, 0, 0.87)',
          padding: '4px',
          settings: {
            entitiesTitle: needsObj.name + ' List',
            enableSearch: true,
            enableSelectColumnDisplay: false,
            enableStickyHeader: true,
            enableStickyAction: true,
            reserveSpaceForHiddenAction: 'true',
            displayEntityName: true,
            entityNameColumnTitle: 'Name',
            displayEntityLabel: false,
            displayEntityType: false,
            displayPagination: true,
            defaultPageSize: 10,
            defaultSortOrder: 'entityName',
            useRowStyleFunction: false
          },
          title: needsObj.name + ' List',
          dropShadow: false,
          enableFullscreen: false,
          titleStyle: {
            fontSize: '17px',
            fontWeight: 500,
            padding: '5px 10px 5px 10px',
            'font-family': 'Roboto'
          },
          useDashboardTimewindow: false,
          showLegend: false,
          datasources: [
            {
              type: 'entity',
              name: null,
              entityAliasId: aliasId,
              filterId: filterId,
              dataKeys: dataKeys,
              alarmFilterConfig: {
                statusList: [
                  'ACTIVE'
                ]
              }
            }
          ],
          displayTimewindow: false,
          actions: {
            actionCellButton: setCellCustomAction(stateEntityParamName, needsObj),
            headerButton: setHeaderCustomAction(stateEntityParamName, needsObj),
            rowClick: []
          },
          widgetStyle: {
            'box-shadow': '0px 0px 10px 6px #0B11330A'
          },
          enableDataExport: false
        },
        row: 0,
        col: 0,
        id
      };

      if (haveChildren || needsObj.type === 'DEVICE') {
        testObj.config.actions.rowClick.push({
          name: 'Select entity',
          icon: 'more_horiz',
          useShowWidgetActionFunction: null,
          showWidgetActionFunction: 'return true;',
          type: 'openDashboardState',
          targetDashboardStateId: `selected${needsObj.name.replaceAll(' ', '')}`,
          setEntityId: true,
          stateEntityParamName: `selected${needsObj.name.replaceAll(' ', '')}`,
          openRightLayout: false,
          openInSeparateDialog: false,
          openInPopover: false,
          id: this.utils.guid()
        });
      }

      return testObj;
    };

    function addUserHTML() {
      return `<form #addEntityForm=\"ngForm\" [formGroup]=\"addEntityFormGroup\"\n      (ngSubmit)=\"save()\" class=\"add-entity-form\">\n    <mat-toolbar fxLayout=\"row\" color=\"primary\">\n        <h2>Add User</h2>\n        <span fxFlex></span>\n        <button mat-icon-button (click)=\"cancel()\" type=\"button\">\n            <mat-icon class=\"material-icons\">close</mat-icon>\n        </button>\n    </mat-toolbar>\n    <mat-progress-bar color=\"warn\" mode=\"indeterminate\" *ngIf=\"isLoading$ | async\">\n    </mat-progress-bar>\n    <div style=\"height: 4px;\" *ngIf=\"!(isLoading$ | async)\"></div>\n    <div mat-dialog-content fxLayout=\"column\">\n        <div fxLayout=\"row\" fxLayoutGap=\"8px\" fxLayout.xs=\"column\"  fxLayoutGap.xs=\"0\">\n            <mat-form-field fxFlex class=\"mat-block\">\n                <mat-label>Email</mat-label>\n                <input matInput formControlName=\"email\" type=\"email\" required>\n            </mat-form-field>\n        </div>\n        <div fxLayout=\"row\" fxLayoutGap=\"8px\" fxLayout.xs=\"column\"  fxLayoutGap.xs=\"0\">\n            <mat-form-field fxFlex class=\"mat-block\">\n                <mat-label>User Role</mat-label>\n                <mat-select matInput formControlName=\"role\" required>\n                    <mat-option *ngFor=\"let role of roles\" [value]=role>\n                        {{role}}\n                    </mat-option>\n                </mat-select>\n            </mat-form-field>\n        </div>\n        <div fxLayout=\"row\" fxLayoutGap=\"8px\" fxLayout.xs=\"column\" fxLayoutGap.xs=\"0\">\n            <mat-form-field fxFlex class=\"mat-block\">\n                <mat-label>First name</mat-label>\n                <input matInput formControlName=\"firstName\">\n            </mat-form-field>\n            <mat-form-field fxFlex class=\"mat-block\">\n                <mat-label>Last name</mat-label>\n                <input matInput formControlName=\"lastName\" >\n            </mat-form-field>\n        </div>\n        <div fxLayout=\"row\" fxLayoutGap=\"8px\" fxLayout.xs=\"column\" fxLayoutGap.xs=\"0\">\n            <mat-form-field fxFlex class=\"mat-block\">\n                <mat-label>Phone number</mat-label>\n                <input matInput formControlName=\"phoneNumber\">\n            </mat-form-field>\n        </div>\n        <div fxLayout=\"row\" fxLayoutGap=\"8px\" fxLayout.xs=\"column\" fxLayoutGap.xs=\"0\">\n            <mat-form-field fxFlex class=\"mat-block\">\n                <mat-label>Activation method</mat-label>\n                    <mat-select formControlName=\"userActivationMethod\">\n                    <mat-option *ngFor=\"let method of activationMethods\" [value]=\"method.value\">\n                        {{method.name}}\n                    </mat-option>\n                </mat-select>\n            </mat-form-field>\n        </div>\n    </div>\n    <div mat-dialog-actions fxLayout=\"row\" fxLayoutAlign=\"end center\">\n        <button mat-button color=\"primary\"\n                type=\"button\"\n                [disabled]=\"(isLoading$ | async)\"\n                (click)=\"cancel()\" cdkFocusInitial>\n            Cancel\n        </button>\n        <button mat-button mat-raised-button color=\"primary\"\n                type=\"submit\"\n                [disabled]=\"(isLoading$ | async) || addEntityForm.invalid || !addEntityForm.dirty\">\n            Create\n        </button>\n    </div>\n</form>\n`
    }

    function addUserJs(stateEntityParamName, relationType) {
      return `let controller = widgetContext.$scope.ctx.stateController;\nlet params = controller.getStateParams();\n\nlet needsId = null;\nlet relationType = '${relationType}'\n\nif(params['${stateEntityParamName}']){\n    needsId = params['${stateEntityParamName}']['entityId'];\n}\n\nconsole.log('widgetContext', widgetContext);\n\nlet $injector = widgetContext.$scope.$injector; \n let dashboardId = controller.dashboardIdValue; \n let customDialog = $injector.get(widgetContext.servicesMap.get('customDialog'));\nlet entityGroupService = $injector.get(widgetContext.servicesMap.get('entityGroupService'));\nlet entityRelationService = $injector.get(widgetContext.servicesMap.get('entityRelationService'));\nlet userService = $injector.get(widgetContext.servicesMap.get('userService'));\n\nopenAddEntityDialog();\n\nfunction openAddEntityDialog() {\n    customDialog.customDialog(htmlTemplate, AddEntityDialogController).subscribe();\n}\n\nfunction AddEntityDialogController(instance) {\n    let vm = instance;\n  let customerGroups = [];\n    \n    entityGroupService.getEntityGroupsByOwnerId(needsId.entityType, needsId.id, 'USER').subscribe(res => \n            res.forEach(group => {\n                if(group.name !== 'All') {\n                    customerGroups.push({\n                        role: group.name,\n                        groupId: group.id.id\n                    })\n                }\n            })\n    );\n    \n  \n    vm.activationMethods = [\n        {\n            value: 'displayActivationLink',\n            name: 'Display activation link'\n        },\n        {\n            value: 'sendActivationMail',\n            name: 'Send activation email'\n        }\n    ];\n    vm.roles = ['Administrator', 'User'];\n\n    vm.addEntityFormGroup = vm.fb.group({\n        email: ['', [vm.validators.required, vm.validators.email]],\n        firstName: [''],\n        lastName: [''],\n         phoneNumber: [''],\n        role: ['', [vm.validators.required]],\n        userActivationMethod: [\n            'displayActivationLink'\n        ]\n    });\n\n    vm.cancel = function() {\n        vm.dialogRef.close(null);\n    };\n\n    vm.save = function() {\n        vm.addEntityFormGroup.markAsPristine();\n        \n        const formValues = vm.addEntityFormGroup.value;\n let groupId = '';\n        vm.user = {};\n        \n        vm.user = {\n            email: formValues.email,\n            firstName: formValues.firstName,\n            lastName: formValues.lastName,\n  customerId: needsId,\n phone: formValues.phoneNumber,\n            authority: \"CUSTOMER_USER\",\n         additionalInfo: {\n                description: \"\",\n                \"defaultDashboardId\": dashboardId,\n                defaultDashboardFullscreen: true,\n                homeDashboardId: null,\n                homeDashboardHideToolbar: true\n            }\n        };\n        \n        vm.user.customerId = needsId;\n        \n        if(formValues.role == 'Administrator'){\n            vm.user.authority = \"CUSTOMER_USER\"\n groupId = customerGroups.find(el => el.role ===\'Customer Administrators\').groupId;\n       }else{\n            vm.user.authority = \"CUSTOMER_USER\"\n   groupId = customerGroups.find(el => el.role ===\'Customer Users\').groupId;\n     }\n        \n        const sendActivationMail = (formValues\n            .userActivationMethod ===\n            'sendActivationMail');\n            \n        userService.saveUser(vm.user, sendActivationMail, groupId).subscribe((user) => {\n     saveRelation(user.id.id, needsId).subscribe();\n            if (formValues.userActivationMethod === 'displayActivationLink') {\n                userService.getActivationLink(user.id.id).subscribe(\n                    (activationLink) => {\n                        displayActivationLink(activationLink).subscribe(\n                            () => {\n          widgetContext.updateAliases();\n         vm.dialogRef.close(null);\n                            });\n                    });\n            } else {\n     widgetContext.updateAliases();\n      vm.dialogRef.close(null);\n            }\n        })\n    };\n    \n    function saveRelation(userId, parentId) {\n        let obj = {\n            from:  {\n                id: parentId.id,\n                entityType: 'CUSTOMER'\n            },\n            to: {\n                id: userId,\n                entityType: 'USER'\n            },\n            type: relationType,\n            typeGroup: \"COMMON\",\n        }\n        \n        if(userId && parentId){\n            return entityRelationService.saveRelation(obj);\n        }\n        return widgetContext.rxjs.of([]);\n    }\n    \n    function displayActivationLink(activationLink) {\n        const template =\n            '<form style=\"min-width: 400px;\">\\n' +\n            '  <mat-toolbar color=\"primary\">\\n' +\n            '    <h2 translate>user.activation-link</h2>\\n' +\n            '    <span fxFlex></span>\\n' +\n            '    <button mat-icon-button\\n' +\n            '            (click)=\"close()\"\\n' +\n            '            type=\"button\">\\n' +\n            '      <mat-icon class=\"material-icons\">close</mat-icon>\\n' +\n            '    </button>\\n' +\n            '  </mat-toolbar>\\n' +\n            '  <mat-progress-bar color=\"warn\" mode=\"indeterminate\" *ngIf=\"isLoading$ | async\">\\n' +\n            '  </mat-progress-bar>\\n' +\n            '  <div style=\"height: 4px;\" *ngIf=\"!(isLoading$ | async)\"></div>\\n' +\n            '  <div mat-dialog-content tb-toast toastTarget=\"activationLinkDialogContent\">\\n' +\n            '    <div class=\"mat-content\" fxLayout=\"column\">\\n' +\n            '      <span [innerHTML]=\"\\'user.activation-link-text\\' | translate: {activationLink: activationLink}\"></span>\\n' +\n            '      <div fxLayout=\"row\" fxLayoutAlign=\"start center\">\\n' +\n            '        <pre class=\"tb-highlight\" fxFlex><code>{{ activationLink }}</code></pre>\\n' +\n            '        <button mat-icon-button\\n' +\n            '                color=\"primary\"\\n' +\n            '                ngxClipboard\\n' +\n            '                cbContent=\"{{ activationLink }}\"\\n' +\n            '                (cbOnSuccess)=\"onActivationLinkCopied()\"\\n' +\n            '                matTooltip=\"{{ \\'user.copy-activation-link\\' | translate }}\"\\n' +\n            '                matTooltipPosition=\"above\">\\n' +\n            '          <mat-icon svgIcon=\"mdi:clipboard-arrow-left\"></mat-icon>\\n' +\n            '        </button>\\n' +\n            '      </div>\\n' +\n            '    </div>\\n' +\n            '  </div>\\n' +\n            '  <div mat-dialog-actions fxLayoutAlign=\"end center\">\\n' +\n            '    <button mat-button color=\"primary\"\\n' +\n            '            type=\"button\"\\n' +\n            '            cdkFocusInitial\\n' +\n            '            [disabled]=\"(isLoading$ | async)\"\\n' +\n            '            (click)=\"close()\">\\n' +\n            '      {{ \\'action.ok\\' | translate }}\\n' +\n            '    </button>\\n' +\n            '  </div>\\n' +\n            '</form>';\n        return customDialog.customDialog(template,\n            ActivationLinkDialogController, {\n            activationLink: activationLink\n        });\n    }\n\n    function ActivationLinkDialogController(instance) {\n        let vm = instance;\n        vm.activationLink = instance.data.activationLink;\n\n        vm.onActivationLinkCopied = onActivationLinkCopied;\n        vm.close = close;\n\n        function onActivationLinkCopied() {\n            widgetContext.showSuccessToast(translate\n                .instant(\n                    'user.activation-link-copied-message'\n                ), 1000, 'bottom', 'left',\n                'activationLinkDialogContent');\n        }\n\n        function close() {\n            vm.dialogRef.close(null);\n        }\n    }\n}\n`
    }

    function editUserHTML() {
      return `<form #editEntityForm=\"ngForm\" [formGroup]=\"editEntityFormGroup\"\n      (ngSubmit)=\"save()\"  class=\"edit-entity-form\">\n    <mat-toolbar fxLayout=\"row\" color=\"primary\">\n        <h2>Edit {{entityType.toLowerCase()}} {{entityName}}</h2>\n        <span fxFlex></span>\n        <button mat-icon-button (click)=\"cancel()\" type=\"button\">\n            <mat-icon class=\"material-icons\">close</mat-icon>\n        </button>\n    </mat-toolbar>\n    <mat-progress-bar color=\"warn\" mode=\"indeterminate\" *ngIf=\"isLoading$ | async\">\n    </mat-progress-bar>\n    <div style=\"height: 4px;\" *ngIf=\"!(isLoading$ | async)\"></div>\n    <div mat-dialog-content fxLayout=\"column\">\n        <div fxLayout=\"row\" fxLayoutGap=\"8px\" fxLayout.xs=\"column\"  fxLayoutGap.xs=\"0\">\n            <mat-form-field fxFlex class=\"mat-block\">\n                <mat-label>Email</mat-label>\n                <input matInput formControlName=\"email\" type=\"email\" required readonly=\"\">\n            </mat-form-field>\n        </div>\n        <div fxLayout=\"row\" fxLayoutGap=\"8px\" fxLayout.xs=\"column\" fxLayoutGap.xs=\"0\">\n            <mat-form-field fxFlex class=\"mat-block\">\n                <mat-label>User role</mat-label>\n                <mat-select formControlName=\"role\">\n                    <mat-option *ngFor=\"let role of roles\" [value]=\"role\">\n                        {{role}}\n                    </mat-option>\n                </mat-select>\n            </mat-form-field>\n        </div>\n        <div fxLayout=\"row\" fxLayoutGap=\"8px\" fxLayout.xs=\"column\" fxLayoutGap.xs=\"0\">\n            <mat-form-field fxFlex class=\"mat-block\">\n                <mat-label>First name</mat-label>\n                <input matInput formControlName=\"firstName\">\n            </mat-form-field>\n            <mat-form-field fxFlex class=\"mat-block\">\n                <mat-label>Last name</mat-label>\n                <input matInput formControlName=\"lastName\" >\n            </mat-form-field>\n        </div>\n        <div fxLayout=\"row\" fxLayoutGap=\"8px\" fxLayout.xs=\"column\" fxLayoutGap.xs=\"0\">\n            <mat-form-field fxFlex class=\"mat-block\">\n                <mat-label>Phone number</mat-label>\n                <input matInput formControlName=\"phoneNumber\">\n            </mat-form-field>\n        </div>\n    </div>\n    <div mat-dialog-actions fxLayout=\"row\" fxLayoutAlign=\"end center\">\n        <button mat-button color=\"primary\"\n                type=\"button\"\n                [disabled]=\"(isLoading$ | async)\"\n                (click)=\"cancel()\" cdkFocusInitial>\n            Cancel\n        </button>\n        <button mat-button mat-raised-button color=\"primary\"\n                type=\"submit\"\n                [disabled]=\"(isLoading$ | async) || editEntityForm.invalid || !editEntityForm.dirty\">\n            Save\n        </button>\n    </div>\n</form>`
    }

    function editUserJS(stateEntityParamName, relationType) {
      return `let controller = widgetContext.$scope.ctx.stateController;\nlet params = controller.getStateParams();\n\nlet needsId = null;\nlet relationType = '${relationType}'\n\nif(params['${stateEntityParamName}']){\n    needsId = params['${stateEntityParamName}']['entityId'];}\nif(!needsId){\n    needsId = {\n        id: widgetContext.currentUser.tenantId,\n        entityType: 'TENANT'\n    }\n}\n\nlet $injector = widgetContext.$scope.$injector;\nlet customDialog = $injector.get(widgetContext.servicesMap.get('customDialog'));\nlet entityRelationService = $injector.get(widgetContext.servicesMap.get('entityRelationService'));\nlet userService = $injector.get(widgetContext.servicesMap.get('userService'));\n\nopenEditEntityDialog();\n\nfunction openEditEntityDialog() {\n    customDialog.customDialog(htmlTemplate, EditEntityDialogController).subscribe();\n}\n\nfunction EditEntityDialogController(instance) {\n    let vm = instance;\n    vm.roles = ['Administrator', 'User'];\n\n    vm.entityName = entityName;\n    vm.entityType = entityId.entityType;\n    vm.attributes = {};\n    vm.entity = {};\n\n    vm.editEntityFormGroup = vm.fb.group({\n        email: ['', [vm.validators.required, vm.validators.email]],\n        firstName: [''],\n        lastName: [''],\n        phoneNumber: [''],\n        role: [{value: '', disabled: true}, [vm.validators.required]]\n    });\n    \n\n    getEntityInfo();\n\n    vm.cancel = function() {\n        vm.dialogRef.close(null);\n    };\n\n    vm.save = function() {\n        vm.editEntityFormGroup.markAsPristine();\n        const formValues = vm.editEntityFormGroup.value;\n        vm.user = {\n            id: entityId,\n            email: formValues.email,\n            firstName: formValues.firstName,\n            lastName: formValues.lastName,\n            customerId: needsId,\n            phone: formValues.phoneNumber\n        };\n        \n        if (formValues.role == 'Administrator') {\n            vm.user.authority = \"CUSTOMER_USER\"\n        } else {\n            vm.user.authority = \"CUSTOMER_USER\"\n        }\n        \n        userService.saveUser(vm.user, false).subscribe(user => {\n            widgetContext.updateAliases();\n            vm.dialogRef.close(null);\n        })\n    };\n\n    function getEntityInfo() {\n        userService.getUserInfo(entityId.id).subscribe(data => {\n            console.log('DATA', data);\n            vm.entity = data;\n            let role = vm.entity.groups[0].name === \"Customer Administrators\"? 'Administrator' : 'User';\n            vm.editEntityFormGroup.patchValue({\n                    email: vm.entity.email,\n                    firstName: vm.entity.firstName,\n                    lastName: vm.entity.lastName,\n                    phoneNumber: vm.entity.phone,\n                    role: role\n                }, {emitEvent: false});\n        })\n        \n    }\n}`
    }

    function addDeviceJs(stateEntityParamName, relationType, attributes) {
      return `let customAttributes = ${JSON.stringify(attributes)}\nlet controller = widgetContext.$scope.ctx.stateController;\nlet params = controller.getStateParams();\n\nlet needsId = null;\nlet relationType = '${relationType}'\n\nif(params['${stateEntityParamName}']){\n    needsId = params['${stateEntityParamName}']['entityId'];\n}\nif(!needsId){\n    needsId = {\n        id: widgetContext.currentUser.tenantId,\n        entityType: 'TENANT'\n    }\n}\n\nlet $injector = widgetContext.$scope.$injector;\nlet customDialog = $injector.get(widgetContext.servicesMap.get('customDialog'));\nlet entityGroupService = $injector.get(widgetContext.servicesMap.get('entityGroupService'));\nlet deviceService = $injector.get(widgetContext.servicesMap.get('deviceService'));\nlet attributeService = $injector.get(widgetContext.servicesMap.get('attributeService'));\nlet entityRelationService = $injector.get(widgetContext.servicesMap.get('entityRelationService'));\n\nopenAddEntityDialog();\n\nfunction openAddEntityDialog() {\n    customDialog.customDialog(htmlTemplate, AddEntityDialogController).subscribe();\n}\n\nfunction AddEntityDialogController(instance) {\n    let vm = instance;\n\n    vm.customAttributes = customAttributes;\n\n    vm.addEntityFormGroup = vm.fb.group({\n        entityName: ['', [vm.validators.required]],\n        entityType: ['DEVICE'],\n        entityLabel: [null],\n        type: ['', [vm.validators.required]],\n        attributes: vm.fb.group({})\n    });\n    \n    if(customAttributes && customAttributes.length > 0){\n        customAttributes.forEach(x=>{\n            vm.addEntityFormGroup.controls.attributes.addControl(x.name, vm.fb.control({ disabled: false, value: null }, []));\n        })\n    }\n\n    vm.cancel = function() {\n        vm.dialogRef.close(null);\n    };\n\n    vm.save = function() {\n        vm.addEntityFormGroup.markAsPristine();\n        saveEntityObservable().subscribe(\n            function (entity) {\n                widgetContext.rxjs.forkJoin([\n                    saveAttributes(entity.id),\n                ]).subscribe(\n                    function () {\n                        if(needsId && relationType){\n                            entityRelationService.saveRelation({\n                                from: needsId,\n                                to: entity.id,\n                                type: relationType,\n                                typeGroup: 'COMMON'\n                            }).subscribe(()=>{\n                                if(needsId.entityType == 'CUSTOMER' || needsId.entityType == 'TENANT'){\n                                    entityGroupService.changeEntityOwner(needsId, entity.id).subscribe(()=>{\n                                        widgetContext.updateAliases();\n                                        vm.dialogRef.close(null);\n                                    })\n                                } else {\n                                    widgetContext.updateAliases();\n                                    vm.dialogRef.close(null);\n                                }\n                            }); \n                        } else {\n                            entityRelationService.saveRelation({\n                                from: needsId,\n                                to: entity.id,\n                                type: relationType,\n                                typeGroup: 'COMMON'\n                            }).subscribe(()=>{\n                                widgetContext.updateAliases();\n                                vm.dialogRef.close(null);\n                            });\n                        }\n                    }\n                );\n            }\n        );\n    };\n\n    function saveEntityObservable() {\n        const formValues = vm.addEntityFormGroup.value;\n        let entity = {\n            name: formValues.entityName,\n            type: formValues.type,\n            label: formValues.entityLabel\n        };\n        return deviceService.saveDevice(entity);\n    }\n\n    function saveAttributes(entityId) {\n        let attributes = vm.addEntityFormGroup.get('attributes').value;\n        let attributesArray = [];\n        for (let key in attributes) {\n            if(attributes[key] !== null) {\n                attributesArray.push({key: key, value: attributes[key]});\n            }\n        }\n        if (attributesArray.length > 0) {\n            return attributeService.saveEntityAttributes(entityId, \"SERVER_SCOPE\", attributesArray);\n        }\n        return widgetContext.rxjs.of([]);\n    }\n}\n`;
    }

    function addDeviceHTML() {
      return `<form #addEntityForm=\"ngForm\" [formGroup]=\"addEntityFormGroup\"\n      (ngSubmit)=\"save()\" class=\"add-entity-form\">\n    <mat-toolbar fxLayout=\"row\" color=\"primary\">\n        <h2>Add entity</h2>\n        <span fxFlex></span>\n        <button mat-icon-button (click)=\"cancel()\" type=\"button\">\n            <mat-icon class=\"material-icons\">close</mat-icon>\n        </button>\n    </mat-toolbar>\n    <mat-progress-bar color=\"warn\" mode=\"indeterminate\" *ngIf=\"isLoading$ | async\">\n    </mat-progress-bar>\n    <div style=\"height: 4px;\" *ngIf=\"!(isLoading$ | async)\"></div>\n    <div mat-dialog-content fxLayout=\"column\">\n        <div fxLayout=\"row\" fxLayoutGap=\"8px\" fxLayout.xs=\"column\"  fxLayoutGap.xs=\"0\">\n            <mat-form-field fxFlex class=\"mat-block\">\n                <mat-label>Entity Name</mat-label>\n                <input matInput formControlName=\"entityName\" required>\n            </mat-form-field>\n            <mat-form-field fxFlex class=\"mat-block\">\n                <mat-label>Entity Label</mat-label>\n                <input matInput formControlName=\"entityLabel\" >\n            </mat-form-field>\n        </div>\n        <div fxLayout=\"row\" fxLayoutGap=\"8px\" fxLayout.xs=\"column\"  fxLayoutGap.xs=\"0\">\n            <tb-entity-subtype-autocomplete\n                    fxFlex\n                    class=\"mat-block\"\n                    formControlName=\"type\"\n                    [required]=\"true\"\n                    [entityType]=\"'DEVICE'\"\n            ></tb-entity-subtype-autocomplete>\n        </div>\n        <div formGroupName=\"attributes\" fxLayout=\"column\">\n            <div *ngFor=\"let attr of customAttributes\" fxLayout=\"row\" fxLayoutGap=\"8px\" fxLayout.xs=\"column\"  fxLayoutGap.xs=\"0\">\n                <mat-form-field *ngIf=\"attr.isEnum\" fxFlex class=\"mat-block\">\n                    <mat-label>{{attr.name}}</mat-label>\n                    <mat-select formControlName=\"{{attr.name}}\">\n                        <mat-option *ngFor=\"let option of attr.enumOptions\" [value]=\"option\">\n                            {{option}}\n                        </mat-option>\n                    </mat-select>\n                </mat-form-field>\n                <mat-form-field *ngIf=\"attr.type == 'INTEGER' && !attr.isEnum\" fxFlex class=\"mat-block\">\n                    <mat-label>{{attr.name}}</mat-label>\n                    <input type=\"number\" step=\"1\" matInput formControlName=\"{{attr.name}}\">\n                </mat-form-field>\n                <mat-form-field *ngIf=\"attr.type == 'STRING' && !attr.isEnum\" fxFlex class=\"mat-block\">\n                    <mat-label>{{attr.name}}</mat-label>\n                    <input matInput formControlName=\"{{attr.name}}\">\n                </mat-form-field>\n                <mat-checkbox *ngIf=\"attr.type == 'BOOLEAN' && !attr.isEnum\" class=\"example-margin\" color=\"primary\" formControlName=\"{{attr.name}}\">{{attr.name}}</mat-checkbox>\n                <fieldset *ngIf=\"attr.type == 'IMAGE'\" [disabled]=\"(isLoading$ | async) || loading\" appearance=\"outline\">\n                    <tb-image-input \n                        formControlName=\"{{attr.name}}\"\n                        [showPreview]=\"true\"\n                        [showClearButton]=\"true\">\n                    </tb-image-input>\n                </fieldset>  \n            </div>\n        </div>\n    </div>\n    <div mat-dialog-actions fxLayout=\"row\" fxLayoutAlign=\"end center\">\n        <button mat-button color=\"primary\"\n                type=\"button\"\n                [disabled]=\"(isLoading$ | async)\"\n                (click)=\"cancel()\" cdkFocusInitial>\n            Cancel\n        </button>\n        <button mat-button mat-raised-button color=\"primary\"\n                type=\"submit\"\n                [disabled]=\"(isLoading$ | async) || addEntityForm.invalid || !addEntityForm.dirty\">\n            Create\n        </button>\n    </div>\n</form>\n`;
    }

    function editDeviceJs(stateEntityParamName, relationType, attributes) {
      return `let customAttributes = ${JSON.stringify(attributes)}\nlet controller = widgetContext.$scope.ctx.stateController;\nlet params = controller.getStateParams();\n\nlet needsId = null;\nlet relationType = '${relationType}'\n\nif(params['${stateEntityParamName}']){\n    needsId = params['${stateEntityParamName}']['entityId'];}\nif(!needsId){\n    needsId = {\n        id: widgetContext.currentUser.tenantId,\n        entityType: 'TENANT'\n    }\n}\n\nlet $injector = widgetContext.$scope.$injector;\nlet customDialog = $injector.get(widgetContext.servicesMap.get('customDialog'));\nlet entityService = $injector.get(widgetContext.servicesMap.get('entityService'));\nlet assetService = $injector.get(widgetContext.servicesMap.get('assetService'));\nlet entityGroupService = $injector.get(widgetContext.servicesMap.get('entityGroupService'));\nlet deviceService = $injector.get(widgetContext.servicesMap.get('deviceService'));\nlet attributeService = $injector.get(widgetContext.servicesMap.get('attributeService'));\nlet entityRelationService = $injector.get(widgetContext.servicesMap.get('entityRelationService'));\n\nopenEditEntityDialog();\n\nfunction openEditEntityDialog() {\n    customDialog.customDialog(htmlTemplate, EditEntityDialogController).subscribe();\n}\n\nfunction EditEntityDialogController(instance) {\n    let vm = instance;\n\n    vm.customAttributes = customAttributes;\n    vm.entityName = entityName;\n    vm.entityType = entityId.entityType;\n    vm.attributes = {};\n    vm.entity = {};\n\n    vm.editEntityFormGroup = vm.fb.group({\n        entityName: ['', [vm.validators.required]],\n        entityType: [null],\n        entityLabel: [null],\n        type: ['', [vm.validators.required]],\n        attributes: vm.fb.group({})\n    });\n    \n    if(customAttributes && customAttributes.length > 0){\n        customAttributes.forEach(x=>{\n            vm.editEntityFormGroup.controls.attributes.addControl(x.name, vm.fb.control({ disabled: false, value: null }, []));\n        })\n    }\n\n    getEntityInfo();\n\n    vm.cancel = function() {\n        vm.dialogRef.close(null);\n    };\n\n    vm.save = function() {\n        vm.editEntityFormGroup.markAsPristine();\n        widgetContext.rxjs.forkJoin([\n            saveAttributes(entityId),\n            saveEntity()\n        ]).subscribe(\n            function () {\n                entityRelationService.saveRelation({\n                    from: needsId,\n                    to: entityId,\n                    type: relationType,\n                    typeGroup: 'COMMON'\n                }).subscribe(()=>{\n                    widgetContext.updateAliases();\n                    vm.dialogRef.close(null);\n                });\n            }\n        );\n    };\n\n    function getEntityAttributes(attributes) {\n        for (var i = 0; i < attributes.length; i++) {\n            vm.attributes[attributes[i].key] = attributes[i].value;\n        }\n    }\n\n    function getEntityInfo() {\n        widgetContext.rxjs.forkJoin([\n            attributeService.getEntityAttributes(entityId, 'SERVER_SCOPE'),\n            entityService.getEntity(entityId.entityType, entityId.id)\n        ]).subscribe(\n            function (data) {\n                getEntityAttributes(data[0]);\n                vm.entity = data[1];\n                vm.editEntityFormGroup.patchValue({\n                    entityName: vm.entity.name,\n                    entityType: vm.entityType,\n                    entityLabel: vm.entity.label,\n                    type: vm.entity.type,\n                    attributes: vm.attributes,\n                }, {emitEvent: false});\n            }\n        );\n    }\n\n    function saveEntity() {\n        const formValues = vm.editEntityFormGroup.value;\n        if (vm.entity.label !== formValues.entityLabel){\n            vm.entity.label = formValues.entityLabel;\n            if (formValues.entityType == 'ASSET') {\n                return assetService.saveAsset(vm.entity);\n            } else if (formValues.entityType == 'DEVICE') {\n                return deviceService.saveDevice(vm.entity);\n            }\n        }\n        return widgetContext.rxjs.of([]);\n    }\n\n    function saveAttributes(entityId) {\n        let attributes = vm.editEntityFormGroup.get('attributes').value;\n        let attributesArray = [];\n        for (let key in attributes) {\n            if (attributes[key] !== vm.attributes[key]) {\n                attributesArray.push({key: key, value: attributes[key]});\n            }\n        }\n        if (attributesArray.length > 0) {\n            return attributeService.saveEntityAttributes(entityId, \"SERVER_SCOPE\", attributesArray);\n        }\n        return widgetContext.rxjs.of([]);\n    }\n}`;
    }

    function editDeviceHTML() {
      return `<form #editEntityForm=\"ngForm\" [formGroup]=\"editEntityFormGroup\"\n      (ngSubmit)=\"save()\"  class=\"edit-entity-form\">\n    <mat-toolbar fxLayout=\"row\" color=\"primary\">\n        <h2>Edit {{entityType.toLowerCase()}} {{entityName}}</h2>\n        <span fxFlex></span>\n        <button mat-icon-button (click)=\"cancel()\" type=\"button\">\n            <mat-icon class=\"material-icons\">close</mat-icon>\n        </button>\n    </mat-toolbar>\n    <mat-progress-bar color=\"warn\" mode=\"indeterminate\" *ngIf=\"isLoading$ | async\">\n    </mat-progress-bar>\n    <div style=\"height: 4px;\" *ngIf=\"!(isLoading$ | async)\"></div>\n    <div mat-dialog-content fxLayout=\"column\">\n        <div fxLayout=\"row\" fxLayoutGap=\"8px\" fxLayout.xs=\"column\"  fxLayoutGap.xs=\"0\">\n            <mat-form-field fxFlex class=\"mat-block\">\n                <mat-label>Entity Name</mat-label>\n                <input matInput formControlName=\"entityName\" required readonly=\"\">\n            </mat-form-field>\n            <mat-form-field fxFlex class=\"mat-block\">\n                <mat-label>Entity Label</mat-label>\n                <input matInput formControlName=\"entityLabel\">\n            </mat-form-field>\n        </div>\n        <div fxLayout=\"row\" fxLayoutGap=\"8px\" fxLayout.xs=\"column\"  fxLayoutGap.xs=\"0\">\n            <mat-form-field fxFlex class=\"mat-block\">\n                <mat-label>Entity Type</mat-label>\n                <input matInput formControlName=\"entityType\" readonly>\n            </mat-form-field>\n            <mat-form-field fxFlex class=\"mat-block\">\n                <mat-label>Type</mat-label>\n                <input matInput formControlName=\"type\" readonly>\n            </mat-form-field>\n        </div>\n        <div formGroupName=\"attributes\" fxLayout=\"column\">\n            <div *ngFor=\"let attr of customAttributes\" fxLayout=\"row\" fxLayoutGap=\"8px\" fxLayout.xs=\"column\"  fxLayoutGap.xs=\"0\">\n  <mat-form-field *ngIf=\"attr.isEnum\" fxFlex class=\"mat-block\">\n <mat-label>{{attr.name}}</mat-label>\n <mat-select formControlName=\"{{attr.name}}\">\n <mat-option *ngFor=\"let option of attr.enumOptions\" [value]=\"option\">\n {{option}}\n </mat-option>\n </mat-select>\n </mat-form-field>\n        <mat-form-field *ngIf=\"attr.type == 'INTEGER' && !attr.isEnum\" fxFlex class=\"mat-block\">\n                    <mat-label>{{attr.name}}</mat-label>\n                    <input type=\"number\" step=\"1\" matInput formControlName=\"{{attr.name}}\">\n                </mat-form-field>\n                <mat-form-field *ngIf=\"attr.type == 'STRING' && !attr.isEnum\" fxFlex class=\"mat-block\">\n                    <mat-label>{{attr.name}}</mat-label>\n                    <input matInput formControlName=\"{{attr.name}}\">\n                </mat-form-field>\n                <mat-checkbox *ngIf=\"attr.type == 'BOOLEAN' && !attr.isEnum\" class=\"example-margin\" color=\"primary\" formControlName=\"{{attr.name}}\">{{attr.name}}</mat-checkbox>\n                <fieldset *ngIf=\"attr.type == 'IMAGE'\" [disabled]=\"(isLoading$ | async) || loading\" appearance=\"outline\">\n                    <tb-image-input \n                        formControlName=\"{{attr.name}}\"\n                        [showPreview]=\"true\"\n                        [showClearButton]=\"true\">\n                    </tb-image-input>\n                </fieldset>  \n            </div>\n        </div>\n    </div>\n    <div mat-dialog-actions fxLayout=\"row\" fxLayoutAlign=\"end center\">\n        <button mat-button color=\"primary\"\n                type=\"button\"\n                [disabled]=\"(isLoading$ | async)\"\n                (click)=\"cancel()\" cdkFocusInitial>\n            Cancel\n        </button>\n        <button mat-button mat-raised-button color=\"primary\"\n                type=\"submit\"\n                [disabled]=\"(isLoading$ | async) || editEntityForm.invalid || !editEntityForm.dirty\">\n            Save\n        </button>\n    </div>\n</form>`;
    }

    function addAssetHTML(){
      return `<form #addEntityForm=\"ngForm\" [formGroup]=\"addEntityFormGroup\"\n      (ngSubmit)=\"save()\" class=\"add-entity-form\">\n    <mat-toolbar fxLayout=\"row\" color=\"primary\">\n        <h2>Add Asset</h2>\n        <span fxFlex></span>\n        <button mat-icon-button (click)=\"cancel()\" type=\"button\">\n            <mat-icon class=\"material-icons\">close</mat-icon>\n        </button>\n    </mat-toolbar>\n    <mat-progress-bar color=\"warn\" mode=\"indeterminate\" *ngIf=\"isLoading$ | async\">\n    </mat-progress-bar>\n    <div style=\"height: 4px;\" *ngIf=\"!(isLoading$ | async)\"></div>\n    <div mat-dialog-content fxLayout=\"column\">\n        <div fxLayout=\"row\" fxLayoutGap=\"8px\" fxLayout.xs=\"column\"  fxLayoutGap.xs=\"0\">\n            <mat-form-field fxFlex class=\"mat-block\">\n                <mat-label>Entity Name</mat-label>\n                <input matInput formControlName=\"entityName\" required>\n            </mat-form-field>\n            <mat-form-field fxFlex class=\"mat-block\">\n                <mat-label>Entity Label</mat-label>\n                <input matInput formControlName=\"entityLabel\" >\n            </mat-form-field>\n        </div>\n        <div fxLayout=\"row\" fxLayoutGap=\"8px\" fxLayout.xs=\"column\"  fxLayoutGap.xs=\"0\">\n            <tb-entity-subtype-autocomplete\n                    fxFlex\n                    class=\"mat-block\"\n                    formControlName=\"type\"\n                    [required]=\"true\"\n                    [entityType]=\"'ASSET'\"\n            ></tb-entity-subtype-autocomplete>\n        </div>\n        <div formGroupName=\"attributes\" fxLayout=\"column\">\n            <div *ngFor=\"let attr of customAttributes\" fxLayout=\"row\" fxLayoutGap=\"8px\" fxLayout.xs=\"column\"  fxLayoutGap.xs=\"0\">\n                <mat-form-field *ngIf=\"attr.isEnum\" fxFlex class=\"mat-block\">\n                    <mat-label>{{attr.name}}</mat-label>\n                    <mat-select formControlName=\"{{attr.name}}\">\n                        <mat-option *ngFor=\"let option of attr.enumOptions\" [value]=\"option\">\n                            {{option}}\n                        </mat-option>\n                    </mat-select>\n                </mat-form-field>\n                <mat-form-field *ngIf=\"attr.type == 'INTEGER' && !attr.isEnum\" fxFlex class=\"mat-block\">\n                    <mat-label>{{attr.name}}</mat-label>\n                    <input type=\"number\" step=\"1\" matInput formControlName=\"{{attr.name}}\">\n                </mat-form-field>\n                <mat-form-field *ngIf=\"attr.type == 'STRING' && !attr.isEnum\" fxFlex class=\"mat-block\">\n                    <mat-label>{{attr.name}}</mat-label>\n                    <input matInput formControlName=\"{{attr.name}}\">\n                </mat-form-field>\n                <mat-checkbox *ngIf=\"attr.type == 'BOOLEAN' && !attr.isEnum\" class=\"example-margin\" color=\"primary\" formControlName=\"{{attr.name}}\">{{attr.name}}</mat-checkbox>\n                <fieldset *ngIf=\"attr.type == 'IMAGE'\" [disabled]=\"(isLoading$ | async) || loading\" appearance=\"outline\">\n                    <tb-image-input \n                        formControlName=\"{{attr.name}}\"\n                        [showPreview]=\"true\"\n                        [showClearButton]=\"true\">\n                    </tb-image-input>\n                </fieldset>         \n            </div>\n        </div>\n    </div>\n    <div mat-dialog-actions fxLayout=\"row\" fxLayoutAlign=\"end center\">\n        <button mat-button color=\"primary\"\n                type=\"button\"\n                [disabled]=\"(isLoading$ | async)\"\n                (click)=\"cancel()\" cdkFocusInitial>\n            Cancel\n        </button>\n        <button mat-button mat-raised-button color=\"primary\"\n                type=\"submit\"\n                [disabled]=\"(isLoading$ | async) || addEntityForm.invalid || !addEntityForm.dirty\">\n            Create\n        </button>\n    </div>\n</form>\n`;
    }

    function addAssetJs(stateEntityParamName, relationType, attributes){
      return `let customAttributes = ${JSON.stringify(attributes)}\nlet controller = widgetContext.$scope.ctx.stateController;\nlet params = controller.getStateParams();\n\nlet needsId = null;\nlet relationType = '${relationType}'\n\nif(params['${stateEntityParamName}']){\n    needsId = params['${stateEntityParamName}']['entityId'];}\nif(params['selectedCompany']){\n    needsId = params['selectedCompany']['entityId'];\n}\n\nlet $injector = widgetContext.$scope.$injector;\nlet customDialog = $injector.get(widgetContext.servicesMap.get('customDialog'));\nlet entityGroupService = $injector.get(widgetContext.servicesMap.get('entityGroupService'));\nlet assetService = $injector.get(widgetContext.servicesMap.get('assetService'));\nlet attributeService = $injector.get(widgetContext.servicesMap.get('attributeService'));\nlet entityRelationService = $injector.get(widgetContext.servicesMap.get('entityRelationService'));\n\nopenAddEntityDialog();\n\nfunction openAddEntityDialog() {\n    customDialog.customDialog(htmlTemplate, AddEntityDialogController).subscribe();\n}\n\nfunction AddEntityDialogController(instance) {\n    let vm = instance;\n\n    vm.customAttributes = customAttributes;\n\n    vm.addEntityFormGroup = vm.fb.group({\n        entityName: ['', [vm.validators.required]],\n        entityType: ['ASSET'],\n        entityLabel: [null],\n        type: ['', [vm.validators.required]],\n        attributes: vm.fb.group({})\n    });\n    \n    if(customAttributes && customAttributes.length > 0){\n        customAttributes.forEach(x=>{\n            vm.addEntityFormGroup.controls.attributes.addControl(x.name, vm.fb.control({ disabled: false, value: null }, []));\n        })\n    }\n\n    vm.cancel = function() {\n        vm.dialogRef.close(null);\n    };\n\n    vm.save = function() {\n        vm.addEntityFormGroup.markAsPristine();\n        saveEntityObservable().subscribe(\n            function (entity) {\n                widgetContext.rxjs.forkJoin([\n                    saveAttributes(entity.id),\n                ]).subscribe(\n                    function () {\n                        if(needsId && relationType){\n                            entityRelationService.saveRelation({\n                                from: needsId,\n                                to: entity.id,\n                                type: relationType,\n                                typeGroup: 'COMMON'\n                            }).subscribe(()=>{\n                                if(needsId.entityType == 'CUSTOMER' || needsId.entityType == 'TENANT'){\n                                    entityGroupService.changeEntityOwner(needsId, entity.id).subscribe(()=>{\n                                        widgetContext.updateAliases();\n                                        vm.dialogRef.close(null);\n                                    })\n                                }\n                            }); \n                        } else {\n                            entityRelationService.saveRelation({\n                                from: {\n                                    id: widgetContext.currentUser.tenantId,\n                                    entityType: 'TENANT'\n                                },\n                                to: entity.id,\n                                type: relationType,\n                                typeGroup: 'COMMON'\n                            }).subscribe(()=>{\n                                widgetContext.updateAliases();\n                                vm.dialogRef.close(null);\n                            });\n                        }\n                    }\n                );\n            }\n        );\n    };\n\n    function saveEntityObservable() {\n        const formValues = vm.addEntityFormGroup.value;\n        let entity = {\n            name: formValues.entityName,\n            type: formValues.type,\n            label: formValues.entityLabel\n        };\n        \n        return assetService.saveAsset(entity);\n    }\n\n    function saveAttributes(entityId) {\n        let attributes = vm.addEntityFormGroup.get('attributes').value;\n        let attributesArray = [];\n        for (let key in attributes) {\n            if(attributes[key] !== null) {\n                attributesArray.push({key: key, value: attributes[key]});\n            }\n        }\n        if (attributesArray.length > 0) {\n            return attributeService.saveEntityAttributes(entityId, \"SERVER_SCOPE\", attributesArray);\n        }\n        return widgetContext.rxjs.of([]);\n    }\n}\n`;
    }

    function editAssetJs(stateEntityParamName, relationType, attributes) {
      return `let customAttributes = ${JSON.stringify(attributes)}\nlet controller = widgetContext.$scope.ctx.stateController;\nlet params = controller.getStateParams();\n\nlet needsId = null;\nlet relationType = '${relationType}'\n\nif(params['${stateEntityParamName}']){\n    needsId = params['${stateEntityParamName}']['entityId'];}\nif(!needsId){\n    needsId = {\n        id: widgetContext.currentUser.tenantId,\n        entityType: 'TENANT'\n    }\n}\n\nlet $injector = widgetContext.$scope.$injector;\nlet customDialog = $injector.get(widgetContext.servicesMap.get('customDialog'));\nlet entityService = $injector.get(widgetContext.servicesMap.get('entityService'));\nlet assetService = $injector.get(widgetContext.servicesMap.get('assetService'));\nlet attributeService = $injector.get(widgetContext.servicesMap.get('attributeService'));\nlet entityRelationService = $injector.get(widgetContext.servicesMap.get('entityRelationService'));\n\nopenEditEntityDialog();\n\nfunction openEditEntityDialog() {\n    customDialog.customDialog(htmlTemplate, EditEntityDialogController).subscribe();\n}\n\nfunction EditEntityDialogController(instance) {\n    let vm = instance;\n\n    vm.customAttributes = customAttributes;\n    vm.entityName = entityName;\n    vm.entityType = entityId.entityType;\n    vm.attributes = {};\n    vm.entity = {};\n\n    vm.editEntityFormGroup = vm.fb.group({\n        entityName: ['', [vm.validators.required]],\n        entityType: [null],\n        entityLabel: [null],\n        type: ['', [vm.validators.required]],\n        attributes: vm.fb.group({})\n    });\n    \n    if(customAttributes && customAttributes.length > 0){\n        customAttributes.forEach(x=>{\n            vm.editEntityFormGroup.controls.attributes.addControl(x.name, vm.fb.control({ disabled: false, value: null }, []));\n        })\n    }\n\n    getEntityInfo();\n\n    vm.cancel = function() {\n        vm.dialogRef.close(null);\n    };\n\n    vm.save = function() {\n        vm.editEntityFormGroup.markAsPristine();\n        widgetContext.rxjs.forkJoin([\n            saveAttributes(entityId),\n            saveEntity()\n        ]).subscribe(\n            function () {\n                entityRelationService.saveRelation({\n                    from: needsId,\n                    to: entityId,\n                    type: relationType,\n                    typeGroup: 'COMMON'\n                }).subscribe(()=>{\n                    widgetContext.updateAliases();\n                    vm.dialogRef.close(null);\n                });\n            }\n        );\n    };\n\n    function getEntityAttributes(attributes) {\n        for (var i = 0; i < attributes.length; i++) {\n            vm.attributes[attributes[i].key] = attributes[i].value;\n        }\n    }\n\n    function getEntityInfo() {\n        widgetContext.rxjs.forkJoin([\n            attributeService.getEntityAttributes(entityId, 'SERVER_SCOPE'),\n            entityService.getEntity(entityId.entityType, entityId.id)\n        ]).subscribe(\n            function (data) {\n                getEntityAttributes(data[0]);\n                vm.entity = data[1];\n                vm.editEntityFormGroup.patchValue({\n                    entityName: vm.entity.name,\n                    entityType: vm.entityType,\n                    entityLabel: vm.entity.label,\n                    type: vm.entity.type,\n                    attributes: vm.attributes,\n                }, {emitEvent: false});\n            }\n        );\n    }\n\n    function saveEntity() {\n        const formValues = vm.editEntityFormGroup.value;\n        if (vm.entity.label !== formValues.entityLabel){\n            vm.entity.label = formValues.entityLabel;\n            return assetService.saveAsset(vm.entity);\n        }\n        return widgetContext.rxjs.of([]);\n    }\n\n    function saveAttributes(entityId) {\n        let attributes = vm.editEntityFormGroup.get('attributes').value;\n        let attributesArray = [];\n        for (let key in attributes) {\n            if (attributes[key] !== vm.attributes[key]) {\n                attributesArray.push({key: key, value: attributes[key]});\n            }\n        }\n        if (attributesArray.length > 0) {\n            return attributeService.saveEntityAttributes(entityId, \"SERVER_SCOPE\", attributesArray);\n        }\n        return widgetContext.rxjs.of([]);\n    }\n}`;
    }

    function editAssetHTML() {
      return `<form #editEntityForm=\"ngForm\" [formGroup]=\"editEntityFormGroup\"\n      (ngSubmit)=\"save()\"  class=\"edit-entity-form\">\n    <mat-toolbar fxLayout=\"row\" color=\"primary\">\n        <h2>Edit {{entityType.toLowerCase()}} {{entityName}}</h2>\n        <span fxFlex></span>\n        <button mat-icon-button (click)=\"cancel()\" type=\"button\">\n            <mat-icon class=\"material-icons\">close</mat-icon>\n        </button>\n    </mat-toolbar>\n    <mat-progress-bar color=\"warn\" mode=\"indeterminate\" *ngIf=\"isLoading$ | async\">\n    </mat-progress-bar>\n    <div style=\"height: 4px;\" *ngIf=\"!(isLoading$ | async)\"></div>\n    <div mat-dialog-content fxLayout=\"column\">\n        <div fxLayout=\"row\" fxLayoutGap=\"8px\" fxLayout.xs=\"column\"  fxLayoutGap.xs=\"0\">\n            <mat-form-field fxFlex class=\"mat-block\">\n                <mat-label>Entity Name</mat-label>\n                <input matInput formControlName=\"entityName\" required readonly=\"\">\n            </mat-form-field>\n            <mat-form-field fxFlex class=\"mat-block\">\n                <mat-label>Entity Label</mat-label>\n                <input matInput formControlName=\"entityLabel\">\n            </mat-form-field>\n        </div>\n        <div formGroupName=\"attributes\" fxLayout=\"column\">\n            <div *ngFor=\"let attr of customAttributes\" fxLayout=\"row\" fxLayoutGap=\"8px\" fxLayout.xs=\"column\"  fxLayoutGap.xs=\"0\">\n                <mat-form-field *ngIf=\"attr.isEnum\" fxFlex class=\"mat-block\">\n                    <mat-label>{{attr.name}}</mat-label>\n                    <mat-select formControlName=\"{{attr.name}}\">\n                        <mat-option *ngFor=\"let option of attr.enumOptions\" [value]=\"option\">\n                            {{option}}\n                        </mat-option>\n                    </mat-select>\n                </mat-form-field>\n                <mat-form-field *ngIf=\"attr.type == 'INTEGER' && !attr.isEnum\" fxFlex class=\"mat-block\">\n                    <mat-label>{{attr.name}}</mat-label>\n                    <input type=\"number\" step=\"1\" matInput formControlName=\"{{attr.name}}\">\n                </mat-form-field>\n                <mat-form-field *ngIf=\"attr.type == 'STRING' && !attr.isEnum\" fxFlex class=\"mat-block\">\n                    <mat-label>{{attr.name}}</mat-label>\n                    <input matInput formControlName=\"{{attr.name}}\">\n                </mat-form-field>\n                <mat-checkbox *ngIf=\"attr.type == 'BOOLEAN' && !attr.isEnum\" class=\"example-margin\" color=\"primary\" formControlName=\"{{attr.name}}\">{{attr.name}}</mat-checkbox>\n                <fieldset *ngIf=\"attr.type == 'IMAGE'\" [disabled]=\"(isLoading$ | async) || loading\" appearance=\"outline\">\n                    <tb-image-input \n                        formControlName=\"{{attr.name}}\"\n                        [showPreview]=\"true\"\n                        [showClearButton]=\"true\">\n                    </tb-image-input>\n                </fieldset> \n            </div>\n        </div>\n    </div>\n    <div mat-dialog-actions fxLayout=\"row\" fxLayoutAlign=\"end center\">\n        <button mat-button color=\"primary\"\n                type=\"button\"\n                [disabled]=\"(isLoading$ | async)\"\n                (click)=\"cancel()\" cdkFocusInitial>\n            Cancel\n        </button>\n        <button mat-button mat-raised-button color=\"primary\"\n                type=\"submit\"\n                [disabled]=\"(isLoading$ | async) || editEntityForm.invalid || !editEntityForm.dirty\">\n            Save\n        </button>\n    </div>\n</form>`;
    }

    function addCustomerJs(stateEntityParamName, relationType, attributes) {
      return `let customAttributes = ${JSON.stringify(attributes)}\nlet controller = widgetContext.$scope.ctx.stateController;\nlet params = controller.getStateParams();\n\nlet needsId = null;\nlet relationType = '${relationType}'\nlet dashboardId = controller.dashboardIdValue; \nif(params['${stateEntityParamName}']){\n    needsId = params['${stateEntityParamName}']['entityId'];\n}\n\nlet $injector = widgetContext.$scope.$injector;\nlet customDialog = $injector.get(widgetContext.servicesMap.get('customDialog'));\nlet entityGroupService = $injector.get(widgetContext.servicesMap.get('entityGroupService'));\nlet customerService = $injector.get(widgetContext.servicesMap.get('customerService'));\nlet attributeService = $injector.get(widgetContext.servicesMap.get('attributeService'));\nlet entityRelationService = $injector.get(widgetContext.servicesMap.get('entityRelationService'));\n\nopenAddEntityDialog();\n\nfunction openAddEntityDialog() {\n    customDialog.customDialog(htmlTemplate, AddEntityDialogController).subscribe();\n}\n\nfunction AddEntityDialogController(instance) {\n    let vm = instance;\n\n let dashboardGroupId;\n    \n    entityGroupService.getEntityGroupIdsForEntityId('DASHBOARD', dashboardId).subscribe(res => {\n        if(res.length) {\n            dashboardGroupId = res[res.length - 1].id;\n            console.log('dashboardGroupId', dashboardGroupId)\n        }\n    })\n\n     vm.customAttributes = customAttributes;
      vm.allowedEntityTypes = ['ASSET', 'DEVICE'];\n\n    vm.addEntityFormGroup = vm.fb.group({\n        title: [null, [vm.validators.required]],\n        additionalInfo: vm.fb.group({\n            userName: [null],\n            email: [null],\n            phone: [null, [vm.validators.pattern(/^-?[0-9]+$/)]],\n        }),\n        attributes: vm.fb.group({})\n    });\n    \n    if(customAttributes && customAttributes.length > 0){\n        customAttributes.forEach(x=>{\n            vm.addEntityFormGroup.controls.attributes.addControl(x.name, vm.fb.control({ disabled: false, value: null }, []));\n        })\n    }\n\n    vm.cancel = function() {\n        vm.dialogRef.close(null);\n    };\n\n    vm.save = function() {\n        vm.addEntityFormGroup.markAsPristine();\n        \n        saveEntityObservable().subscribe(\n            function (entity) {\n                widgetContext.rxjs.forkJoin([\n                    saveAttributes(entity.id),\n                ]).subscribe(\n                    function () {\n  if(entity.id.entityType === 'CUSTOMER') {\n                            entityGroupService.getEntityGroupsByOwnerId(entity.id.entityType, entity.id.id, 'USER').subscribe(groups => {\n                                let customerAdministrators = groups.find(x=>x.name==\"Customer Administrators\");\n                                let customerUsers = groups.find(x=>x.name==\"Customer Users\");\n                     entityGroupService.shareEntityGroup(dashboardGroupId, {\n                                    ownerId: entity.id,\n                                    allUserGroup: true,\n                                    readElseWrite: true\n                                }).subscribe()\n                            })\n                        }\n                       if(needsId && relationType){\n                            entityRelationService.saveRelation({\n                                from: needsId,\n                                to: entity.id,\n                                type: relationType,\n                                typeGroup: 'COMMON'\n                            }).subscribe(()=>{\n                                if(needsId.entityType == 'CUSTOMER' || needsId.entityType == 'TENANT'){\n                                    entityGroupService.changeEntityOwner(needsId, entity.id).subscribe(()=>{\n                                        widgetContext.updateAliases();\n                                        vm.dialogRef.close(null);\n                                    })\n                                }\n                            }); \n                        } else {\n                            entityRelationService.saveRelation({\n                                from: {\n                                    id: widgetContext.currentUser.tenantId,\n                                    entityType: 'TENANT'\n                                },\n                                to: entity.id,\n                                type: relationType,\n                                typeGroup: 'COMMON'\n                            }).subscribe(()=>{\n                                widgetContext.updateAliases();\n                                vm.dialogRef.close(null);\n                            });\n                        }\n                    }\n                );\n            }\n        );\n    };\n\n    function saveEntityObservable() {\n        var cf = vm.addEntityFormGroup.value;\n\n        var customer = {\n            title: cf.title,\n            additionalInfo: {\n                userName: cf.additionalInfo.userName,\n                email: cf.additionalInfo.email,\n                phone: cf.additionalInfo.phone\n            }\n        }\n        \n        return customerService.saveCustomer(customer);\n    }\n\n    function saveAttributes(entityId) {\n        let attributes = vm.addEntityFormGroup.get('attributes').value;\n        let attributesArray = [];\n        for (let key in attributes) {\n            if(attributes[key] !== null) {\n                attributesArray.push({key: key, value: attributes[key]});\n            }\n        }\n        if (attributesArray.length > 0) {\n            return attributeService.saveEntityAttributes(entityId, \"SERVER_SCOPE\", attributesArray);\n        }\n        return widgetContext.rxjs.of([]);\n    }\n}\n`;

    }

    function addCustomerHTML() {
      return `<form #addEntityForm=\"ngForm\" [formGroup]=\"addEntityFormGroup\"\n      (ngSubmit)=\"save()\" class=\"add-entity-form\">\n    <mat-toolbar fxLayout=\"row\" color=\"primary\">\n        <h2>Add entity</h2>\n        <span fxFlex></span>\n        <button mat-icon-button (click)=\"cancel()\" type=\"button\">\n            <mat-icon class=\"material-icons\">close</mat-icon>\n        </button>\n    </mat-toolbar>\n    <mat-progress-bar color=\"warn\" mode=\"indeterminate\" *ngIf=\"isLoading$ | async\">\n    </mat-progress-bar>\n    <div style=\"height: 4px;\" *ngIf=\"!(isLoading$ | async)\"></div>\n    <div mat-dialog-content fxLayout=\"column\">\n        <div fxLayout=\"row\" fxLayoutGap=\"8px\" fxLayout.xs=\"column\"  fxLayoutGap.xs=\"0\">\n            <mat-form-field fxFlex class=\"mat-block\">\n                <mat-label>Title</mat-label>\n                <input matInput formControlName=\"title\" required>\n            </mat-form-field>\n            <mat-form-field formGroupName=\"additionalInfo\" fxFlex class=\"mat-block\">\n                <mat-label>Email</mat-label>\n                <input type=\"email\" matInput formControlName=\"email\">\n            </mat-form-field>\n        </div>\n        <div fxLayout=\"row\" fxLayoutGap=\"8px\" fxLayout.xs=\"column\"  fxLayoutGap.xs=\"0\">\n            <mat-form-field formGroupName=\"additionalInfo\" fxFlex class=\"mat-block\">\n                <mat-label>User name</mat-label>\n                <input type=\"text\" step=\"any\" matInput formControlName=\"userName\">\n            </mat-form-field>\n        </div>\n        <div formGroupName=\"attributes\" fxLayout=\"column\">\n            <div *ngFor=\"let attr of customAttributes\" fxLayout=\"row\" fxLayoutGap=\"8px\" fxLayout.xs=\"column\"  fxLayoutGap.xs=\"0\">\n                <mat-form-field *ngIf=\"attr.type == 'INTEGER'\" fxFlex class=\"mat-block\">\n                    <mat-label>{{attr.name}}</mat-label>\n                    <input type=\"number\" step=\"1\" matInput formControlName=\"{{attr.name}}\">\n                </mat-form-field>\n                <mat-form-field *ngIf=\"attr.type == 'STRING'\" fxFlex class=\"mat-block\">\n                    <mat-label>{{attr.name}}</mat-label>\n                    <input matInput formControlName=\"{{attr.name}}\">\n                </mat-form-field>\n                <mat-checkbox *ngIf=\"attr.type == 'BOOLEAN'\" class=\"example-margin\" color=\"primary\" formControlName=\"{{attr.name}}\">{{attr.name}}</mat-checkbox>\n                <fieldset *ngIf=\"attr.type == 'IMAGE'\" [disabled]=\"(isLoading$ | async) || loading\" appearance=\"outline\">\n                    <tb-image-input \n                        formControlName=\"{{attr.name}}\"\n                        [showPreview]=\"true\"\n                        [showClearButton]=\"true\">\n                    </tb-image-input>\n                </fieldset>  \n            </div>\n        </div>\n    </div>\n    <div mat-dialog-actions fxLayout=\"row\" fxLayoutAlign=\"end center\">\n        <button mat-button color=\"primary\"\n                type=\"button\"\n                [disabled]=\"(isLoading$ | async)\"\n                (click)=\"cancel()\" cdkFocusInitial>\n            Cancel\n        </button>\n        <button mat-button mat-raised-button color=\"primary\"\n                type=\"submit\"\n                [disabled]=\"(isLoading$ | async) || addEntityForm.invalid || !addEntityForm.dirty\">\n            Create\n        </button>\n    </div>\n</form>\n`;
    }

    function editCustomerJs(stateEntityParamName, relationType, attributes) {
      return `let customAttributes = ${JSON.stringify(attributes)}\nlet controller = widgetContext.$scope.ctx.stateController;\nlet params = controller.getStateParams();\n\nlet needsId = null;\nlet relationType = '${relationType}'\n \nif(params['${stateEntityParamName}']){\n    needsId = params['${stateEntityParamName}']['entityId'];\n}\n\nif(!needsId){\n    needsId = {\n        id: widgetContext.currentUser.tenantId,\n        entityType: 'TENANT'\n    }\n}\n\nlet $injector = widgetContext.$scope.$injector;\nlet customDialog = $injector.get(widgetContext.servicesMap.get('customDialog'));\nlet entityService = $injector.get(widgetContext.servicesMap.get('entityService'));\nlet assetService = $injector.get(widgetContext.servicesMap.get('assetService'));\nlet customerService = $injector.get(widgetContext.servicesMap.get('customerService'));\nlet entityGroupService = $injector.get(widgetContext.servicesMap.get('entityGroupService'));\nlet deviceService = $injector.get(widgetContext.servicesMap.get('deviceService'));\nlet attributeService = $injector.get(widgetContext.servicesMap.get('attributeService'));\nlet entityRelationService = $injector.get(widgetContext.servicesMap.get('entityRelationService'));\n\nopenEditEntityDialog();\n\nfunction openEditEntityDialog() {\n    customDialog.customDialog(htmlTemplate, EditEntityDialogController).subscribe();\n}\n\nfunction EditEntityDialogController(instance) {\n    let vm = instance;\n\n    vm.entityName = entityName;\n    vm.entityType = entityId.entityType;\n    vm.attributes = {};\n    vm.entity = {};\n    vm.customAttributes = customAttributes;\n\n    vm.editEntityFormGroup = vm.fb.group({\n        title: [null],\n        additionalInfo: vm.fb.group({\n            email: [null],\n            phone: [null],\n            userName: [null],\n        }),\n        attributes: vm.fb.group({})\n    });\n    if(customAttributes && customAttributes.length > 0){\n        customAttributes.forEach(x=>{\n            vm.editEntityFormGroup.controls.attributes.addControl(x.name, vm.fb.control({ disabled: false, value: null }, []));\n        })\n        }\n\n    getEntityInfo();\n\n    vm.cancel = function() {\n        vm.dialogRef.close(null);\n    };\n\n    vm.save = function() {\n        vm.editEntityFormGroup.markAsPristine();\n        widgetContext.rxjs.forkJoin([\n            saveAttributes(entityId),\n            saveEntity()\n        ]).subscribe(\n            function () {\n                entityRelationService.saveRelation({\n                    from: needsId,\n                    to: entityId,\n                    type: relationType,\n                    typeGroup: 'COMMON'\n                }).subscribe(()=>{\n                    widgetContext.updateAliases();\n                    vm.dialogRef.close(null);\n                });\n            }\n        );\n    };\n\n    function getEntityAttributes(attributes) {\n        for (var i = 0; i < attributes.length; i++) {\n            vm.attributes[attributes[i].key] = attributes[i].value;\n        }\n    }\n\n    function getEntityInfo() {\n        widgetContext.rxjs.forkJoin([\n            attributeService.getEntityAttributes(entityId, 'SERVER_SCOPE'),\n            entityService.getEntity(entityId.entityType, entityId.id)\n        ]).subscribe(\n            function (data) {\n                getEntityAttributes(data[0]);\n                vm.entity = data[1];\n                vm.editEntityFormGroup.patchValue({\n                    title: vm.entity.title,\n                    additionalInfo: {\n                        email: vm.entity.additionalInfo.email,\n                        phone: vm.entity.additionalInfo.phone,\n                        userName: vm.entity.additionalInfo.userName,\n                    },\n                    attributes: vm.attributes,\n                }, {emitEvent: false});\n            }\n        );\n    }\n\n    function saveEntity() {\n        const formValues = vm.editEntityFormGroup.value;\n        \n        vm.entity.title = formValues.title;\n        vm.entity.label = formValues.entityLabel;\n        vm.entity.additionalInfo.email = formValues.additionalInfo.email;\n        vm.entity.additionalInfo.userName = formValues.additionalInfo.userName;\n        vm.entity.additionalInfo.phone = formValues.additionalInfo.phone;\n\n        return customerService.saveCustomer(vm.entity);\n    }\n\n    function saveAttributes(entityId) {\n        let attributes = vm.editEntityFormGroup.get('attributes').value;\n        let attributesArray = [];\n        for (let key in attributes) {\n            if (attributes[key] !== vm.attributes[key]) {\n                attributesArray.push({key: key, value: attributes[key]});\n            }\n        }\n        if (attributesArray.length > 0) {\n            return attributeService.saveEntityAttributes(entityId, \"SERVER_SCOPE\", attributesArray);\n        }\n        return widgetContext.rxjs.of([]);\n    }\n}`;

    }

    function editCustomerHTML() {
      return `<form #editEntityForm=\"ngForm\" [formGroup]=\"editEntityFormGroup\"\n      (ngSubmit)=\"save()\"  class=\"edit-entity-form\">\n    <mat-toolbar fxLayout=\"row\" color=\"primary\">\n        <h2>Edit {{entityType.toLowerCase()}} {{entityName}}</h2>\n        <span fxFlex></span>\n        <button mat-icon-button (click)=\"cancel()\" type=\"button\">\n            <mat-icon class=\"material-icons\">close</mat-icon>\n        </button>\n    </mat-toolbar>\n    <mat-progress-bar color=\"warn\" mode=\"indeterminate\" *ngIf=\"isLoading$ | async\">\n    </mat-progress-bar>\n    <div style=\"height: 4px;\" *ngIf=\"!(isLoading$ | async)\"></div>\n    <div mat-dialog-content fxLayout=\"column\">\n        <div fxLayout=\"row\" fxLayoutGap=\"8px\" fxLayout.xs=\"column\"  fxLayoutGap.xs=\"0\">\n            <mat-form-field fxFlex class=\"mat-block\">\n                <mat-label>Title</mat-label>\n                <input matInput formControlName=\"title\" required>\n            </mat-form-field>\n            <mat-form-field formGroupName=\"additionalInfo\" fxFlex class=\"mat-block\">\n                <mat-label>Email</mat-label>\n                <input type=\"email\" matInput formControlName=\"email\">\n            </mat-form-field>\n        </div>\n        <div fxLayout=\"row\" fxLayoutGap=\"8px\" fxLayout.xs=\"column\"  fxLayoutGap.xs=\"0\">\n            <mat-form-field formGroupName=\"additionalInfo\" fxFlex class=\"mat-block\">\n                <mat-label>User name</mat-label>\n                <input type=\"text\" step=\"any\" matInput formControlName=\"userName\">\n            </mat-form-field>\n        </div>\n        <div formGroupName=\"attributes\" fxLayout=\"column\">\n            <div *ngFor=\"let attr of customAttributes\" fxLayout=\"row\" fxLayoutGap=\"8px\" fxLayout.xs=\"column\"  fxLayoutGap.xs=\"0\">\n                <mat-form-field *ngIf=\"attr.type == 'INTEGER'\" fxFlex class=\"mat-block\">\n                    <mat-label>{{attr.name}}</mat-label>\n                    <input type=\"number\" step=\"1\" matInput formControlName=\"{{attr.name}}\">\n                </mat-form-field>\n                <mat-form-field *ngIf=\"attr.type == 'STRING'\" fxFlex class=\"mat-block\">\n                    <mat-label>{{attr.name}}</mat-label>\n                    <input matInput formControlName=\"{{attr.name}}\">\n                </mat-form-field>\n                <mat-checkbox *ngIf=\"attr.type == 'BOOLEAN'\" class=\"example-margin\" color=\"primary\" formControlName=\"{{attr.name}}\">{{attr.name}}</mat-checkbox>\n                <fieldset *ngIf=\"attr.type == 'IMAGE'\" [disabled]=\"(isLoading$ | async) || loading\" appearance=\"outline\">\n                    <tb-image-input \n                        formControlName=\"{{attr.name}}\"\n                        [showPreview]=\"true\"\n                        [showClearButton]=\"true\">\n                    </tb-image-input>\n                </fieldset>  \n            </div>\n        </div>\n    </div>\n    <div mat-dialog-actions fxLayout=\"row\" fxLayoutAlign=\"end center\">\n        <button mat-button color=\"primary\"\n                type=\"button\"\n                [disabled]=\"(isLoading$ | async)\"\n                (click)=\"cancel()\" cdkFocusInitial>\n            Cancel\n        </button>\n        <button mat-button mat-raised-button color=\"primary\"\n                type=\"submit\"\n                [disabled]=\"(isLoading$ | async) || editEntityForm.invalid || !editEntityForm.dirty\">\n            Save\n        </button>\n    </div>\n</form>`;
    }

    function hasChildrenOrNo(firstLvL): boolean {
      return firstLvL.children && firstLvL.children.length > 0;
    }

    function processLevels(children, parent, parentName = '') {
      children.forEach(child => {
        if(child.type === EntityType.CUSTOMER) {
          child.children.push({
            name: "User",
            type: EntityType.USER,
            data: {
              relationType: "fromCustomerToUser",
              attributes: []
            },
            parent: child.level,
            children: [],
            level: child.level + 1
          })
        };

        const hasChildren = hasChildrenOrNo(child);
        setLevel(child, parent, hasChildren, parentName);

        if (hasChildren) {
          const stateName = `selected${child.name.replace(/ /g, '')}`;
          newDashboard.configuration.states[stateName] = setNewState(`${child.name} Details`);
          processLevels(child.children, child, stateName);
        } else if(child.type == "DEVICE"){
          const stateName = `selected${child.name.replace(/ /g, '')}`;
          newDashboard.configuration.states[stateName] = setNewState(`${child.name} Details`);
          setChartLevel(child, parent, hasChildren, stateName)
        }
      })
    }

    processLevels(tenantChildren, json[0], 'default');

    return newDashboard;
  }

  private setWidgetSize(sizeX: number, sizeY: number, row: number, col: number): WidgetSize {
    return {
      sizeX,
      sizeY,
      row,
      col
    };
  }

  private crateEmptyDashboard(): Dashboard {
    return {
      title: 'Management Dashboard new',
      image: null,
      mobileHide: false,
      mobileOrder: null,
      configuration: {
        description: '',
        widgets: {},
        states: {
          default: {
            name: 'Management Dashboard',
            root: true,
            layouts: {
              main: {
                widgets: {},
                gridSettings: {
                  backgroundColor: '#FFFFFF',
                  columns: 24,
                  margin: 10,
                  backgroundSizeMode: '100%',
                  outerMargin: true,
                  autoFillHeight: true,
                  backgroundImageUrl: null,
                  mobileAutoFillHeight: false,
                  mobileRowHeight: 70
                }
              }
            }
          }
        },
        entityAliases: {},
        filters: {},
        timewindow: {
          hideInterval: false,
          hideLastInterval: false,
          hideQuickInterval: false,
          hideAggregation: false,
          hideAggInterval: false,
          hideTimezone: false,
          selectedTab: 0,
          realtime: {
            realtimeType: 0,
            timewindowMs: 3600000,
            quickInterval: QuickTimeInterval.CURRENT_DAY,
            interval: 300000
          },
          aggregation: {
            type: AggregationType.AVG,
            limit: 25000
          },
          timezone: null
        },
        settings: {
          stateControllerId: 'entity',
          showTitle: false,
          showDashboardsSelect: true,
          showEntitiesSelect: true,
          showDashboardTimewindow: true,
          showDashboardExport: true,
          toolbarAlwaysOpen: true
        }
      },
      externalId: null,
      name: 'Management Dashboard'
    };
  }
}

interface WidgetSize {
  sizeX: number;
  sizeY: number;
  row: number;
  col: number;
};
