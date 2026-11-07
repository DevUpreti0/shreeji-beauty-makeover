import type { Metadata } from "next";
import "./globals.css";
import SupportChatWidget from "./components/support-chat-widget";
export const metadata: Metadata = { title: "Shreeji Beauty Makeover | Learn. Create. Shine.", description: "Professional beauty, makeup and skincare learning platform." };
function OwnershipBanner(){return <div role="note" aria-label="Website ownership notice" style={{width:"100%",background:"#241d19",color:"#fff7ef",textAlign:"center",padding:"7px 12px",fontSize:11,fontWeight:600,letterSpacing:".7px",lineHeight:1.5,borderBottom:"1px solid #b98a67"}}>This website is under DuKu Business FCA Lab</div>}
export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) { return <html lang="en"><body><OwnershipBanner/>{children}<SupportChatWidget/></body></html>; }
