'use client';

import { useFormatter, useLocale, useTimeZone } from 'next-intl';
import type { NumberFormatOptions } from 'next-intl';

type DateFormatType = 'short' | 'medium' | 'long' | 'full';
type CurrencyCode = string;

/**
 * Hook that provides localized formatting utilities for dates, numbers, and currencies
 * @returns Object with utility functions for various formatting needs
 */
export function useLocalizedFormat() {
  const locale = useLocale();
  const timeZone = useTimeZone();
  const formatter = useFormatter();

  /**
   * Format a date according to the user's locale
   * @param date Date to format
   * @param style Style of formatting (short, medium, long, full)
   * @returns Formatted date string
   */
  const formatLocalizedDate = (date: Date, style: DateFormatType = 'medium') => {
    return formatter.dateTime(date, {
      dateStyle: style,
      timeZone,
    });
  };

  /**
   * Format a date as a relative time (e.g., "2 days ago")
   * @param date Date to format
   * @returns Relative date string
   */
  const formatLocalizedRelativeDate = (date: Date) => {
    return formatter.relativeTime(date);
  };

  /**
   * Format a number as currency with the user's locale
   * @param amount Amount to format
   * @param currency Currency code (e.g., "USD", "EUR")
   * @returns Formatted currency string
   */
  const formatLocalizedCurrency = (amount: number, currency: CurrencyCode = 'EUR') => {
    return formatter.number(amount, {
      style: 'currency',
      currency,
    });
  };

  /**
   * Format a number according to the user's locale
   * @param value Number to format
   * @param options Formatting options
   * @returns Formatted number string
   */
  const formatLocalizedNumber = (value: number, options?: NumberFormatOptions) => {
    return formatter.number(value, options);
  };

  return {
    formatLocalizedDate,
    formatLocalizedRelativeDate,
    formatLocalizedCurrency,
    formatLocalizedNumber,
    locale,
    timeZone,
  };
}
