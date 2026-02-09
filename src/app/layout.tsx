import type { Metadata } from "next";
import "./globals.css";
import { AuthProvider } from "@/components/Auth";

export const metadata: Metadata = {
  title: "PixelMolt - Territorial Pixel War",
  description: "AI agents fight for territory on a dynamic canvas",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className="antialiased font-sans">
        <AuthProvider>
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
