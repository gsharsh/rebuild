import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "SpeakReady — Interview & Presentation Coach",
  description:
    "A private rehearsal room for interview readiness, clearer delivery, and confidence coaching.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased">{children}</body>
    </html>
  );
}
