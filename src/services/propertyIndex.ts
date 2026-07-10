import type { ObjectProperties, TrimbleAPI, ViewerModel } from '@/types';
import { batch } from '@/utils/batch';

export interface IndexedObject {
  modelId: string;
  modelName?: string;
  runtimeId: number;
  props: ObjectProperties;
}

export type IndexProgressCallback = (indexed: number, total: number) => void;

/** Cache mémoire par modèle — jamais localStorage (iframe tierce). */
const modelCache = new Map<string, IndexedObject[]>();

export function clearIndex(): void {
  modelCache.clear();
}

export function invalidateModel(modelId: string): void {
  modelCache.delete(modelId);
}

interface RawModelObjects {
  modelId?: string;
  objectRuntimeIds?: number[];
  objects?: Array<{ id?: number }>;
}

function extractRuntimeIds(entry: RawModelObjects): number[] {
  if (Array.isArray(entry.objectRuntimeIds)) return entry.objectRuntimeIds;
  if (Array.isArray(entry.objects)) {
    return entry.objects
      .map((object) => object.id)
      .filter((id): id is number => typeof id === 'number');
  }
  return [];
}

async function indexModel(
  api: TrimbleAPI,
  model: ViewerModel,
  runtimeIds: number[],
  onBatchDone: (count: number) => void,
): Promise<IndexedObject[]> {
  const indexed: IndexedObject[] = [];

  for (const ids of batch(runtimeIds, 50)) {
    const propsBatch = (await api.viewer.getObjectProperties(model.id, ids)) as ObjectProperties[];

    propsBatch.forEach((props, position) => {
      const runtimeId = props.runtimeId ?? props.id ?? ids[position];
      indexed.push({
        modelId: model.id,
        modelName: model.name,
        runtimeId,
        props,
      });
    });

    onBatchDone(ids.length);
  }

  return indexed;
}

/**
 * Construit (ou lit depuis le cache) l'index des propriétés de tous les modèles chargés.
 * Batchs de 50 runtimeIds — limite dure de l'API getObjectProperties.
 */
export async function buildIndex(
  api: TrimbleAPI,
  models: ViewerModel[],
  onProgress?: IndexProgressCallback,
): Promise<IndexedObject[]> {
  const visibleByModel = new Map<string, number[]>();
  const rawEntries = (await api.viewer.getObjects(undefined, {
    visible: true,
  })) as RawModelObjects[];

  for (const entry of rawEntries) {
    if (!entry.modelId) continue;
    visibleByModel.set(entry.modelId, extractRuntimeIds(entry));
  }

  const modelsToIndex = models.filter((model) => !modelCache.has(model.id));
  const total = modelsToIndex.reduce(
    (sum, model) => sum + (visibleByModel.get(model.id)?.length ?? 0),
    0,
  );
  let done = 0;

  for (const model of modelsToIndex) {
    const runtimeIds = visibleByModel.get(model.id) ?? [];
    const indexed = await indexModel(api, model, runtimeIds, (count) => {
      done += count;
      onProgress?.(done, total);
    });
    modelCache.set(model.id, indexed);
  }

  return models.flatMap((model) => modelCache.get(model.id) ?? []);
}
