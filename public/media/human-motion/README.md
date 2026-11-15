# ClubKeep Human Motion 2.0 — Phase 1 Media Library

The approved media assets live at `public/media/human-motion/`. Next.js serves them at URLs beginning with `/media/human-motion/`. The former `src/components/human-motion/{models,branding,decorations,metrics,medals,concepts}` paths were incorrect for public media; the content has been relocated without recompression.

| Media | Directory | Uploaded |
| --- | --- | ---: |
| Logos (light, dark, stacked, monochrome) | `brand/logos/` | 6 |
| App icon | `brand/icons/` | 1 |
| Yoga, Gym, Dance heroes | `photography/heroes/{yoga,gym,dance}/` | 6 |
| Community, Challenge, Lifestyle photos | `photography/{community,challenges,lifestyle}/` | 6 |
| Hero flow, landscape, botanical, challenge illustrations | `illustrations/` | 10 |
| Four KPI waves, light and dark | `illustrations/metric-waves/` | 8 |
| Individual achievement art | `achievements/individual/` | 8 |
| Unified achievement atlas | `achievements/achievement-sprite.svg` | 1 |

**Total: 46 public media assets.** Seven screenshot mockups are archived under `docs/design/human-motion/references/` so they are not downloadable as part of the production website. The React kit remains at `src/components/human-motion/`.

Empty placeholders are intentionally reserved for `photography/classes/`, `photography/avatars/`, and `motion/`. These assets have not been included in the upload yet.

### Important usage rules

- The achievement React component loads the individual SVGs; external symbol `<use>` caused black gradient rendering in Chromium. The atlas is for export/inspection only and now uses unique gradient IDs.
- Source logo/icon SVGs contain embedded raster pixels, **not editable vector paths**. Some include nontransparent baked backgrounds; preserve the approved visuals and replace only with an accurately redrawn vector master.
- Use explicit `-light`/`-dark` file swaps for ClubKeep's manual theme control.
- All files in `public/` are accessible without login. Never store personally identifying customer photos, credentials, or private documents here.

Detailed path mapping and QA: `docs/design/HUMAN_MOTION_2_MEDIA_UPLOAD.md`.
