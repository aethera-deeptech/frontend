import { Button } from '@/components/ui/button';
import { TextInput } from '@/components/ui/text-input';
import { TextLink } from '@/components/ui/text-link';
import { AuthFrame } from '@/pages/auth/auth-frame';
import { PasswordField } from '@/pages/auth/password-field';

// The login does not exist yet, so the whole form is disabled. The screen is here so that the way in is ready when it does.
export function MasukPage() {
  return (
    <AuthFrame
      title="Masuk"
      subtitle="Masuk untuk melihat saran penghematan usaha Anda."
      notice={{
        title: 'Masuk belum tersedia',
        message: 'Fitur masuk sedang disiapkan. Formulir ini belum bisa dipakai.',
      }}
    >
      <form noValidate className="flex flex-col gap-3">
        <fieldset disabled className="flex flex-col gap-3">
          <legend className="sr-only">Masuk dengan email</legend>
          <TextInput label="Email" type="email" autoComplete="email" />
          <PasswordField label="Kata sandi" autoComplete="current-password" disabled />
          <Button type="submit" kind="accent" size="lg">
            Masuk
          </Button>
        </fieldset>
        <p className="text-label text-text-2 text-center">atau</p>
        <Button size="lg" disabled>
          Lanjut dengan Google
        </Button>
      </form>
      <p className="text-body text-text-2 text-center">
        Belum punya akun? <TextLink to="/daftar">Daftar</TextLink>
      </p>
    </AuthFrame>
  );
}
