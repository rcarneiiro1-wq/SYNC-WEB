import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Sync ERP — Gerenciamento de Embarque",
  description: "Painel de acompanhamento de embarques ativos - Sync ERP",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="pt-BR" className="h-full antialiased">
      <body className="min-h-full flex flex-col">{children}</body>
    </html>
  );
}
