import { ModusWcProgress, ModusWcTypography } from '@trimble-oss/moduswebcomponents-react';

export interface IndexProgressBarProps {
  percent: number;
  indexed: number;
  total: number;
  lazyMode: boolean;
}

export function IndexProgressBar({ percent, indexed, total, lazyMode }: IndexProgressBarProps) {
  const safePercent = Math.max(0, Math.min(100, percent));
  const label = lazyMode
    ? `Analyse progressive : ${indexed.toLocaleString('fr-FR')} / ${total.toLocaleString('fr-FR')} objets (${safePercent} %)`
    : `Indexation : ${indexed.toLocaleString('fr-FR')} / ${total.toLocaleString('fr-FR')} objets (${safePercent} %)`;

  return (
    <div className="index-progress" role="status" aria-live="polite">
      <ModusWcTypography hierarchy="p" label={label} />
      <ModusWcProgress value={safePercent} max={100} label={`${safePercent} %`} />
    </div>
  );
}
