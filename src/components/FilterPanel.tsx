import { useCallback, useMemo, useState, type FormEvent } from 'react';

import {
  ModusWcAccordion,
  ModusWcButton,
  ModusWcCheckbox,
  ModusWcCollapse,
  ModusWcIcon,
  ModusWcSelect,
  ModusWcTextInput,
  ModusWcTypography,
} from '@trimble-oss/moduswebcomponents-react';

import { PropertyPicker } from '@/components/PropertyPicker';
import {
  DEFAULT_LEVEL1_PROPERTY_ID,
  DEFAULT_MATCH_MODE,
  DEFAULT_PROPERTY_ID,
  getPropertyLabel,
  MATCH_MODE_OPTIONS,
} from '@/config/searchProperties';
import type { FilterRule, HierarchyFilter, MatchMode } from '@/types';
import { readInputChecked, readInputString } from '@/utils/modusFormEvents';

export interface FilterPanelProps {
  availableLevel1Values: string[];
  scannedLevel1PropertyId: string | null;
  onApply: (filter: HierarchyFilter) => void;
  onScanModel: (propertyId: string) => void;
  disabled?: boolean;
  loading?: boolean;
}

function createEmptyRule(): FilterRule {
  return {
    propertyId: DEFAULT_PROPERTY_ID,
    matchMode: DEFAULT_MATCH_MODE,
    text: '',
  };
}

