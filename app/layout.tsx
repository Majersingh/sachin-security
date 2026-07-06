// app/layout.tsx
import type { Metadata } from "next";
import "./globals.css";
import Nav from "@/app/components/Navbar";
import Footer from "@/app/components/Footer";

export const metadata: Metadata = {
  metadataBase: new URL("https://sachinsecurity.co.in"),
  title: {
    default: "Sachin Security Services Pvt. Ltd. | Professional Security Since 1996",
    template: "%s | Sachin Security Services Pvt. Ltd.",
  },
  description:
    "Sachin Security Services Pvt. Ltd. is an ISO 9001:2015 certified company offering professional security guard, corporate, industrial, and event security solutions across Gujarat, Madhya Pradesh, Uttar Pradesh, and Rajasthan since 1996.",
  keywords: [
    "security services",
    "best security services",
    "best security services in gujarat",
    "best security services in vadodara",
    "best security agency in vadodara",
    "security agency",
    "security guards",
    "Vadodara security",
    "Ahmedabad security company",
    "Gujarat security agency",
    "corporate security",
    "industrial security",
    "event security",
    "retail security",
    "armed guards",
    "CCTV monitoring",
    "ISO certified security company",
    "bouncer services",
    "residential security",
    "hotel security services",
    "private security agency",
    "bodyguard services",
    "security patrol services",
    "trained security guards",
    "security management company",
    "24x7 security services",
  ],
  authors: [{ name: "Sachin Security Services Pvt. Ltd." }],
  icons: {
    icon: "/logo.png", // favicon (tab icon)
    shortcut: "/logo.png",
    apple: "/logo.png",
  },
  openGraph: {
    type: "website",
    locale: "en_IN",
    url: "https://sachinsecurity.co.in",
    siteName: "Sachin Security Services Pvt. Ltd.",
    title: "Sachin Security Services | Professional Security Since 1996",
    description:
      "Trusted security services provider offering trained guards, industrial security, and event protection across India since 1996.",
    images: [
      {
        url: "/logo.png",
        width: 1200,
        height: 630,
        alt: "Sachin Security Services Pvt. Ltd.",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    site: "@sachinsecurity", // optional if you have an account
    title: "Sachin Security Services Pvt. Ltd. | Professional Security Since 1996",
    description:
      "ISO 9001:2015 certified provider of security and protection services for industries, corporates, and events.",
    images: ["/logo.png"],
  },
  robots: {
    index: true,
    follow: true,
    googleBot: {
      index: true,
      follow: true,
      "max-snippet": -1,
      "max-image-preview": "large",
      "max-video-preview": -1,
    },
  },
  verification: {
    google: "your-google-verification-code", // Replace with real Search Console code
    yandex: "your-yandex-verification-code",
  },
  alternates: {
    canonical: "https://sachinsecurity.co.in",
  },
  category: "Security Services",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="scroll-smooth">
      <head>
        <link rel="icon" href="/logo.png" type="image/png" sizes="32x32" />
      </head>
      <body>
        <Nav />
        {children}
        <Footer />
      </body>
    </html>
  );
}
