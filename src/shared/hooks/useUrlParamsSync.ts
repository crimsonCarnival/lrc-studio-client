import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useSearchParams } from 'react-router-dom';

interface UrlAppState {
  editorMode: string;
  setEditorMode: (mode: string) => void;
  [key: string]: unknown;
}

interface UrlLayoutState {
  focusMode: string;
  setFocusMode: (mode: string) => void;
  mobileTab: string;
  setMobileTab: (tab: string) => void;
  layoutSwap: boolean;
  setLayoutSwap: (swap: boolean) => void;
  isReady: boolean;
  [key: string]: unknown;
}

const EDITOR_MODES = ['lrc', 'srt', 'words'];
const FOCUS_MODES = ['default', 'sync', 'playback'];
const MOBILE_TABS = ['editor', 'preview'];

/**
 * Synchronises editor UI state with URL parameters.
 *
 * Two rules keep this hook from trampling other pages' parameters:
 *
 * 1. **Ownership.** `mode`, `focus`, `view` and `swap` belong to the project
 *    pages, so they are only read and written while `layoutState.isReady` is
 *    true. This hook is mounted for every route under `/*`, and writing those
 *    keys unconditionally is what deleted `?view=public` on profiles and
 *    `?focus=<card>` on settings — both pages own a parameter of the same name.
 * 2. **Defaults are omitted.** A parameter at its default value is removed from
 *    the URL rather than written out, so a copied link carries only what the
 *    person actually changed.
 *
 * Content deep links (`?s=`, `?loop=`) are deliberately *not* handled here.
 * They are read-only intents produced by an explicit share action and parsed by
 * `shared/utils/url-params.ts`; echoing them back as state changes would
 * overwrite the shared link while the viewer watches.
 */
export function useUrlParamsSync(appState: UrlAppState, layoutState: UrlLayoutState) {
  const { i18n } = useTranslation();
  const [searchParams, setSearchParams] = useSearchParams();
  const isFirstLoad = useRef(true);
  const lastParamsRef = useRef('');

  const { editorMode, setEditorMode } = appState;

  const {
    focusMode,
    setFocusMode,
    mobileTab,
    setMobileTab,
    layoutSwap,
    setLayoutSwap,
    isReady,
  } = layoutState;

  // 1. Initialization from URL on mount
  useEffect(() => {
    if (!isFirstLoad.current) return;
    isFirstLoad.current = false;

    // Language is app-wide, so it is read on every route.
    const hl = searchParams.get('hl');
    if (hl && i18n.language !== hl) {
      i18n.changeLanguage(hl);
    }

    // Everything below is project-page state. Reading it elsewhere would apply
    // another page's identically-named parameter to the editor.
    if (!isReady) return;

    const mode = searchParams.get('mode');
    const focus = searchParams.get('focus');
    const view = searchParams.get('view');
    const swap = searchParams.get('swap');

    if (mode && EDITOR_MODES.includes(mode) && editorMode !== mode) {
      setEditorMode(mode);
    }

    if (focus && FOCUS_MODES.includes(focus) && focusMode !== focus) {
      setFocusMode(focus);
    }

    if (view && MOBILE_TABS.includes(view) && mobileTab !== view) {
      setMobileTab(view);
    }

    // `1` is the current form; `true` is accepted so links shared before the
    // boolean convention landed keep working.
    if ((swap === '1' || swap === 'true') && !layoutSwap) {
      setLayoutSwap(true);
    }
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // 2. Sync state changes TO the URL
  useEffect(() => {
    const params = new URLSearchParams(searchParams);
    let changed = false;

    const updateParam = (key: string, val: string | number | null, defaultVal: string | number | null) => {
      const current = params.get(key);
      const strVal = val != null ? String(val) : null;

      if (val == null || val === defaultVal) {
        if (current !== null) {
          params.delete(key);
          changed = true;
        }
      } else if (current !== strVal) {
        params.set(key, strVal as string);
        changed = true;
      }
    };

    const currentHl = i18n.language?.split('-')[0] || 'en';
    updateParam('hl', currentHl, 'en');

    if (isReady) {
      updateParam('mode', editorMode, 'lrc');
      updateParam('focus', focusMode, 'default');
      updateParam('view', mobileTab, 'editor');
      updateParam('swap', layoutSwap ? '1' : null, null);
    } else {
      // Off the project pages these keys are not ours. Leave whatever the
      // owning page put there untouched.
      updateParam('mode', null, null);
    }

    const paramsString = params.toString();
    if (changed && paramsString !== lastParamsRef.current) {
      lastParamsRef.current = paramsString;
      setSearchParams(params, { replace: true });
    }
    // setSearchParams is stable (useSearchParams)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [i18n.language, editorMode, focusMode, mobileTab, layoutSwap, searchParams, isReady]);
}
