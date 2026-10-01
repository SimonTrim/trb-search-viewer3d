import type { SearchResult, ViewerSelection } from '@/types';

export function resultRowId(result: Pick<SearchResult, 'modelId' | 'runtimeId'>): string {
  return `${result.modelId}:${result.runtimeId}`;
}

/** Normalise les payloads `viewer.onSelectionChanged` (tableau direct ou `{ data: [] }`). */
export function normalizeViewerSelection(data: unknown): ViewerSelection[] {
  if (Array.isArray(data)) {
    return data as ViewerSelection[];
  }

  if (data && typeof data === 'object') {
    const payload = data as { data?: unknown };
    if (Array.isArray(payload.data)) {
      return payload.data as ViewerSelection[];
    }
  }

  return [];
}

/** Associe la sélection 3D aux lignes du tableau de résultats. */
export function rowIdsFromViewerSelection(
  selection: ViewerSelection[],
  results: SearchResult[],
): string[] {
  if (!selection.length || !results.length) return [];

  const resultIds = new Set(results.map((result) => resultRowId(result)));
  const matched: string[] = [];
  const seen = new Set<string>();

  for (const entry of selection) {
    for (const runtimeId of entry.objectRuntimeIds ?? []) {
      const rowId = resultRowId({ modelId: entry.modelId, runtimeId });
      if (!resultIds.has(rowId) || seen.has(rowId)) continue;
      seen.add(rowId);
      matched.push(rowId);
    }
  }

  return matched;
}
