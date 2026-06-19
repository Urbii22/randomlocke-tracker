"use client";

import { useEffect, useMemo, useState } from "react";
import { createInitialGameState } from "@/lib/game";
import { parseStoredGameState, serializeGameState, STORAGE_KEY } from "@/lib/storage";
import type { GameState } from "@/types/randomlocke";

export function useLocalStorageGameState() {
  const [isReady, setIsReady] = useState(false);
  const [state, setState] = useState<GameState>(() => createInitialGameState());

  useEffect(() => {
    window.setTimeout(() => {
      setState(parseStoredGameState(window.localStorage.getItem(STORAGE_KEY)));
      setIsReady(true);
    }, 0);
  }, []);

  useEffect(() => {
    if (isReady) {
      window.localStorage.setItem(STORAGE_KEY, serializeGameState(state));
    }
  }, [isReady, state]);

  return useMemo(
    () => ({
      state,
      setState,
      isReady,
      exportJson: () => serializeGameState(state),
      importJson: (json: string) => setState(parseStoredGameState(json)),
      reset: () => setState(createInitialGameState()),
    }),
    [isReady, state],
  );
}
