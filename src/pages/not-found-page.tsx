import { Link } from 'react-router';

// The Figma file has no design for this page, so it is plain text until the user decides.
export function NotFoundPage() {
  return (
    <>
      <title>Halaman tidak ditemukan · Audit Energi UMKM</title>
      <h1 className="text-h2 text-text-heading">Halaman tidak ditemukan</h1>
      <p className="text-body text-text-2 mt-2">Alamat yang Anda buka tidak ada.</p>
      <Link to="/" className="text-body text-text-accent mt-3 inline-block rounded-md underline">
        Kembali ke Beranda
      </Link>
    </>
  );
}
