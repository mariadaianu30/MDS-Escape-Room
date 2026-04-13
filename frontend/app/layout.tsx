import type { Metadata } from "next";
import "./globals.css";
import { InventoryProvider } from "@/lib/InventoryContext";
import Inventory from "@/components/Inventory";

export const metadata: Metadata = {
  title: "Escape Room: Mathematical Library",
  description: "Level 1 Escape Room interactive puzzle.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <link href="https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Cormorant+Garamond:wght@400;600&family=Roboto+Slab:wght@400&display=swap" rel="stylesheet" />
      </head>
      <body className="font-cormorant">
        <InventoryProvider>
          {children}
          <Inventory />
        </InventoryProvider>
      </body>
    </html>
  );
}
