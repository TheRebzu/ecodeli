# Verification Service Updates - Document Status Alignment

## Summary
Updated `verification.service.ts` to use the same document status handling logic as `document-list.tsx` component.

## Key Changes Made

### 1. Status Type Updates
- Updated `VerificationResult` type to include `EXPIRED` status
- Now supports: `PENDING`, `APPROVED`, `REJECTED`, `EXPIRED`, `NOT_SUBMITTED`

### 2. New Status Utility Methods
```typescript
// Same logic as document-list.tsx getStatusBadgeProps
static getStatusBadgeProps(status: string)

// Check if document is expired based on expiryDate
private isDocumentExpired(document: any): boolean

// Get effective status including expiration logic
private getEffectiveDocumentStatus(document: any): string
```

### 3. Enhanced Verification Methods
```typescript
// Updated to use new status logic
async getUserVerificationStatus(userId: string, userRole: UserRole): Promise<VerificationResult>

// Get documents with their effective statuses
async getUserDocumentsWithStatus(userId: string, userRole: UserRole)

// Automatically mark expired documents
async checkAndMarkExpiredDocuments(userId?: string)
```

### 4. Status Logic Alignment
The service now follows the exact same status precedence as document-list.tsx:
1. **EXPIRED** - If document has passed its expiryDate
2. **REJECTED** - If document was rejected during review
3. **PENDING** - If document is awaiting review
4. **APPROVED** - If document is verified and not expired
5. **NOT_SUBMITTED** - If no document was uploaded

### 5. Updated Comments
- Added comprehensive documentation explaining the status alignment
- Documented how the service now matches document-list.tsx behavior

## Status Handling Logic
Both `verification.service.ts` and `document-list.tsx` now use identical logic:

- **PENDING**: outline variant, "En attente"
- **APPROVED**: success variant, "Approuvé" 
- **REJECTED**: destructive variant, "Rejeté"
- **EXPIRED**: warning variant, "Expiré"
- **NOT_SUBMITTED**: outline variant, default case

## Next Steps
1. The existing compilation errors in the service are related to missing Prisma schema definitions
2. Database schema needs to be updated to support all the verification tables referenced
3. Consider running the updated service with proper error handling for missing schema elements
