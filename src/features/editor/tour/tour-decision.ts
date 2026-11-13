export type TourPrefs = { shown: number; enabled: boolean; legacySeen: boolean };

/** After this many automatic showings the tour stops opening on its own; replays still work. */
export const AUTO_TOUR_LIMIT = 20;

/**
 * Decides whether the tour auto-opens for a freshly created project.
 * The count is account-wide, not per device class: a tour shown once on a
 * phone means the next desktop new project already offers the opt-out.
 * A legacy "tutorial seen" flag counts as one prior showing.
 */
export function decideAutoTour(newProject: boolean, prefs: TourPrefs): { show: boolean; offerOptOut: boolean } {
  if (!newProject || !prefs.enabled) return { show: false, offerOptOut: false };
  const prior = Math.max(prefs.shown, prefs.legacySeen ? 1 : 0);
  if (prior >= AUTO_TOUR_LIMIT) return { show: false, offerOptOut: false };
  return { show: true, offerOptOut: prior >= 1 };
}
