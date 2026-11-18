# Service media classification — 2026-10-13

Reviewed the 129 distinct image/poster references used by Home, Services,
Projects, Landscaping & Pavers, and Welding. Compared the relevant originals
with the connected EBC Google Drive photo collection, the earlier website
gallery archive, and the workshop-welding replacement photo.

## Placement rules

- **Concrete:** driveways, patios, slabs, steps, sidewalks, concrete placement
  and related preparation. Diagonal control joints and stamped concrete are
  concrete, not evidence of a paver installation.
- **Landscaping & pavers:** only outdoor-work media whose contents support
  the caption. The two new photographs show ground preparation and gravel,
  not sod installation or finished pavers.
- **Welding:** the workshop photo shows welding on a trailer frame. Keep the
  existing separately labeled Facebook welding video in this service.
- The existing Instagram sod video belongs in Landscaping, not the recent
  concrete-project cards. Preserve its source link and fallback link.
- Never infer a client's identity, project county, completion date, or work
  performed merely because a lawn, house, vehicle, or slab is in the frame.

## Newly optimized original photographs

| Drive original | Public variants | Classification |
| --- | --- | --- |
| IMG_2890.jpeg | assets/images/landscaping-20261013/site-preparation-{720,1440}.webp | Outdoor soil preparation |
| IMG_2910.jpeg | assets/images/landscaping-20261013/gravel-surface-{720,1440}.webp | Gravel surface beside a home |

Only orientation, proportional downscaling, compression and metadata removal
were applied. Original Drive files and folder organization were not changed.
No AI-generated or retouched project photos were added. These photographs are
not captioned as completed paver or sod projects. No confirmed standalone
paver-installation photograph was found among the reviewed samples.

## Runtime safeguards

- Projects opens in Concrete, with separate Landscaping and Welding controls.
- Direct service gallery links select the matching service and hero background.
- Concrete-only features, recent concrete work and conceptual concrete previews
  are hidden while another service is selected.
- The all-services overview remains explicitly selectable. Even there, enlarged
  photo navigation stays inside the selected photo's service; recent project
  cards and conceptual previews also retain their own gallery scope.
- Dedicated service pages link to the matching gallery, not the unfiltered one.
- Service deep links skip the old concrete-photo entrance animation.
- `tests/service-media-flow.mjs` protects service boundaries, backgrounds,
  deep links, source placement, photo existence, size and private metadata.


## November 1 journal curation

Original footage visually reviewed in Drive; selected frames and silent H.264 clips are published. No synthetic project imagery. File upload dates are not presented as completion dates. Each journal story stays within one project.

| Gallery | Original | Source location | Published clip |
|---|---|---|---|
| deck | IMG_0686.mov | Authorized private Drive folder | 0–18s |
| sod | IMG_5376.MOV | Authorized private Drive folder | 38–57s |
| welding | IMG_5134.MOV | Authorized private Drive folder | 25–37s |
| driveway | IMG_1281.MOV | Authorized private Drive folder | 2–22s |
| walkway | IMG_0769.MOV | Authorized private Drive folder | 0–12s |

Sod images replace soil/gravel illustrations on the landscaping page and portfolio. Block walls belong to landscaping in the portfolio and have their own journal filter. Concrete joints are not labeled as pavers. The deck is explicitly in progress. The remaining patio, wall and workshop photos retain their previously documented provenance. Two social-only concrete videos link to their original EBC posts.


## November 17 source recovery and journal update

Verified the user-authorized open Facebook session for the professional profile
`EdgarAguilarEBC` (ID `100059137420359`). The old `galincitobolanos1`
address returned unavailable content. No Facebook content or privacy settings
were changed. Dates below are **source publication dates**, never inferred
construction/completion dates; the verification date is **2026-11-17**.

Reviewed the recent professional-profile content library and opened the relevant
original posts and photo galleries. Shared EBC Page albums were reached through
those profile posts, not through discovery of a new source account. Excluded
recommendations of other contractors, collaboration announcements, cover-photo
changes, private/unclear entries, archived ephemeral stories, and sales/planning
listings without verified project media. A private or unverified entry is not
proof of a completed EBC job and is not a new public journal story.

