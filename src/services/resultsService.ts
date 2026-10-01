import type { SearchResult } from '@/types';

export type ResultSortField = 'name' | 'ifcClass' | 'matchedValue';
export type ResultSortDirection = 'asc' | 'desc';

export interface ResultTypeSummary {
  ifcClass: string;
  count: number;
}

export function summarizeResultsByType(results: SearchResult[]): ResultTypeSummary[] {
  const counts = new Map<string, number>();

  for (const result of results) {
    const key = result.ifcClass || 'Non classé';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }

  return Array.from(counts.entries())
    .map(([ifcClass, count]) => ({ ifcClass, count }))
    .sort((a, b) => b.count - a.count || a.ifcClass.localeCompare(b.ifcClass, 'fr'));
}

export function sortResults(
  results: SearchResult[],
  field: ResultSortField,
  direction: ResultSortDirection,
): SearchResult[] {
  const factor = direction === 'asc' ? 1 : -1;

  return [...results].sort((left, right) => {
    const leftValue = left[field] ?? '';
    const rightValue = right[field] ?? '';
    return leftValue.localeCompare(rightValue, 'fr', { sensitivity: 'base' }) * factor;
  });
}
