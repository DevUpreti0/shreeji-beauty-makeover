import {Suspense} from "react";
export default function CashfreeReturnLayout({children}:{children:React.ReactNode}){return <Suspense fallback={<main className="portalPage"><p>Loading payment status…</p></main>}>{children}</Suspense>}
