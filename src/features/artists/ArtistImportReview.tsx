import { ArtistParseReview } from './ArtistParseReview';
import type { ArtistImporter } from './useArtistImport';

/** Renders the pending review of an {@link ArtistImporter}, if there is one. */
export function ArtistImportReview({ importer }: { importer: ArtistImporter }) {
  if (!importer.pending) return null;
  return <ArtistParseReview plan={importer.pending.plan} onApply={importer.confirm} onCancel={importer.cancel} />;
}
