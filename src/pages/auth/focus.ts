// Puts the focus on a field after a call failed, unless the user has already moved on to another control while the call ran.
// The caller gives the element that had the focus when the call started. The focus has stayed when it is still there, when it is
// on the page, or when it is on the field itself.
export function focusUnlessMoved(field: HTMLElement | null, activeAtStart: Element | null): void {
  const active = document.activeElement;
  const stayed =
    active === null || active === document.body || active === field || active === activeAtStart;

  if (stayed) {
    field?.focus();
  }
}
