import type { ISelectOption } from '@trimble-oss/moduswebcomponents';

import type { MatchMode, ObjectProperties } from '@/types';

import propertySetsConfig from './propertySets.json';

export interface SearchPropertyConfig {
  id: string;
  label: string;
  kind: 'product' | 'class' | 'propertySet';
  path?: string;
  propertySet?: string;
  propertyName?: string;
}

export const SEARCH_PROPERTIES: SearchPropertyConfig[] = [
  { id: 'name', label: 'Nom', kind: 'product', path: 'name' },
  { id: 'objectType', label: "Type d'objet", kind: 'product', path: 'objectType' },
  { id: 'ifcClass', label: 'Type IFC', kind: 'class' },
  {
    id: 'idfm_thematique',
    label: 'Thématique',
    kind: 'propertySet',
    propertySet: propertySetsConfig.idfmIdentifiant.setName,
    propertyName: propertySetsConfig.idfmIdentifiant.properties.thematique,
  },
  {
    id: 'idfm_categorie',
    label: 'Catégorie',
    kind: 'propertySet',
    propertySet: propertySetsConfig.idfmIdentifiant.setName,
    propertyName: propertySetsConfig.idfmIdentifiant.properties.categorie,
  },
  {
    id: 'idfm_type_objet',
    label: 'Type objet',
    kind: 'propertySet',
    propertySet: propertySetsConfig.idfmIdentifiant.setName,
    propertyName: propertySetsConfig.idfmIdentifiant.properties.typeObjet,
  },
];

export const PROPERTY_SELECT_OPTIONS: ISelectOption[] = SEARCH_PROPERTIES.map((property) => ({
  label: property.label,
  value: property.id,
}));

export const MATCH_MODE_OPTIONS: ISelectOption[] = [
  { label: 'Contient', value: 'contains' },
  { label: 'Commence par', value: 'startsWith' },
  { label: 'Égal à', value: 'equals' },
];

export const DEFAULT_PROPERTY_ID = 'name';
export const DEFAULT_MATCH_MODE: MatchMode = 'contains';

function findInPropertySets(obj: ObjectProperties, setName: string, propName: string): string {
  const set = obj.properties?.find((propertySet) => propertySet.set === setName || propertySet.name === setName);
  const prop = set?.properties?.find((entry) => entry.name === propName);
  return String(prop?.value ?? '');
}

export function resolveProperty(obj: ObjectProperties, propertyId: string): string {
  const definition = SEARCH_PROPERTIES.find((entry) => entry.id === propertyId);
  if (!definition) return '';

  switch (definition.kind) {
    case 'product':
      if (definition.path === 'name') return obj.product?.name ?? obj.name ?? '';
      if (definition.path === 'objectType') return obj.product?.objectType ?? '';
      return '';
    case 'class':
      return obj.class ?? obj.type ?? '';
    case 'propertySet':
      if (!definition.propertySet || !definition.propertyName) return '';
      return findInPropertySets(obj, definition.propertySet, definition.propertyName);
    default:
      return '';
  }
}

export function matchValue(
  value: string,
  query: string,
  matchMode: MatchMode,
  caseSensitive: boolean,
): boolean {
  const source = caseSensitive ? value : value.toLowerCase();
  const needle = caseSensitive ? query : query.toLowerCase();

  if (!needle) return false;

  switch (matchMode) {
    case 'equals':
      return source === needle;
    case 'startsWith':
      return source.startsWith(needle);
    case 'contains':
    default:
      return source.includes(needle);
  }
}
