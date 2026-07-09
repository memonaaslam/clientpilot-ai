import { AuthDeveloperBrand } from "@/components/AuthDeveloperBrand";
import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "ClientPilot AI",
  description: "AI meeting memory and follow-up CRM for service businesses."
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}        <AuthDeveloperBrand />
      </body>
    </html>
  );
}



