import type { Metadata } from "next";
import "./globals.css";
import SupportChatWidget from "./components/support-chat-widget";
import PanelDrawer from "./components/panel-drawer";
export const metadata: Metadata = { title: "Shreeji Beauty Makeover | Learn. Create. Shine.", description: "Professional beauty, makeup and skincare learning platform." };
function OwnershipBanner(){return <div role="note" aria-label="Website ownership notice" className="ownershipBanner">This website is under DuKu Business FCA Lab</div>}
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><OwnershipBanner/><PanelDrawer/>{children}<SupportChatWidget/></body></html>; }
