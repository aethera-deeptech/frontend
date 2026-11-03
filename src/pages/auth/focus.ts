// Puts the focus on a field after a call failed, unless the user has already moved on to another control while the call ran.
// The focus is still on the submit button, on the page or on the field itself in the cases where nobody moved it.
export function focusUnlessMoved(field: HTMLElement | null): void {
  const active = document.activeElement;
  const stayed =
    active === null ||
    active === document.body ||
    active === field ||
    (active instanceof HTMLButtonElement && active.type === 'submit');

  if (stayed) {
    field?.focus();
  }
}
