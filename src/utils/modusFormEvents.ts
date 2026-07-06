type WithValue = { value?: string | null };
type WithChecked = { checked?: boolean | null };

export function readInputString(event: CustomEvent): string {
  const target = (event.detail as InputEvent | undefined)?.target as WithValue | null;
  return target?.value ?? '';
}

export function readInputChecked(event: CustomEvent): boolean {
  const target = (event.detail as InputEvent | undefined)?.target as WithChecked | null;
  return Boolean(target?.checked);
}
