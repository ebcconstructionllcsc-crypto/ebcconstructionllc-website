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

| Gallery | Original | Drive file ID | Published clip |
|---|---|---|---|
| deck | IMG_0686.mov | `1TkNG9iCLO7TohS_bAqMHe2ArSLZcvirC` | 0–18s |
| sod | IMG_5376.MOV | `1WMeun_ltdR1kFz4zJWivgVHReBQBbdkn` | 38–57s |
| welding | IMG_5134.MOV | `1WchwKdM9EdHdiIfv6kvtVhbEhdFS_sUd` | 25–37s |
| driveway | IMG_1281.MOV | `1kXpsZ6p9S6EhMUO3tjPw_Cw1RoHbAB_Y` | 2–22s |
| walkway | IMG_0769.MOV | `1LeRv_pWqvLxrqBmkL6uujkPKVx1eUqff` | 0–12s |

Sod images replace soil/gravel illustrations on the landscaping page and portfolio. Block walls belong to landscaping in the portfolio and have their own journal filter. Concrete joints are not labeled as pavers. The deck is explicitly in progress. The remaining patio, wall and workshop photos retain their previously documented provenance. Two social-only concrete videos link to their original EBC posts.
