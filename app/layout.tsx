import './globals.css';
import Sidebar from '@/components/Sidebar';

export const metadata = {
  title: 'Pharmacy POS & Inventory',
  description: 'Pharmacy management system',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>
        <div className="flex min-h-screen">
          <Sidebar />
          <main className="flex-1 p-6">{children}</main>
        </div>
      </body>
    </html>
  );
}
