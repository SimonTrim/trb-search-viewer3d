import { useCallback, useEffect, useRef, useState } from 'react';

import {
  ModusWcAlert,
  ModusWcCard,
  ModusWcLoader,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react';

import { FilterPanel } from '@/components/FilterPanel';
import { ResultsTable } from '@/components/ResultsTable';
import { SearchBar } from '@/components/SearchBar';
import { ToastHost } from '@/components/ToastHost';
import { ViewerActionsBar } from '@/components/ViewerActionsBar';
import { useToasts } from '@/hooks/useToasts';
import { useTrimbleConnect } from '@/hooks/useTrimbleConnect';
import { applyHierarchyFilter, collectIfcTypes } from '@/services/filterService';
import { buildIndex, clearIndex } from '@/services/propertyIndex';
import { searchIndex } from '@/services/searchService';
import {
  HIGHLIGHT_WARN_THRESHOLD,
  highlightResults,
  resetViewer,
  zoomToResult,
} from '@/services/viewerActions';
import type { HierarchyFilter, SearchQuery, SearchResult, SearchStatus } from '@/types';

export default function App() {
  const { api, isBusy, isMockMode, models, error } = useTrimbleConnect();
  const { toasts, pushToast, dismissToast } = useToasts();

  const [status, setStatus] = useState<SearchStatus>('idle');
  const [progress, setProgress] = useState(0);
  const [results, setResults] = useState<SearchResult[]>([]);
  const [hasSearched, setHasSearched] = useState(false);
  const [availableTypes, setAvailableTypes] = useState<string[]>([]);
  const [isolate, setIsolate] = useState(true);
  const isolateRef = useRef(isolate);
  isolateRef.current = isolate;

  // Les modèles chargés ont changé : l'index des propriétés n'est plus fiable.
  useEffect(() => {
    clearIndex();
    setAvailableTypes([]);
  }, [models]);

  useEffect(() => {
    console.log(`[RechercheElements] isBusy=${isBusy} isMockMode=${isMockMode} models=${models.length}`);
  }, [isBusy, isMockMode, models]);

  const applyFoundResults = useCallback(
    async (found: SearchResult[], successMessage: string, emptyMessage?: string) => {
      if (!api) return;

      setResults(found);
      setHasSearched(true);

      if (!found.length) {
        setStatus('idle');
        if (emptyMessage) {
          pushToast({ variant: 'info', title: 'Aucun résultat', message: emptyMessage });
        }
        return;
      }

      setStatus('highlighting');
      if (found.length > HIGHLIGHT_WARN_THRESHOLD) {
        pushToast({
          variant: 'warning',
          title: `${found.length} éléments`,
          message: 'La colorisation peut prendre quelques secondes.',
        });
      }
      await highlightResults(api, found, { isolate: isolateRef.current });

      setStatus('idle');
      pushToast({
        variant: 'success',
        title: `${found.length} élément(s) trouvé(s)`,
        message: successMessage,
      });
    },
    [api, pushToast],
  );

  const runWithIndex = useCallback(
    async (
      runner: (indexed: Awaited<ReturnType<typeof buildIndex>>) => SearchResult[],
      options?: { scanOnly?: boolean },
    ) => {
      if (isMockMode || !api) {
        pushToast({
          variant: 'info',
          title: 'Mode développement',
          message: 'La recherche nécessite un modèle chargé dans Trimble Connect.',
        });
        return;
      }

      if (!models.length) {
        pushToast({
          variant: 'warning',
          title: 'Aucun modèle chargé',
          message: 'Chargez un modèle IFC dans le viewer avant de lancer une recherche.',
        });
        return;
      }

      try {
        setStatus('indexing');
        setProgress(0);
        const indexed = await buildIndex(api, models, (done, total) => {
          setProgress(total > 0 ? Math.round((done / total) * 100) : 100);
        });
        setAvailableTypes(collectIfcTypes(indexed));
        console.log(`[RechercheElements] Index: ${indexed.length} objet(s)`);

        if (options?.scanOnly) {
          setStatus('idle');
          pushToast({
            variant: 'success',
            title: 'Modèle analysé',
            message: `${indexed.length} objet(s) indexé(s), ${collectIfcTypes(indexed).length} type(s) IFC.`,
          });
          return;
        }

        setStatus('searching');
        const found = runner(indexed);
        await applyFoundResults(
          found,
          'Résultats colorisés en rouge dans le viewer.',
          'Aucun élément ne correspond aux critères.',
        );
      } catch (searchError) {
        console.error('[RechercheElements] Erreur:', searchError);
        setStatus('error');
        pushToast({
          variant: 'error',
          title: 'Erreur',
          message: searchError instanceof Error ? searchError.message : 'L\'opération a échoué.',
        });
      }
    },
    [api, applyFoundResults, isMockMode, models, pushToast],
  );

  const handleSearch = useCallback(
    async (query: SearchQuery) => {
      await runWithIndex((indexed) => {
        const found = searchIndex(indexed, query);
        console.log(
          `[RechercheElements] "${query.text}" (${query.propertyId}): ${found.length} résultat(s)`,
        );
        return found;
      });
    },
    [runWithIndex],
  );

  const handleFilter = useCallback(
    async (filter: HierarchyFilter) => {
      await runWithIndex((indexed) => {
        const found = applyHierarchyFilter(indexed, filter);
        console.log(`[RechercheElements] Filtre hiérarchique: ${found.length} résultat(s)`);
        return found;
      });
    },
    [runWithIndex],
  );

  const handleScanTypes = useCallback(async () => {
    await runWithIndex(() => [], { scanOnly: true });
  }, [runWithIndex]);

  const handleRowClick = useCallback(
    async (result: SearchResult) => {
      if (!api) return;
      try {
        await zoomToResult(api, result);
      } catch (zoomError) {
        console.error('[RechercheElements] Zoom impossible:', zoomError);
      }
    },
    [api],
  );

  const handleReset = useCallback(async () => {
    if (!api) return;
    try {
      await resetViewer(api);
      pushToast({
        variant: 'info',
        title: 'Vue réinitialisée',
        message: 'Visibilité et couleurs restaurées.',
      });
    } catch (resetError) {
      console.error('[RechercheElements] Réinitialisation impossible:', resetError);
    }
  }, [api, pushToast]);

  const working = status === 'indexing' || status === 'searching' || status === 'highlighting';
  const statusLabel =
    status === 'indexing'
      ? `Indexation des propriétés… ${progress}%`
      : status === 'searching'
        ? 'Recherche en cours…'
        : 'Mise en évidence dans le viewer…';

  return (
    <>
      <main className="app-shell">
        <ModusWcCard className="search-panel" padding="comfortable">
          {/* Les branches restent montées : démonter des enfants slottés dans un
              hôte Modus provoque NotFoundError removeChild avec React. La visibilité
              est pilotée par la classe u-hidden (l'attribut hidden est manipulé par
              Stencil/Modus sur les enfants slottés et ne serait pas fiable). */}
          <header className="search-panel__header">
            <ModusWcTypography hierarchy="h3" label="Recherche d'éléments" />
            <div className={isMockMode ? undefined : 'u-hidden'}>
              <ModusWcAlert variant="info" alertTitle="Mode développement">
                {error ?? 'Workspace API non disponible — interface testable hors Trimble Connect.'}
              </ModusWcAlert>
            </div>
          </header>

          <div className={`search-panel__loading${isBusy ? '' : ' u-hidden'}`}>
            <ModusWcLoader />
            <ModusWcTypography hierarchy="p" label="Connexion au viewer…" />
          </div>

          <div className={isBusy ? 'u-hidden' : undefined}>
            <SearchBar
              onSearch={handleSearch}
              disabled={!models.length && !isMockMode}
              loading={working}
            />

            <FilterPanel
              availableTypes={availableTypes}
              onApply={handleFilter}
              onScanTypes={handleScanTypes}
              disabled={!models.length && !isMockMode}
              loading={working}
            />

            <div className={`search-panel__status${working ? '' : ' u-hidden'}`}>
              <ModusWcLoader size="sm" />
              <ModusWcTypography hierarchy="p" label={statusLabel} />
            </div>

            <div className={`search-panel__results${hasSearched && !working ? '' : ' u-hidden'}`}>
              <div className={results.length > 0 ? undefined : 'u-hidden'}>
                <ResultsTable
                  results={results}
                  multiModel={models.length > 1}
                  onRowClick={handleRowClick}
                />
                <ViewerActionsBar
                  isolate={isolate}
                  onIsolateChange={setIsolate}
                  onReset={handleReset}
                  disabled={working}
                />
              </div>
              <div className={results.length === 0 ? undefined : 'u-hidden'}>
                <ModusWcAlert variant="info" alertTitle="Aucun résultat">
                  Aucun élément ne correspond à votre recherche.
                </ModusWcAlert>
              </div>
            </div>
          </div>
        </ModusWcCard>
      </main>

      <ToastHost toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
