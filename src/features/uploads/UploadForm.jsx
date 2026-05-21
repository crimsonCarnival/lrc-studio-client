import React, { useRef } from 'react';
import useInputMethod from '@/shared/hooks/useInputMethod';
import { Button } from '@ui/button';
import FileItem from './components/FileItem';

const EMPTY_FILES = [];
const EMPTY_PROGRESS = {};

/**
 * UploadForm component
 * Provides responsive file upload interface:
 * - Desktop: Drag-drop zone for file selection
 * - Mobile: Tap button for file selection
 * - Shows file list with upload progress
 */
export const UploadForm = ({
  onFileSelect,
  onSubmit,
  onDelete,
  files = EMPTY_FILES,
  uploadProgress = EMPTY_PROGRESS
}) => {
  const inputMethod = useInputMethod();
  const isMobile = inputMethod === 'touch';
  const fileInputRef = useRef(null);
  const dragZoneRef = useRef(null);

  // Mobile: tap button to select files
  const handleTapSelectFile = () => {
    fileInputRef.current?.click();
  };

  // Desktop: handle drag-drop
  const handleDragOver = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragZoneRef.current) {
      dragZoneRef.current.classList.add('border-primary', 'bg-zinc-800');
    }
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    e.stopPropagation();
    if (dragZoneRef.current) {
      dragZoneRef.current.classList.remove('border-primary', 'bg-zinc-800');
    }
  };

  const handleDrop = (e) => {
    e.preventDefault();
    e.stopPropagation();

    if (dragZoneRef.current) {
      dragZoneRef.current.classList.remove('border-primary', 'bg-zinc-800');
    }

    const droppedFiles = e.dataTransfer?.files;
    if (droppedFiles) {
      onFileSelect(droppedFiles);
    }
  };

  const handleFileInputChange = (e) => {
    const selectedFiles = e.target.files;
    if (selectedFiles) {
      onFileSelect(selectedFiles);
    }
  };

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-4 p-4">
      {/* Desktop: Drag-drop zone (hidden on mobile) */}
      {!isMobile && (
        <div
          ref={dragZoneRef}
          onDragOver={handleDragOver}
          onDragLeave={handleDragLeave}
          onDrop={handleDrop}
          className="border-2 border-dashed border-zinc-600 rounded-lg p-8 text-center bg-zinc-900/50 cursor-pointer hover:bg-zinc-800 hover:border-primary transition-all"
        >
          <p className="text-zinc-400">Drag and drop audio files here</p>
          <p className="text-sm text-zinc-500 mt-2">or click the button below to select</p>
        </div>
      )}

      {/* Mobile: Tap button (hidden on desktop) */}
      {isMobile && (
        <Button
          type="button"
          onClick={handleTapSelectFile}
          className="h-12 rounded bg-primary text-white font-medium hover:bg-primary/90 transition-colors"
        >
          + Select Audio File
        </Button>
      )}

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="audio/*"
        className="hidden"
        onChange={handleFileInputChange}
      />

      {/* File list with progress */}
      {files && files.length > 0 && (
        <div className="border border-zinc-700 rounded bg-zinc-900/50">
          <div className="px-4 py-2 border-b border-zinc-700 text-sm text-zinc-400">
            Files ({files.length})
          </div>

          <div className="flex flex-col">
            {Array.from(files).map((file) => (
              <FileItem
                key={file.name}
                file={file}
                progress={uploadProgress[file.name]}
                onDelete={() => onDelete?.(file.name)}
              />
            ))}
          </div>
        </div>
      )}

      {/* Submit button */}
      <Button
        type="submit"
        disabled={!files || files.length === 0}
        className="h-12 rounded bg-green-600 text-white font-medium disabled:opacity-50 disabled:cursor-not-allowed hover:bg-green-700 transition-colors"
      >
        Upload {files?.length || 0} file(s)
      </Button>
    </form>
  );
};

export default UploadForm;
