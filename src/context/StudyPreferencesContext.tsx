import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type ReactNode,
} from "react";

import { toggleTag } from "../domain/tagSelection";
import {
  fetchStudyPreferences,
  saveOnlyMine,
  saveSelectedTags,
} from "../services/preferences";
import { useAuth } from "./AuthContext";

export interface StudyPreferencesState {
  /** Tags to study; an empty list means "study every card". */
  selectedTags: string[];
  /** When true, study and stats only include cards the user created. */
  onlyMine: boolean;
  /** True while the selection is being loaded for the signed-in user. */
  loading: boolean;
  /** True while a toggle is being persisted. */
  saving: boolean;
  error: string | null;
  toggle: (tag: string) => void;
  toggleOnlyMine: () => void;
  isSelected: (tag: string) => boolean;
}

const StudyPreferencesContext = createContext<StudyPreferencesState | null>(
  null,
);

/**
 * Owns the tag filter shared by the settings screen and the study queue.
 *
 * Toggles are applied optimistically and rolled back if the server rejects the
 * write, so the UI never drifts from the persisted selection.
 */
export function StudyPreferencesProvider({
  children,
}: {
  children: ReactNode;
}) {
  const { session } = useAuth();
  const userId = session?.user.id ?? null;

  const [selectedTags, setSelectedTags] = useState<string[]>([]);
  const [onlyMine, setOnlyMine] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Mirror of the latest selection so `toggle` can compute the next value
  // without depending on (and being re-created by) every state change.
  const selectedRef = useRef<string[]>([]);
  const onlyMineRef = useRef(false);

  const applySelection = useCallback((tags: string[]) => {
    selectedRef.current = tags;
    setSelectedTags(tags);
  }, []);

  const applyOnlyMine = useCallback((value: boolean) => {
    onlyMineRef.current = value;
    setOnlyMine(value);
  }, []);

  useEffect(() => {
    let active = true;

    const run = async () => {
      if (!userId) {
        applySelection([]);
        applyOnlyMine(false);
        setError(null);
        setLoading(false);
        return;
      }

      setLoading(true);
      try {
        const preferences = await fetchStudyPreferences();
        if (!active) return;
        applySelection(preferences.selectedTags);
        applyOnlyMine(preferences.onlyMine);
        setError(null);
      } catch (cause) {
        if (!active) return;
        setError(cause instanceof Error ? cause.message : String(cause));
      } finally {
        if (active) setLoading(false);
      }
    };

    void run();
    return () => {
      active = false;
    };
  }, [userId, applySelection, applyOnlyMine]);

  const toggle = useCallback(
    (tag: string) => {
      const previous = selectedRef.current;
      const next = toggleTag(previous, tag);

      applySelection(next);
      setSaving(true);
      setError(null);

      void saveSelectedTags(next)
        .catch((cause) => {
          applySelection(previous);
          setError(cause instanceof Error ? cause.message : String(cause));
        })
        .finally(() => setSaving(false));
    },
    [applySelection],
  );

  const toggleOnlyMine = useCallback(() => {
    const previous = onlyMineRef.current;
    const next = !previous;

    applyOnlyMine(next);
    setSaving(true);
    setError(null);

    void saveOnlyMine(next)
      .catch((cause) => {
        applyOnlyMine(previous);
        setError(cause instanceof Error ? cause.message : String(cause));
      })
      .finally(() => setSaving(false));
  }, [applyOnlyMine]);

  const isSelected = useCallback(
    (tag: string) => selectedTags.includes(tag),
    [selectedTags],
  );

  const value = useMemo<StudyPreferencesState>(
    () => ({
      selectedTags,
      onlyMine,
      loading,
      saving,
      error,
      toggle,
      toggleOnlyMine,
      isSelected,
    }),
    [
      selectedTags,
      onlyMine,
      loading,
      saving,
      error,
      toggle,
      toggleOnlyMine,
      isSelected,
    ],
  );

  return (
    <StudyPreferencesContext.Provider value={value}>
      {children}
    </StudyPreferencesContext.Provider>
  );
}

export function useStudyPreferences(): StudyPreferencesState {
  const context = useContext(StudyPreferencesContext);
  if (!context) {
    throw new Error(
      "useStudyPreferences must be used inside a StudyPreferencesProvider",
    );
  }
  return context;
}
