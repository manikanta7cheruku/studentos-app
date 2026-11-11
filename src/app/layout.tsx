import type { Metadata, Viewport } from "next";
import { Bricolage_Grotesque, DM_Sans } from "next/font/google";
import "./globals.css";
import { MSWProvider } from "@/mocks";
import { OfflineBanner } from "@/components/app/offline-banner";

const bricolage = Bricolage_Grotesque({
  subsets: ["latin"],
  variable: "--font-bricolage",
  display: "swap",
});

const dmSans = DM_Sans({
  subsets: ["latin"],
  variable: "--font-dm-sans",
  display: "swap",
});

export const metadata: Metadata = {
  title: "StudentOS",
  description: "A private student platform for your college.",
};

export const viewport: Viewport = {
  themeColor: "#0b0b10",
  colorScheme: "dark",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${bricolage.variable} ${dmSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <OfflineBanner />
        <MSWProvider>{children}</MSWProvider>
      </body>
    </html>
  );
}
