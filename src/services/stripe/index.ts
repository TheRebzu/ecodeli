// @/lib/stripe.ts
export const stripe = {
  checkout: {
    sessions: {
      create: async () => ({
        id: 'mock_session_id'
      })
    }
  }
}