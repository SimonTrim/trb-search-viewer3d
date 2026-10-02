import type { ViewerModel } from '@/types';

import type { IndexedObject } from './propertyIndex';

const MAX_SAMPLE_VALUES = 25;
const PRODUCT_SET = '__IFC_PRODUCT__';
const IFC_CLASS_SET = '__IFC_CLASS__';

export interface PropertyCatalogEntry {
  propertySet: string;
  propertyName: string;
  filledObjectCount: number;
  distinctValueCount: number;
  sampleValues: string[];
}

export interface PropertyCatalogIfcClass {
  ifcClass: string;
  count: number;
}

export interface PropertyCatalog {
  schemaVersion: 1;
  exportedAt: string;
  projectName?: string;
  models: Array<{ id: string; name?: string }>;
  totalObjects: number;
  ifcClasses: PropertyCatalogIfcClass[];
  properties: PropertyCatalogEntry[];
}

interface PropertyAccumulator {
  propertySet: string;
  propertyName: string;
  values: Set<string>;
  filledObjectCount: number;
}

function catalogKey(propertySet: string, propertyName: string): string {
  return `${propertySet}\u0000${propertyName}`;
}

function addValue(accumulator: PropertyAccumulator, rawValue: unknown): void {
  const value = String(rawValue ?? '').trim();
  if (!value) return;
  accumulator.filledObjectCount += 1;
  accumulator.values.add(value);
}

function getOrCreateAccumulator(
  registry: Map<string, PropertyAccumulator>,
  propertySet: string,
  propertyName: string,
): PropertyAccumulator {
  const key = catalogKey(propertySet, propertyName);
  const existing = registry.get(key);
  if (existing) return existing;

  const created: PropertyAccumulator = {
    propertySet,
    propertyName,
    values: new Set<string>(),
    filledObjectCount: 0,
  };
  registry.set(key, created);
  return created;
}

function toCatalogEntry(accumulator: PropertyAccumulator): PropertyCatalogEntry {
  const sampleValues = Array.from(accumulator.values)
    .sort((left, right) => left.localeCompare(right, 'fr'))
    .slice(0, MAX_SAMPLE_VALUES);

  return {
    propertySet: accumulator.propertySet,
    propertyName: accumulator.propertyName,
    filledObjectCount: accumulator.filledObjectCount,
    distinctValueCount: accumulator.values.size,
    sampleValues,
  };
}

/** Agrège toutes les propriétés distinctes rencontrées dans l'index. */
export function buildPropertyCatalog(
  indexed: IndexedObject[],
  models: ViewerModel[],
  projectName?: string,
): PropertyCatalog {
  const registry = new Map<string, PropertyAccumulator>();
  const ifcClassCounts = new Map<string, number>();

  for (const entry of indexed) {
    const ifcClass = entry.props.class ?? entry.props.type ?? '';
    if (ifcClass) {
      ifcClassCounts.set(ifcClass, (ifcClassCounts.get(ifcClass) ?? 0) + 1);
    }

    addValue(getOrCreateAccumulator(registry, IFC_CLASS_SET, 'class'), ifcClass);
    addValue(getOrCreateAccumulator(registry, PRODUCT_SET, 'name'), entry.props.product?.name ?? entry.props.name);
    addValue(
      getOrCreateAccumulator(registry, PRODUCT_SET, 'description'),
      entry.props.product?.description,
    );
    addValue(
      getOrCreateAccumulator(registry, PRODUCT_SET, 'objectType'),
      entry.props.product?.objectType,
    );

    for (const propertySet of entry.props.properties ?? []) {
      const setName = propertySet.set ?? propertySet.name ?? 'Sans nom';
      for (const property of propertySet.properties ?? []) {
        addValue(getOrCreateAccumulator(registry, setName, property.name), property.value);
      }
    }
  }

  const properties = Array.from(registry.values())
    .map(toCatalogEntry)
    .filter((item) => item.filledObjectCount > 0)
    .sort(
      (left, right) =>
        left.propertySet.localeCompare(right.propertySet, 'fr') ||
        left.propertyName.localeCompare(right.propertyName, 'fr'),
    );

  const ifcClasses = Array.from(ifcClassCounts.entries())
    .map(([ifcClass, count]) => ({ ifcClass, count }))
    .sort((left, right) => right.count - left.count || left.ifcClass.localeCompare(right.ifcClass, 'fr'));

  return {
    schemaVersion: 1,
    exportedAt: new Date().toISOString(),
    projectName,
    models: models.map((model) => ({ id: model.id, name: model.name })),
    totalObjects: indexed.length,
    ifcClasses,
    properties,
  };
}

export function buildPropertyCatalogFilename(projectName?: string): string {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
  const safeProject = (projectName ?? 'projet')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9_-]+/g, '_')
    .slice(0, 40);

  return `catalogue-proprietes-${safeProject}-${stamp}.json`;
}

export function downloadPropertyCatalog(catalog: PropertyCatalog): void {
  const filename = buildPropertyCatalogFilename(catalog.projectName);
  const blob = new Blob([JSON.stringify(catalog, null, 2)], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.rel = 'noopener';
  link.click();
  URL.revokeObjectURL(url);
}
