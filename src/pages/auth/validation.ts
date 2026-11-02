import { businessNameLength, passwordLength } from '@/api/auth';

// The checks of the forms before the API is called. Each one returns the text under the field, or undefined when the value is
// fine. The API checks again, so these only save a round trip.

// An address needs a name, an at sign and a domain with a dot. The API decides what counts as a real address.
const emailShape = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function checkEmail(value: string): string | undefined {
  const email = value.trim();

  if (email === '') {
    return 'Isi email Anda.';
  }
  return emailShape.test(email) && email.length <= 254 ? undefined : 'Isi email yang valid.';
}

// The login accepts any password that is not empty, so a password from before a rule change still works
export function checkPasswordPresent(value: string): string | undefined {
  return value === '' ? 'Isi kata sandi Anda.' : undefined;
}

export function checkNewPassword(value: string): string | undefined {
  if (value === '') {
    return 'Isi kata sandi Anda.';
  }
  if (value.length < passwordLength.min) {
    return `Minimal ${passwordLength.min.toString()} karakter.`;
  }
  return value.length > passwordLength.max
    ? `Maksimal ${passwordLength.max.toString()} karakter.`
    : undefined;
}

export function checkBusinessName(value: string): string | undefined {
  const name = value.trim();

  if (name === '') {
    return 'Isi nama usaha.';
  }
  return name.length > businessNameLength.max
    ? `Maksimal ${businessNameLength.max.toString()} karakter.`
    : undefined;
}