### Source-to-story mapping

| Story ID | Public source ID | Source published (America/New_York) | Decision |
|---|---|---|---|
| `sod` | `1504876491493584` | 2026-11-16 21:36 | Same backyard as existing sod footage: pool fence, shed, white fence and crew match. Add six photographs, retain the original clip and first three frames. |
| `extension` | `1503891968258703` | 2026-11-15 22:12 | Same driveway as the archived Instagram reel `DeZuQUsgfXP`: video visibly matches the stone-front house, garage, side extensions and curb. Add six photographs and restore a visible card, preserving the existing story ID and video. |
| `driveway-deck-20261111` | `122154026199348579` | 2026-11-11 22:12 | Add a distinct project with five construction photos. The house wrap, brick foundation and existing timber deck distinguish it from the archive walkway. Exclude the two review screenshots and all customer-identifying copy. |
| `patio` | `122153943669348579` | 2026-11-11 11:58 | Exact finished-photo match to the existing patio gallery. Add only two before-work images; keep the original three finished images without duplicating the project. |
| `deck` | Reel `2179539616299336`, post `1470856244895609` | 2026-10-14 00:03 | Pending reel is the existing deck-in-progress project: same shed doors, framing and crew. Add its original source link alongside the existing silent Drive clip; do not create another story or imply completion. |

The landscaping Page album `122155039029348579`, shared by profile post
`1504565484858018`, repeats the landscaping photos. The driveway Page album
`122154882927348579`, shared by profile post `1503925871588646`, repeats the
extension. Profile post `1502950085019558` shares a cover-photo change.
Profile posts `1500069895307577` and `1499677102013523` point to the deck-connection
and patio Page albums respectively. These shared posts are not separate projects.

Original public source links:

- `sod`: https://www.facebook.com/EdgarAguilarEBC/posts/pfbid0noeJXPW9kE3EhsMB6ExmREHh7oxFhBMqxWoCAMVS1Nw1cgaTww8RJMn58vwM8tZfl
- `extension`: https://www.facebook.com/EdgarAguilarEBC/posts/pfbid0sAaH6mUBrDBXaU7AcmGpsUWn7CnEhs5sYLhL3Vkj8UWbZ4qNcPVsMyhzsWKw4oEZl
- `patio`: https://www.facebook.com/permalink.php?story_fbid=pfbid034QfeMg6KiMcDRGRnBuBuaCAh95hTEcZP9oVbtJGKbymcfL8KbcvfPfc4zBMmjE4Kl&id=61590457384469
- `driveway-deck-20261111`: https://www.facebook.com/permalink.php?story_fbid=pfbid02kg8H6wztKwYd1JK9WwFfhAQH6cAxuP2rLRtWopDYrsXMtiTqkZ1KAEqfQAcVzhLfl&id=61590457384469
- `deck`: https://www.facebook.com/reel/2179539616299336

### Display derivatives

The originals remain unchanged. These WebP derivatives use only EXIF orientation,
proportional downscaling (maximum 1600 px), compression and metadata removal.
No synthetic imagery, retouching, customer names, addresses or completion dates
were introduced. Existing pools/decks shown for context are not claimed as EBC
construction. The new photographs were visually compared against the archive
before association with a story.

