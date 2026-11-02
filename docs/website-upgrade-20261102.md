# Website upgrade — 2026-11-02

## Published scope
- Home consolidated from 16 to 7 main sections; two primary hero actions, four dedicated concrete service entry points, six linked project stories, existing verified reviews, founder/customer-care context and estimate contact.
- Six independent, bilingual project pages: curved driveway, patio extension, concrete access, curved block wall, sod installation and field welding. Each uses only the corresponding journal media. Patio and wall have three verified photos; other featured stories have three photos and one video. No invented extra angles, before/after pairings, dimensions, client names or testimonials.
- Four concrete service pages: driveways, patios, slabs/foundations and sidewalks/steps. Added canonical URLs, social metadata, sitemap entries and deployment allowlist entries.
- Project/service context preselects a service and editable description in the estimate form. Language changes preserve customer edits. Unknown query values are ignored.
- GA4 public allowlist extended to new pages and news. Project/service click events contain no query parameters, project text, customer data or lead references.

## Images and authenticity
User authorized subtle professional retouching, preserving project design and authenticity. A generative edit trial was rejected because small background and construction details were reconstructed. It was not included in the website or repository.

The website uses existing original frame captures and photographs. Presentation only applies brightness 1.035 and contrast 1.015 to the featured images; original image files and full-size gallery images remain unchanged. There is no synthetic sharpening, geometry change, inpainting, object removal or fabricated resolution. Framing cards crop for layout; the project page and enlarged image allow the complete frame to be seen. Source mapping remains in `assets/media/journal-20261101.json` and existing provenance documentation.

## Validation
- Full npm test suite passed, with new checks for all ten page routes, sitemap/deployment inclusion, file integrity, bilingual estimate context, preserving user edits, allowlisted inputs and analytics privacy.
- Desktop UI checked; responsive home/project/service UI checked at 375 CSS pixels with no horizontal overflow. English/Spanish project-to-contact navigation and photo lightbox verified in browser.
- Production form tested through the actual review/send UI with a clearly labeled internal test (no real customer). Confirmation EBC-CE846936 was displayed; the matching row exists in leads with status new and next_action Review website request. Gmail search confirmed the matching message in the EBC business inbox. This test had no photo attachments; live attachment delivery was not separately verified.
- Existing automated tests cover direct-send failure, recovery, files and duplicate submission handling. Actual human follow-up, phone-call connections and resulting booked jobs are not inferred from click events.
- No Lighthouse score or real-user Core Web Vitals claimed. Fewer homepage sections/photos and non-autoplay/preload-none video reduce initial work; actual speed depends on device/network.
