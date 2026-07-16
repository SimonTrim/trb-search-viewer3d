export type MatchMode = 'contains' | 'startsWith' | 'equals';

export interface SearchQuery {
  text: string;
  propertyId: string;
  matchMode: MatchMode;
  caseSensitive: boolean;
}

export interface SearchResult {
  modelId: string;
  runtimeId: number;
  name: string;
  ifcClass: string;
  modelName?: string;
  matchedValue: string;
}

export interface PropertyDefinition {
  id: string;
  label: string;
}

export type SearchStatus = 'idle' | 'indexing' | 'searching' | 'highlighting' | 'error';

export interface SearchState {
  status: SearchStatus;
  progress?: number;
  results: SearchResult[];
  lastQuery?: SearchQuery;
  indexSize: number;
}

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface ViewerSelection {
  modelId: string;
  objectRuntimeIds: number[];
}

export interface ModelObjectIds {
  modelId: string;
  objectRuntimeIds?: number[];
  recursive?: boolean;
}

export interface ObjectProperty {
  name: string;
  value: string | number | boolean | null;
  type?: string;
}

export interface PropertySet {
  name?: string;
  set?: string;
  properties?: ObjectProperty[];
}

export interface ProductInfo {
  name?: string;
  description?: string;
  objectType?: string;
}

export interface ObjectProperties {
  id?: number;
  runtimeId?: number;
  class?: string;
  type?: string;
  name?: string;
  product?: ProductInfo;
  properties?: PropertySet[];
}

export interface ViewerModel {
  id: string;
  name?: string;
}

export interface TrimbleProject {
  id: string;
  name: string;
  location?: string;
}

export interface ViewerObjectState {
  visible?: boolean | 'reset';
  color?: string | null | 'reset';
  opacity?: number;
}

export interface ViewerObjectSelector {
  modelObjectIds?: ModelObjectIds[];
}

export interface ViewerCamera {
  position: Vector3;
  target: Vector3;
  up?: Vector3;
}

export interface ObjectBoundingBox {
  runtimeId?: number;
  min: Vector3;
  max: Vector3;
}

export interface HierarchyEntity {
  id: number;
  name?: string;
  fileId?: string;
}

export interface TrimbleViewerAPI {
  getModels: (filter?: string) => Promise<unknown[]>;
  getObjects: (selector?: ViewerObjectSelector, state?: ViewerObjectState) => Promise<unknown[]>;
  getSelection: () => Promise<ViewerSelection[]>;
  setSelection: (selector: unknown, mode: 'set' | 'add' | 'remove') => Promise<void>;
  getObjectProperties: (modelId: string, ids: number[]) => Promise<unknown[]>;
  setObjectState: (selector: unknown, state: ViewerObjectState) => Promise<void>;
  isolateEntities: (entities: unknown[]) => Promise<void>;
  getCamera: () => Promise<ViewerCamera>;
  setCamera: (target: unknown, options?: Record<string, unknown>) => Promise<void>;
  getHierarchyChildren: (
    modelId: string,
    entityIds: number[],
    hierarchyType?: number | string,
    recursive?: boolean,
  ) => Promise<HierarchyEntity[]>;
  getObjectBoundingBoxes: (
    modelId: string,
    objectRuntimeIds: number[],
  ) => Promise<ObjectBoundingBox[]>;
  setOpacity: (opacity: number) => Promise<void>;
  reset: () => Promise<void>;
}

export interface TrimbleExtensionAPI {
  requestPermission: (permission: 'accesstoken' | string) => Promise<string>;
}

export interface TrimbleProjectAPI {
  getCurrentProject: () => Promise<TrimbleProject>;
}

export interface TrimbleAPI {
  viewer: TrimbleViewerAPI;
  extension: TrimbleExtensionAPI;
  project: TrimbleProjectAPI;
}

export interface TrimbleWorkspaceGlobal {
  connect: (
    parent: Window,
    onEvent: (event: string, data: unknown) => void | Promise<void>,
    timeout?: number,
  ) => Promise<TrimbleAPI>;
}

export interface TrimbleConnectState {
  api: TrimbleAPI | null;
  project: TrimbleProject | null;
  accessToken: string | null;
  selection: ViewerSelection[];
  models: ViewerModel[];
  isConnected: boolean;
  isEmbedded: boolean;
  isMockMode: boolean;
  isBusy: boolean;
  error: string | null;
}