| Story | Facebook photo ID | Local derivative |
|---|---|---|
| `sod` | `1504875871493646` | `assets/images/journal-20261117/sod-river-rock.webp` |
| `sod` | `1504875878160312` | `assets/images/journal-20261117/sod-lawn.webp` |
| `sod` | `1504875864826980` | `assets/images/journal-20261117/sod-preparation.webp` |
| `sod` | `1504875934826973` | `assets/images/journal-20261117/sod-installation.webp` |
| `sod` | `1504875948160305` | `assets/images/journal-20261117/sod-yard.webp` |
| `sod` | `1504875984826968` | `assets/images/journal-20261117/sod-pool-edge.webp` |
| `extension` | `1503890141592219` | `assets/images/journal-20261117/extension-after-front.webp` |
| `extension` | `1503890124925554` | `assets/images/journal-20261117/extension-before-left.webp` |
| `extension` | `1503890118258888` | `assets/images/journal-20261117/extension-before-right.webp` |
| `extension` | `1503890184925548` | `assets/images/journal-20261117/extension-side.webp` |
| `extension` | `1503890214925545` | `assets/images/journal-20261117/extension-after-right.webp` |
| `extension` | `1503890231592210` | `assets/images/journal-20261117/extension-after-left.webp` |
| `patio` | `122153943555348579` | `assets/images/journal-20261117/patio-before-wide.webp` |
| `patio` | `122153943597348579` | `assets/images/journal-20261117/patio-before-edge.webp` |
| `driveway-deck-20261111` | `122154025989348579` | `assets/images/journal-20261117/deck-connection-finished.webp` |
| `driveway-deck-20261111` | `122154026031348579` | `assets/images/journal-20261117/deck-connection-deck.webp` |
| `driveway-deck-20261111` | `122154025857348579` | `assets/images/journal-20261117/deck-connection-before.webp` |
| `driveway-deck-20261111` | `122154025899348579` | `assets/images/journal-20261117/deck-connection-preparation.webp` |
| `driveway-deck-20261111` | `122154025947348579` | `assets/images/journal-20261117/deck-connection-reinforcement.webp` |

The three homepage previews now link to `sod`, `extension` and
`driveway-deck-20261111`. All prior journal IDs and archive links remain valid.
The concrete hero and service filtering remain unchanged. Only the homepage and
news sitemap dates were advanced to the actual website-update date.


## November 17 complete project catalog

Projects now uses all verified stories from the journal data, including the deck,
field welding, poolside retaining wall and recent concrete galleries. The catalog
is generated; its links preserve each original story and keep media within the
matching project. No dates or customer names were added to the catalog.

### Wide driveway with diamond joints

The new `large-diamond-driveway` gallery uses the already approved original-photo
derivatives `driveway-diagonal-joints-wide.webp` (IMG_2501.jpeg) and
`driveway-garage-joints.webp` (IMG_2503.jpeg). Both are recorded in
`assets/media/driveways-20261005.json`. Visual comparison confirms the same wide
driveway at the gray house under construction, with matching garage, porch and
joint layout. This is distinct from the narrower curved driveway in the existing
`diamond` story. Source publication and completion dates remain unknown.

### Additional field-welding clip

The original IMG_5139.MOV from the authorized private EBC video collection shows
the welder beside equipment with his helmet raised. Its outdoor setting,
equipment and light-blue work shirt match the existing field-welding session;
it does not show the indoor trailer-workshop project. The complete 3.24-second
clip is captioned `Welder beside equipment / Soldador junto al equipo`, without
claiming an active welding arc. The original remains unchanged and private.

Public display derivatives:

- `assets/video/gallery-20261117/welder-beside-equipment.mp4`: H.264,
  720 × 1280, no audio, approximately 1.65 MB.
- `assets/images/gallery-20261117/welder-beside-equipment.webp`: frame at 1 second,
  proportional resize/compression only; no synthetic edits or private metadata.

The existing welding clip is preserved; this separate source is added to the
`welding` gallery. The workshop photograph remains in its own gallery.

### Edgar pressure-washing concrete

The owner supplied the original portrait photograph directly on November 17,
2026 (America/New_York). `assets/images/team/edgar-pressure-washing.jpg` is the
unchanged 866 × 1279 JPEG (229,249 bytes), with no cropping, retouching or generated
content. Its metadata contains image dimensions, orientation, color space and
resolution only; no location or capture date is embedded.

The complete photograph appears in the Projects `edgar-on-site` feature and
beside Edgar's story on About. Both link to the full image. The photo documents
Edgar cleaning concrete; it does not establish a separate completed project,
customer, location or completion date. The feature stays outside the generated
project catalog so future journal synchronization preserves it.
