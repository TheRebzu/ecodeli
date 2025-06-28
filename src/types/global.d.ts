export type UserRole = 'CLIENT' | 'DELIVERER' | 'MERCHANT' | 'PROVIDER' | 'ADMIN'

export interface User {
  id: string
  email: string
  firstName: string
  lastName: string
  role: UserRole
  phoneNumber?: string
  isVerified: boolean
  isFirstLogin: boolean
  createdAt: Date
  updatedAt: Date
}

export type SubscriptionPlan = 'FREE' | 'STARTER' | 'PREMIUM'

export interface Subscription {
  id: string
  userId: string
  plan: SubscriptionPlan
  startDate: Date
  endDate?: Date
  isActive: boolean
}
