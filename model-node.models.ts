import {FcNode} from "ngx-flowchart";
import {FcEdge} from "ngx-flowchart/lib/ngx-flowchart.models";
import {ValueTypeData} from "@shared/models/constants";
import {CellActionDescriptor} from "@home/models/entity/entities-table-config.models";

export interface FcModelNodeType extends FcNode {
  //component?: RuleNodeComponentDescriptor;
  //singletonMode?: boolean;
  nodeClass?: string;
  icon?: string;
  iconUrl?: string;
}

export interface AddModelNodeDialogData {
  modelNode: FcModelNode;
  modelNodesSavedNamesList: string[];
}

export interface AddModelEdgeDialogData {
  edge: FcEdge;
  modelEdgesSavedNamesList: string[];
}

export interface FcModelNode extends FcNode {
  type: ModelElementType;
  added: boolean;
  additionalFields: ModelAdditionalFieldsObj;
  userRoles?: Array<ModelUserDefaultRole | string>;
  isUserSelfRegistration?: boolean;
}

export type ModelAdditionalFieldsObj = {
  [key in AdditionalFieldsTypes]?: ModelAdditionalField[];
};

export enum ModelElementType {
  TENANT = 'TENANT',
  CUSTOMER = 'CUSTOMER',
  ASSET = 'ASSET',
  DEVICE = 'DEVICE'
}

export enum ModelUserDefaultRole {
  CUSTOMER_USER = 'CUSTOMER_USER',
  CUSTOMER_ADMINISTRATOR = 'CUSTOMER_ADMINISTRATOR'
}

export enum AdditionalFieldsTypes {
  ATTRIBUTES = 'attributes',
  TELEMETRIES = 'telemetries',
  ROLES = 'roles'
}

export interface ModelAdditionalField {
  name: string;
  type?: ModelEntityValueType;
  userRole?: string;
  isEnum?: boolean;
  enumOptions?: ModelEntityValueType[];
}

export interface  FCDataModel {
  nodes: Array<FcModelNode>;
  edges: Array<FcEdge>;
}

export interface EditableModelAdditionalField {
  field: ModelAdditionalField;
  type: AdditionalFieldsTypes;
}

export interface CustomCellActionDescriptor<T> extends Omit<CellActionDescriptor<T>, 'onAction'> {
  onAction: (event: MouseEvent, index: number, entity: T) => any;
}

export enum ModelEntityValueType {
  IMAGE = 'IMAGE',
  STRING = 'STRING',
  INTEGER = 'INTEGER',
  DOUBLE = 'DOUBLE',
  BOOLEAN = 'BOOLEAN',
  JSON = 'JSON'
}

export const ModelEntityValueTypesMap = new Map<ModelEntityValueType, ValueTypeData>(
  [
    [
      ModelEntityValueType.STRING,
      {
        name: 'value.string',
        icon: 'mdi:format-text'
      }
    ],
    [
      ModelEntityValueType.INTEGER,
      {
        name: 'value.integer',
        icon: 'mdi:numeric'
      }
    ],
    [
      ModelEntityValueType.DOUBLE,
      {
        name: 'value.double',
        icon: 'mdi:numeric'
      }
    ],
    [
      ModelEntityValueType.BOOLEAN,
      {
        name: 'value.boolean',
        icon: 'mdi:checkbox-marked-outline'
      }
    ],
    [
      ModelEntityValueType.JSON,
      {
        name: 'value.json',
        icon: 'mdi:code-json'
      }
    ],
    [
      ModelEntityValueType.IMAGE,
      {
        name: 'Image',
        icon: 'mdi:image'
      }
    ]
  ]
);
