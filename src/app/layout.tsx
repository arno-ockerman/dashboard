import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import CommandPalette from "@/components/CommandPalette";

export const metadata: Metadata = {
  title: "Make It Happen | Dashboard",
  description: "Business dashboard for Make It Happen - Herbalife distribution, CRM, Sales, Knowledge",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Bebas+Neue&family=Playfair+Display:ital,wght@0,400;0,600;1,400&family=Red+Hat+Display:wght@300;400;500;600;700;800&display=swap"
          rel="stylesheet"
        />
      </head>
      <body className="bg-zinc-950 text-white font-red-hat overflow-x-hidden">
        <div className="flex h-screen overflow-hidden">
          <Sidebar />
          <CommandPalette />
          <main className="flex-1 min-w-0 overflow-y-auto overflow-x-hidden bg-zinc-950">
            <div className="px-4 sm:px-6 lg:px-8 py-6 lg:py-8 max-w-7xl mx-auto">
              {children}
            </div>
          </main>
        </div>
      </body>
    </html>
  );
}
