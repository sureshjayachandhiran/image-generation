import "./globals.css";

export const metadata = {
  title: "Pixel AI — Personal Image Studio",
  description: "Private image generation powered by your own ComfyUI engine."
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
