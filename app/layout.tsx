import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Fotobudka - Masterpiece AI",
  description: "Design and print your expo postcards",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <head>
        <meta
          name="viewport"
          content="width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no"
        />
      </head>
      <body style={{ margin: 0, backgroundColor: "#eeece2" }}>
        {children}
      </body>
    </html>
  );
}
