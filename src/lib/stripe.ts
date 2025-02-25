// @/lib/stripe-config.ts ou équivalent
export const stripeConfig = {
  secretKey: 'mock_sk_test_key',
  publishableKey: 'mock_pk_test_key',
  webhookSecret: 'mock_whsec_key'
}

export const stripe = {
  checkout: {
    sessions: {
      create: async () => ({ id: 'mock_session' })
    }
  },
  webhooks: {
    constructEvent: () => ({
      type: 'mock.event',
      data: { object: {} }
    })
  }
}