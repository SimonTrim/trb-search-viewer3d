import type { ISelectOption } from '@trimble-oss/moduswebcomponents';

import type { MatchMode, ObjectProperties } from '@/types';

import propertySetsConfig from './propertySets.json';

export interface SearchPropertyConfig {
  id: string;
  label: string;
  kind: 'product' | 'class' | 'propertySet' | 'propertyAnySet';
  path?: string;
  propertySet?: string;
  propertyName?: string;
  /** Alias Revit FR/EN — recherche dans tous les jeux de propriétés. */
  propertyAliases?: string[];
}

const revitProperties = propertySetsConfig.revit.properties;

export const SEARCH_PROPERTIES: SearchPropertyConfig[] = [
  { id: 'name', label: 'Nom', kind: 'product', path: 'name' },
  { id: 'description', label: 'Description', kind: 'product', path: 'description' },
  { id: 'objectType', label: "Type d'objet", kind: 'product', path: 'objectType' },
  { id: 'ifcClass', label: 'Classification (type IFC)', kind: 'class' },
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
  {
    id: 'idfm_localisation',
    label: 'Localisation',
    kind: 'propertySet',
    propertySet: propertySetsConfig.idfmIdentifiant.setName,
    propertyName: propertySetsConfig.idfmIdentifiant.properties.localisation,
  },
  {
    id: 'idfm_niveau',
    label: 'Niveau',
    kind: 'propertySet',
    propertySet: propertySetsConfig.idfmIdentifiant.setName,
    propertyName: propertySetsConfig.idfmIdentifiant.properties.niveau,
  },
  {
    id: 'idfm_gestionnaire',
    label: 'Gestionnaire',
    kind: 'propertySet',
    propertySet: propertySetsConfig.idfmIdentifiant.setName,
    propertyName: propertySetsConfig.idfmIdentifiant.properties.gestionnaire,
  },
  {
    id: 'revit_family',
    label: 'Revit — Famille',
    kind: 'propertyAnySet',
    propertyAliases: revitProperties.family,
  },
  {
    id: 'revit_type',
    label: 'Revit — Type',
    kind: 'propertyAnySet',
    propertyAliases: revitProperties.type,
  },
  {
    id: 'revit_category',
    label: 'Revit — Catégorie',
    kind: 'propertyAnySet',
    propertyAliases: revitProperties.category,
  },
  {
    id: 'revit_system_type',
    label: 'Revit — Type de système',
    kind: 'propertyAnySet',
    propertyAliases: revitProperties.systemType,
  },
  {
    id: 'revit_system_name',
    label: 'Revit — Nom du système',
    kind: 'propertyAnySet',
    propertyAliases: revitProperties.systemName,
  },
  {
    id: 'revit_system_classification',
    label: 'Revit — Classification système',
    kind: 'propertyAnySet',
    propertyAliases: revitProperties.systemClassification,
  },
  {
    id: 'revit_level',
    label: 'Revit — Niveau',
    kind: 'propertyAnySet',
    propertyAliases: revitProperties.level,
  },
  {
    id: 'revit_mark',
    label: 'Revit — Repère',
    kind: 'propertyAnySet',
    propertyAliases: revitProperties.mark,
  },
  {
    id: 'revit_comments',
    label: 'Revit — Commentaires',
    kind: 'propertyAnySet',
    propertyAliases: revitProperties.comments,
  },
  {
    id: 'revit_workset',
    label: 'Revit — Lot de travaux',
    kind: 'propertyAnySet',
    propertyAliases: revitProperties.workset,
  },
  {
    id: 'revit_phase_created',
    label: 'Revit — Phase créée',
    kind: 'propertyAnySet',
    propertyAliases: revitProperties.phaseCreated,
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
export const DEFAULT_LEVEL1_PROPERTY_ID = 'ifcClass';
export const DEFAULT_MATCH_MODE: MatchMode = 'contains';

export function getPropertyLabel(propertyId: string): string {
  return SEARCH_PROPERTIES.find((entry) => entry.id === propertyId)?.label ?? propertyId;
}

function findInPropertySets(obj: ObjectProperties, setName: string, propName: string): string {
  const set = obj.properties?.find(
    (propertySet) => propertySet.set === setName || propertySet.name === setName,
  );
  const prop = set?.properties?.find((entry) => entry.name === propName);
  return String(prop?.value ?? '');
}

function findPropertyByAliases(obj: ObjectProperties, aliases: string[]): string {
  const normalizedAliases = new Set(aliases.map((alias) => alias.toLowerCase()));

  for (const propertySet of obj.properties ?? []) {
    for (const property of propertySet.properties ?? []) {
      if (normalizedAliases.has(property.name.toLowerCase())) {
        return String(property.value ?? '');
      }
    }
  }

  return '';
}

export function resolveProperty(obj: ObjectProperties, propertyId: string): string {
  const definition = SEARCH_PROPERTIES.find((entry) => entry.id === propertyId);
  if (!definition) return '';

  switch (definition.kind) {
    case 'product':
      if (definition.path === 'name') return obj.product?.name ?? obj.name ?? '';
      if (definition.path === 'description') return obj.product?.description ?? '';
      if (definition.path === 'objectType') return obj.product?.objectType ?? '';
      return '';
    case 'class':
      return obj.class ?? obj.type ?? '';
    case 'propertySet':
      if (!definition.propertySet || !definition.propertyName) return '';
      return findInPropertySets(obj, definition.propertySet, definition.propertyName);
    case 'propertyAnySet':
      if (!definition.propertyAliases?.length) return '';
      return findPropertyByAliases(obj, definition.propertyAliases);
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
