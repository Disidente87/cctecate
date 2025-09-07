import type { Metadata } from "next";
import { Inter, Poppins } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

const poppins = Poppins({
  subsets: ["latin"],
  weight: ["400", "500", "600", "700", "800"],
  variable: "--font-poppins",
  display: "swap",
});

export const metadata: Metadata = {
  title: "Creando Consciencia Tecate - Transforma tu vida, despierta tu liderazgo",
  description: "Programa de desarrollo personal y liderazgo que transforma vidas a través de inteligencia emocional, metas personales y comunidad.",
  keywords: "liderazgo, desarrollo personal, inteligencia emocional, metas, comunidad, Tecate",
  authors: [{ name: "Creando Consciencia Tecate" }],
  openGraph: {
    title: "Creando Consciencia Tecate",
    description: "Transforma tu vida, despierta tu liderazgo",
    type: "website",
    locale: "es_ES",
  },
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es">
      <body className={`${inter.variable} ${poppins.variable} antialiased`}>
        {children}
      </body>
    </html>
  );
}
