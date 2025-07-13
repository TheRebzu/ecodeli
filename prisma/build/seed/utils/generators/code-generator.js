"use strict";
var __createBinding =
  (this && this.__createBinding) ||
  (Object.create
    ? function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        var desc = Object.getOwnPropertyDescriptor(m, k);
        if (
          !desc ||
          ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)
        ) {
          desc = {
            enumerable: true,
            get: function () {
              return m[k];
            },
          };
        }
        Object.defineProperty(o, k2, desc);
      }
    : function (o, m, k, k2) {
        if (k2 === undefined) k2 = k;
        o[k2] = m[k];
      });
var __exportStar =
  (this && this.__exportStar) ||
  function (m, exports) {
    for (var p in m)
      if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p))
        __createBinding(exports, m, p);
  };
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateValidationCode = generateValidationCode;
exports.generateTrackingNumber = generateTrackingNumber;
exports.generateOrderNumber = generateOrderNumber;
exports.generateInvoiceNumber = generateInvoiceNumber;
exports.generateTicketNumber = generateTicketNumber;
exports.generateReferralCode = generateReferralCode;
exports.generateContractNumber = generateContractNumber;
exports.generateNFCCardId = generateNFCCardId;
exports.generateAccessCode = generateAccessCode;
exports.generateCertificationNumber = generateCertificationNumber;
exports.generateBookingReference = generateBookingReference;
// Génère un code de validation à 6 chiffres
function generateValidationCode() {
  return Math.floor(100000 + Math.random() * 900000).toString();
}
// Génère un numéro de tracking unique
function generateTrackingNumber(prefix = "ECO") {
  const timestamp = Date.now().toString(36).toUpperCase();
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${timestamp}${random}`;
}
// Génère un numéro de commande
function generateOrderNumber() {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  const random = Math.floor(1000 + Math.random() * 9000);
  return `CMD-${year}${month}${day}-${random}`;
}
// Génère un numéro de facture
function generateInvoiceNumber(prefix = "FAC") {
  const date = new Date();
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const sequence = Math.floor(1000 + Math.random() * 9000);
  return `${prefix}-${year}-${month}-${sequence}`;
}
// Génère un numéro de ticket
function generateTicketNumber() {
  const timestamp = Date.now();
  const random = Math.floor(100 + Math.random() * 900);
  return `TIC-${timestamp}-${random}`;
}
// Génère un code de parrainage
function generateReferralCode(userName) {
  const cleanName = userName.replace(/[^a-zA-Z0-9]/g, "").toUpperCase();
  const prefix = cleanName.substring(0, 4);
  const random = Math.random().toString(36).substring(2, 6).toUpperCase();
  return `${prefix}${random}`;
}
// Génère un numéro de contrat
function generateContractNumber(merchantName) {
  const date = new Date();
  const year = date.getFullYear();
  const cleanName = merchantName
    .replace(/[^a-zA-Z]/g, "")
    .substring(0, 3)
    .toUpperCase();
  const random = Math.floor(100 + Math.random() * 900);
  return `CONT-${cleanName}-${year}-${random}`;
}
// Génère un identifiant de carte NFC
function generateNFCCardId() {
  const hex = () =>
    Math.floor(Math.random() * 256)
      .toString(16)
      .padStart(2, "0");
  return `NFC-${hex()}${hex()}-${hex()}${hex()}-${hex()}${hex()}`;
}
// Génère un code d'accès pour box de stockage
function generateAccessCode() {
  const letters = "ABCDEFGHIJKLMNOPQRSTUVWXYZ";
  const letter = letters[Math.floor(Math.random() * letters.length)];
  const numbers = Math.floor(1000 + Math.random() * 9000);
  return `${letter}${numbers}`;
}
// Génère un numéro de certification
function generateCertificationNumber(type) {
  const typePrefix = type.substring(0, 3).toUpperCase();
  const year = new Date().getFullYear();
  const sequence = Math.floor(10000 + Math.random() * 90000);
  return `CERT-${typePrefix}-${year}-${sequence}`;
}
// Génère une référence de réservation
function generateBookingReference() {
  const date = new Date();
  const year = date.getFullYear().toString().substring(2);
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const random = Math.floor(10000 + Math.random() * 90000);
  return `RES-${year}${month}-${random}`;
}
// Exporte toutes les fonctions de reference-generator
__exportStar(require("./reference-generator"), exports);
