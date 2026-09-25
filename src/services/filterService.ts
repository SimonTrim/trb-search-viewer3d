import { matchValue, resolveProperty } from '@/config/searchProperties';
import type { HierarchyFilter, SearchResult } from '@/types';

import type { IndexedObject } from './propertyIndex';

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
    const ifcClass = entry.props.class ?? entry.props.type ?? '';

    if (filter.ifcTypes.length > 0 && !filter.ifcTypes.includes(ifcClass)) {
      continue;
    }

    let matchesAllRules = true;
    let lastMatchedValue = ifcClass;

    for (const rule of filter.rules) {
      const trimmed = rule.text.trim();
      if (!trimmed) continue;

      const value = resolveProperty(entry.props, rule.propertyId);
      if (!matchValue(value, trimmed, rule.matchMode, filter.caseSensitive)) {
        matchesAllRules = false;
        break;
      }
      lastMatchedValue = value;
    }

    if (!matchesAllRules) continue;

    results.push(toSearchResult(entry, lastMatchedValue));
  }

  return results;
}
