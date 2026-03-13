import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ClerkProvider } from "@clerk/nextjs";
import "./globals.css";
import ReduxProvider from "@/components/ReduxProvider";
import { AppointmentProvider } from "@/context/AppointmentContext";
import { Toaster } from "@/components/ui/sonner";
import GoogleTranslate from "@/components/GoogleTranslate";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SehatSetu by livconnect - Healthcare Appointment Booking",
  description:
    "Quick and easy appointment booking with healthcare professionals",
  icons: {
    icon: [
      {
        url: "/favicon.svg?v=3",
        type: "image/svg+xml",
      },
      {
        url: "/favicon.ico?v=3",
        sizes: "any",
      },
    ],
    other: [
      {
        rel: "mask-icon",
        url: "/favicon.svg?v=3",
        color: "#1A5FFC",
      },
    ],
  },
  manifest: "/site.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "default",
    title: "SehatSetu",
  },
};

export const viewport: Viewport = {
  themeColor: "#1A5FFC",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <ClerkProvider>
      <ReduxProvider>
        <AppointmentProvider>
          <html lang="en" suppressHydrationWarning>
            <head>
              <link rel="icon" type="image/svg+xml" href="/favicon.svg?v=3" />
              <link rel="icon" type="image/x-icon" href="/favicon.ico?v=3" />
              <link rel="mask-icon" href="/favicon.svg?v=3" color="#1A5FFC" />
            </head>
            <body
              className={`${geistSans.variable} ${geistMono.variable} antialiased`}
              suppressHydrationWarning
            >
              <GoogleTranslate />
              {children}
              <Toaster />
            </body>
          </html>
        </AppointmentProvider>
      </ReduxProvider>
    </ClerkProvider>
  );
}
