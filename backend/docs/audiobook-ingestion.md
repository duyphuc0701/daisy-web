# Audiobook ingestion and authenticated playback

## Security boundary

R2 must remain private. The API stores full object keys internally in `audiobook_parts.r2_key`, validates that every key belongs to `CLOUDFLARE_S3_FOLDER_NAME`, and never sends keys, bucket names, or presigned URLs to clients.

The streaming routes require a verified principal. The included `createSessionAuthenticator` validates a short-lived HMAC-signed `daisy_session` cookie (`AUDIO_SESSION_COOKIE_NAME`) using `AUDIO_SESSION_SECRET`; its issuer must create payloads with a non-empty `sub`, integer `exp` (Unix seconds), and optional string `roles`. It is an adapter boundary: production may inject the real identity-provider/session verifier through `createApp({ authenticateRequest })`. Do not add a login endpoint or trust a request header for identity.

For cross-origin browser playback, the frontend must use a secure HTTP-only cookie and `<audio crossorigin="use-credentials">`; configure an exact frontend origin in `CORS_ALLOWED_ORIGINS`. Never use `*` for credentialed audio routes.

## Cost controls

The included limiter is deliberately process-local and is safe for development/single-instance fallback only. The default access policy denies playback; production deployments must inject an entitlement policy and replicas **must inject a shared or edge-backed limiter** through `createApp({ audioRateLimiter })`, keyed by authenticated user plus a secondary abuse signal, before enabling public traffic. Configure `AUDIO_MAX_CONCURRENT_STREAMS_PER_USER`, `AUDIO_STREAM_RATE_LIMIT_MAX`, and `AUDIO_STREAM_RATE_LIMIT_WINDOW_MS`; monitor 429s, R2 requests, bytes streamed, and disconnects.

## Publish checklist

1. Upload an `audio/mpeg` object and transcript under the configured folder prefix using a read/write ingestion credential. Runtime credentials are read-only.
2. Run an R2 `HeadObject`, record the private key, byte length, ETag, duration, BCP 47 language, narrator, and ordered parts/chapters in the additive tables.
3. Store a UTF-8 timed-text JSON transcript as `{ "segments": [{ "startMs": 0, "endMs": 1, "text": "…" }] }`. Segments must be monotonically ordered and include relevant speaker/non-speech information.
4. Set `published_at` only after range, transcript, and metadata checks pass. Unpublish by clearing `published_at`; never rely on object obscurity.
5. Use a non-production private bucket for staging checks. Do not run smoke tests against production credentials.

## DAISY ingestion command

The repository includes a repeatable importer for DAISY 2005 folders. It preserves original MP3 parts, derives their order from the OPF/SMIL spine, converts DTBook + SMIL text cues into the JSON transcript contract, derives chapter starts from NCX, uploads private R2 objects, and upserts the matching MySQL rows.

Run a no-write validation first:

```bash
cd backend
npm run audiobook:ingest -- \
  --source "/path/to/DAISY-folder" \
  --book-id 1 \
  --slug cay-cam-ngot \
  --dry-run
```

After applying the audiobook migration and verifying the plan, omit `--dry-run` to upload and publish:

```bash
npm run audiobook:ingest -- \
  --source "/path/to/DAISY-folder" \
  --book-id 1 \
  --slug cay-cam-ngot
```

The command writes `audio-books/cay-cam-ngot/audio/*.mp3`, generated `transcripts/*.json`, and an optional private `source/` copy. It needs a separate R2 credential with Object Read & Write permission; production playback must continue using the read-only runtime credential. Re-running the command updates the existing parts by `(book_id, part_number)` and replaces chapters for those parts.
