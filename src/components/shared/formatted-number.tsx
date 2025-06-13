"use client";

import { useLocalizedFormat } from "@/hooks/system/use-socket";

interface FormattedNumberProps {
  value: number | null | undefined;
  type?: "decimal" | "currency" | "percent";
  currency?: string;
  className?: string;
  options?: Intl.NumberFormatOptions;
}

export function FormattedNumber({
  value,
  type = "decimal",
  currency,
  className = "",
  options,
}: FormattedNumberProps) {
  const { formatLocalizedCurrency, formatLocalizedNumber } =
    useLocalizedFormat();

  if (value === null || value === undefined) {
    return <span className={className}>-</span>;
  }

  if (type === "currency") {
    return (
      <span className={className}>
        {formatLocalizedCurrency(value, currency)}
      </span>
    );
  }

  if (type === "percent") {
    return (
      <span className={className}>
        {formatLocalizedNumber(value, { style: "percent", ...options })}
      </span>
    );
  }

  return (
    <span className={className}>{formatLocalizedNumber(value, options)}</span>
  );
}
