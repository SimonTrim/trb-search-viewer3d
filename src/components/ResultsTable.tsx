import { useCallback, useEffect, useMemo, useState } from 'react';

import type {
  IPaginationChangeEventDetail,
  ISelectOption,
  ITableColumn,
  ModusWcTableCustomEvent,
} from '@trimble-oss/moduswebcomponents';
import { ModusWcSelect, ModusWcTable, ModusWcTypography } from '@trimble-oss/moduswebcomponents-react';

import {
  sortResults,
  type ResultSortDirection,
  type ResultSortField,
} from '@/services/resultsService';
import type { SearchResult } from '@/types';
import { readInputString } from '@/utils/modusFormEvents';

export interface ResultsTableProps {
  results: SearchResult[];
  multiModel: boolean;
  onRowClick: (result: SearchResult) => void;
}

interface ResultRow extends Record<string, unknown> {
  key: number;
  name: string;
  ifcClass: string;
  matchedValue: string;
  modelName: string;
}

const SORT_FIELD_OPTIONS: ISelectOption[] = [
  { label: 'Nom', value: 'name' },
  { label: 'Classification (type IFC)', value: 'ifcClass' },
  { label: 'Valeur trouvée', value: 'matchedValue' },
];

const SORT_DIRECTION_OPTIONS: ISelectOption[] = [
  { label: 'Croissant (A → Z)', value: 'asc' },
  { label: 'Décroissant (Z → A)', value: 'desc' },
];

export function ResultsTable({ results, multiModel, onRowClick }: ResultsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [sortField, setSortField] = useState<ResultSortField>('name');
  const [sortDirection, setSortDirection] = useState<ResultSortDirection>('asc');

  useEffect(() => {
    setCurrentPage(1);
  }, [results, sortField, sortDirection]);

  const sortedResults = useMemo(
    () => sortResults(results, sortField, sortDirection),
    [results, sortDirection, sortField],
  );

  const rows = useMemo<ResultRow[]>(
    () =>
      sortedResults.map((result, index) => ({
        key: index,
        name: result.name,
        ifcClass: result.ifcClass,
        matchedValue: result.matchedValue,
        modelName: result.modelName ?? '',
      })),
    [sortedResults],
  );

  const columns = useMemo<ITableColumn[]>(() => {
    const base: ITableColumn[] = [
      { id: 'name', accessor: 'name', header: 'Nom' },
      { id: 'ifcClass', accessor: 'ifcClass', header: 'Classification' },
      { id: 'matchedValue', accessor: 'matchedValue', header: 'Valeur' },
    ];
    if (multiModel) {
      base.push({ id: 'modelName', accessor: 'modelName', header: 'Modèle' });
    }
    return base;
  }, [multiModel]);

  const handleRowClick = useCallback(
    (event: CustomEvent<{ row: Record<string, unknown>; index: number }>) => {
      const key = event.detail?.row?.key;
      if (typeof key !== 'number') return;
      const result = sortedResults[key];
      if (result) onRowClick(result);
    },
    [onRowClick, sortedResults],
  );

  const handlePaginationChange = useCallback(
    (event: ModusWcTableCustomEvent<IPaginationChangeEventDetail>) => {
      const nextPage = event.detail?.currentPage;
      if (typeof nextPage === 'number' && nextPage >= 1) {
        setCurrentPage(nextPage);
      }
    },
    [],
  );

  return (
    <div className="results-table">
      <ModusWcTypography
        hierarchy="p"
        weight="semibold"
        label={`${results.length} élément(s) trouvé(s)`}
      />

      <div className="results-table__sort">
        <ModusWcSelect
          className="results-table__sort-field"
          label="Trier par"
          size="sm"
          value={sortField}
          options={SORT_FIELD_OPTIONS}
          onInputChange={(event: CustomEvent) =>
            setSortField(readInputString(event) as ResultSortField)
          }
        />
        <ModusWcSelect
          className="results-table__sort-direction"
          label="Ordre"
          size="sm"
          value={sortDirection}
          options={SORT_DIRECTION_OPTIONS}
          onInputChange={(event: CustomEvent) =>
            setSortDirection(readInputString(event) as ResultSortDirection)
          }
        />
      </div>

      <div className="results-table__grid">
        <ModusWcTable
          columns={columns}
          data={rows}
          density="compact"
          hover
          zebra
          paginated={rows.length > 25}
          currentPage={currentPage}
          pageSizeOptions={[25, 50, 100]}
          showPageSizeSelector={rows.length > 25}
          caption="Résultats de recherche"
          onRowClick={handleRowClick}
          onPaginationChange={handlePaginationChange}
        />
      </div>
    </div>
  );
}
