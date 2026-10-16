import type { Metadata, Viewport } from "next";
import { Righteous, Plus_Jakarta_Sans } from "next/font/google";
import { PwaRegister } from "@/components/pwa-register";
import "./globals.css";

const righteous = Righteous({
  variable: "--font-righteous",
  weight: "400",
  subsets: ["latin"],
});

const plusJakarta = Plus_Jakarta_Sans({
  variable: "--font-jakarta",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "La Perla Soft",
  description:
    "Control de inventario, ventas, créditos y utilidades — La Perla Video Bar",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "La Perla Soft",
  },
};

export const viewport: Viewport = {
  themeColor: "#120a22",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="es"
      className={`${righteous.variable} ${plusJakarta.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col">
        <PwaRegister />
        {children}
      </body>
    </html>
  );
}
