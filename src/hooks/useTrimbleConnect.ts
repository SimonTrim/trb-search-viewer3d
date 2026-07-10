import {
  createContext,
  createElement,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type PropsWithChildren,
} from 'react';

import type {
  TrimbleAPI,
  TrimbleConnectState,
  TrimbleWorkspaceGlobal,
  ViewerModel,
  ViewerSelection,
} from '@/types';

declare global {
  interface Window {
    TrimbleConnectWorkspace?: TrimbleWorkspaceGlobal;
  }
}

const MOCK_PROJECT = {
  id: 'mock-project',
  name: 'Projet démo (hors TC)',
};

const MOCK_MODELS: ViewerModel[] = [
  { id: 'mock-model-1', name: 'Maquette IFC démo' },
];

export interface TrimbleContextValue extends TrimbleConnectState {
  reloadModels: () => Promise<void>;
}

const defaultState: TrimbleContextValue = {
  api: null,
  project: null,
  accessToken: null,
  selection: [],
  models: [],
  isConnected: false,
  isEmbedded: false,
  isMockMode: false,
  isBusy: false,
  error: null,
  reloadModels: async () => undefined,
};

const TrimbleConnectContext = createContext<TrimbleContextValue>(defaultState);

export function useTrimbleConnect(): TrimbleContextValue {
  return useContext(TrimbleConnectContext);
}

function wait(ms: number) {
  return new Promise((resolve) => {
    window.setTimeout(resolve, ms);
  });
}

function normalizeModels(raw: unknown[]): ViewerModel[] {
  const models: ViewerModel[] = [];

  for (const entry of raw) {
    const model = entry as Record<string, unknown>;
    const id = String(model.id ?? model.modelId ?? '');
    if (!id) continue;
    models.push({
      id,
      name: typeof model.name === 'string' ? model.name : undefined,
    });
  }

  return models;
}

async function readViewerSnapshot(api: TrimbleAPI) {
  let models = normalizeModels(await api.viewer.getModels('loaded'));
  const selection = (await api.viewer.getSelection()) as ViewerSelection[];

  if (!models.length) {
    for (const retryDelay of [1200, 2400, 4000]) {
      await wait(retryDelay);
      models = normalizeModels(await api.viewer.getModels('loaded'));
      if (models.length) break;
    }
  }

  return { models, selection };
}

function useProvideTrimbleConnect(): TrimbleContextValue {
  const [state, setState] = useState<TrimbleConnectState>({
    api: null,
    project: null,
    accessToken: null,
    selection: [],
    models: [],
    isConnected: false,
    isEmbedded: false,
    isMockMode: false,
    isBusy: true,
    error: null,
  });

  const reloadModels = useCallback(async () => {
    if (!state.api) return;
    const snapshot = await readViewerSnapshot(state.api);
    setState((current) => ({ ...current, ...snapshot }));
  }, [state.api]);

  useEffect(() => {
    let cancelled = false;

    function updateIfMounted(nextState: Partial<TrimbleConnectState>) {
      if (cancelled) return;
      setState((current) => ({ ...current, ...nextState }));
    }

    async function connectToTrimble() {
      const isEmbedded = window.self !== window.top;
      const sdk = window.TrimbleConnectWorkspace;

      if (!isEmbedded || !sdk) {
        updateIfMounted({
          api: null,
          project: MOCK_PROJECT,
          accessToken: null,
          selection: [],
          models: MOCK_MODELS,
          isConnected: true,
          isEmbedded: false,
          isMockMode: true,
          isBusy: false,
          error: isEmbedded
            ? 'Workspace API indisponible — mode développement local actif.'
            : null,
        });
        return;
      }

      try {
        let apiRef: TrimbleAPI | null = null;

        console.log('[RechercheElements] Connexion au Workspace API…');
        const api = (await sdk.connect(window.parent, async (event: string, data: unknown) => {
          if (!apiRef) return;

          if (event === 'extension.accessToken') {
            updateIfMounted({ accessToken: typeof data === 'string' ? data : null });
          }

          if (event === 'viewer.selectionChanged' || event === 'viewer.onSelectionChanged') {
            updateIfMounted({
              selection: Array.isArray(data) ? (data as ViewerSelection[]) : [],
            });
          }

          if (
            event === 'viewer.modelLoaded' ||
            event === 'viewer.modelRemoved' ||
            event === 'viewer.onModelLoaded' ||
            event === 'viewer.onModelRemoved'
          ) {
            const snapshot = await readViewerSnapshot(apiRef);
            updateIfMounted(snapshot);
          }
        }, 30000)) as TrimbleAPI;

        apiRef = api;
        console.log('[RechercheElements] Connecté. Lecture projet + modèles…');

        const [project, snapshot] = await Promise.all([
          api.project.getCurrentProject(),
          readViewerSnapshot(api),
        ]);
        console.log(
          `[RechercheElements] Projet: ${project?.name ?? '?'} — ${snapshot.models.length} modèle(s) chargé(s)`,
        );

        updateIfMounted({
          api,
          project,
          selection: snapshot.selection,
          models: snapshot.models,
          isConnected: true,
          isEmbedded: true,
          isMockMode: false,
          isBusy: false,
          error: null,
        });

        // La demande de permission peut rester en attente d'une action utilisateur :
        // elle ne doit pas bloquer l'affichage de l'interface.
        api.extension
          .requestPermission('accesstoken')
          .then((permission) => {
            console.log('[RechercheElements] Permission accesstoken:', permission);
            if (permission !== 'pending' && permission !== 'denied') {
              updateIfMounted({ accessToken: permission });
            }
          })
          .catch((permissionError: unknown) => {
            console.warn('[RechercheElements] requestPermission en échec:', permissionError);
          });
      } catch (error) {
        console.error('[RechercheElements] Échec de connexion:', error);
        updateIfMounted({
          api: null,
          project: MOCK_PROJECT,
          accessToken: null,
          selection: [],
          models: MOCK_MODELS,
          isConnected: false,
          isEmbedded: true,
          isMockMode: true,
          isBusy: false,
          error: error instanceof Error ? error.message : 'Connexion Workspace API échouée.',
        });
      }
    }

    connectToTrimble();

    return () => {
      cancelled = true;
    };
  }, []);

  return useMemo(
    () => ({
      ...state,
      reloadModels,
    }),
    [reloadModels, state],
  );
}

export function TrimbleConnectProvider({ children }: PropsWithChildren) {
  const value = useProvideTrimbleConnect();
  return createElement(TrimbleConnectContext.Provider, { value }, children);
}
