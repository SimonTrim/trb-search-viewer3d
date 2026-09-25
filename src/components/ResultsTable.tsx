import { useCallback, useEffect, useMemo, useState } from 'react';

import type { IPaginationChangeEventDetail, ITableColumn, ModusWcTableCustomEvent } from '@trimble-oss/moduswebcomponents';
import { ModusWcTable, ModusWcTypography } from '@trimble-oss/moduswebcomponents-react';

import type { SearchResult } from '@/types';

export interface ResultsTableProps {
  results: SearchResult[];
  multiModel: boolean;
  onRowClick: (result: SearchResult) => void;
}

interface ResultRow extends Record<string, unknown> {
  key: number;
  name: string;
  ifcClass: string;
  modelName: string;
}

export function ResultsTable({ results, multiModel, onRowClick }: ResultsTableProps) {
  const [currentPage, setCurrentPage] = useState(1);

  useEffect(() => {
    setCurrentPage(1);
  }, [results]);

  const rows = useMemo<ResultRow[]>(
    () =>
      results.map((result, index) => ({
        key: index,
        name: result.name,
        ifcClass: result.ifcClass,
        modelName: result.modelName ?? '',
      })),
    [results],
  );

  const columns = useMemo<ITableColumn[]>(() => {
    const base: ITableColumn[] = [
      { id: 'name', accessor: 'name', header: 'Nom' },
      { id: 'ifcClass', accessor: 'ifcClass', header: 'Type IFC' },
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
      const result = results[key];
      if (result) onRowClick(result);
    },
    [onRowClick, results],
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
