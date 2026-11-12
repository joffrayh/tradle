import { useCallback, useEffect, useMemo, useState } from "react";
import { Country } from "../domain/countries";
import { Guess } from "../domain/guess";

// Kept separate from the daily "guesses" store so unlimited rounds never
// affect daily stats or streaks.
const STORAGE_KEY = "unlimited";
const RECENT_HISTORY = 30;

interface UnlimitedState {
  round: number;
  code: string | null;
  guesses: Guess[];
  recent: string[];
  played: number;
  won: number;
}

const initialState: UnlimitedState = {
  round: 0,
  code: null,
  guesses: [],
  recent: [],
  played: 0,
  won: 0,
};

function load(): UnlimitedState {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? { ...initialState, ...JSON.parse(stored) } : initialState;
  } catch {
    return initialState;
  }
}

function save(state: UnlimitedState) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    // Storage full or blocked: the round still works, it just won't persist.
  }
}

function pickCountry(pool: Country[], recent: string[]): string | null {
  if (pool.length === 0) return null;
  const fresh = pool.filter((country) => !recent.includes(country.code));
  const candidates = fresh.length > 0 ? fresh : pool;
  return candidates[Math.floor(Math.random() * candidates.length)].code;
}

export function useUnlimitedGame(pool: Country[], maxTries: number) {
  const [state, setState] = useState<UnlimitedState>(load);

  const update = useCallback((next: UnlimitedState) => {
    setState(next);
    save(next);
  }, []);

  // Pick the first country once the pool has loaded.
  useEffect(() => {
    if (state.code == null && pool.length > 0) {
      const code = pickCountry(pool, state.recent);
      update({ ...state, code, recent: code ? [code] : [] });
    }
  }, [pool, state, update]);

  const country = useMemo(
    () => pool.find((c) => c.code === state.code),
    [pool, state.code]
  );

  const addGuess = useCallback(
    (guess: Guess): Guess[] => {
      const guesses = [...state.guesses, guess];
      const won = guess.distance === 0;
      const ended = won || guesses.length >= maxTries;
      update({
        ...state,
        guesses,
        played: state.played + (ended ? 1 : 0),
        won: state.won + (won ? 1 : 0),
      });
      return guesses;
    },
    [maxTries, state, update]
  );

  const nextRound = useCallback(() => {
    const code = pickCountry(pool, state.recent);
    update({
      ...state,
      round: state.round + 1,
      code,
      guesses: [],
      recent: code
        ? [code, ...state.recent].slice(0, RECENT_HISTORY)
        : state.recent,
    });
  }, [pool, state, update]);

  return {
    country,
    guesses: state.guesses,
    round: state.round,
    played: state.played,
    won: state.won,
    addGuess,
    nextRound,
  };
}
