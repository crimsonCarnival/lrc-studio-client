// Composes the watch page: stage (left) | meta + optional up-next rail (right).
export default function WatchLayout({ stage, meta, upNext }) {
  return (
    <div className="w-full max-w-screen-xl mx-auto px-3 sm:px-6 py-4 flex flex-col lg:flex-row gap-6">
      {/* Left: lyrics / media stage — takes majority of width */}
      <div className="lg:flex-[3] min-w-0">
        {stage}
      </div>
      {/* Right: project metadata + optional up-next playlist */}
      <div className="lg:w-80 xl:w-96 lg:flex-shrink-0 flex flex-col gap-4">
        {meta}
        {upNext}
      </div>
    </div>
  );
}
