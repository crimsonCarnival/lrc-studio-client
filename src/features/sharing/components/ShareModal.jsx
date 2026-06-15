import { useRef, useEffect, useReducer } from 'react';
import { useTranslation, Trans } from 'react-i18next';
import { Button } from '@ui/button';
import { Input } from '@ui/input';
import { Copy, Check, AlertCircle, Clock, Calendar, Cloud, Share2 } from 'lucide-react';
import { Tip } from '@ui/tip';
import { formatTime } from '@/shared/utils/format-time';

/**
 * SharePanel component for the sharing popover.
 * Enhanced with a custom time picker for deep linking.
 */
function shareReducer(state, action) {
  switch (action.type) {
    case 'SET_COPIED': return { ...state, copied: action.payload };
    case 'SET_PRIVACY': return { ...state, privacy: action.payload };
    case 'SET_INCLUDE_TIME': return { ...state, includeTime: action.payload };
    case 'SET_CUSTOM_TIME': return { ...state, customTime: action.payload };
    case 'INC_LOADING_STEP': return { ...state, loadingStep: state.loadingStep + 1 };
    default: return state;
  }
}

export function SharePanel({
  url: baseUrl,
  mediaSource = 'none',
  linesCount,
  hasSynced,
  isPublic = true,
  onPrivacyChange,
  playbackPosition = 0,
  duration = 0,
  loading = false,
  forksEnabled,
  onForksEnabledChange,
}) {
  const { t } = useTranslation();
  const [state, dispatch] = useReducer(shareReducer, {
    copied: false,
    privacy: isPublic ? 'public' : 'private',
    includeTime: false,
    customTime: Math.floor(playbackPosition),
    loadingStep: 0,
  });

  const { copied, privacy, includeTime, customTime, loadingStep } = state;
  const inputRef = useRef(null);

  // Sync customTime with playbackPosition initially or when toggled
  useEffect(() => {
    if (includeTime && customTime === 0 && playbackPosition > 0) {
      dispatch({ type: 'SET_CUSTOM_TIME', payload: Math.floor(playbackPosition) });
    }
  }, [includeTime, playbackPosition, customTime]);
  const loadingOptions = t('share.generatingLink', { returnObjects: true });

  useEffect(() => {
    if (loading) {
      const interval = setInterval(() => {
        dispatch({ type: 'INC_LOADING_STEP' });
      }, 1500);
      return () => clearInterval(interval);
    }
  }, [loading]);

  // Dynamic URL
  const url = loading ? '' : (includeTime && customTime >= 0 
    ? `${baseUrl}${baseUrl.includes('?') ? '&' : '?'}s=${customTime}`
    : (baseUrl || ''));

  const handlePrivacyToggle = () => {
    const newPrivacy = privacy === 'public' ? 'private' : 'public';
    dispatch({ type: 'SET_PRIVACY', payload: newPrivacy });
    if (onPrivacyChange) onPrivacyChange(newPrivacy);
  };

  useEffect(() => {
    if (!copied) {
      const t = setTimeout(() => { inputRef.current?.select(); }, 80);
      return () => clearTimeout(t);
    }
  }, [url, copied]);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(url);
      dispatch({ type: 'SET_COPIED', payload: true });
      setTimeout(() => dispatch({ type: 'SET_COPIED', payload: false }), 2000);
    } catch {
      inputRef.current?.select();
    }
  };

  const handleManualTimeChange = (e) => {
    const val = parseInt(e.target.value) || 0;
    dispatch({ type: 'SET_CUSTOM_TIME', payload: Math.max(0, duration > 0 ? Math.min(duration, val) : val) });
  };

  if (loading) {
    const messagesArray = Array.isArray(loadingOptions) ? loadingOptions : [loadingOptions];
    const cycleMessage = messagesArray[loadingStep % messagesArray.length];

    const isRecaptcha = loading === 'recaptcha';
    const title = isRecaptcha ? t('share.securityCheck') : t('share.generating');
    const desc = isRecaptcha ? t('share.verifying') : cycleMessage;

    return (
      <div className="flex flex-col items-center justify-center gap-4 p-8 animate-fade-in min-h-[280px]">
        <div className="relative">
          <div className="size-12 rounded-full border-2 border-zinc-800 border-t-primary animate-spin" />
          <div className="absolute inset-0 flex items-center justify-center">
            {isRecaptcha ? (
              <svg className="size-5 text-primary" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
              </svg>
            ) : (
              <Share2 className="size-5 text-zinc-600" />
            )}
          </div>
        </div>
        <div className="text-center space-y-1">
          <p className="text-sm font-bold text-zinc-200">{title}</p>
          <p className="text-[10px] text-zinc-500 max-w-[200px] mx-auto min-h-[30px] flex items-center justify-center transition-all duration-300">{desc}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-4 p-4 animate-fade-in">
      {/* Privacy/visibility toggle */}
      <div className="flex items-center justify-between gap-2 mb-1">
        <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
          {t('share.visibility')}
        </span>
        <Button
          variant={privacy === 'public' ? 'outline' : 'secondary'}
          size="sm"
          className={`h-7 flex items-center gap-1.5 px-3 rounded-full text-[10px] font-bold transition-all duration-300 ${privacy === 'public' 
            ? 'text-emerald-400 border-emerald-500/40 bg-emerald-500/10 hover:bg-emerald-500/20 shadow-[0_0_12px_rgba(52,211,153,0.1)]' 
            : 'text-zinc-400 border-zinc-700 bg-zinc-800 hover:bg-zinc-700'}`}
          onClick={handlePrivacyToggle}
        >
          {privacy === 'public' ? (
            <>
              <div className="size-1.5 rounded-full bg-emerald-400 animate-pulse" />
              {t('share.public')}
            </>
          ) : (
            <>
              <div className="size-1.5 rounded-full bg-zinc-500" />
              {t('share.private')}
            </>
          )}
        </Button>
      </div>

      {onForksEnabledChange !== undefined && (
        <div className="flex items-center justify-between gap-2 mb-1">
          <span className="text-xs text-zinc-400 font-bold uppercase tracking-wider">
            {t('share.forksEnabled')}
          </span>
          <button
            type="button"
            role="switch"
            aria-checked={forksEnabled !== false}
            onClick={() => onForksEnabledChange(forksEnabled === false)}
            className={`size-8 h-4 rounded-full p-0.5 transition-all duration-300 outline-none focus:ring-2 focus:ring-primary/50 ${forksEnabled !== false ? 'bg-primary' : 'bg-zinc-700'}`}
          >
            <div className={`size-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-300 ${forksEnabled !== false ? 'translate-x-4' : 'translate-x-0'}`} />
          </button>
        </div>
      )}

      {/* Badges */}
      <div className="flex flex-wrap gap-2">
        <div className={`flex items-center gap-2 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-colors ${mediaSource !== 'none'
            ? 'border-accent-blue/30 bg-accent-blue/5 text-accent-blue'
            : 'border-zinc-800 bg-zinc-900/50 text-zinc-600'
          }`}>
          {mediaSource === 'youtube' ? (
            <svg className="size-3 text-red-500" viewBox="0 0 24 24" fill="currentColor">
              <path d="M23.498 6.186a3.016 3.016 0 0 0-2.122-2.136C19.505 3.545 12 3.545 12 3.545s-7.505 0-9.377.505A3.017 3.017 0 0 0 .502 6.186C0 8.07 0 12 0 12s0 3.93.502 5.814a3.016 3.016 0 0 0 2.122 2.136c1.871.505 9.376.505 9.376.505s7.505 0 9.377-.505a3.015 3.015 0 0 0 2.122-2.136C24 15.93 24 12 24 12s0-3.93-.502-5.814zM9.545 15.568V8.432L15.818 12l-6.273 3.568z" />
            </svg>
          ) : mediaSource === 'cloudinary' ? (
            <Cloud className="size-3 text-sky-400" />
          ) : (
            <AlertCircle className="size-3 text-zinc-700" />
          )}
          {mediaSource === 'youtube' ? t('share.youtubeIncluded') : (mediaSource === 'cloudinary' ? t('share.mediaIncluded') : t('share.noMedia'))}
        </div>

        <div className={`flex items-center gap-2 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-colors ${hasSynced
            ? 'border-primary/30 bg-primary/5 text-primary'
            : 'border-zinc-800 bg-zinc-900/50 text-zinc-600'
          }`}>
          <Calendar className="size-3" />
          {linesCount} {hasSynced ? t('share.syncedLines') : t('share.lines')}
        </div>
      </div>

      {/* Time Toggle & Picker */}
      <div className="space-y-3 bg-zinc-900/40 p-3 rounded-xl border border-zinc-800/60">
        <div className="flex items-center justify-between">
          <label className="flex items-center gap-2 cursor-pointer group">
            <button 
              type="button"
              onClick={() => {
                const next = !includeTime;
                dispatch({ type: 'SET_INCLUDE_TIME', payload: next });
                if (next && customTime === 0 && playbackPosition > 0) {
                  dispatch({ type: 'SET_CUSTOM_TIME', payload: Math.floor(playbackPosition) });
                }
              }}
              role="switch"
              aria-checked={includeTime}
              className={`size-8 h-4 rounded-full p-0.5 transition-all duration-300 outline-none focus:ring-2 focus:ring-primary/50 ${includeTime ? 'bg-primary' : 'bg-zinc-700'}`}
            >
              <div className={`size-3 h-3 rounded-full bg-white shadow-sm transition-transform duration-300 ${includeTime ? 'translate-x-4' : 'translate-x-0'}`} />
            </button>
            <span className={`text-[11px] font-bold transition-colors ${includeTime ? 'text-zinc-200' : 'text-zinc-500'}`}>
              {t('share.includeTime')}
            </span>
          </label>
          {includeTime && (
            <span className="text-[10px] font-mono text-primary font-bold">
              {formatTime(customTime)}
            </span>
          )}
        </div>

        {includeTime && (
          <div className="space-y-3 pt-1 animate-in slide-in-from-top-2 duration-300">
            {duration > 0 && (
              <div className="relative h-6 flex items-center group">
                <input
                  type="range"
                  min="0"
                  max={duration}
                  step="1"
                  value={customTime}
                  onChange={(e) => dispatch({ type: 'SET_CUSTOM_TIME', payload: parseInt(e.target.value) })}
                  className="w-full h-1 bg-zinc-800 rounded-lg appearance-none cursor-pointer accent-primary group-hover:h-1.5 transition-all"
                />
              </div>
            )}
            <div className="flex items-center gap-2">
              <div className="relative flex-1">
                <Clock className="absolute left-2.5 top-1/2 -translate-y-1/2 size-3 text-zinc-500" />
                <Input
                  type="text"
                  inputMode="numeric"
                  pattern="[0-9]*"
                  value={customTime}
                  onChange={handleManualTimeChange}
                  className="h-8 pl-8 bg-zinc-950/50 border-zinc-800 text-[11px] font-mono focus:ring-primary/20"
                  placeholder={t('share.secondsPlaceholder')}
                />
              </div>
              <Button
                variant="ghost"
                size="sm"
                onClick={() => dispatch({ type: 'SET_CUSTOM_TIME', payload: Math.floor(playbackPosition) })}
                className="h-8 px-2 text-[10px] text-zinc-400 hover:text-primary hover:bg-primary/5 font-bold"
              >
                {t('share.useCurrent')}
              </Button>
            </div>
          </div>
        )}
      </div>

      {/* Description */}
      <p className="text-[10px] text-zinc-500 leading-relaxed px-1">
        {privacy === 'public'
          ? t('share.description')
          : t('share.privateDescription')}
      </p>

      {/* URL + copy */}
      <div className="flex gap-2 group mt-1">
        <div className="relative flex-1 min-w-0">
          <input
            ref={inputRef}
            readOnly
            value={url}
            onClick={() => inputRef.current?.select()}
            className="w-full bg-zinc-950/50 border border-zinc-800 hover:border-zinc-700/80 rounded-xl px-3 py-2.5 text-[11px] font-mono text-zinc-300 focus:outline-none focus:ring-1 focus:ring-primary/30 cursor-text transition-all"
          />
          <div className="absolute inset-y-0 right-0 w-8 bg-gradient-to-l from-zinc-950/50 to-transparent pointer-events-none rounded-r-xl" />
        </div>
        <Tip content={copied ? t('share.copied') : t('share.copy')}>
          <Button
            onClick={handleCopy}
            variant="outline"
            className={`flex-shrink-0 h-[38px] w-[38px] p-0 border transition-all duration-300 rounded-xl ${copied
                ? 'bg-primary/20 border-primary/40 text-primary scale-105'
                : 'bg-zinc-800/80 border-zinc-700/60 text-zinc-300 hover:bg-zinc-700 hover:text-zinc-100 hover:scale-105 active:scale-95'
              }`}
          >
            {copied ? <Check className="size-4" strokeWidth={3} /> : <Copy className="size-4" />}
          </Button>
        </Tip>
      </div>

      {/* reCAPTCHA Notice */}
      <div className="mt-2 text-center">
        <p className="text-[9px] leading-relaxed text-zinc-600">
          <Trans 
            i18nKey="share.recaptchaNotice"
            components={[
              <a key="0" href="https://policies.google.com/privacy" target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-zinc-400 underline transition-colors" />,
              <a key="1" href="https://policies.google.com/terms" target="_blank" rel="noreferrer" className="text-zinc-500 hover:text-zinc-400 underline transition-colors" />
            ]}
          />
        </p>
      </div>
    </div>
  );
}
