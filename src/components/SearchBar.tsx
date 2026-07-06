import { useCallback, useState, type FormEvent } from 'react';

import {
  ModusWcButton,
  ModusWcCheckbox,
  ModusWcIcon,
  ModusWcSelect,
  ModusWcTextInput,
} from '@trimble-oss/moduswebcomponents-react';

import {
  DEFAULT_MATCH_MODE,
  DEFAULT_PROPERTY_ID,
  MATCH_MODE_OPTIONS,
  PROPERTY_SELECT_OPTIONS,
} from '@/config/searchProperties';
import type { MatchMode, SearchQuery } from '@/types';
import { readInputChecked, readInputString } from '@/utils/modusFormEvents';

export interface SearchBarProps {
  onSearch: (query: SearchQuery) => void;
  disabled?: boolean;
  loading?: boolean;
}

export function SearchBar({ onSearch, disabled = false, loading = false }: SearchBarProps) {
  const [text, setText] = useState('');
  const [propertyId, setPropertyId] = useState(DEFAULT_PROPERTY_ID);
  const [matchMode, setMatchMode] = useState<MatchMode>(DEFAULT_MATCH_MODE);
  const [caseSensitive, setCaseSensitive] = useState(false);

  const submitSearch = useCallback(() => {
    const trimmed = text.trim();
    if (!trimmed || disabled || loading) return;

    onSearch({
      text: trimmed,
      propertyId,
      matchMode,
      caseSensitive,
    });
  }, [caseSensitive, disabled, loading, matchMode, onSearch, propertyId, text]);

  const handleSubmit = useCallback(
    (event: FormEvent) => {
      event.preventDefault();
      submitSearch();
    },
    [submitSearch],
  );

  return (
    <form className="search-bar" onSubmit={handleSubmit} noValidate>
      <div className="search-bar__row search-bar__row--primary">
        <ModusWcTextInput
          className="search-bar__text"
          label="Recherche"
          placeholder="Rechercher…"
          size="md"
          value={text}
          disabled={disabled || loading}
          onInputChange={(event: CustomEvent) => setText(readInputString(event))}
        />

        <ModusWcSelect
          className="search-bar__property"
          label="Propriété"
          size="sm"
          value={propertyId}
          options={PROPERTY_SELECT_OPTIONS}
          disabled={disabled || loading}
          onInputChange={(event: CustomEvent) => setPropertyId(readInputString(event))}
        />
      </div>

      <div className="search-bar__row search-bar__row--actions">
        <ModusWcSelect
          className="search-bar__match-mode"
          label="Correspondance"
          size="sm"
          value={matchMode}
          options={MATCH_MODE_OPTIONS}
          disabled={disabled || loading}
          onInputChange={(event: CustomEvent) => setMatchMode(readInputString(event) as MatchMode)}
        />

        <ModusWcButton
          className="search-bar__submit"
          type="submit"
          color="primary"
          size="md"
          disabled={disabled || loading || text.trim().length === 0}
        >
          <ModusWcIcon name="search" size="xs" decorative slot="start" />
          Rechercher
        </ModusWcButton>
      </div>

      <ModusWcCheckbox
        className="search-bar__case"
        label="Sensible à la casse"
        value={caseSensitive}
        disabled={disabled || loading}
        onInputChange={(event: CustomEvent) => setCaseSensitive(readInputChecked(event))}
      />
    </form>
  );
}
