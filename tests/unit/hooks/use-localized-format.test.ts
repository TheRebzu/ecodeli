import { renderHook } from '@testing-library/react-hooks';
import { useLocalizedFormat } from '@/hooks/use-localized-format';
import { useLocale, useNow } from 'next-intl';
import { formatCurrency, formatDate, formatRelativeDate } from '@/lib/utils';
import { useUserPreferences } from '@/hooks/use-user-preferences';

// Mock des hooks et fonctions
jest.mock('next-intl', () => ({
  useLocale: jest.fn(),
  useNow: jest.fn(),
  useFormatter: jest.fn(() => ({
    number: jest.fn(value => `formatted_${value}`),
  })),
}));

jest.mock('@/lib/utils', () => ({
  formatCurrency: jest.fn(),
  formatDate: jest.fn(),
  formatRelativeDate: jest.fn(),
}));

jest.mock('@/hooks/use-user-preferences', () => ({
  useUserPreferences: jest.fn(),
}));

describe('useLocalizedFormat', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (useLocale as jest.Mock).mockReturnValue('fr');
    (useNow as jest.Mock).mockReturnValue(new Date('2023-01-01'));
    (useUserPreferences as jest.Mock).mockReturnValue({
      preferences: {
        dateFormat: 'medium',
        currencyFormat: 'EUR',
      },
    });
  });

  it('should format date correctly', () => {
    (formatDate as jest.Mock).mockReturnValue('1 janvier 2023');

    const { result } = renderHook(() => useLocalizedFormat());
    const formattedDate = result.current.formatLocalizedDate(new Date('2023-01-01'));

    expect(formatDate).toHaveBeenCalledWith(expect.any(Date), 'd MMMM yyyy', 'fr');
    expect(formattedDate).toBe('1 janvier 2023');
  });

  it('should format currency correctly', () => {
    (formatCurrency as jest.Mock).mockReturnValue('123,45 €');

    const { result } = renderHook(() => useLocalizedFormat());
    const formattedCurrency = result.current.formatLocalizedCurrency(123.45);

    expect(formatCurrency).toHaveBeenCalledWith(123.45, 'EUR', 'fr');
    expect(formattedCurrency).toBe('123,45 €');
  });

  it('should format relative date correctly', () => {
    (formatRelativeDate as jest.Mock).mockReturnValue('il y a 3 jours');

    const { result } = renderHook(() => useLocalizedFormat());
    const formattedRelativeDate = result.current.formatLocalizedRelativeDate(
      new Date('2022-12-29')
    );

    expect(formatRelativeDate).toHaveBeenCalledWith(expect.any(Date), 'fr');
    expect(formattedRelativeDate).toBe('il y a 3 jours');
  });

  it('should respect user preferences for date format', () => {
    (useUserPreferences as jest.Mock).mockReturnValue({
      preferences: {
        dateFormat: 'short',
        currencyFormat: 'EUR',
      },
    });

    (formatDate as jest.Mock).mockReturnValue('01/01/2023');

    const { result } = renderHook(() => useLocalizedFormat());
    const formattedDate = result.current.formatLocalizedDate(new Date('2023-01-01'));

    expect(formatDate).toHaveBeenCalledWith(expect.any(Date), 'dd/MM/yyyy', 'fr');
    expect(formattedDate).toBe('01/01/2023');
  });

  it('should respect user preferences for currency format', () => {
    (useUserPreferences as jest.Mock).mockReturnValue({
      preferences: {
        dateFormat: 'medium',
        currencyFormat: 'USD',
      },
    });

    (formatCurrency as jest.Mock).mockReturnValue('$123.45');

    const { result } = renderHook(() => useLocalizedFormat());
    const formattedCurrency = result.current.formatLocalizedCurrency(123.45);

    expect(formatCurrency).toHaveBeenCalledWith(123.45, 'USD', 'fr');
    expect(formattedCurrency).toBe('$123.45');
  });
});
