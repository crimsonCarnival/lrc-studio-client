import { useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Icon } from '@/shared/ui/Icon';
import { Tip } from '@ui/tip';
import { Button } from '@ui/button';
import { cn } from '@/shared/utils/utils';
import { ShareSheet } from '@/features/sharing/components/ShareSheet';
import { projectsService } from '../services/projects.service';
import { ogShareUrl } from '../og-url';

interface ShareOgButtonProps {
  publicId: string;
  title?: string;
  /** Artist, shown under the title in the sheet and sent with the link. */
  subtitle?: string;
  /** The project's own name, when it is not the song's (used in the WhatsApp message). */
  projectName?: string;
  coverImage?: string | null;
  genre?: string | null;
  className?: string;
}

/** Opens the share sheet for a published project's link-preview URL. */
export function ShareOgButton({ publicId, title = '', subtitle, projectName, coverImage, genre, className = '' }: ShareOgButtonProps) {
  const { t } = useTranslation();
  const [open, setOpen] = useState(false);
  const label = t('share.shareLink');

  return (
    <>
      <Tip content={label}>
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={() => setOpen(true)}
          aria-label={label}
          aria-haspopup="dialog"
          className={cn('size-11 rounded-full bg-transparent text-subtle hover:text-foreground lg:size-11', className)}
        >
          <Icon name="share" size={18} />
        </Button>
      </Tip>
      <ShareSheet
        open={open}
        onOpenChange={setOpen}
        url={ogShareUrl(publicId)}
        title={title || 'LRC Studio'}
        subtitle={subtitle}
        projectName={projectName}
        coverImage={coverImage}
        genre={genre}
        onShared={() => { projectsService.incrementShare(publicId).catch(() => {}); }}
      />
    </>
  );
}
