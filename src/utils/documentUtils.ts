// Utility functions for document handling

/**
 * Returns the required documents based on the user's role.
 * @param role - The role of the user.
 * @returns An array of required document names.
 */
export function getRequiredDocumentsByRole(role: string): string[] {
  const roleDocumentMap: Record<string, string[]> = {
    admin: ['ID Proof', 'Address Proof', 'Tax Document'],
    deliverer: ['Driver License', 'Vehicle Registration', 'Insurance'],
    client: ['ID Proof', 'Contract Agreement'],
  };

  return roleDocumentMap[role] || [];
}

/**
 * Checks if all required documents are uploaded.
 * @param requiredDocuments - List of required document names.
 * @param uploadedDocuments - List of uploaded document names.
 * @returns True if all required documents are uploaded, false otherwise.
 */
export function areAllDocumentsUploaded(
  requiredDocuments: string[],
  uploadedDocuments: string[]
): boolean {
  return requiredDocuments.every(doc => uploadedDocuments.includes(doc));
}
