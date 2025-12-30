import type { Metadata } from "next";
import { Noto_Sans_JP, Shippori_Mincho } from "next/font/google";
import "./globals.css";
import { UserProvider } from "@/context/UserContext";

const notoSans = Noto_Sans_JP({
  variable: "--font-body",
  subsets: ["latin"],
  weight: ["400", "500", "600", "700"],
  display: "swap",
});

const shipporiMincho = Shippori_Mincho({
  variable: "--font-heading",
  subsets: ["latin"],
  weight: ["600", "700"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "りんご会♪",
  description: "欲しいものを交換し合う、新しいコミュニティ",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ja">
      <body
        className={`${notoSans.variable} ${shipporiMincho.variable} antialiased bg-[#F5F5F5] text-[#5C4033]`}
      >
        <UserProvider>{children}</UserProvider>
      </body>
    </html>
  );
}
