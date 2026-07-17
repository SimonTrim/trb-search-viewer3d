import type { ModelObjectIds, SearchResult, TrimbleAPI } from '@/types';

export const HIGHLIGHT_COLOR = '#E9190F';

/** Au-delà de ce seuil, la colorisation peut être lente — avertir l'utilisateur. */
export const HIGHLIGHT_WARN_THRESHOLD = 1000;

function groupByModel(results: SearchResult[]): ModelObjectIds[] {
  const byModel = new Map<string, number[]>();
  for (const result of results) {
    const ids = byModel.get(result.modelId) ?? [];
    ids.push(result.runtimeId);
    byModel.set(result.modelId, ids);
  }
  return Array.from(byModel.entries(), ([modelId, objectRuntimeIds]) => ({
    modelId,
    objectRuntimeIds,
  }));
}

/**
 * Sélecteur "objets actuellement sélectionnés". La sélection est la seule
 * opération qui résout de façon fiable la géométrie de ces objets (y compris
 * les composites Nova dont les runtime IDs ne donnent ni bounding box ni
 * descendance via les APIs) : on sélectionne d'abord, puis on applique
 * couleur/visibilité/caméra sur { selected: true } pour laisser le viewer
 * résoudre lui-même les entités concernées.
 */
const SELECTED = { selected: true };

export interface HighlightOptions {
  isolate: boolean;
}

/**
 * Met en évidence les résultats dans le viewer (ordre imposé par le PRD) :
 * sélection → colorisation rouge → isolation optionnelle → cadrage caméra.
 */
export async function highlightResults(
  api: TrimbleAPI,
  results: SearchResult[],
  options: HighlightOptions,
): Promise<void> {
  if (!results.length) return;

  const modelObjectIds = groupByModel(results);

  await api.viewer.setSelection({ modelObjectIds }, 'set');

  if (options.isolate) {
    // Équivalent natif de « Afficher uniquement les objets sélectionnés » :
    // le viewer résout lui-même la géométrie des objets composites.
    try {
      await api.viewer.isolateEntities([{ modelObjectIds }]);
    } catch (isolateError) {
      console.warn('[RechercheElements] isolateEntities en échec:', isolateError);
      await api.viewer.setObjectState(undefined, { visible: false });
      await api.viewer.setObjectState(SELECTED, { visible: true });
    }
  }

  await api.viewer.setObjectState(SELECTED, { color: HIGHLIGHT_COLOR });

  // Cadre la caméra sur la sélection : le viewer connaît la géométrie réelle.
  await api.viewer.setCamera(SELECTED, { animationTime: 600 });
}

/** Sélectionne un élément unique et zoome dessus (clic sur une ligne de résultat). */
export async function zoomToResult(api: TrimbleAPI, result: SearchResult): Promise<void> {
  const modelObjectIds = [{ modelId: result.modelId, objectRuntimeIds: [result.runtimeId] }];
  await api.viewer.setSelection({ modelObjectIds }, 'set');
  await api.viewer.setCamera(SELECTED, { animationTime: 400 });
}

/** Restaure visibilité, couleurs et opacité du viewer. */
export async function resetViewer(api: TrimbleAPI): Promise<void> {
  await api.viewer.setObjectState(undefined, { visible: 'reset', color: 'reset' });
  await api.viewer.setOpacity(100);
}
