import type { ModelObjectIds, SearchResult, TrimbleAPI, Vector3 } from '@/types';

export const HIGHLIGHT_COLOR = '#E9190F';

/** Au-delà de ce seuil, la colorisation peut être lente — avertir l'utilisateur. */
export const HIGHLIGHT_WARN_THRESHOLD = 1000;

/**
 * En dessous de cette diagonale (en mètres), le "zoom to fit" natif risque de
 * placer la caméra dans l'objet : on cadre manuellement avec du recul.
 */
const MIN_FIT_DIAGONAL_M = 1;

/** Recul minimal de la caméra pour les objets plats ou ponctuels (en mètres). */
const MIN_CAMERA_DISTANCE_M = 3;

interface BoundingBox {
  min: Vector3;
  max: Vector3;
}

function mergeBoxes(boxes: BoundingBox[]): BoundingBox {
  const merged: BoundingBox = {
    min: { x: Infinity, y: Infinity, z: Infinity },
    max: { x: -Infinity, y: -Infinity, z: -Infinity },
  };
  for (const box of boxes) {
    for (const axis of ['x', 'y', 'z'] as const) {
      merged.min[axis] = Math.min(merged.min[axis], box.min[axis]);
      merged.max[axis] = Math.max(merged.max[axis], box.max[axis]);
    }
  }
  return merged;
}

/**
 * Cadre la caméra sur les objets. Utilise le fit natif quand la géométrie a une
 * taille raisonnable ; sinon positionne manuellement la caméra avec un recul
 * minimal pour éviter que l'objet disparaisse (near-plane clipping).
 */
async function fitCameraToObjects(
  api: TrimbleAPI,
  modelObjectIds: ModelObjectIds[],
  animationTime: number,
): Promise<void> {
  let boxes: BoundingBox[] = [];
  try {
    for (const { modelId, objectRuntimeIds } of modelObjectIds) {
      if (!objectRuntimeIds?.length) continue;
      const result = await api.viewer.getObjectBoundingBoxes(modelId, objectRuntimeIds);
      boxes = boxes.concat(
        result.filter((box): box is BoundingBox => Boolean(box?.min && box?.max)),
      );
    }
    console.log(
      `[RechercheElements] Bounding boxes: ${boxes.length}`,
      JSON.stringify(boxes.slice(0, 4)),
    );
  } catch (boxError) {
    console.warn('[RechercheElements] getObjectBoundingBoxes indisponible:', boxError);
  }

  if (!boxes.length) {
    await api.viewer.setCamera({ modelObjectIds }, { animationTime });
    return;
  }

  const merged = mergeBoxes(boxes);
  const size = {
    x: merged.max.x - merged.min.x,
    y: merged.max.y - merged.min.y,
    z: merged.max.z - merged.min.z,
  };
  const diagonal = Math.hypot(size.x, size.y, size.z);

  if (diagonal >= MIN_FIT_DIAGONAL_M) {
    await api.viewer.setCamera({ modelObjectIds }, { animationTime });
    return;
  }

  const center = {
    x: (merged.min.x + merged.max.x) / 2,
    y: (merged.min.y + merged.max.y) / 2,
    z: (merged.min.z + merged.max.z) / 2,
  };

  // Conserve la direction de vue actuelle si possible, sinon vue 3/4 standard.
  let direction: Vector3 = { x: -0.577, y: -0.577, z: -0.577 };
  try {
    const camera = await api.viewer.getCamera();
    const dx = camera.target.x - camera.position.x;
    const dy = camera.target.y - camera.position.y;
    const dz = camera.target.z - camera.position.z;
    const length = Math.hypot(dx, dy, dz);
    if (length > 1e-6) {
      direction = { x: dx / length, y: dy / length, z: dz / length };
    }
  } catch {
    // getCamera indisponible : direction par défaut.
  }

  const distance = Math.max(diagonal * 4, MIN_CAMERA_DISTANCE_M);
  await api.viewer.setCamera(
    {
      position: {
        x: center.x - direction.x * distance,
        y: center.y - direction.y * distance,
        z: center.z - direction.z * distance,
      },
      target: center,
      up: { x: 0, y: 0, z: 1 },
    },
    { animationTime },
  );
}

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

