import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Marketing Insights Generator",
  description: "Turn messy marketing data into CMO-ready insights",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="bg-gray-50 text-gray-900 min-h-screen font-sans antialiased">
        {children}
      </body>
    </html>
  );
}
