import { useState, useCallback } from 'react';
import type { FormEvent } from 'react';
import { useNavigate } from 'react-router-dom';
import useDynamicTranslation from '@/shared/hooks/useDynamicTranslation';
import useInputMethod from '@/shared/hooks/useInputMethod';
import { useSettings } from '@/features/settings/useSettings';
import { Icon } from '@/shared/ui/Icon';
import { Button } from '@ui/button';
import { AnimatePresence, motion } from 'framer-motion';
import { LoadingSpinner } from '@ui/LoadingSpinner';
import UploadForm from './UploadForm';
import toast from 'react-hot-toast';
import { uploadsService } from '@/features/projects/services/uploads.service';

interface UploadMediaResult {
  secure_url: string;
  public_id: string;
  duration?: number;
}

/**
 * Dedicated page for uploading audio files with responsive mobile/desktop UI.
 */
export const UploadPage = () => {
  const { t } = useDynamicTranslation();
  const { settings } = useSettings();
  const navigate = useNavigate();
  const inputMethod = useInputMethod();
  const isMobile = inputMethod === 'touch';

  const [files, setFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<string, number>>({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState<string | null>(null);

  // Handle file selection
  const handleFileSelect = useCallback((fileList: FileList) => {
    if (!fileList || fileList.length === 0) return;

    // Convert FileList to array and validate audio files
    const audioFiles = Array.from(fileList).filter(file => {
      if (!file.type.startsWith('audio/')) {
        toast.error((t as (key: string, options?: Record<string, unknown>) => string)('uploads.invalidFormat', { ns: 'uploads' }) || `Invalid file: ${file.name} is not an audio file`);
        return false;
      }
      return true;
    });

    if (audioFiles.length > 0) {
      setFiles(prev => [...prev, ...audioFiles]);
    }
  }, [t]);

  // Handle file deletion
  const handleDeleteFile = useCallback((fileName: string) => {
    setFiles(prev => prev.filter(f => f.name !== fileName));
    setUploadProgress(prev => {
      const updated = { ...prev };
      delete updated[fileName];
      return updated;
    });
  }, []);

  // Handle form submission - upload all files
  const handleSubmit = useCallback(async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!files || files.length === 0) {
      toast.error(t('uploads.noFiles') || 'No files selected');
      return;
    }

    setIsUploading(true);

    try {
      await Promise.all(Array.from(files).map(async (file) => {
        setUploadProgress(prev => ({ ...prev, [file.name]: 25 }));
        try {
          const result = await uploadsService.uploadMedia(file, undefined) as UploadMediaResult;
          await uploadsService.saveMedia({
            source: 'cloudinary',
            uploadUrl: result.secure_url,
            publicId: result.public_id,
            fileName: file.name,
            duration: result.duration || 0,
          });
          setUploadProgress(prev => ({ ...prev, [file.name]: 100 }));
          toast.success(t('uploads.uploadSuccess') || `${file.name} uploaded successfully`);
        } catch (error) {
          const errorMsg = (error as { message?: string }).message || 'Unknown error';
          toast.error(t('uploads.uploadError') || `Failed to upload ${file.name}: ${errorMsg}`);
          setUploadError(errorMsg);
          setUploadProgress(prev => ({ ...prev, [file.name]: 0 }));
        }
      }));

      // Clear files after successful upload
      setFiles([]);
      setUploadProgress({});
      setUploadError(null);

      // Optionally navigate to library or stay on page
      toast.success(t('uploads.allComplete') || 'All uploads complete!');
      // Navigate back after configured delay
      const delayMode = settings?.advanced?.uploadRedirectDelay ?? 'normal';
      const delayMs = ({ fast: 500, normal: 1500, slow: 3000 } as Record<string, number>)[delayMode] || 1500;
      setTimeout(() => {
        navigate('/library?tab=uploads');
      }, delayMs);
    } finally {
      setIsUploading(false);
    }
  }, [files, t, navigate, settings?.advanced?.uploadRedirectDelay]);

  return (
    <div className="flex flex-col h-screen max-lg:max-h-[calc(100vh-60px)] bg-zinc-950">
      {/* Header */}
      <div className="p-4 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex-shrink-0"
            aria-label={t('common.back')}
          >
            <Icon name="chevron_left" size={16} />
          </Button>
          <h1 className="text-2xl font-semibold text-zinc-100">{t('uploads.uploadAudio')}</h1>
        </div>
        <p className="text-sm text-zinc-400 px-10">
          {isMobile
            ? t('uploads.tapToSelect')
            : t('uploads.dragDrop')}
        </p>
      </div>

      {/* Form */}
      <div className="flex-1 overflow-auto flex flex-col">
        {/* Error message with animation */}
        <AnimatePresence>
          {uploadError && (
            <motion.div
              initial={{ opacity: 0, x: -10 }}
              animate={{ opacity: 1, x: 0 }}
              exit={{ opacity: 0, x: 10 }}
              transition={{ duration: 0.2 }}
              className="mx-4 mt-4 p-3 rounded-lg bg-red-500/10 border border-red-500/30 text-sm text-red-400"
            >
              {uploadError}
            </motion.div>
          )}
        </AnimatePresence>

        <UploadForm
          onFileSelect={handleFileSelect}
          onSubmit={handleSubmit}
          onDelete={handleDeleteFile}
          files={files}
          uploadProgress={uploadProgress}
        />

        {/* Upload Status */}
        <AnimatePresence>
          {isUploading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="fixed inset-0 bg-black/50 flex items-center justify-center z-50"
            >
              <motion.div
                initial={{ scale: 0.9, opacity: 0 }}
                animate={{ scale: 1, opacity: 1 }}
                exit={{ scale: 0.9, opacity: 0 }}
                className="bg-zinc-800 rounded-xl p-6 text-center max-w-sm"
              >
                <div className="flex items-center justify-center mb-4">
                  <LoadingSpinner size="lg" />
                </div>
                <p className="text-white font-medium">{t('uploads.uploading')}</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default UploadPage;
