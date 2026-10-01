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
import { resultRowId } from '@/utils/selectionSync';

export interface ResultsTableProps {
  results: SearchResult[];
  multiModel: boolean;
  selectedRowIds: string[];
  onRowClick: (result: SearchResult) => void;
}

interface ResultRow extends Record<string, unknown> {
  id: string;
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

const DEFAULT_PAGE_SIZE = 25;

export function ResultsTable({
  results,
  multiModel,
  selectedRowIds,
  onRowClick,
}: ResultsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(DEFAULT_PAGE_SIZE);
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
        id: resultRowId(result),
        key: index,
        name: result.name,
        ifcClass: result.ifcClass,
        matchedValue: result.matchedValue,
        modelName: result.modelName ?? '',
      })),
    [sortedResults],
  );

  // Afficher la page contenant la première ligne sélectionnée (sync viewer → tableau).
  useEffect(() => {
    if (!selectedRowIds.length || !rows.length) return;

    const rowIndex = rows.findIndex((row) => selectedRowIds.includes(row.id));
    if (rowIndex < 0) return;

    const targetPage = Math.floor(rowIndex / pageSize) + 1;
    if (targetPage !== currentPage) {
      setCurrentPage(targetPage);
    }
  }, [currentPage, pageSize, rows, selectedRowIds]);

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
      const rowId = event.detail?.row?.id;
      if (typeof rowId !== 'string') return;

      const result = sortedResults.find((entry) => resultRowId(entry) === rowId);
      if (result) onRowClick(result);
    },
    [onRowClick, sortedResults],
  );

  const handlePaginationChange = useCallback(
    (event: ModusWcTableCustomEvent<IPaginationChangeEventDetail>) => {
      const nextPage = event.detail?.currentPage;
      const nextPageSize = event.detail?.pageSize;
      if (typeof nextPage === 'number' && nextPage >= 1) {
        setCurrentPage(nextPage);
      }
      if (typeof nextPageSize === 'number' && nextPageSize > 0) {
        setPageSize(nextPageSize);
      }
    },
    [],
  );

  const selectionLabel =
    selectedRowIds.length > 0
      ? `${selectedRowIds.length} élément(s) sélectionné(s) dans le viewer`
      : 'Cliquez un élément dans le viewer ou le tableau pour synchroniser la sélection';

  return (
    <div className="results-table">
      <ModusWcTypography
        hierarchy="p"
        weight="semibold"
        label={`${results.length} élément(s) trouvé(s)`}
      />
      <ModusWcTypography className="results-table__sync-hint" hierarchy="p" label={selectionLabel} />

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
          selectable="multi"
          selectedRowIds={selectedRowIds}
          paginated={rows.length > DEFAULT_PAGE_SIZE}
          currentPage={currentPage}
          pageSizeOptions={[25, 50, 100]}
          showPageSizeSelector={rows.length > DEFAULT_PAGE_SIZE}
          caption="Résultats de recherche"
          onRowClick={handleRowClick}
          onPaginationChange={handlePaginationChange}
        />
      </div>
    </div>
  );
}
