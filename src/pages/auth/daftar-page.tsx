import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/text-input';
import { TextLink } from '@/components/ui/text-link';
import { AuthFrame } from '@/pages/auth/auth-frame';
import { PasswordField } from '@/pages/auth/password-field';

// Registration does not exist yet, so the whole form is disabled, like the login.
export function DaftarPage() {
  return (
    <AuthFrame
      title="Daftar"
      subtitle="Buat akun untuk usaha Anda."
      notice={{
        title: 'Daftar belum tersedia',
        message: 'Fitur daftar sedang disiapkan. Formulir ini belum bisa dipakai.',
      }}
    >
      <form noValidate className="flex flex-col gap-3">
        <fieldset disabled className="flex flex-col gap-3">
          <legend className="sr-only">Daftar dengan email</legend>
          <TextInput
            label="Nama usaha"
            helper="Tampil di bagian atas Beranda."
            autoComplete="organization"
          />
          <TextInput label="Email" type="email" autoComplete="email" />
          <PasswordField
            label="Kata sandi"
            helper="Minimal 8 karakter."
            autoComplete="new-password"
            disabled
          />
          <Button type="submit" kind="accent" size="lg">
            Daftar
          </Button>
        </fieldset>
        <p className="text-label text-text-2 text-center">atau</p>
        <Button size="lg" disabled>
          Daftar dengan Google
        </Button>
        <p className="text-label text-text-2 text-center">
          Dengan mendaftar, Anda menyetujui Ketentuan dan Kebijakan privasi.
        </p>
      </form>
      <p className="text-body text-text-2 text-center">
        Sudah punya akun? <TextLink to="/masuk">Masuk</TextLink>
      </p>
    </AuthFrame>
  );
}
