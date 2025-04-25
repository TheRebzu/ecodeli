import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AnnouncementDetail } from "@/components/announcements/announcement-detail";
import { api } from "@/trpc/react";

// Mock des traductions
vi.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

// Mock du router Next.js
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useParams: () => ({
    id: "test-announcement-id",
    locale: "fr",
  }),
}));

// Mock de l'API tRPC
vi.mock("@/trpc/react", () => ({
  api: {
    announcement: {
      getById: {
        useQuery: vi.fn(),
      },
      applyForAnnouncement: {
        useMutation: vi.fn(),
      },
      acceptApplication: {
        useMutation: vi.fn(),
      },
      updateStatus: {
        useMutation: vi.fn(),
      },
      sendMessage: {
        useMutation: vi.fn(),
      },
      getMessages: {
        useQuery: vi.fn(),
      },
    },
    auth: {
      getSession: {
        useQuery: vi.fn(),
      },
    },
  },
}));

// Mock de toast
vi.mock("sonner", () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe("AnnouncementDetail Component", () => {
  beforeEach(() => {
    // Réinitialiser les mocks
    vi.clearAllMocks();

    // Mock des données par défaut
    api.announcement.getById.useQuery.mockReturnValue({
      data: {
        id: "test-announcement-id",
        title: "Test Announcement",
        description: "This is a test announcement",
        status: "OPEN",
        price: 50.0,
        packageSize: "MEDIUM",
        packageWeight: 5.0,
        packageValue: 100.0,
        pickupAddress: "123 Pickup St",
        deliveryAddress: "456 Delivery Ave",
        deadline: new Date("2025-12-31"),
        requiresInsurance: true,
        createdAt: new Date("2025-01-01"),
        clientId: "client-id",
        client: {
          id: "client-id",
          name: "Test Client",
          image: null,
        },
        delivererId: null,
        deliverer: null,
        applications: [],
      },
      isLoading: false,
      error: null,
    });

    api.auth.getSession.useQuery.mockReturnValue({
      data: {
        user: {
          id: "test-user-id",
          role: "DELIVERER",
        },
      },
    });

    api.announcement.applyForAnnouncement.useMutation.mockReturnValue({
      mutate: vi.fn(),
      isLoading: false,
    });

    api.announcement.getMessages.useQuery.mockReturnValue({
      data: {
        messages: [],
      },
      refetch: vi.fn(),
    });
  });

  it("should render the announcement details correctly", () => {
    render(<AnnouncementDetail />);

    // Vérifier que les détails de l'annonce sont affichés
    expect(screen.getByText("Test Announcement")).toBeInTheDocument();
    expect(screen.getByText("This is a test announcement")).toBeInTheDocument();
    expect(screen.getByText("123 Pickup St")).toBeInTheDocument();
    expect(screen.getByText("456 Delivery Ave")).toBeInTheDocument();
    expect(screen.getByText("50.00€")).toBeInTheDocument();
  });

  it("should show loading state when data is loading", () => {
    api.announcement.getById.useQuery.mockReturnValue({
      isLoading: true,
    });

    render(<AnnouncementDetail />);

    // Vérifier que l'état de chargement est affiché
    expect(screen.getByRole("status")).toBeInTheDocument();
  });

  it("should show error state when there is an error", () => {
    api.announcement.getById.useQuery.mockReturnValue({
      error: new Error("Failed to load announcement"),
      isLoading: false,
    });

    render(<AnnouncementDetail />);

    // Vérifier que l'état d'erreur est affiché
    expect(screen.getByText("announcementNotFound")).toBeInTheDocument();
  });

  it("should allow deliverers to apply for open announcements", async () => {
    const mutateMock = vi.fn();
    api.announcement.applyForAnnouncement.useMutation.mockReturnValue({
      mutate: mutateMock,
      isLoading: false,
    });

    render(<AnnouncementDetail />);

    // Cliquer sur le bouton pour postuler
    fireEvent.click(screen.getByText("applyForDelivery"));

    // Remplir le formulaire de candidature
    fireEvent.change(screen.getByPlaceholder("applicationMessagePlaceholder"), {
      target: { value: "I would like to deliver this package" },
    });

    fireEvent.change(screen.getByPlaceholder("50"), {
      target: { value: "45" },
    });

    // Soumettre la candidature
    fireEvent.click(screen.getByText("submitApplication"));

    // Vérifier que la mutation a été appelée avec les bonnes valeurs
    await waitFor(() => {
      expect(mutateMock).toHaveBeenCalledWith({
        announcementId: "test-announcement-id",
        message: "I would like to deliver this package",
        price: 45,
      });
    });
  });

  it("should not show apply button for clients", () => {
    api.auth.getSession.useQuery.mockReturnValue({
      data: {
        user: {
          id: "client-id", // Même ID que le client de l'annonce
          role: "CLIENT",
        },
      },
    });

    render(<AnnouncementDetail />);

    // Vérifier que le bouton pour postuler n'est pas affiché
    expect(screen.queryByText("applyForDelivery")).not.toBeInTheDocument();
  });

  it("should show different actions based on announcement status", () => {
    // Tester avec une annonce assignée
    api.announcement.getById.useQuery.mockReturnValue({
      data: {
        ...api.announcement.getById.useQuery().data,
        status: "ASSIGNED",
        delivererId: "test-user-id",
        deliverer: {
          id: "test-user-id",
          name: "Test Deliverer",
          image: null,
        },
      },
      isLoading: false,
    });

    render(<AnnouncementDetail />);

    // Vérifier que le bouton pour commencer la livraison est affiché
    expect(screen.getByText("startDelivery")).toBeInTheDocument();
  });
});
