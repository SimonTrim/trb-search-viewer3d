import { ModusWcCheckbox } from '@trimble-oss/moduswebcomponents-react';

import { readInputChecked } from '@/utils/modusFormEvents';

export interface ViewerActionsBarProps {
  isolate: boolean;
  onIsolateChange: (isolate: boolean) => void;
  disabled?: boolean;
}

export function ViewerActionsBar({ isolate, onIsolateChange, disabled = false }: ViewerActionsBarProps) {
  return (
    <div className="viewer-actions">
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
