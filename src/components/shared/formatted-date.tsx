'use client';

import { useLocalizedFormat } from '@/hooks/use-localized-format';

type DateFormat = 'short' | 'medium' | 'long' | string;

interface FormattedDateProps {
  date: Date | string | null | undefined;
  format?: DateFormat;
  relative?: boolean;
  className?: string;
}

export function FormattedDate({
  date,
  format = 'medium',
  relative = false,
  className = '',
}: FormattedDateProps) {
  const { formatLocalizedDate, formatLocalizedRelativeDate } = useLocalizedFormat();

  if (!date) {
    return <span className={className}>-</span>;
  }

  if (relative) {
    return (
      <time dateTime={new Date(date).toISOString()} className={className}>
        {formatLocalizedRelativeDate(date)}
      </time>
    );
  }

  return (
    <time dateTime={new Date(date).toISOString()} className={className}>
      {formatLocalizedDate(date, format)}
    </time>
  );
}
