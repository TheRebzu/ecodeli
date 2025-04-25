import { describe, it, expect, vi, beforeEach } from "vitest";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import { AnnouncementsList } from "@/components/announcements/announcements-list";
import { api } from "@/trpc/react";
import { AnnouncementStatus, PackageSize } from "@prisma/client";

// Mock des traductions
vi.mock("next-intl", () => ({
  useTranslations: () => (key) => key,
}));

// Mock du router Next.js
vi.mock("next/navigation", () => ({
  useRouter: () => ({
    push: vi.fn(),
  }),
  useSearchParams: () => ({
    get: () => "fr",
  }),
}));

// Mock de l'API tRPC
vi.mock("@/trpc/react", () => ({
  api: {
    announcement: {
      getAll: {
        useInfiniteQuery: vi.fn(),
      },
    },
  },
}));

describe("AnnouncementsList Component", () => {
  const mockAnnouncements = [
    {
      id: "announcement-1",
      title: "First Announcement",
      description: "Description of first announcement",
      status: AnnouncementStatus.OPEN,
      price: 50.0,
      packageSize: PackageSize.MEDIUM,
      packageWeight: 5.0,
      pickupAddress: "123 Pickup St",
      deliveryAddress: "456 Delivery Ave",
      deadline: new Date("2025-12-31"),
      requiresInsurance: true,
      createdAt: new Date("2025-01-01"),
      client: {
        id: "client-1",
        name: "Client One",
        image: null,
      },
    },
    {
      id: "announcement-2",
      title: "Second Announcement",
      description: "Description of second announcement",
      status: AnnouncementStatus.ASSIGNED,
      price: 75.0,
      packageSize: PackageSize.LARGE,
      packageWeight: 10.0,
      pickupAddress: "789 Pickup Ave",
      deliveryAddress: "101 Delivery St",
      deadline: new Date("2025-11-15"),
      requiresInsurance: false,
      createdAt: new Date("2025-01-15"),
      client: {
        id: "client-2",
        name: "Client Two",
        image: null,
      },
    },
  ];

  beforeEach(() => {
    // Réinitialiser les mocks
    vi.clearAllMocks();

    // Mock des données par défaut
    api.announcement.getAll.useInfiniteQuery.mockReturnValue({
      data: {
        pages: [
          {
            announcements: mockAnnouncements,
            nextCursor: null,
          },
        ],
      },
      isLoading: false,
      isFetching: false,
      fetchNextPage: vi.fn(),
      hasNextPage: false,
    });
  });

  it("should render the list of announcements correctly", () => {
    render(<AnnouncementsList />);

    // Vérifier que les annonces sont affichées
    expect(screen.getByText("First Announcement")).toBeInTheDocument();
    expect(screen.getByText("Second Announcement")).toBeInTheDocument();
    expect(
      screen.getByText("123 Pickup St → 456 Delivery Ave"),
    ).toBeInTheDocument();
    expect(
      screen.getByText("789 Pickup Ave → 101 Delivery St"),
    ).toBeInTheDocument();
  });

  it("should show loading state when data is loading", () => {
    api.announcement.getAll.useInfiniteQuery.mockReturnValue({
      isLoading: true,
    });

    render(<AnnouncementsList />);

    // Vérifier que les skeletons de chargement sont affichés
    const skeletons = screen.getAllByTestId("announcement-skeleton");
    expect(skeletons.length).toBeGreaterThan(0);
  });

  it("should show empty state when no announcements are found", () => {
    api.announcement.getAll.useInfiniteQuery.mockReturnValue({
      data: {
        pages: [
          {
            announcements: [],
            nextCursor: null,
          },
        ],
      },
      isLoading: false,
    });

    render(<AnnouncementsList />);

    // Vérifier que le message d'absence d'annonces est affiché
    expect(screen.getByText("noAnnouncementsFound")).toBeInTheDocument();
  });

  it("should apply filters when filter values change", async () => {
    render(<AnnouncementsList />);

    // Sélectionner un statut
    fireEvent.click(screen.getByText("allStatuses"));
    fireEvent.click(screen.getByText("status.open"));

    // Appliquer les filtres
    fireEvent.click(screen.getByText("applyFilters"));

    // Vérifier que la requête a été appelée avec les bons filtres
    await waitFor(() => {
      expect(api.announcement.getAll.useInfiniteQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          status: AnnouncementStatus.OPEN,
        }),
        expect.anything(),
      );
    });
  });

  it("should reset filters when reset button is clicked", async () => {
    render(<AnnouncementsList />);

    // Sélectionner un statut
    fireEvent.click(screen.getByText("allStatuses"));
    fireEvent.click(screen.getByText("status.open"));

    // Réinitialiser les filtres
    fireEvent.click(screen.getByText("resetFilters"));

    // Vérifier que la requête a été appelée sans filtres
    await waitFor(() => {
      expect(api.announcement.getAll.useInfiniteQuery).toHaveBeenCalledWith(
        expect.objectContaining({
          status: undefined,
        }),
        expect.anything(),
      );
    });
  });

  it("should load more announcements when load more button is clicked", async () => {
    const fetchNextPageMock = vi.fn();
    api.announcement.getAll.useInfiniteQuery.mockReturnValue({
      data: {
        pages: [
          {
            announcements: mockAnnouncements,
            nextCursor: "next-cursor",
          },
        ],
      },
      isLoading: false,
      isFetching: false,
      fetchNextPage: fetchNextPageMock,
      hasNextPage: true,
    });

    render(<AnnouncementsList />);

    // Cliquer sur le bouton pour charger plus d'annonces
    fireEvent.click(screen.getByText("loadMore"));

    // Vérifier que fetchNextPage a été appelé
    expect(fetchNextPageMock).toHaveBeenCalled();
  });

  it("should navigate to announcement detail when an announcement is clicked", () => {
    const pushMock = vi.fn();
    vi.mock("next/navigation", () => ({
      useRouter: () => ({
        push: pushMock,
      }),
      useSearchParams: () => ({
        get: () => "fr",
      }),
    }));

    render(<AnnouncementsList />);

    // Cliquer sur une annonce
    fireEvent.click(screen.getByText("First Announcement"));

    // Vérifier que la navigation a été appelée avec le bon ID
    expect(pushMock).toHaveBeenCalledWith("/announcements/announcement-1");
  });
});
