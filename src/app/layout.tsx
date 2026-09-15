import type { Metadata } from "next";
import { Geist_Mono } from "next/font/google";
import "./globals.css";
import { Toaster } from "@/components/ui/sonner";
import { ThemeProvider } from "@/components/theme-provider";

// Satoshi is a premium sans-serif font from Fontshare (free for personal & commercial use)
// loaded via their CDN CSS. It's used as the primary body font for readability.
const satoshi = {
  className: "font-satoshi",
  variable: "--font-satoshi",
  style: { fontFamily: "Satoshi, sans-serif" },
};

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Aabir — AI Support Agent for @AmazonHelp",
  description:
    "An AI customer-support agent that classifies intent, drafts grounded replies, and decides auto-handle vs escalate — with multi-turn context, fine-tuned sentiment, human-in-the-loop feedback, and A/B threshold tuning.",
  keywords: ["AI agent", "customer support", "intent classification", "LLM"],
  authors: [{ name: "Aabir" }],
  icons: {
    icon: "/favicon.ico",
    shortcut: "/favicon.ico",
    apple: "/favicon.ico",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <head>
        {/* Satoshi font from Fontshare CDN */}
        <link
          href="https://api.fontshare.com/v2/css?f=satoshi&display=swap"
          rel="stylesheet"
        />
      </head>
      <body
        className={`${geistMono.variable} font-sans antialiased bg-background text-foreground`}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="light"
          enableSystem
          disableTransitionOnChange
        >
          {children}
          <Toaster richColors position="top-right" />
        </ThemeProvider>
      </body>
    </html>
  );
}
