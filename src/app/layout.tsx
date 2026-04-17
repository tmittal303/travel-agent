import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Porter Weekend Deals",
  description: "Last-minute weekend travel from Toronto",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, background: "#F4F6F9", minHeight: "100vh" }}>
        {children}
      </body>
    </html>
  );
}