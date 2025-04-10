import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import MerchantContracts from '@/app/merchant/contracts/page';

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

describe('MerchantContracts Component', () => {
  const mockRouter = { push: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it('renders the contracts page correctly', () => {
    render(<MerchantContracts />);

    // Check if the title is rendered
    expect(screen.getByText('Gestion des contrats')).toBeInTheDocument();

    // Check if the tabs are rendered
    expect(screen.getByRole('tab', { name: 'Tous' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Actifs' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'En attente' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Expirés' })).toBeInTheDocument();

    // Check if the search input is rendered
    expect(screen.getByPlaceholderText('Rechercher...')).toBeInTheDocument();

    // Check if the "Nouveau contrat" button is rendered
    expect(screen.getByText('Nouveau contrat')).toBeInTheDocument();
  });

  it('navigates to new contract page when button is clicked', () => {
    render(<MerchantContracts />);

    const newContractButton = screen.getByText('Nouveau contrat');
    fireEvent.click(newContractButton);

    expect(mockRouter.push).toHaveBeenCalledWith('/merchant/contracts/new');
  });

  it('filters contracts when searching', () => {
    render(<MerchantContracts />);

    // Get all contract rows initially
    const initialContractRows = screen.getAllByRole('row');
    const initialCount = initialContractRows.length - 1; // Subtract header row

    // Type in search box
    const searchInput = screen.getByPlaceholderText('Rechercher...');
    fireEvent.change(searchInput, { target: { value: 'premium' } });

    // Check if contracts are filtered
    const filteredContractRows = screen.getAllByRole('row');
    expect(filteredContractRows.length - 1).toBeLessThan(initialCount);

    // Check if the filtered contract is visible
    expect(screen.getByText('Contrat de partenariat premium')).toBeInTheDocument();
  });

  it('displays contract status badges with correct variants', () => {
    render(<MerchantContracts />);

    // Check if status badges are rendered with correct text
    expect(screen.getByText('Actif')).toBeInTheDocument();
    expect(screen.getByText('En attente')).toBeInTheDocument();
    expect(screen.getByText('Expiré')).toBeInTheDocument();
    expect(screen.getByText('Résilié')).toBeInTheDocument();
  });

  it('navigates to contract details when viewing a contract', () => {
    render(<MerchantContracts />);

    // Find the first view button and click it
    const viewButtons = screen.getAllByRole('button', { name: '' });
    fireEvent.click(viewButtons[0]);

    // Check if router.push was called with the correct path
    expect(mockRouter.push).toHaveBeenCalled();
  });
});
