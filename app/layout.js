import './globals.css';

export const metadata = {
  title: 'Lift Specifications',
  description: 'Add lift specifications one at a time.',
};

export const viewport = { width: 'device-width', initialScale: 1 };

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
