import { render, screen, fireEvent } from '@testing-library/react';
import { useRouter } from 'next/navigation';
import ProviderAvailability from '@/app/provider/availability/page';

// Mock useRouter
jest.mock('next/navigation', () => ({
  useRouter: jest.fn(),
}));

// Mock window.alert
window.alert = jest.fn();

describe('ProviderAvailability Component', () => {
  const mockRouter = { push: jest.fn() };

  beforeEach(() => {
    jest.clearAllMocks();
    (useRouter as jest.Mock).mockReturnValue(mockRouter);
  });

  it('renders the availability page correctly', () => {
    render(<ProviderAvailability />);

    // Check if the title is rendered
    expect(screen.getByText('Mes disponibilités')).toBeInTheDocument();

    // Check if the tabs are rendered
    expect(screen.getByRole('tab', { name: 'Disponibilités' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Services proposés' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Zones géographiques' })).toBeInTheDocument();

    // Check if the "Voir mon calendrier" button is rendered
    expect(screen.getByText('Voir mon calendrier')).toBeInTheDocument();

    // Check if the "Enregistrer" button is rendered
    expect(screen.getByText('Enregistrer')).toBeInTheDocument();
  });

  it('navigates to calendar page when button is clicked', () => {
    render(<ProviderAvailability />);

    const calendarButton = screen.getByText('Voir mon calendrier');
    fireEvent.click(calendarButton);

    expect(mockRouter.push).toHaveBeenCalledWith('/provider/calendar');
  });

  it('toggles availability mode between recurring and specific', () => {
    render(<ProviderAvailability />);

    // Check if recurring mode is active by default
    const recurringButton = screen.getByText('Disponibilités récurrentes');
    expect(recurringButton).toHaveClass('bg-primary');

    // Click on specific dates button
    const specificButton = screen.getByText('Dates spécifiques');
    fireEvent.click(specificButton);

    // Check if specific mode is now active
    expect(specificButton).toHaveClass('bg-primary');

    // Check if the "Fonctionnalité à venir" message is displayed
    expect(screen.getByText('Fonctionnalité à venir')).toBeInTheDocument();
  });

  it('toggles day availability when switch is clicked', () => {
    render(<ProviderAvailability />);

    // Find the switch for Monday (which should be enabled by default)
    const mondaySwitch = screen.getAllByRole('switch')[0];
    expect(mondaySwitch).toBeChecked();

    // Click the switch to disable Monday
    fireEvent.click(mondaySwitch);

    // Check if Monday is now disabled
    expect(mondaySwitch).not.toBeChecked();
  });

  it('switches to services tab when clicked', () => {
    render(<ProviderAvailability />);

    // Click on the Services tab
    const servicesTab = screen.getByRole('tab', { name: 'Services proposés' });
    fireEvent.click(servicesTab);

    // Check if the services content is displayed
    expect(screen.getByText('Sélectionnez les types de services que vous souhaitez proposer')).toBeInTheDocument();

    // Check if service types are displayed
    expect(screen.getByText('Transport de personnes')).toBeInTheDocument();
    expect(screen.getByText('Garde d\'animaux')).toBeInTheDocument();
    expect(screen.getByText('Services à domicile')).toBeInTheDocument();
    expect(screen.getByText('Livraison')).toBeInTheDocument();
    expect(screen.getByText('Achats à l\'étranger')).toBeInTheDocument();
  });

  it('switches to areas tab when clicked', () => {
    render(<ProviderAvailability />);

    // Click on the Areas tab
    const areasTab = screen.getByRole('tab', { name: 'Zones géographiques' });
    fireEvent.click(areasTab);

    // Check if the areas content is displayed
    expect(screen.getByText('Définissez les zones dans lesquelles vous proposez vos services')).toBeInTheDocument();

    // Check if area options are displayed
    expect(screen.getByText('Paris intra-muros')).toBeInTheDocument();
    expect(screen.getByText('Petite couronne')).toBeInTheDocument();
    expect(screen.getByText('Grande couronne')).toBeInTheDocument();
  });

  it('saves availability when save button is clicked', () => {
    render(<ProviderAvailability />);

    // Click the save button
    const saveButton = screen.getByText('Enregistrer mes disponibilités');
    fireEvent.click(saveButton);

    // Check if alert was called (simulating successful save)
    expect(window.alert).toHaveBeenCalledWith('Vos disponibilités ont été enregistrées avec succès !');
  });
});
# Analyse des Composants Manquants - EcoDeli

Après avoir examiné la structure du projet et les exigences documentées, voici une analyse des composants qui nécessitent un développement ou une amélioration.

## Sections peu développées

### Section Merchant (Commerçant)
La section merchant est très peu développée, avec seulement un dossier dashboard. Selon les exigences, cette section devrait inclure :
- Gestion de contrat
- Gestion des annonces
- Gestion de la facturation
- Accès aux paiements
- Interface pour proposer des services de lâcher de chariot

### Section Provider (Prestataire de services)
La section provider est également minimale, avec seulement un dossier dashboard. Selon les exigences, cette section devrait inclure :
- Évaluation des prestations
- Validation de la sélection des prestataires
- Calendrier des disponibilités
- Gestion des interventions
- Facturation automatique mensuelle

### Section Admin
La section admin a une structure de base mais manque de fonctionnalités complètes pour :
- Gestion financière de l'entreprise
- Rapports et statistiques avancés
- Gestion des entrepôts de stockage temporaire
- Gestion des assurances

## Fonctionnalités manquantes par type d'utilisateur

### Client
- Tutoriel d'utilisation du site (mentionné dans les exigences)
- Système de notifications push via OneSignal
- Interface multilingue complète
- Système de suivi des colis en temps réel amélioré

### Courier (Livreur)
- Intégration complète des cartes NFC
- Système de planification avancé
- Gestion des trajets optimisés

### Général
- Application autonome Java pour rapports graphiques (Mission 2)
- Application Android pour les clients (Mission 2)
- Intégration complète de Stripe pour les paiements
- Génération automatique de factures au format PDF
- API complète pour gérer l'intégralité des traitements
- Services Cloud (logs Datalog, authentification Key Vault Azure ou Firebase)

## Priorités de développement

1. **Haute priorité**
   - Compléter les sections merchant et provider (fonctionnalités de base)
   - Implémenter l'intégration des paiements avec Stripe
   - Développer le système de génération de factures PDF
   - Améliorer le système de notifications

2. **Priorité moyenne**
   - Développer l'interface multilingue
   - Améliorer les fonctionnalités d'administration
   - Implémenter le tutoriel d'utilisation pour les clients
   - Développer le système de suivi des colis en temps réel

3. **Priorité future**
   - Développer l'application Android pour les clients
   - Créer l'application autonome Java pour les rapports
   - Intégrer les services Cloud avancés

## Tests à développer

- Tests unitaires pour les nouvelles fonctionnalités
- Tests d'intégration pour les flux de paiement
- Tests de l'interface utilisateur pour les différentes sections
- Tests de performance pour le suivi des colis en temps réel
- Tests de sécurité pour l'authentification et les paiements
