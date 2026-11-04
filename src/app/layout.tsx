import type { Metadata } from "next";
import localFont from "next/font/local";
import "./globals.css";
import { MSWProvider } from "@/mocks";

const fraunces = localFont({
  src: "../../public/fonts/fraunces/fraunces-variable.ttf",
  variable: "--font-fraunces",
  weight: "100 900",
  display: "swap",
});

const publicSans = localFont({
  src: "../../public/fonts/public-sans/public-sans-variable.ttf",
  variable: "--font-public-sans",
  weight: "100 900",
  display: "swap",
});

export const metadata: Metadata = {
  title: "StudentOS",
  description: "A private student platform for your college.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className={`${fraunces.variable} ${publicSans.variable} h-full antialiased`}>
      <body className="min-h-full flex flex-col">
        <MSWProvider>{children}</MSWProvider>
      </body>
    </html>
  );
}
