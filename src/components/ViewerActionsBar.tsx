import { ModusWcButton, ModusWcCheckbox, ModusWcIcon } from '@trimble-oss/moduswebcomponents-react';

import { readInputChecked } from '@/utils/modusFormEvents';

export interface ViewerActionsBarProps {
  isolate: boolean;
  onIsolateChange: (isolate: boolean) => void;
  onReset: () => void;
  disabled?: boolean;
}

export function ViewerActionsBar({
  isolate,
  onIsolateChange,
  onReset,
  disabled = false,
}: ViewerActionsBarProps) {
  return (
    <div className="viewer-actions">
      <ModusWcButton
        variant="outlined"
        color="secondary"
        size="sm"
        disabled={disabled}
        onButtonClick={onReset}
      >
        <ModusWcIcon name="refresh" size="xs" decorative slot="start" />
        Réinitialiser
      </ModusWcButton>

      <ModusWcCheckbox
        label="Isoler les résultats"
        size="sm"
        value={isolate}
        disabled={disabled}
        onInputChange={(event: CustomEvent) => onIsolateChange(readInputChecked(event))}
      />
    </div>
  );
}
