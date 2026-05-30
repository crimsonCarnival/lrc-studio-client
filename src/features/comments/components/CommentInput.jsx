import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { Loader2 } from 'lucide-react';

export function CommentInput({ onSubmit, onCancel, placeholder, autoFocus = false, isReply = false }) {
  const { t } = useTranslation();
  const [text, setText] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (autoFocus) ref.current?.focus();
  }, [autoFocus]);

  // Auto-resize textarea
  const handleChange = (e) => {
    setText(e.target.value.slice(0, 1000));
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
  };

  const handleSubmit = async () => {
    const trimmed = text.trim();
    if (!trimmed || submitting) return;
    setSubmitting(true);
    try {
      await onSubmit(trimmed);
      setText('');
      if (ref.current) ref.current.style.height = 'auto';
    } finally {
      setSubmitting(false);
    }
  };

  const handleKey = (e) => {
    if (e.key === 'Enter' && (e.metaKey || e.ctrlKey)) handleSubmit();
    if (e.key === 'Escape' && onCancel) onCancel();
  };

  // Counter color changes near limit
  const counterClass = text.length >= 980
    ? 'text-red-500'
    : text.length >= 900
    ? 'text-amber-500/80'
    : 'text-zinc-700';

  return (
    <div className="flex flex-col gap-2">
      <textarea
        ref={ref}
        value={text}
        onChange={handleChange}
        onKeyDown={handleKey}
        placeholder={placeholder || t('comments.placeholder')}
        rows={isReply ? 2 : 3}
        className="w-full resize-none rounded-xl bg-zinc-900/50 border border-zinc-700/50 text-sm text-zinc-200 placeholder:text-zinc-600 px-3 py-2.5 leading-relaxed focus:outline-none focus:ring-1 focus:ring-primary/40 focus:border-primary/40 transition-colors duration-200 overflow-hidden"
        style={{ minHeight: isReply ? '60px' : '76px' }}
      />
      <div className="flex items-center justify-between">
        <span className={`text-[10px] font-mono transition-colors ${counterClass}`}>{text.length}/1000</span>
        <div className="flex items-center gap-2">
          {onCancel && (
            <button
              onClick={onCancel}
              className="h-7 px-3 text-xs text-zinc-500 hover:text-zinc-200 hover:bg-zinc-800/60 rounded-lg transition-colors duration-150"
            >
              {t('comments.cancel')}
            </button>
          )}
          <button
            onClick={handleSubmit}
            disabled={!text.trim() || submitting}
            className="h-7 px-3 text-xs font-semibold bg-primary text-zinc-950 hover:bg-primary/85 rounded-lg transition-colors duration-150 disabled:opacity-25 disabled:cursor-not-allowed flex items-center gap-1.5"
          >
            {submitting && <Loader2 className="size-3 animate-spin" />}
            {t('comments.submit')}
          </button>
        </div>
      </div>
    </div>
  );
}
