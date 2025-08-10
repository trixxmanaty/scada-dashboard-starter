
import "./globals.css"; import type { Metadata } from "next";
export const metadata: Metadata = { title:"SCADA Dashboard Starter • GreenGasTurbines", description:"A polished dashboard shell for energy assets." };
export default function RootLayout({ children }: { children: React.ReactNode }) { return (<html lang="en"><body className="bg-white text-gray-900">{children}</body></html>); }
