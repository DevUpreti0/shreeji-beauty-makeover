import type { Metadata } from "next";
import "./globals.css";
import SupportChatWidget from "./components/support-chat-widget";
export const metadata: Metadata = { title: "Shreeji Beauty Makeover | Learn. Create. Shine.", description: "Professional beauty, makeup and skincare learning platform." };
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body>{children}<SupportChatWidget/></body></html>; }
