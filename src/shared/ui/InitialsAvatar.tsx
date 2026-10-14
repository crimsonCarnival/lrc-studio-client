import { avatarHue } from './avatar-hue';

interface InitialsAvatarProps {
  /** Shown as its first letter. */
  name?: string | null;
  /** Account name: picks the colour. Falls back to the name when there is none. */
  handle?: string | null;
  /** Size, shape and font size; the colours come from the handle. */
  className?: string;
}

/** The avatar of a user without a picture: their initial on a colour of their own. */
export function InitialsAvatar({ name, handle, className = '' }: InitialsAvatarProps) {
  const label = name || handle || '?';
  return (
    <div
      aria-hidden="true"
      className={`grid place-items-center font-heading font-bold select-none ${className}`}
      style={avatarHue(handle || label)}
    >
      {label[0].toUpperCase()}
    </div>
  );
}
