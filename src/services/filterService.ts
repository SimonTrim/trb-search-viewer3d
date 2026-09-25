import { matchValue, resolveProperty } from '@/config/searchProperties';
import type { HierarchyFilter, SearchResult, TrimbleAPI, ViewerModel } from '@/types';

import {
  iterateIndexedBatches,
  type IndexedObject,
  type IndexProgressCallback,
} from './propertyIndex';

/** Collecte les types IFC distincts présents dans l'index. */
export function collectIfcTypes(indexed: IndexedObject[]): string[] {
  const types = new Set<string>();
  for (const entry of indexed) {
    const ifcClass = entry.props.class ?? entry.props.type ?? '';
    if (ifcClass) types.add(ifcClass);
  }
  return Array.from(types).sort((a, b) => a.localeCompare(b));
}

function toSearchResult(entry: IndexedObject, matchedValue = ''): SearchResult {
  return {
    modelId: entry.modelId,
    modelName: entry.modelName,
    runtimeId: entry.runtimeId,
    name: entry.props.product?.name ?? entry.props.name ?? `#${entry.runtimeId}`,
    ifcClass: entry.props.class ?? entry.props.type ?? '',
    matchedValue,
  };
}

export function matchHierarchyFilterEntry(
  entry: IndexedObject,
  filter: HierarchyFilter,
): SearchResult | null {
  const ifcClass = entry.props.class ?? entry.props.type ?? '';

  if (filter.ifcTypes.length > 0 && !filter.ifcTypes.includes(ifcClass)) {
    return null;
  }

  let lastMatchedValue = ifcClass;

  for (const rule of filter.rules) {
    const trimmed = rule.text.trim();
    if (!trimmed) continue;

    const value = resolveProperty(entry.props, rule.propertyId);
    if (!matchValue(value, trimmed, rule.matchMode, filter.caseSensitive)) {
      return null;
    }
    lastMatchedValue = value;
  }

  return toSearchResult(entry, lastMatchedValue);
}

/**
 * Applique le filtre hiérarchique sur l'index :
 * - Niveau 1 : restriction par types IFC (cases à cocher)
 * - Niveau 2 : règles combinées sur les propriétés (ET logique)
 */
export function applyHierarchyFilter(
  indexed: IndexedObject[],
  filter: HierarchyFilter,
): SearchResult[] {
  const results: SearchResult[] = [];

  for (const entry of indexed) {
    const match = matchHierarchyFilterEntry(entry, filter);
    if (match) results.push(match);
  }

  return results;
}

/** Filtre progressif : analyse par lots avec mise en cache incrémentale. */
export async function filterWithLazyIndex(
  api: TrimbleAPI,
  models: ViewerModel[],
  filter: HierarchyFilter,
  onProgress?: IndexProgressCallback,
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  await iterateIndexedBatches(
    api,
    models,
    (entries) => {
      for (const entry of entries) {
        const match = matchHierarchyFilterEntry(entry, filter);
        if (match) results.push(match);
      }
    },
    onProgress,
  );

  return results;
}
