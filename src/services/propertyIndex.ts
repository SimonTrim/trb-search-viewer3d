import type { ObjectProperties, TrimbleAPI, ViewerModel } from '@/types';
import { batch } from '@/utils/batch';

export interface IndexedObject {
  modelId: string;
  modelName?: string;
  runtimeId: number;
  props: ObjectProperties;
}

export type IndexProgressCallback = (indexed: number, total: number) => void;

/** Seuil PRD : indexation progressive au-delà de 5 000 objets visibles. */
export const LAZY_INDEX_THRESHOLD = 5000;

/** Cache mémoire par modèle — jamais localStorage (iframe tierce). */
const modelCache = new Map<string, IndexedObject[]>();
const indexedIds = new Map<string, Set<number>>();

export function clearIndex(): void {
  modelCache.clear();
  indexedIds.clear();
}

export function invalidateModel(modelId: string): void {
  modelCache.delete(modelId);
  indexedIds.delete(modelId);
}

export function shouldUseLazyIndexing(totalVisible: number): boolean {
  return totalVisible > LAZY_INDEX_THRESHOLD;
}

export function getCachedIndex(models: ViewerModel[]): IndexedObject[] {
  return models.flatMap((model) => modelCache.get(model.id) ?? []);
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

async function getVisibleIdsByModel(api: TrimbleAPI): Promise<Map<string, number[]>> {
  const visibleByModel = new Map<string, number[]>();
  const rawEntries = (await api.viewer.getObjects(undefined, {
    visible: true,
  })) as RawModelObjects[];

  for (const entry of rawEntries) {
    if (!entry.modelId) continue;
    visibleByModel.set(entry.modelId, extractRuntimeIds(entry));
  }

  return visibleByModel;
}

/** Compte les objets visibles sans appeler getObjectProperties. */
export async function countVisibleObjects(
  api: TrimbleAPI,
  models: ViewerModel[],
): Promise<number> {
  const visibleByModel = await getVisibleIdsByModel(api);
  return models.reduce((sum, model) => sum + (visibleByModel.get(model.id)?.length ?? 0), 0);
}

function isRuntimeIdCached(modelId: string, runtimeId: number): boolean {
  return indexedIds.get(modelId)?.has(runtimeId) ?? false;
}

function findCachedEntry(modelId: string, runtimeId: number): IndexedObject | undefined {
  return modelCache.get(modelId)?.find((entry) => entry.runtimeId === runtimeId);
}

function addToCache(entry: IndexedObject): void {
  const list = modelCache.get(entry.modelId) ?? [];
  list.push(entry);
  modelCache.set(entry.modelId, list);

  const ids = indexedIds.get(entry.modelId) ?? new Set<number>();
  ids.add(entry.runtimeId);
  indexedIds.set(entry.modelId, ids);
}

function isModelFullyIndexed(modelId: string, runtimeIds: number[]): boolean {
  if (!runtimeIds.length) return true;
  const cached = indexedIds.get(modelId);
  if (!cached) return false;
  return runtimeIds.every((id) => cached.has(id));
}

async function yieldToMain(): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
}

async function fetchBatchEntries(
  api: TrimbleAPI,
  model: ViewerModel,
  runtimeIds: number[],
): Promise<IndexedObject[]> {
  const uncachedIds = runtimeIds.filter((id) => !isRuntimeIdCached(model.id, id));
  const entries: IndexedObject[] = [];

  if (uncachedIds.length > 0) {
    const propsBatch = (await api.viewer.getObjectProperties(
      model.id,
      uncachedIds,
    )) as ObjectProperties[];

    propsBatch.forEach((props, position) => {
      const runtimeId = props.runtimeId ?? props.id ?? uncachedIds[position];
      const entry: IndexedObject = {
        modelId: model.id,
        modelName: model.name,
        runtimeId,
        props,
      };
      addToCache(entry);
      entries.push(entry);
    });
  }

  for (const runtimeId of runtimeIds) {
    if (uncachedIds.includes(runtimeId)) continue;
    const cached = findCachedEntry(model.id, runtimeId);
    if (cached) entries.push(cached);
  }

  return entries;
}

/**
 * Parcourt tous les objets visibles par lots de 50.
 * Les lots déjà en cache sont réutilisés sans appel API supplémentaire.
 */
export async function iterateIndexedBatches(
  api: TrimbleAPI,
  models: ViewerModel[],
  onBatch: (entries: IndexedObject[]) => void | Promise<void>,
  onProgress?: IndexProgressCallback,
): Promise<void> {
  const visibleByModel = await getVisibleIdsByModel(api);
  const total = models.reduce(
    (sum, model) => sum + (visibleByModel.get(model.id)?.length ?? 0),
    0,
  );
  let processed = 0;

  onProgress?.(processed, total);

  for (const model of models) {
    const runtimeIds = visibleByModel.get(model.id) ?? [];

    for (const ids of batch(runtimeIds, 50)) {
      const entries = await fetchBatchEntries(api, model, ids);
      await onBatch(entries);

      processed += ids.length;
      onProgress?.(Math.min(processed, total), total);
      await yieldToMain();
    }
  }
}

/**
 * Construit (ou lit depuis le cache) l'index complet des propriétés.
 * Batchs de 50 runtimeIds — limite dure de l'API getObjectProperties.
 */
export async function buildIndex(
  api: TrimbleAPI,
  models: ViewerModel[],
  onProgress?: IndexProgressCallback,
): Promise<IndexedObject[]> {
  const visibleByModel = await getVisibleIdsByModel(api);
  const needsIndexing = models.some(
    (model) => !isModelFullyIndexed(model.id, visibleByModel.get(model.id) ?? []),
  );

  if (!needsIndexing) {
    const total = models.reduce(
      (sum, model) => sum + (visibleByModel.get(model.id)?.length ?? 0),
      0,
    );
    onProgress?.(total, total);
    return getCachedIndex(models);
  }

  await iterateIndexedBatches(api, models, () => {}, onProgress);
  return getCachedIndex(models);
}
