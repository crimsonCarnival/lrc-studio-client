// client/src/features/projects/components/WatchLayout.jsx
// Composes the watch page: main column (stage + metadata) and optional up-next rail.
export default function WatchLayout({ stage, meta, upNext }) {
  return (
    <div className="w-full max-w-screen-xl mx-auto px-3 sm:px-6 py-4 flex flex-col lg:flex-row gap-6">
      <div className="flex-1 min-w-0 flex flex-col">
        {stage}
        {meta}
      </div>
      {upNext && <div className="w-full lg:w-80 lg:flex-shrink-0">{upNext}</div>}
    </div>
  );
}
