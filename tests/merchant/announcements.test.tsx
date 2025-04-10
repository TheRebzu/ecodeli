import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import MerchantAnnouncements from '@/app/merchant/announcements/page';

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('MerchantAnnouncements Component', () => {
  const mockRouter = { push: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it('renders the announcements page correctly', () => {
    render(<MerchantAnnouncements />);

    // Check if the title is rendered
    expect(screen.getByText('Gestion des annonces')).toBeInTheDocument();

    // Check if the tabs are rendered
    expect(screen.getByRole('tab', { name: 'Toutes' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Actives' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'En pause' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Brouillons' })).toBeInTheDocument();

    // Check if the search input is rendered
    expect(screen.getByPlaceholderText('Rechercher...')).toBeInTheDocument();

    // Check if the "Nouvelle annonce" button is rendered
    expect(screen.getByText('Nouvelle annonce')).toBeInTheDocument();
  });

  it('navigates to new announcement page when button is clicked', () => {
    render(<MerchantAnnouncements />);

    const newAnnouncementButton = screen.getByText('Nouvelle annonce');
    fireEvent.click(newAnnouncementButton);

    expect(mockRouter.push).toHaveBeenCalledWith('/merchant/announcements/new');
  });

  it('filters announcements when searching', () => {
    render(<MerchantAnnouncements />);

    // Get all announcement rows initially
    const initialAnnouncementRows = screen.getAllByRole('row');
    const initialCount = initialAnnouncementRows.length - 1; // Subtract header row

    // Type in search box
    const searchInput = screen.getByPlaceholderText('Rechercher...');
    fireEvent.change(searchInput, { target: { value: 'express' } });

    // Check if announcements are filtered
    const filteredAnnouncementRows = screen.getAllByRole('row');
    expect(filteredAnnouncementRows.length - 1).toBeLessThan(initialCount);

    // Check if the filtered announcement is visible
    expect(screen.getByText('Livraison express de médicaments')).toBeInTheDocument();
  });

  it('displays announcement status badges with correct variants', () => {
    render(<MerchantAnnouncements />);

    // Check if status badges are rendered with correct text
    expect(screen.getByText('Active')).toBeInTheDocument();
    expect(screen.getByText('En pause')).toBeInTheDocument();
    expect(screen.getByText('Brouillon')).toBeInTheDocument();
    expect(screen.getByText('Expirée')).toBeInTheDocument();
  });

  it('navigates to announcement details when viewing an announcement', () => {
    render(<MerchantAnnouncements />);

    // Find the first view button and click it
    const viewButtons = screen.getAllByRole('button', { name: '' });
    fireEvent.click(viewButtons[0]);

    // Check if router.push was called with the correct path
    expect(mockRouter.push).toHaveBeenCalled();
  });
});
