import { create } from "zustand";

export type ModalType =
  | "login"
  | "register"
  | "forgot-password"
  | "delivery-details"
  | "subscription-details"
  | "insurance-details"
  | "storage-details"
  | "payment"
  | "confirmation"
  | "delete-confirmation"
  | "custom";

interface ModalData {
  title?: string;
  message?: string;
  data?: Record<string, unknown>;
}

interface ModalState {
  type: ModalType | null;
  isOpen: boolean;
  data: ModalData;
  
  // Actions
  openModal: (type: ModalType, data?: ModalData) => void;
  closeModal: () => void;
  setModalData: (data: ModalData) => void;
}

export const useModalStore = create<ModalState>((set) => ({
  type: null,
  isOpen: false,
  data: {},
  
  // Open a modal with optional data
  openModal: (type, data = {}) => {
    set({
      type,
      isOpen: true,
      data,
    });
  },
  
  // Close the currently open modal
  closeModal: () => {
    set({
      type: null,
      isOpen: false,
      data: {},
    });
  },
  
  // Update modal data without changing open state
  setModalData: (data) => {
    set((state) => ({
      data: { ...state.data, ...data },
    }));
  },
})); 