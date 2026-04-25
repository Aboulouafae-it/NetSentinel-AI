import type { Metadata } from "next";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import TopBar from "@/components/TopBar";

export const metadata: Metadata = {
  title: "NetSentinel AI",
  description: "AI-powered network management and observability",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body>
        <div style={{ display: 'flex', minHeight: '100vh' }}>
          <Sidebar />
          <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minWidth: 0 }}>
            <TopBar />
            <main style={{ flex: 1, padding: 'var(--spacing-xl)', overflowY: 'auto' }}>
              {children}
            </main>
          </div>
        </div>
      </body>
    </html>
  );
}
