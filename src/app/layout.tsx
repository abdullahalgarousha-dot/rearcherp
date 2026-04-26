export const dynamic = 'force-dynamic';

import type { Metadata } from "next";
import { Inter, Cairo } from "next/font/google";
import "./globals.css";
import { cn } from "@/lib/utils";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const cairo = Cairo({ subsets: ["arabic"], variable: "--font-cairo" });

import { getSystemSettings } from "@/app/actions/settings"
import { Toaster } from "sonner";

export async function generateMetadata(): Promise<Metadata> {
    const settings = await getSystemSettings()
    const companyName = settings.companyNameEn || "TO-PO Engineering"

    return {
        title: `${companyName} | System`,
        description: "TO-PO Engineering Management System",
    }
}

export default function RootLayout({
    children,
}: Readonly<{
    children: React.ReactNode;
}>) {
    return (
        <html lang="en" dir="rtl" suppressHydrationWarning>
            <body suppressHydrationWarning className={cn(
                "min-h-screen bg-background font-sans antialiased",
                inter.variable,
                cairo.variable
            )}>
                {children}
                <Toaster richColors position="top-center" />
            </body>
        </html>
    );
}
