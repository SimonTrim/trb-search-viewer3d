import { matchValue, resolveProperty } from '@/config/searchProperties';
import type { SearchQuery, SearchResult, TrimbleAPI, ViewerModel } from '@/types';

import { iterateIndexedBatches, type IndexedObject, type IndexProgressCallback } from './propertyIndex';

function toSearchResult(entry: IndexedObject, matchedValue: string): SearchResult {
  return {
    modelId: entry.modelId,
    modelName: entry.modelName,
    runtimeId: entry.runtimeId,
    name: entry.props.product?.name ?? entry.props.name ?? `#${entry.runtimeId}`,
    ifcClass: entry.props.class ?? entry.props.type ?? '',
    matchedValue,
  };
}

export function matchSearchEntry(entry: IndexedObject, query: SearchQuery): SearchResult | null {
  const value = resolveProperty(entry.props, query.propertyId);
  if (!value) return null;
  if (!matchValue(value, query.text, query.matchMode, query.caseSensitive)) return null;
  return toSearchResult(entry, value);
}

export function searchIndex(indexed: IndexedObject[], query: SearchQuery): SearchResult[] {
  const results: SearchResult[] = [];

  for (const entry of indexed) {
    const match = matchSearchEntry(entry, query);
    if (match) results.push(match);
  }

  return results;
}

/** Recherche progressive : analyse par lots avec mise en cache incrémentale. */
export async function searchWithLazyIndex(
  api: TrimbleAPI,
  models: ViewerModel[],
  query: SearchQuery,
  onProgress?: IndexProgressCallback,
): Promise<SearchResult[]> {
  const results: SearchResult[] = [];

  await iterateIndexedBatches(
    api,
    models,
    (entries) => {
      for (const entry of entries) {
        const match = matchSearchEntry(entry, query);
        if (match) results.push(match);
      }
    },
    onProgress,
  );

  return results;
}
