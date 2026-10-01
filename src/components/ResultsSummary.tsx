import { useMemo } from 'react';

import { ModusWcTypography } from '@trimble-oss/moduswebcomponents-react';

import { summarizeResultsByType } from '@/services/resultsService';
import type { SearchResult } from '@/types';

export interface ResultsSummaryProps {
  results: SearchResult[];
}

export function ResultsSummary({ results }: ResultsSummaryProps) {
  const summary = useMemo(() => summarizeResultsByType(results), [results]);

  if (!summary.length) return null;

  return (
    <div className="results-summary" aria-label="Comptage par type IFC">
      <ModusWcTypography hierarchy="p" weight="semibold" label="Comptage par classification" />
      <ul className="results-summary__list">
        {summary.map((entry) => (
          <li key={entry.ifcClass} className="results-summary__item">
            <span className="results-summary__type">{entry.ifcClass}</span>
            <span className="results-summary__count">{entry.count}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
