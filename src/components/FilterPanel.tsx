import { useCallback, useState, type FormEvent } from 'react';

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

import {
  DEFAULT_MATCH_MODE,
  DEFAULT_PROPERTY_ID,
  MATCH_MODE_OPTIONS,
  PROPERTY_SELECT_OPTIONS,
} from '@/config/searchProperties';
import type { FilterRule, HierarchyFilter, MatchMode } from '@/types';
import { readInputChecked, readInputString } from '@/utils/modusFormEvents';

export interface FilterPanelProps {
  availableTypes: string[];
  onApply: (filter: HierarchyFilter) => void;
  onScanTypes?: () => void;
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
  availableTypes,
  onApply,
  onScanTypes,
  disabled = false,
  loading = false,
}: FilterPanelProps) {
  const [selectedTypes, setSelectedTypes] = useState<string[]>([]);
  const [rules, setRules] = useState<FilterRule[]>([createEmptyRule()]);
  const [caseSensitive, setCaseSensitive] = useState(false);
  const [typesExpanded, setTypesExpanded] = useState(true);
  const [rulesExpanded, setRulesExpanded] = useState(false);

  const toggleType = useCallback((ifcType: string, checked: boolean) => {
    setSelectedTypes((current) =>
      checked ? [...current, ifcType] : current.filter((type) => type !== ifcType),
    );
  }, []);

  const selectAllTypes = useCallback(() => {
    setSelectedTypes(availableTypes);
  }, [availableTypes]);

  const clearTypes = useCallback(() => {
    setSelectedTypes([]);
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
        ifcTypes: selectedTypes,
        rules: rules.filter((rule) => rule.text.trim().length > 0),
        caseSensitive,
      });
    },
    [caseSensitive, disabled, loading, onApply, rules, selectedTypes],
  );

  const hasActiveFilter =
    selectedTypes.length > 0 || rules.some((rule) => rule.text.trim().length > 0);

  return (
    <form className="filter-panel" onSubmit={handleSubmit} noValidate>
      <ModusWcAccordion aria-label="Filtres hiérarchiques">
        <ModusWcCollapse
          expanded={typesExpanded}
          options={{
            title: 'Niveau 1 — Types d\'objet',
            description: 'Isoler par type IFC (IfcSpace, IfcColumn…)',
            icon: 'layers',
            size: 'sm',
          }}
          onExpandedChange={(event: CustomEvent<{ expanded: boolean }>) =>
            setTypesExpanded(event.detail.expanded)
          }
        >
          <div slot="content" className="filter-panel__section">
            {availableTypes.length === 0 ? (
              <div className="filter-panel__scan">
                <ModusWcTypography
                  hierarchy="p"
                  label="Analysez le modèle pour lister les types IFC disponibles."
                />
                {onScanTypes ? (
                  <ModusWcButton
                    type="button"
                    variant="outlined"
                    color="secondary"
                    size="sm"
                    disabled={disabled || loading}
                    onButtonClick={onScanTypes}
                  >
                    Analyser le modèle
                  </ModusWcButton>
                ) : null}
              </div>
            ) : (
              <>
                <div className="filter-panel__type-actions">
                  <ModusWcButton
                    type="button"
                    variant="borderless"
                    size="xs"
                    disabled={disabled || loading}
                    onButtonClick={selectAllTypes}
                  >
                    Tout sélectionner
                  </ModusWcButton>
                  <ModusWcButton
                    type="button"
                    variant="borderless"
                    size="xs"
                    disabled={disabled || loading}
                    onButtonClick={clearTypes}
                  >
                    Effacer
                  </ModusWcButton>
                </div>
                <div className="filter-panel__type-list">
                  {availableTypes.map((ifcType) => (
                    <ModusWcCheckbox
                      key={ifcType}
                      label={ifcType}
                      size="sm"
                      value={selectedTypes.includes(ifcType)}
                      disabled={disabled || loading}
                      onInputChange={(event: CustomEvent) =>
                        toggleType(ifcType, readInputChecked(event))
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
                <ModusWcSelect
                  className="filter-panel__rule-property"
                  label={`Propriété ${index + 1}`}
                  size="sm"
                  value={rule.propertyId}
                  options={PROPERTY_SELECT_OPTIONS}
                  disabled={disabled || loading}
                  onInputChange={(event: CustomEvent) =>
                    updateRule(index, { propertyId: readInputString(event) })
                  }
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
                <ModusWcButton
                  type="button"
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
