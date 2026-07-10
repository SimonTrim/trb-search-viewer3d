import { useCallback } from 'react';

import { ModusWcAlert, ModusWcCard, ModusWcLoader, ModusWcTypography } from '@trimble-oss/moduswebcomponents-react';

import { SearchBar } from '@/components/SearchBar';
import { ToastHost } from '@/components/ToastHost';
import { useToasts } from '@/hooks/useToasts';
import { useTrimbleConnect } from '@/hooks/useTrimbleConnect';
import type { SearchQuery } from '@/types';

export default function App() {
  const { isBusy, isMockMode, models, error } = useTrimbleConnect();
  const { toasts, pushToast, dismissToast } = useToasts();

  const handleSearch = useCallback(
    (query: SearchQuery) => {
      if (!models.length) {
        pushToast({
          variant: 'warning',
          title: 'Aucun modèle chargé',
          message: 'Chargez un modèle IFC dans le viewer avant de lancer une recherche.',
        });
        return;
      }

      pushToast({
        variant: 'info',
        title: 'Recherche enregistrée',
        message: `"${query.text}" sur ${query.propertyId} — intégration résultats à venir.`,
      });
    },
    [models.length, pushToast],
  );

  return (
    <>
      <main className="app-shell">
        <ModusWcCard className="search-panel" padding="comfortable">
          {/* Les branches restent montées (hidden) : démonter des enfants slottés
              dans un hôte Modus provoque NotFoundError removeChild avec React. */}
          <header className="search-panel__header">
            <ModusWcTypography hierarchy="h3" label="Recherche d'éléments" />
            <div hidden={!isMockMode}>
              <ModusWcAlert variant="info" alertTitle="Mode développement">
                {error ?? 'Workspace API non disponible — interface testable hors Trimble Connect.'}
              </ModusWcAlert>
            </div>
          </header>

          <div className="search-panel__loading" hidden={!isBusy}>
            <ModusWcLoader />
            <ModusWcTypography hierarchy="p" label="Connexion au viewer…" />
          </div>
          <div hidden={isBusy}>
            <SearchBar onSearch={handleSearch} disabled={!models.length && !isMockMode} />
          </div>
        </ModusWcCard>
      </main>

      <ToastHost toasts={toasts} onDismiss={dismissToast} />
    </>
  );
}
