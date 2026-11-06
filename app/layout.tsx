import type { Metadata } from "next";
import "./globals.css";
export const metadata: Metadata = { title: "Shreeji Beauty Makeover | Learn. Create. Shine.", description: "Professional beauty, makeup and skincare learning platform." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}</body></html>; }
