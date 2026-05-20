import React, { useState, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import useDynamicTranslation from '@/shared/hooks/useDynamicTranslation';
import useInputMethod from '@/shared/hooks/useInputMethod';
import { ChevronLeft } from 'lucide-react';
import { Button } from '@ui/button';
import { motion, AnimatePresence } from 'framer-motion';
import { LoadingSpinner } from '@ui/LoadingSpinner';
import UploadForm from './UploadForm';
import toast from 'react-hot-toast';
import { uploadsService } from '@/features/projects/services/uploads.service';

/**
 * UploadPage component
 * Dedicated page for uploading audio files with responsive mobile/desktop UI
 * - Mobile: Tap button to select file, vertical layout
 * - Desktop: Drag-drop zone, horizontal layout
 */
export const UploadPage = () => {
  const { t, dt } = useDynamicTranslation();
  const navigate = useNavigate();
  const inputMethod = useInputMethod();
  const isMobile = inputMethod === 'touch';

  const [files, setFiles] = useState([]);
  const [uploadProgress, setUploadProgress] = useState({});
  const [isUploading, setIsUploading] = useState(false);
  const [uploadError, setUploadError] = useState(null);

  // Handle file selection
  const handleFileSelect = useCallback((fileList) => {
    if (!fileList || fileList.length === 0) return;

    // Convert FileList to array and validate audio files
    const audioFiles = Array.from(fileList).filter(file => {
      if (!file.type.startsWith('audio/')) {
        toast.error(t('uploads.invalidFormat', { ns: 'uploads' }) || `Invalid file: ${file.name} is not an audio file`);
        return false;
      }
      return true;
    });

    if (audioFiles.length > 0) {
      setFiles(prev => [...prev, ...audioFiles]);
    }
  }, [t]);

  // Handle file deletion
  const handleDeleteFile = useCallback((fileName) => {
    setFiles(prev => prev.filter(f => f.name !== fileName));
    setUploadProgress(prev => {
      const updated = { ...prev };
      delete updated[fileName];
      return updated;
    });
  }, []);

  // Handle form submission - upload all files
  const handleSubmit = useCallback(async (e) => {
    e.preventDefault();

    if (!files || files.length === 0) {
      toast.error(t('uploads.noFiles') || 'No files selected');
      return;
    }

    setIsUploading(true);

    try {
      // Get reCAPTCHA token (if needed for your setup)
      // const recaptchaToken = await getRecaptchaToken();

      for (const file of files) {
        try {
          // Update progress
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: 25 // Simulating upload start
          }));

          // Upload file to Cloudinary
          const result = await uploadsService.uploadToCloudinary(
            file,
            null // recaptchaToken if needed
          );

          // Save metadata to database
          await uploadsService.saveMedia({
            source: 'cloudinary',
            cloudinaryUrl: result.secure_url,
            publicId: result.public_id,
            fileName: file.name,
            duration: result.duration || 0,
          });

          // Mark as completed
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: 100
          }));

          toast.success(t('uploads.uploadSuccess') || `${file.name} uploaded successfully`);
        } catch (error) {
          const errorMsg = error.message || 'Unknown error';
          toast.error(t('uploads.uploadError') || `Failed to upload ${file.name}: ${errorMsg}`);
          setUploadError(errorMsg);
          setUploadProgress(prev => ({
            ...prev,
            [file.name]: 0
          }));
        }
      }

      // Clear files after successful upload
      setFiles([]);
      setUploadProgress({});
      setUploadError(null);

      // Optionally navigate to library or stay on page
      toast.success(t('uploads.allComplete') || 'All uploads complete!');
      // Navigate back after short delay
      setTimeout(() => {
        navigate('/library?tab=uploads');
      }, 1500);
    } finally {
      setIsUploading(false);
    }
  }, [files, t, navigate]);

  return (
    <div className="flex flex-col h-screen max-lg:max-h-[calc(100vh-60px)] bg-zinc-950">
      {/* Header */}
      <div className="px-4 py-4 border-b border-zinc-800 flex-shrink-0">
        <div className="flex items-center gap-3 mb-3">
          <Button
            variant="outline"
            size="icon"
            onClick={() => navigate(-1)}
            className="text-zinc-400 hover:text-zinc-200 hover:bg-zinc-800 flex-shrink-0"
            aria-label={t('common.back', 'Back')}
          >
            <ChevronLeft className="size-4" />
          </Button>
          <h1 className="text-2xl font-bold text-zinc-100">{t('uploads.uploadAudio', 'Upload Audio')}</h1>
        </div>
        <p className="text-sm text-zinc-400 px-10">
          {isMobile
            ? t('uploads.tapToSelect', 'Tap to select an audio file')
            : t('uploads.dragDrop', 'Drag and drop or select files')}
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
                <p className="text-white font-medium">{t('uploads.uploading', 'Uploading files...')}</p>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default UploadPage;
