import { createContext, useContext, useEffect } from 'react';

/** Staged edits a panel holds itself (profile, privacy) — the page needs them to guard leaving. */
export type PanelDraft = {
  isDirty: boolean;
  /** Resolves true once the edits are committed; false leaves them staged. */
  save: () => Promise<boolean>;
  discard: () => void;
};

export const SettingsDraftContext = createContext<(draft: PanelDraft | null) => void>(() => {});

export function useReportDraft(draft: PanelDraft) {
  const report = useContext(SettingsDraftContext);
  // Every render, so the page always holds the latest save/discard closures.
  useEffect(() => { report(draft); });
  useEffect(() => () => report(null), [report]);
}
