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
  await api.viewer.setObjectState({ modelObjectIds }, { color: HIGHLIGHT_COLOR });

  if (options.isolate) {
    // isolateEntities attend des entityIds externes (pas des runtime IDs) :
    // on isole via setObjectState, qui accepte le même ObjectSelector.
    await api.viewer.setObjectState(undefined, { visible: false });
    await api.viewer.setObjectState({ modelObjectIds }, { visible: true });
  }

  // Cadre la caméra sur l'ensemble des résultats pour qu'ils soient visibles.
  await api.viewer.setCamera({ modelObjectIds }, { animationTime: 600 });
}

/** Sélectionne un élément unique et zoome dessus (clic sur une ligne de résultat). */
export async function zoomToResult(api: TrimbleAPI, result: SearchResult): Promise<void> {
  const selector = {
    modelObjectIds: [{ modelId: result.modelId, objectRuntimeIds: [result.runtimeId] }],
  };
  await api.viewer.setSelection(selector, 'set');
  // setCamera accepte un ObjectSelector ({ modelObjectIds }) pour cadrer les objets.
  await api.viewer.setCamera(selector, { animationTime: 400 });
}

/** Restaure visibilité, couleurs et opacité du viewer. */
export async function resetViewer(api: TrimbleAPI): Promise<void> {
  await api.viewer.setObjectState(undefined, { visible: 'reset', color: 'reset' });
  await api.viewer.setOpacity(100);
}
