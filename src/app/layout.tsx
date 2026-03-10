import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'USMLE Step 2 CK Question Generator — by Medmastery & LITFL',
  description:
    'Upload a PDF and generate high-quality USMLE Step 2 CK practice questions with AI. Built by Medmastery and Life in the Fast Lane.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
