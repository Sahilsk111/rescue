STREET RESCUE JAMMU - FINAL FIX (2026-11-18)

ONE FILE DOES EVERYTHING (recommended):
- Open ONLY this file: index.html  (this one file contains Home, Report, Adopt,
  Donate, Volunteer, Contact and Admin. Every button/menu opens its section inside
  the same file, so it works even in a phone ZIP preview or file preview.)
- No extraction needed. No other file to open first.

If you want the original multi-page version instead:
- Extract/Unzip ALL files first, then open the extracted folder's index.html.
  Do NOT open files inside the ZIP preview for the multi-page version.

Why the old fix still failed on your phone:
Phone previews open HTML in a sandbox with NO storage and NO file navigation.
The old single-file version crashed on blocked storage and its #/report links
    (hash navigation) cannot run inside blob:/data: previews, so taps did nothing.
This version fixes both: storage is guarded (no crash in previews) and section
switching no longer needs hash navigation or sibling files.

Tested in a real browser: all 7 sections open from file://, data: URL and
blob: URL preview contexts with no page errors.

Admin (demo only): admin@gmail.com / password. Data saves in this browser only.
Contact details in this file are placeholders.

Do not deploy, demo only.
