# Login imagery

Drop the login panel photograph in this directory. The interface renders correctly without it, the panel falls back to a deep brand-tinted surface with the KMC mark, so a missing file is never a broken screen.

## What the login screen expects

| File | Purpose | Required |
|---|---|---|
| `login-panel.jpg` | The left panel of the sign-in screen | No. Falls back to a tinted surface |
| `login-panel@2x.jpg` | High-density variant | No |

## Specification

| Property | Value |
|---|---|
| Aspect ratio | Portrait, roughly 3:4. The panel is full height and about 45% of viewport width on desktop |
| Minimum size | 1200 × 1600 px. Supply 1600 × 2133 px for `@2x` |
| Format | JPEG, progressive, quality 80. Keep the file under 400 KB. This screen loads before authentication and should not wait on a large asset |
| Subject | Vehicle plant or manufacturing floor |
| Composition | The right third is overlaid with a dark gradient carrying white text. Keep the subject weighted to the left and avoid detail that matters on the right edge |

## Choosing the photograph

Avoid clinical or medical imagery. This is a QHSE system, not a medical product, and a stethoscope on the sign-in screen sets the wrong expectation about what it does.

Avoid prominent recognisable faces. A face on a sign-in screen reads as an employee or a patient, and neither implication is one this system should make.

Industrial environment, machinery, assembly work and plant interiors all work well. Muted or cool-toned images sit better under the overlay than saturated ones.

## Licensing

Record the source and licence of whatever you place here in `NOTICE.md` alongside this file, including the photographer and the licence name. A corporate deployment needs to be able to answer where its assets came from, and the answer should not depend on anyone's memory.
