import type { Metadata } from "next";
import { Provider } from "@/components/ui/provider";
import { getSiteTitle } from "@/lib/site-config";
import "./globals.css";

export const metadata: Metadata = {
  title: getSiteTitle(),
  description: "Đặt lịch thuê máy ảnh",
  themeColor: "#5c3d29",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="vi">
      <body>
        <Provider>{children}</Provider>
      </body>
    </html>
  );
}
