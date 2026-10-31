# Accessibility statement

The app is a bare scaffold that shows only the product name, so there is no real interface to audit yet. This page says what the design aims for, where the known gaps are and how to report a barrier. It makes no claim about screens that are not built.

## What the design aims for

- The text contrast of every color pair in the design is computed by a script and not judged by eye, in both the Light and the Dark theme.
- Touch targets on the Mobile screens are at least 44 px high and wide.
- A state is never shown by color alone. A status also has a word, such as Perkiraan or Terverifikasi.
- Every control that takes focus has a visible focus ring that is 2 px wide.
- Every screen exists in a Light and a Dark theme.
- The interface is in Indonesian, and the text is written for an owner who is not technical.

## Known gaps

- A few color pairs are below the contrast target and are accepted for now. They are the disabled text in the Light theme, the focus ring and a few chart parts in the Dark theme, and one danger tag on the gray page. Disabled buttons and disabled calendar dates are exempt.
- Some buttons and sidebar items on the Desktop screens are smaller than 44 px by design.
- Hover states are designed for buttons, sidebar items and menu options only. The other controls have none yet.
- Nothing has been tested with assistive technology, and no conformance claim is made for any standard such as WCAG.
- The wording of the safety warning for the clamp sensor is a draft that a licensed electrician must confirm.

## Report a barrier

Open an issue with the bug report form and fill in the Accessibility field. Describe what you were trying to do, where it went wrong and which tools you use, such as a browser and a screen reader. The form applies the `bug` label and a maintainer adds the `accessibility` label. This repository does not promise a reply time for these reports.
