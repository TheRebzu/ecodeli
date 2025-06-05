// Export des types de schémas pour l'authentification
export type { ClientRegisterSchemaType } from './client-register.schema';
export type { DelivererRegisterSchemaType } from './deliverer-register.schema';
export type { MerchantRegisterSchemaType } from './merchant-register.schema';
export type { ProviderRegisterSchemaType } from './provider-register.schema';
export type { LoginSchemaType } from './login.schema';
export type { RegisterBaseSchemaType } from './register.schema';

// Export des schémas
export { clientRegisterSchema } from './client-register.schema';
export { delivererRegisterSchema } from './deliverer-register.schema';
export { merchantRegisterSchema } from './merchant-register.schema';
export { providerRegisterSchema } from './provider-register.schema';
export {
  loginSchema,
  verifyEmailSchema,
  forgotPasswordSchema,
  resetPasswordSchema,
} from './login.schema';
export {
  registerBaseSchema,
  passwordSchema,
  addressFields,
  registerBaseFields,
  UserRole,
} from './register.schema';
export { userRoleSchema, userStatusSchema } from './user.schema';

// Export des schémas d'authentification
export * from './login.schema';
export * from './register.schema';
export * from './client-register.schema';
export * from './deliverer-register.schema';
export * from './merchant-register.schema';
export * from './provider-register.schema';
export * from './user.schema';

// Export des types utilisés par les schémas
// L'export de UserRole est déjà fait plus haut

// Export all auth schemas from this file
export * from './user.schema';
export * from './login.schema';
export * from './document.schema';
export * from './verification.schema';
export * from './admin.schema';
