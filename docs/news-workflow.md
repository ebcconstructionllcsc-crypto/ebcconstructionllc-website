# Updating EBC Novedades

## Current publication contract

The public route is `https://ebcconstructionllc.com/news.html`. Its source is
`news.html`: the `.journal-card[data-story]` cards and the inline JSON script
`#news-media-data`. Keep both representations consistent. Preserve existing
story IDs and their `news.html?project=ID` links, including archive stories that
have no visible card.

The three homepage previews live in `index.html`, inside the section with
`aria-labelledby="latest-work-title"`. Update those links, images and bilingual
copy together when selecting new work. Keep each preview inside its project.

`assets/news-gallery.js` handles filters and the viewer; it does not fetch new
posts. `assets/updates.js` only opens existing Instagram embeds. The old
`assets/media/journal-20261101.json` is an archive, not the current feed.
`assets/site-media.js` and the private manager's Supabase library are not
connected to this page. Do not change that separate system to publish news.

There is no news generator. Do not depend on `novedades-ebc.html`,
`assets/data/ebc-news.json` or `scripts/build-news.mjs`. The existing
`scripts/prepare-pages.mjs` only prepares the deployment artifact.

## Sources and verification

Use only the sources authorized by the existing automation:

- EBC professional Facebook profile: https://www.facebook.com/galincitobolanos1/
- Original EBC Drive videos: https://drive.google.com/drive/folders/1eMNzi2x4h2J7Aux50zkb_pGBxAyXi2np

Existing links to other profiles do not authorize new source discovery or
publication from them. Verify access on each run; this document does not imply
that access is available or has been restored. A sign-in redirect is not a
successful source check.

Compare the source post URL/ID, original Drive file ID and project/media already
published before adding anything. Record new provenance in
`docs/media-classification.md`: the source identifier, matching story ID, source
date when verified, verification date and the local derivatives. The existing
document maps original Drive videos to several archive stories. Do not copy
private access tokens or signed URLs into the repository.

Use original EBC media. Preserve originals; use separate display derivatives
for orientation, proportional resizing, compression and metadata removal.
Do not fabricate or retouch construction details, combine unrelated projects,
or label work as before/after without evidence. Keep English and Spanish titles,
descriptions, captions and image alternatives aligned. Do not add client names,
addresses or other personal details.

Use only verified dates and state whether a date describes the source post or
publication. An upload date or a filename does not prove project completion.
Keep unknown historical dates unknown. If a complete source check finds no new
material, leave the content and dates unchanged without a notification. If source
access fails, report a new blocker rather than claiming there are no new posts;
do not disable the task or change its schedule on your own.

## Editing, validation and publication

1. Read the current `main` and work in an isolated branch/worktree. Check for
   concurrent edits before changing news or homepage content; preserve other
   work and never force-push over it.
2. Add the verified media and provenance, then update the news card, inline JSON
   and selected homepage previews. Preserve service categories and existing
   deep links. The news hero currently represents concrete; changing its service
   also requires updating the hero's filter behavior in `assets/news-gallery.js`.
3. Run `node tests/news-gallery-flow.mjs`, then `npm test`. The gallery test
   checks metadata, assets, card/story links, homepage previews, filters and
   viewer behavior without a fixed total number of stories. Do not weaken
   checks merely to accept new content.
4. Fetch the latest `main` before publishing. If it moved, integrate its changes,
   review the combined diff and rerun the checks. Publish through the existing
   authorized workflow. GitHub Pages deploys pushes to `main` after validation;
   it does not discover or write new posts on its own.
5. Verify the resulting deployment and the live `news.html` and homepage. Open
   each new project link, check its photos/videos, filters, mobile layout and
   both languages. Report the published source/story links, or the exact
   remaining blocker; do not call an unverified deployment complete.
