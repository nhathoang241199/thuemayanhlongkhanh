import type { Metadata } from "next";
import { Provider } from "@/components/ui/provider";
import "./globals.css";

export const metadata: Metadata = {
  title: "Thuê máy ảnh Long Khánh",
  description: "Đặt lịch thuê máy ảnh",
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
