# Audiobook metadata publication

## Application boundary

The application repository accepts one reviewed release input:
`database/audiobook-metadata.v1.json`.

It contains the complete publisher-ready database payload, expected read-only R2
object descriptors, per-book revision fences, and a SHA-256 digest over the
canonical document. The application contains no DAISY source processing or R2
object-write tooling.

Application restart never imports metadata automatically. Local and production
environments run the metadata command explicitly after migrations.

## Reviewed release contract

The committed artifact currently validates to:

- 73 books
- 2,926 audio parts
- 1,822 chapters
- 7,977 expected R2 objects
- 4,107,459,220 bytes

Every part and transcript key must remain inside the configured R2 prefix and the
book's immutable revision path. Artifact digest, summary, IDs, titles, revisions,
object metadata, dense part numbers, and dense chapter sequences fail closed.

## Scripts

Application maintenance entry points live under `backend/scripts/`:

- `scripts/migrate.js` — schema and reviewed catalog migrations
- `scripts/seed.js` — destructive local catalog bootstrap
- `scripts/publish-audiobook-metadata.js` — local/production metadata ingestion

Use package commands rather than invoking these files directly.

## Credentials

Metadata verification and runtime playback use read-only R2 credentials:

```dotenv
CLOUDFLARE_S3_API=https://<account-id>.r2.cloudflarestorage.com
CLOUDFLARE_S3_ACCESS_KEY_ID=
CLOUDFLARE_S3_SECRET_ACCESS_KEY=
CLOUDFLARE_S3_BUCKET_NAME=
CLOUDFLARE_S3_FOLDER_NAME=audio-books
CLOUDFLARE_S3_REGION=auto
```

The deployed application must not receive object-write credentials.

## Local metadata publication

Use the same artifact and command intended for production:

```bash
cd daisy-web/backend
npm run db:migrate
npm run db:migrate:status

npm run db:audiobooks:publish -- \
  --artifact ../database/audiobook-metadata.v1.json \
  --concurrency 4 \
  --report .metadata-reports/local-publication.json
```

Reapplying the same artifact is idempotent and reports `already_published`.

`npm run db:seed` truncates the `books` table and is only for disposable local
databases. It is not a deployment step.

## Production deployment

```bash
cd /path/to/daisy-web/backend
npm ci --omit=dev
npm run db:migrate
npm run db:migrate:status

npm run db:audiobooks:publish -- \
  --artifact ../database/audiobook-metadata.v1.json \
  --concurrency 4 \
  --report .metadata-reports/production-publication.json
```

Restart the cPanel/Passenger application only after the publication report
completes successfully.

The metadata command:

1. validates artifact schema, totals, prefix, and digest;
2. validates exact target book IDs and titles;
3. verifies every expected object through read-only `HeadObject`;
4. locks the per-book publication fence;
5. inserts or updates parts and replaces chapters transactionally;
6. advances the revision fence only after successful publication;
7. reconciles revision, part count, and chapter count.

The reviewed catalog migration inserts IDs 202–205 non-destructively and fails
if an existing row uses a conflicting exact title.

## Failure and retry behavior

Publication is transactional per book. If a run stops:

- already-published revisions reconcile without mutation;
- the same artifact can be rerun safely;
- a different current revision fails as stale;
- R2 verification happens before mutation of the affected book.

Database rollback uses the publication fence and stored snapshot. R2 remains
read-only from this repository.

## Completion gate

A release is complete only when:

- the committed artifact validates to the reviewed totals;
- production migrations are applied;
- metadata publication reports 73 published/already-published books and zero
  failures;
- database reconciliation matches every artifact revision;
- authenticated catalog, `HEAD`, full `GET`, range `206`, conditional `304`,
  invalid range `416`, transcripts, and frontend chapter boundaries pass;
- independent architecture and critical verification approve the release.
