export const storageService = {
  async createBoxReservation(input: any, userId: string) {
    return { id: "generated-id", ...input, userId };
  },
};
