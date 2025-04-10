import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import ProviderCalendar from '@/app/provider/calendar/page';

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('ProviderCalendar Component', () => {
  const mockRouter = { push: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it('renders the calendar page correctly', () => {
    render(<ProviderCalendar />);

    // Check if the title is rendered
    expect(screen.getByText('Mon calendrier')).toBeInTheDocument();

    // Check if the tabs are rendered
    expect(screen.getByRole('tab', { name: 'Calendrier' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Liste' })).toBeInTheDocument();

    // Check if the view selector is rendered
    expect(screen.getByText('Sélectionner une vue')).toBeInTheDocument();

    // Check if the "Définir mes disponibilités" button is rendered
    expect(screen.getByText('Définir mes disponibilités')).toBeInTheDocument();
  });

  it('navigates to availability page when button is clicked', () => {
    render(<ProviderCalendar />);

    const availabilityButton = screen.getByText('Définir mes disponibilités');
    fireEvent.click(availabilityButton);

    expect(mockRouter.push).toHaveBeenCalledWith('/provider/availability');
  });

  it('changes view when selecting different view options', () => {
    render(<ProviderCalendar />);

    // Open the select dropdown
    const viewSelector = screen.getByText('Sélectionner une vue');
    fireEvent.click(viewSelector);

    // Select "Jour" view
    const dayOption = screen.getByText('Jour');
    fireEvent.click(dayOption);

    // Check if the day view is rendered
    expect(screen.getByText('Vue journalière')).toBeInTheDocument();
  });

  it('navigates between dates using navigation buttons', () => {
    render(<ProviderCalendar />);

    // Get the initial date text
    const initialDateText = screen.getByText(/Semaine du/i).textContent;

    // Click the next button
    const nextButton = screen.getAllByRole('button')[2]; // The right arrow button
    fireEvent.click(nextButton);

    // Check if the date has changed
    const newDateText = screen.getByText(/Semaine du/i).textContent;
    expect(newDateText).not.toEqual(initialDateText);
  });

  it('resets to today when clicking the Today button', () => {
    render(<ProviderCalendar />);

    // Click the next button to change the date
    const nextButton = screen.getAllByRole('button')[2]; // The right arrow button
    fireEvent.click(nextButton);

    // Click the Today button
    const todayButton = screen.getByText('Aujourd\'hui');
    fireEvent.click(todayButton);

    // Check if the date includes today's date (this is a simplified check)
    const dateText = screen.getByText(/Semaine du/i).textContent;
    expect(dateText).toContain(new Date().getDate().toString());
  });

  it('displays events correctly in week view', () => {
    render(<ProviderCalendar />);

    // Check if events are rendered in the week view
    // Note: This is a simplified test as the actual events depend on the current date
    expect(screen.getByText('Vue hebdomadaire')).toBeInTheDocument();
  });

  it('switches to list view when clicking the List tab', () => {
    render(<ProviderCalendar />);

    // Click the List tab
    const listTab = screen.getByRole('tab', { name: 'Liste' });
    fireEvent.click(listTab);

    // Check if the list view is rendered
    expect(screen.getByText('Liste des services')).toBeInTheDocument();
  });
});
