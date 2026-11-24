import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Mapa CRPM — Brigada Militar / RS",
  description:
    "Circunscrições territoriais CRPM (Brigada Militar) do Rio Grande do Sul — Decreto nº 57.060/2023",
  other: {
    "decreto-sigla-canonica": "CRPO",
  },
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("mapa-crpm-theme");if(t==="light"||t==="dark")document.documentElement.dataset.theme=t;}catch(e){}`,
          }}
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
