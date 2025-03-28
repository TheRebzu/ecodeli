import { UserRole, UserStatus } from "@/lib/validations/user";

export interface User {
  id: string;
  name: string;
  email: string;
  emailVerified?: Date;
  image?: string;
  role: UserRole;
  status: UserStatus;
  createdAt: Date;
  updatedAt: Date;
}

export interface UserProfile extends User {
  phone?: string;
  bio?: string;
  preferredLanguage: string;
  notificationPreferences: NotificationPreferences;
  addresses: Address[];
  paymentMethods?: PaymentMethod[];
}

export interface NotificationPreferences {
  email: boolean;
  sms: boolean;
  push: boolean;
  marketing: boolean;
}

export interface Address {
  id: string;
  userId: string;
  label: string;
  street: string;
  city: string;
  postalCode: string;
  country: string;
  additionalInfo?: string;
  isDefault: boolean;
  type: "HOME" | "WORK" | "OTHER";
  createdAt: Date;
  updatedAt: Date;
}

export interface PaymentMethod {
  id: string;
  userId: string;
  type: "CARD" | "PAYPAL" | "BANK_TRANSFER";
  name: string;
  isDefault: boolean;
  cardDetails?: CardDetails;
  paypalEmail?: string;
  bankDetails?: BankDetails;
  createdAt: Date;
  updatedAt: Date;
}

export interface CardDetails {
  last4: string;
  brand: string;
  expiryMonth: string;
  expiryYear: string;
}

export interface BankDetails {
  accountName: string;
  last4: string;
  bankName?: string;
}

export interface UserSession {
  id: string;
  userId: string;
  expires: Date;
  sessionToken: string;
  createdAt: Date;
  updatedAt: Date;
  user: User;
}

export interface AuthToken {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  status: UserStatus;
  iat: number;
  exp: number;
}

export interface AccountVerification {
  id: string;
  userId: string;
  token: string;
  type: "EMAIL" | "RESET_PASSWORD" | "TWO_FACTOR";
  expiresAt: Date;
  createdAt: Date;
  updatedAt: Date;
} 