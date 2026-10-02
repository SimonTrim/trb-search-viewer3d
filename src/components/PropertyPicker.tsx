import { useCallback, useEffect, useMemo, useState } from 'react';

import { ModusWcSelect } from '@trimble-oss/moduswebcomponents-react';

import {
  getDefaultGroupForProperty,
  getPropertyGroup,
  getPropertyOptionsForGroup,
  PROPERTY_GROUP_SELECT_OPTIONS,
  resolvePropertyInGroup,
  type PropertyGroupId,
} from '@/config/propertyGroups';
import { readInputString } from '@/utils/modusFormEvents';

export interface PropertyPickerProps {
  propertyId: string;
  onPropertyChange: (propertyId: string) => void;
  disabled?: boolean;
  groupLabel?: string;
  propertyLabel?: string;
  className?: string;
  size?: 'sm' | 'md';
}

export function PropertyPicker({
  propertyId,
  onPropertyChange,
  disabled = false,
  groupLabel = 'Famille de propriétés',
  propertyLabel = 'Propriété',
  className,
  size = 'sm',
}: PropertyPickerProps) {
  const [groupId, setGroupId] = useState<PropertyGroupId>(() => getDefaultGroupForProperty(propertyId));

  useEffect(() => {
    setGroupId(getDefaultGroupForProperty(propertyId));
  }, [propertyId]);

  const propertyOptions = useMemo(() => getPropertyOptionsForGroup(groupId), [groupId]);
  const groupDescription = useMemo(() => getPropertyGroup(groupId).description, [groupId]);
  const resolvedPropertyId = useMemo(
    () => resolvePropertyInGroup(groupId, propertyId),
    [groupId, propertyId],
  );

  const handleGroupChange = useCallback(
    (nextGroupId: PropertyGroupId) => {
      setGroupId(nextGroupId);
      const nextPropertyId = resolvePropertyInGroup(nextGroupId, propertyId);
      onPropertyChange(nextPropertyId);
    },
    [onPropertyChange, propertyId],
  );

  const handlePropertyChange = useCallback(
    (nextPropertyId: string) => {
      onPropertyChange(nextPropertyId);
    },
    [onPropertyChange],
  );

  return (
    <div className={['property-picker', className].filter(Boolean).join(' ')}>
      <ModusWcSelect
        className="property-picker__group"
        label={groupLabel}
        size={size}
        value={groupId}
        options={PROPERTY_GROUP_SELECT_OPTIONS}
        disabled={disabled}
        onInputChange={(event: CustomEvent) =>
          handleGroupChange(readInputString(event) as PropertyGroupId)
        }
      />
      <ModusWcSelect
        className="property-picker__property"
        label={propertyLabel}
        size={size}
        value={resolvedPropertyId}
        options={propertyOptions}
        disabled={disabled}
        aria-description={groupDescription}
        onInputChange={(event: CustomEvent) => handlePropertyChange(readInputString(event))}
      />
    </div>
  );
}
