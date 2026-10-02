import type { ISelectOption } from '@trimble-oss/moduswebcomponents';

import { getPropertyLabel, SEARCH_PROPERTIES } from './searchProperties';

export type PropertyGroupId =
  | 'favorites'
  | 'idfm_classification'
  | 'idfm_localisation'
  | 'general_ifc'
  | 'revit';

export interface PropertyGroupDefinition {
  id: PropertyGroupId;
  label: string;
  description: string;
  propertyIds: string[];
}

const REVIT_PROPERTY_IDS = SEARCH_PROPERTIES
  .filter((property) => property.id.startsWith('revit_'))
  .map((property) => property.id);

/** Propriétés MOA mises en avant pour un accès rapide. */
export const FAVORITE_PROPERTY_IDS: string[] = [
  'idfm_thematique',
  'idfm_categorie',
  'objectType',
  'idfm_localisation',
  'idfm_niveau',
  'idfm_gestionnaire',
];

export const PROPERTY_GROUPS: PropertyGroupDefinition[] = [
  {
    id: 'favorites',
    label: 'Favoris',
    description: 'Propriétés IDFM les plus utilisées par les chargés de projet',
    propertyIds: FAVORITE_PROPERTY_IDS,
  },
  {
    id: 'idfm_classification',
    label: 'IDFM — Classification',
    description: 'Thématique, catégorie, type et description métier',
    propertyIds: ['idfm_thematique', 'idfm_categorie', 'objectType', 'description'],
  },
  {
    id: 'idfm_localisation',
    label: 'IDFM — Localisation',
    description: 'Repérage, niveau, site et unité fonctionnelle',
    propertyIds: ['idfm_localisation', 'idfm_niveau', 'idfm_gestionnaire'],
  },
  {
    id: 'general_ifc',
    label: 'Général & IFC',
    description: 'Nom d’objet et classification IFC native',
    propertyIds: ['name', 'ifcClass'],
  },
  {
    id: 'revit',
    label: 'Revit',
    description: 'Paramètres techniques Revit (famille, système, repère…)',
    propertyIds: REVIT_PROPERTY_IDS,
  },
];

export const PROPERTY_GROUP_SELECT_OPTIONS: ISelectOption[] = PROPERTY_GROUPS.map((group) => ({
  label: group.id === 'favorites' ? `★ ${group.label}` : group.label,
  value: group.id,
}));

export function getPropertyGroup(groupId: PropertyGroupId): PropertyGroupDefinition {
  const group = PROPERTY_GROUPS.find((entry) => entry.id === groupId);
  if (!group) return PROPERTY_GROUPS[0];
  return group;
}

export function getDefaultGroupForProperty(propertyId: string): PropertyGroupId {
  if (FAVORITE_PROPERTY_IDS.includes(propertyId)) return 'favorites';

  for (const group of PROPERTY_GROUPS) {
    if (group.id !== 'favorites' && group.propertyIds.includes(propertyId)) {
      return group.id;
    }
  }

  return 'favorites';
}

export function getPropertyOptionsForGroup(groupId: PropertyGroupId): ISelectOption[] {
  const group = getPropertyGroup(groupId);
  return group.propertyIds.map((propertyId) => ({
    label: getPropertyLabel(propertyId),
    value: propertyId,
  }));
}

export function resolvePropertyInGroup(
  groupId: PropertyGroupId,
  propertyId: string,
): string {
  const group = getPropertyGroup(groupId);
  if (group.propertyIds.includes(propertyId)) return propertyId;
  return group.propertyIds[0] ?? propertyId;
}
