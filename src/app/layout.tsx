import type { Metadata } from "next";
import { Fraunces, Outfit } from "next/font/google";
import "./globals.css";

const serif = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-serif",
});

const sans = Outfit({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-sans",
});

export const metadata: Metadata = {
  title: { default: "Harborlane", template: "%s · Harborlane" },
  description:
    "Harborlane is a portfolio demo by Muhammad Ayaz: a multi-tenant workspace for clients, tasks, and invoices.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className={`${serif.variable} ${sans.variable}`}>
        <a className="skip" href="#main">
          Skip to content
        </a>
        {children}
      </body>
    </html>
  );
}
