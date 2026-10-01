import { matchValue, resolveProperty } from '@/config/searchProperties';
import type { HierarchyFilter, SearchResult, TrimbleAPI, ViewerModel } from '@/types';

import {
  iterateIndexedBatches,
  type IndexedObject,
  type IndexProgressCallback,
} from './propertyIndex';

/** Collecte les valeurs distinctes d'une propriété dans l'index. */
export function collectDistinctPropertyValues(
  indexed: IndexedObject[],
  propertyId: string,
): string[] {
  const values = new Set<string>();
  for (const entry of indexed) {
    const value = resolveProperty(entry.props, propertyId).trim();
    if (value) values.add(value);
  }
  return Array.from(values).sort((a, b) => a.localeCompare(b, 'fr'));
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

function matchesLevel1Value(value: string, selected: string, caseSensitive: boolean): boolean {
  if (caseSensitive) return value === selected;
  return value.toLowerCase() === selected.toLowerCase();
}

export function matchHierarchyFilterEntry(
  entry: IndexedObject,
  filter: HierarchyFilter,
): SearchResult | null {
  const ifcClass = entry.props.class ?? entry.props.type ?? '';
  let lastMatchedValue = ifcClass;

  if (filter.level1.values.length > 0) {
    const level1Value = resolveProperty(entry.props, filter.level1.propertyId);
    const matchesLevel1 = filter.level1.values.some((selected) =>
      matchesLevel1Value(level1Value, selected, filter.caseSensitive),
    );
    if (!matchesLevel1) return null;
    lastMatchedValue = level1Value;
  }

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
 * - Niveau 1 : restriction par valeurs d'une propriété (cases à cocher)
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
