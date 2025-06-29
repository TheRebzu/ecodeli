"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTransactionReference = generateTransactionReference;
exports.generateNFCCardId = generateNFCCardId;
exports.generateAccessCode = generateAccessCode;
exports.generateInvoiceNumber = generateInvoiceNumber;
exports.generateSessionId = generateSessionId;
exports.generateApiToken = generateApiToken;
// Génère une référence de transaction
function generateTransactionReference(prefix = 'TXN') {
    const timestamp = Date.now().toString(36).toUpperCase();
    const random = Math.random().toString(36).substring(2, 8).toUpperCase();
    return `${prefix}-${timestamp}-${random}`;
}
// Génère un ID de carte NFC
function generateNFCCardId() {
    const hex = () => Math.floor(Math.random() * 16).toString(16).toUpperCase();
    return `${hex()}${hex()}:${hex()}${hex()}:${hex()}${hex()}:${hex()}${hex()}`;
}
// Génère un code d'accès pour les box
function generateAccessCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}
// Génère un numéro de facture
function generateInvoiceNumber() {
    const date = new Date();
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const sequence = Math.floor(1000 + Math.random() * 9000);
    return `FAC-${year}${month}-${sequence}`;
}
// Génère un ID de session
function generateSessionId() {
    return `sess_${Date.now()}_${Math.random().toString(36).substring(2, 15)}`;
}
// Génère un token API
function generateApiToken() {
    const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789';
    let token = 'eco_';
    for (let i = 0; i < 32; i++) {
        token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
}
