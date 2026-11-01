# Accessibility statement

The app has its screens, and the automated axe check in the end to end tests covers each route once, with sample data, on three devices. The home screen is checked on every device. The sign-in and sign-up screens are scanned with their forms disabled. The steps to add a device are scanned for a plug (kind, consent, name and the search while it runs) and for the clamp warning. This page says what the design aims for, where the known gaps are and how to report a barrier. The other states are scanned on an iPhone 13 and Desktop Chrome. They are the empty, collecting and error states of Beranda, Saran, Alat, Laporan, Catat produksi and Pengaturan, a tip that is deferred, rejected or checked, a tip or a device that does not exist, the found and the not found outcome of a device search, the open room list and the clamp consent step. It makes no claim about anything else, such as the dark theme, a screen with a banner for being offline, a filtered list with no result or a form that shows a validation error.

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
- The floating Catat produksi button stays over the lower right corner on Beranda and Alat. At 200 percent zoom or with a large system font it covers more of the screen, and this was not tested.
- Nothing has been tested with assistive technology, and no conformance claim is made for any standard such as WCAG.
- The wording of the safety warning for the clamp sensor is a draft that a licensed electrician must confirm.

## Report a barrier

Open an issue with the bug report form and fill in the Accessibility field. Describe what you were trying to do, where it went wrong and which tools you use, such as a browser and a screen reader. The form applies the `bug` label and a maintainer adds the `accessibility` label. This repository does not promise a reply time for these reports.
