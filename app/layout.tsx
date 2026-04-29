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
        <link
          href="https://fonts.googleapis.com/css2?family=Lato:ital,wght@0,400;0,700;1,400&display=swap"
          rel="stylesheet"
        />
      </head>
      <body style={{ margin: 0, backgroundColor: "#ffffff" }}>
        {children}
      </body>
    </html>
  );
}
