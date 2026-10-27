import "./style.css";
export const metadata = {
  title: "PACE — Marketing Intelligence",
  description: "Monitoramento e SEO com IA local",
};
export default function Layout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  );
}
