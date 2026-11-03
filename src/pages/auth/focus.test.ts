import { afterEach, describe, expect, it } from 'vitest';

import { focusUnlessMoved } from '@/pages/auth/focus';

function setup() {
  document.body.innerHTML =
    '<form><input id="password"><input id="email"><button type="submit" id="send">Daftar</button>' +
    '<button type="button" id="show">Tampilkan</button></form>';
  const get = (id: string): HTMLElement => {
    const element = document.getElementById(id);

    if (!element) {
      throw new Error(`The test page has no element ${id}.`);
    }
    return element;
  };

  return { password: get('password'), email: get('email'), send: get('send'), show: get('show') };
}

afterEach(() => {
  document.body.innerHTML = '';
});

describe('focusUnlessMoved', () => {
  it('puts the focus on the field when it is on the page, on the submit button or on the field', () => {
    const { password, send } = setup();

    focusUnlessMoved(password);
    expect(password).toHaveFocus();

    send.focus();
    focusUnlessMoved(password);
    expect(password).toHaveFocus();

    (document.activeElement as HTMLElement).blur();
    focusUnlessMoved(password);
    expect(password).toHaveFocus();
  });

  it('leaves the focus where the user moved it', () => {
    const { password, email, show } = setup();

    email.focus();
    focusUnlessMoved(password);
    expect(email).toHaveFocus();

    show.focus();
    focusUnlessMoved(password);
    expect(show).toHaveFocus();
  });

  it('does nothing when there is no field', () => {
    const { email } = setup();

    email.focus();
    focusUnlessMoved(null);

    expect(email).toHaveFocus();
  });
});