export function FilterPanel({
  availableLevel1Values,
  scannedLevel1PropertyId,
  onApply,
  onScanModel,
  disabled = false,
  loading = false,
}: FilterPanelProps) {
  const [level1PropertyId, setLevel1PropertyId] = useState(DEFAULT_LEVEL1_PROPERTY_ID);
  const [selectedLevel1Values, setSelectedLevel1Values] = useState<string[]>([]);
  const [rules, setRules] = useState<FilterRule[]>([createEmptyRule()]);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [level1Expanded, setLevel1Expanded] = useState(true);
  const [rulesExpanded, setRulesExpanded] = useState(false);

  const level1PropertyLabel = useMemo(
    () => getPropertyLabel(level1PropertyId),
    [level1PropertyId],
  );

  const level1ValuesReady =
    scannedLevel1PropertyId === level1PropertyId && availableLevel1Values.length > 0;

  const toggleLevel1Value = useCallback((value: string, checked: boolean) => {
    setSelectedLevel1Values((current) =>
      checked ? [...current, value] : current.filter((entry) => entry !== value),
    );
  }, []);

  const selectAllLevel1Values = useCallback(() => {
    setSelectedLevel1Values(availableLevel1Values);
  }, [availableLevel1Values]);

  const clearLevel1Values = useCallback(() => {
    setSelectedLevel1Values([]);
  }, []);

  const handleLevel1PropertyChange = useCallback((propertyId: string) => {
    setLevel1PropertyId(propertyId);
    setSelectedLevel1Values([]);
  }, []);

  const updateRule = useCallback((index: number, patch: Partial<FilterRule>) => {
    setRules((current) =>
      current.map((rule, position) => (position === index ? { ...rule, ...patch } : rule)),
    );
  }, []);

  const addRule = useCallback(() => {
    setRules((current) => [...current, createEmptyRule()]);
  }, []);

  const removeRule = useCallback((index: number) => {
    setRules((current) => (current.length <= 1 ? current : current.filter((_, i) => i !== index)));
  }, []);

  const handleSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      if (disabled || loading) return;

      onApply({
        level1: {
          propertyId: level1PropertyId,
          values: selectedLevel1Values,
        },
        rules: rules.filter((rule) => rule.text.trim().length > 0),
        caseSensitive,
      });
    },
    [caseSensitive, disabled, level1PropertyId, loading, onApply, rules, selectedLevel1Values],
  );

  const hasActiveFilter =
    selectedLevel1Values.length > 0 || rules.some((rule) => rule.text.trim().length > 0);

  return (
    <form className="filter-panel" onSubmit={handleSubmit} noValidate>
      <ModusWcAccordion aria-label="Filtres hiérarchiques">
        <ModusWcCollapse
          expanded={level1Expanded}
          options={{
            title: 'Niveau 1 — Filtre par propriété',
            description: `Restreindre par ${level1PropertyLabel}`,
            icon: 'layers',
            size: 'sm',
          }}
          onExpandedChange={(event: CustomEvent<{ expanded: boolean }>) =>
            setLevel1Expanded(event.detail.expanded)
          }
        >
          <div slot="content" className="filter-panel__section">
            <PropertyPicker
              className="filter-panel__level1-property"
              groupLabel="Famille niveau 1"
              propertyLabel="Propriété niveau 1"
              propertyId={level1PropertyId}
              disabled={disabled || loading}
              onPropertyChange={handleLevel1PropertyChange}
            />

            <div className="filter-panel__scan">
              <ModusWcTypography
                hierarchy="p"
                label="Choisissez une propriété puis analysez le modèle pour lister les valeurs disponibles."
              />
              <ModusWcButton
                type="button"
                variant="outlined"
                color="secondary"
                size="sm"
                disabled={disabled || loading}
                onButtonClick={() => onScanModel(level1PropertyId)}
              >
                Analyser le modèle
              </ModusWcButton>
            </div>

            {!level1ValuesReady ? (
              scannedLevel1PropertyId && scannedLevel1PropertyId !== level1PropertyId ? (
                <ModusWcTypography
                  hierarchy="p"
                  label="La propriété a changé : relancez l'analyse pour afficher les nouvelles valeurs."
                />
              ) : null
            ) : (
              <>
                <div className="filter-panel__type-actions">
                  <ModusWcButton
                    type="button"
                    variant="borderless"
                    size="xs"
                    disabled={disabled || loading}
                    onButtonClick={selectAllLevel1Values}
                  >
                    Tout sélectionner
                  </ModusWcButton>
                  <ModusWcButton
                    type="button"
                    variant="borderless"
                    size="xs"
                    disabled={disabled || loading}
                    onButtonClick={clearLevel1Values}
                  >
                    Effacer
                  </ModusWcButton>
                </div>
                <div className="filter-panel__type-list">
                  {availableLevel1Values.map((value) => (
                    <ModusWcCheckbox
                      key={value}
                      label={value}
                      size="sm"
                      value={selectedLevel1Values.includes(value)}
                      disabled={disabled || loading}
                      onInputChange={(event: CustomEvent) =>
                        toggleLevel1Value(value, readInputChecked(event))
                      }
                    />
                  ))}
                </div>
              </>
            )}
          </div>
        </ModusWcCollapse>

        <ModusWcCollapse
          expanded={rulesExpanded}
          options={{
            title: 'Niveau 2 — Filtres combinés',
            description: 'Règles sur les propriétés (ET logique)',
            icon: 'filter',
            size: 'sm',
          }}
          onExpandedChange={(event: CustomEvent<{ expanded: boolean }>) =>
            setRulesExpanded(event.detail.expanded)
          }
        >
          <div slot="content" className="filter-panel__section">
            {rules.map((rule, index) => (
              <div key={index} className="filter-panel__rule">
                <div className="filter-panel__rule-fields">
                  <PropertyPicker
                    className="filter-panel__rule-property"
                    groupLabel={`Famille ${index + 1}`}
                    propertyLabel={`Propriété ${index + 1}`}
                    propertyId={rule.propertyId}
                    disabled={disabled || loading}
                    onPropertyChange={(propertyId) => updateRule(index, { propertyId })}
                  />
                  <ModusWcSelect
                    className="filter-panel__rule-match"
                    label="Correspondance"
                    size="sm"
                    value={rule.matchMode}
                    options={MATCH_MODE_OPTIONS}
                    disabled={disabled || loading}
                    onInputChange={(event: CustomEvent) =>
                      updateRule(index, { matchMode: readInputString(event) as MatchMode })
                    }
                  />
                  <ModusWcTextInput
                    className="filter-panel__rule-value"
                    label="Valeur"
                    size="sm"
                    placeholder="Valeur à filtrer…"
                    value={rule.text}
                    disabled={disabled || loading}
                    onInputChange={(event: CustomEvent) =>
                      updateRule(index, { text: readInputString(event) })
                    }
                  />
                </div>
                <ModusWcButton
                  type="button"
                  className="filter-panel__rule-remove"
                  variant="borderless"
                  color="danger"
                  size="sm"
                  disabled={disabled || loading || rules.length <= 1}
                  onButtonClick={() => removeRule(index)}
                  aria-label={`Supprimer la règle ${index + 1}`}
                >
                  <ModusWcIcon name="close" size="xs" decorative />
                </ModusWcButton>
              </div>
            ))}

            <ModusWcButton
              type="button"
              variant="outlined"
              color="secondary"
              size="sm"
              disabled={disabled || loading}
              onButtonClick={addRule}
            >
              <ModusWcIcon name="add" size="xs" decorative slot="start" />
              Ajouter une règle
            </ModusWcButton>
          </div>
        </ModusWcCollapse>
      </ModusWcAccordion>

      <ModusWcCheckbox
        className="filter-panel__case"
        label="Sensible à la casse"
        size="sm"
        value={caseSensitive}
        disabled={disabled || loading}
        onInputChange={(event: CustomEvent) => setCaseSensitive(readInputChecked(event))}
      />

      <ModusWcButton
        type="submit"
        color="primary"
        size="md"
        disabled={disabled || loading || !hasActiveFilter}
      >
        <ModusWcIcon name="filter" size="xs" decorative slot="start" />
        Appliquer le filtre
      </ModusWcButton>
    </form>
  );
}
