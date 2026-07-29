// app/lib/settings.ts
// Company settings types + defaults (pure; usable on client and server).

export interface CompanySettings {
  companyName: string;
  tagline: string;
  address: string;
  city: string;
  state: string;
  pincode: string;
  phone: string;
  email: string;
  website: string;
  workingDays: number[]; // weekday numbers, 0 = Sunday ... 6 = Saturday
  officeStartTime: string; // "HH:MM"
  officeEndTime: string; // "HH:MM"
}

export const DEFAULT_COMPANY_SETTINGS: CompanySettings = {
  companyName: "Sachin Security Services Pvt. Ltd.",
  tagline: "",
  address: "410, 411, Oneindiabulls, Nr. Jetalpur Over Bridge, Jetalpur",
  city: "Vadodara",
  state: "Gujarat",
  pincode: "390007",
  phone: "+91 6357889701",
  email: "info@sachinsecurity.co.in",
  website: "www.sachinsecurity.co.in",
  workingDays: [1, 2, 3, 4, 5, 6], // Mon–Sat (Sunday off)
  officeStartTime: "09:00",
  officeEndTime: "18:00",
};

// Ordered Monday-first for UI; value is the JS getUTCDay() number.
export const WEEKDAYS: { value: number; label: string }[] = [
  { value: 1, label: "Monday" },
  { value: 2, label: "Tuesday" },
  { value: 3, label: "Wednesday" },
  { value: 4, label: "Thursday" },
  { value: 5, label: "Friday" },
  { value: 6, label: "Saturday" },
  { value: 0, label: "Sunday" },
];

// Fields that can be persisted/edited.
export const COMPANY_SETTINGS_KEYS = Object.keys(DEFAULT_COMPANY_SETTINGS) as (keyof CompanySettings)[];
