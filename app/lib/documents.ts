// app/lib/documents.ts
// Shared document constants/types (pure).
export const DOCUMENT_TYPES = ["Appointment Letter", "Pay Slip", "ID Proof", "Certificate", "Other"] as const;
export type DocumentType = (typeof DOCUMENT_TYPES)[number];

export const ALLOWED_DOC_TYPES = [
  "application/pdf",
  "image/jpeg",
  "image/png",
  "image/webp",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

export const MAX_DOC_BYTES = 5 * 1024 * 1024; // 5MB
