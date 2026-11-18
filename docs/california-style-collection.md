# California Style collection

The owner authorized applying the same presentation improvements to all California Style work. The collection matches the `#california-style` section in projects.html: all 21 photographs and six original videos, each included once in the galleries. Categories describe the visible media and are not a claim that every photograph is a different project. Work-in-progress video captions are preserved.

- Dedicated bilingual collection at california-style.html, with entries from Home and Projects, same-site estimate context, canonical/social metadata and sitemap/deployment inclusion.
- Mild display-only brightness 1.035 and contrast 1.015 applied through filename selectors to the known collection media, responsive versions, original video posters and enlarged gallery views. No original file changed, no synthesized detail, no geometry adjustment, no joint/texture cleanup. The known California-style diagonal image in the news journal receives the same treatment.
- Collection photos retain their full frames with contain layout, including on mobile. Native video is loaded only after the visitor opens it and does not autoplay. Closing the viewer clears its media source.
- New collection regression test compares every asset to the established specialty inventory, verifies bilingual photo/video captions, navigation/focus restoration, estimate context and deployment inclusion. Full npm test suite passed before publication.

## Diamond project added November 17, 2026

The four finished views from `concrete-before-after-20261109` now lead both
California Style collections. They show the same curved driveway, diamond joints
and connecting walkway; the landscape second view also serves as the dedicated
page's cover. Both collections link to the existing seven-photo before/after
story. The original 17 photos and six videos remain, with no media files altered.

This specialty collection is curated separately from the generated Projects
catalog. When publishing a verified California Style project, update both
`california-style.html` and `projects.html#california-style`, including their
captions, metadata totals and sitemap dates. `npm run sync:projects` only refreshes
the general project catalog; it does not classify or add specialty photos.
