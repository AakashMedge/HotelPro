import type { Metadata } from "next";
import { Playfair_Display, Inter } from 'next/font/google';
import "@/styles/globals.css";

const playfair = Playfair_Display({
    subsets: ['latin'],
    weight: ['400', '700', '900'],
    variable: '--font-playfair',
});

const inter = Inter({
    subsets: ['latin'],
    variable: '--font-inter',
});

export const metadata: Metadata = {
    title: "HotelPro | Premium Hospitality Management",
    description: "Seamlessly manage your hotel, restaurant, and staff with HotelPro.",
};

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" className={`${playfair.variable} ${inter.variable}`}>
            <body className="antialiased min-h-screen flex flex-col font-sans">
                {children}
            </body>
        </html>
    );
}
