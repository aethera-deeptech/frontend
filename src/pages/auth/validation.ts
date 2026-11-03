import { businessNameLength, passwordLength } from '@/api/auth';
import { countCharacters } from '@/lib/characters';

// The checks of the forms before the API is called. Each one returns the text under the field, or undefined when the value is
// fine. The API checks again, so these only save a round trip.

// An address needs a name, an at sign and a domain with a dot. The API decides what counts as a real address.
const emailShape = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function checkEmail(value: string, emptyText = 'Isi email Anda.'): string | undefined {
  const email = value.trim();

  if (email === '') {
    return emptyText;
  }
  return emailShape.test(email) && email.length <= 254 ? undefined : 'Isi email yang valid.';
}

// The address that replaces the one of the account. An address that is the same as the current one changes nothing, but the
// API does not refuse it and would send another link to it, so the screen asks for another address first.
export function checkNewEmail(value: string, current: string): string | undefined {
  const email = value.trim();

  if (email === '') {
    return 'Isi email baru Anda.';
  }
  const wrong = 'Isi email yang benar, dan berbeda dari email saat ini.';

  if (checkEmail(email) !== undefined) {
    return wrong;
  }
  return email.toLowerCase() === current.trim().toLowerCase() ? wrong : undefined;
}

// The login accepts any password that is not empty, so a password from before a rule change still works
export function checkPasswordPresent(value: string): string | undefined {
  return value === '' ? 'Isi kata sandi Anda.' : undefined;
}

// The text under the password field when the API refuses a password that is on its list of common ones
export const commonPasswordText = 'Kata sandi ini terlalu umum. Pilih kata sandi lain.';

export function checkNewPassword(value: string): string | undefined {
  if (value === '') {
    return 'Isi kata sandi Anda.';
  }
  // The API counts characters and not the units of the string, so four emoji are four and not eight
  const length = countCharacters(value);

  if (length < passwordLength.min) {
    return `Minimal ${passwordLength.min.toString()} karakter.`;
  }
  return length > passwordLength.max
    ? `Maksimal ${passwordLength.max.toString()} karakter.`
    : undefined;
}

export function checkBusinessName(value: string): string | undefined {
  const name = value.trim();

  if (name === '') {
    return 'Isi nama usaha.';
  }
  return countCharacters(name) > businessNameLength.max
    ? `Maksimal ${businessNameLength.max.toString()} karakter.`
    : undefined;
}
