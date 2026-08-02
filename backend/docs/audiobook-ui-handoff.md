# Audiobook UI handoff

## Ownership boundary

The backend owns audiobook metadata discovery, authorization, rate limiting,
private R2 reads, byte-range responses, and transcript responses. The UI owns
player state, controls, chapter navigation, loading states, and user-facing
errors.

No R2 bucket name, object key, credential, or presigned URL is part of the
browser contract.

## Local integration before Auth is available

The normal backend is fail-closed: a missing session returns `401`, and the
default access policy returns `403`. For local audiobook integration only, start
the backend with:

```bash
cd backend
NODE_ENV=development AUDIO_DEV_BYPASS_AUTH=true npm run dev
```

Both variables are required. The backend refuses to start with the bypass in
`test`, `production`, or an unspecified environment. Production continues to
require the session authenticator and a real access-policy adapter.

The bypass supplies a fixed development principal, allows audiobook access, and
still exercises the repository, rate limiter, private R2 reader, range parser,
and response headers. It does not replace audiobook data with mock catalog or
third-party audio.

## Current UI integration gap

At this handoff, `frontend/src/components/AudiobookPlayer.jsx` substitutes a
mock catalog and third-party media when discovery returns `401`, `403`, or
`404`. The UI owner should remove that fallback before accepting the integration.
With the development bypass enabled, the player should consume the real catalog
and stream URLs; without it, those status codes should remain visible as distinct
UI states.

## Browser contract

Use the relative URLs returned by the API:

1. `GET /api/books/:bookId/audio`
2. `GET|HEAD /api/books/:bookId/audio/:audioId/stream`
3. `GET /api/books/:bookId/audio/:audioId/transcript?format=json|text`

Catalog requests should use `credentials: "include"`. The audio element should
use the returned `streamUrl` unchanged and set `crossOrigin="use-credentials"`
when the API is on an allowed cross-origin host. The Vite `/api` proxy keeps
local requests same-origin.

The catalog exposes part and chapter data in this shape:

```json
{
  "bookId": 42,
  "title": "Example",
  "language": "vi",
  "narrator": "Reader",
  "totalDurationMs": 10000,
  "parts": [
    {
      "id": 104,
      "partNumber": 1,
      "title": "Part 1",
      "durationMs": 10000,
      "mimeType": "audio/mpeg",
      "language": "vi",
      "narrator": "Reader",
      "streamUrl": "/api/books/42/audio/104/stream",
      "transcriptUrl": "/api/books/42/audio/104/transcript",
      "chapters": [
        {
          "id": 1,
          "title": "Chapter 1",
          "startMs": 0,
          "endMs": 10000
        }
      ]
    }
  ]
}
```

## UI acceptance checklist

- Do not build R2 URLs or expose storage identifiers.
- Do not replace `401`, `403`, or `404` responses with mock media.
- Treat `401` as authentication required.
- Treat `403` as authenticated but not permitted.
- Treat `404` as no published audiobook or missing part/transcript.
- Treat `429` as rate limited and respect `Retry-After`.
- Support `206` range playback and `416` invalid-range responses.
- Keep the selected part and active chapter synchronized with playback time.
- Use `startMs` and `endMs` as milliseconds.
- Reset player state when `bookId` or the selected part changes.
- Test with the development bypass, then repeat authentication cases after the
  Auth integration lands.

## Backend verification already covered

The backend test suite covers anonymous rejection, access denial, development
bypass discovery and streaming, full and range responses, conditional requests,
transcripts, CORS, and rate limiting.
