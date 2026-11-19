import type { ComponentProps } from 'react';
import { useBreakpoint } from '@/shared/hooks/useBreakpoint';
import Editor from './core/Editor';

/** Everything Editor takes except `phone`, which this component decides. */
type EditorPageProps = Omit<ComponentProps<typeof Editor>, 'phone'>;

/**
 * Picks the editor layout by width, not by input method: below `lg` the phone layout,
 * otherwise the desktop one. A touch tablet at `lg` or wider gets the desktop editor and a
 * narrow mouse window gets the phone one. Either way it is the same Editor, so both share
 * one useEditor and one set of behaviours.
 */
export default function EditorPage(props: EditorPageProps) {
  const isLg = useBreakpoint('lg');
  const phone = !isLg;

  return <Editor {...props} phone={phone} />;
}