interface RawModelObjects {
  modelId?: string;
  objects?: Array<{ id?: number }>;
}

/**
 * Les objets composites (ex. terminaux Nova) ne portent pas la géométrie :
 * elle appartient à des entités enfants (getObjectBoundingBoxes renvoie 0 boîte
 * pour les parents). On résout donc explicitement toute la descendance, via la
 * hiérarchie (assemblages, conteneurs, groupes) et getObjects récursif.
 */
async function expandWithDescendants(
  api: TrimbleAPI,
  modelObjectIds: ModelObjectIds[],
): Promise<ModelObjectIds[]> {
  const expanded: ModelObjectIds[] = [];

  for (const group of modelObjectIds) {
    const baseIds = group.objectRuntimeIds ?? [];
    const ids = new Set(baseIds);

    // HierarchyType: 4 = ElementAssembly, 3 = Containment, 5 = Group.
    for (const hierarchyType of [4, 3, 5]) {
      try {
        const children = await api.viewer.getHierarchyChildren(
          group.modelId,
          baseIds,
          hierarchyType,
          true,
        );
        for (const child of children ?? []) {
          if (typeof child.id === 'number') ids.add(child.id);
        }
      } catch {
        // Type de hiérarchie non supporté pour ces objets : on continue.
      }
    }

    try {
      const raw = (await api.viewer.getObjects({
        modelObjectIds: [{ ...group, recursive: true }],
      })) as RawModelObjects[];
      for (const entry of raw ?? []) {
        if (entry.modelId && entry.modelId !== group.modelId) continue;
        for (const object of entry.objects ?? []) {
          if (typeof object.id === 'number') ids.add(object.id);
        }
      }
    } catch {
      // getObjects avec sélecteur non supporté : on garde la hiérarchie.
    }

    console.log(
      `[RechercheElements] Descendants: ${baseIds.length} parent(s) → ${ids.size} entité(s) (modèle ${group.modelId})`,
    );
    expanded.push({ modelId: group.modelId, objectRuntimeIds: Array.from(ids) });
  }

  return expanded;
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
  const withDescendants = await expandWithDescendants(api, modelObjectIds);

  await api.viewer.setSelection({ modelObjectIds }, 'set');
  await api.viewer.setObjectState(
    { modelObjectIds: withDescendants },
    { color: HIGHLIGHT_COLOR },
  );

  if (options.isolate) {
    // isolateEntities attend des entityIds externes (pas des runtime IDs) :
    // on isole via setObjectState, qui accepte le même ObjectSelector.
    await api.viewer.setObjectState(undefined, { visible: false });
    await api.viewer.setObjectState({ modelObjectIds: withDescendants }, { visible: true });
  }

  // Cadre la caméra sur l'ensemble des résultats pour qu'ils soient visibles.
  await fitCameraToObjects(api, withDescendants, 600);
}

/** Sélectionne un élément unique et zoome dessus (clic sur une ligne de résultat). */
export async function zoomToResult(api: TrimbleAPI, result: SearchResult): Promise<void> {
  const modelObjectIds = [{ modelId: result.modelId, objectRuntimeIds: [result.runtimeId] }];
  const withDescendants = await expandWithDescendants(api, modelObjectIds);
  await api.viewer.setSelection({ modelObjectIds }, 'set');
  await fitCameraToObjects(api, withDescendants, 400);
}

/** Restaure visibilité, couleurs et opacité du viewer. */
export async function resetViewer(api: TrimbleAPI): Promise<void> {
  await api.viewer.setObjectState(undefined, { visible: 'reset', color: 'reset' });
  await api.viewer.setOpacity(100);
}
