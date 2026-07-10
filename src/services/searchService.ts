import { matchValue, resolveProperty } from '@/config/searchProperties';
import type { SearchQuery, SearchResult } from '@/types';

import type { IndexedObject } from './propertyIndex';

export function searchIndex(indexed: IndexedObject[], query: SearchQuery): SearchResult[] {
  const results: SearchResult[] = [];

  for (const entry of indexed) {
    const value = resolveProperty(entry.props, query.propertyId);
    if (!value) continue;
    if (!matchValue(value, query.text, query.matchMode, query.caseSensitive)) continue;

    results.push({
      modelId: entry.modelId,
      modelName: entry.modelName,
      runtimeId: entry.runtimeId,
      name: entry.props.product?.name ?? entry.props.name ?? `#${entry.runtimeId}`,
      ifcClass: entry.props.class ?? entry.props.type ?? '',
      matchedValue: value,
    });
  }

  return results;
}
