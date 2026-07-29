"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { createInitialGameStateForGame, isTrackedGameId, type TrackedGameId } from "@/lib/trackedGame";
import {
  ACTIVE_GAME_STORAGE_KEY,
  getGameStorageKey,
  LEGACY_STORAGE_KEY,
  parseStoredGameState,
  serializeGameState,
} from "@/lib/storage";
import type { GameState } from "@/types/randomlocke";

export function useLocalStorageGameState() {
  const [isReady, setIsReady] = useState(false);
  const [activeGame, setActiveGame] = useState<TrackedGameId>("anil");
  const [state, setState] = useState<GameState>(() => createInitialGameStateForGame("anil"));

  useEffect(() => {
    window.setTimeout(() => {
      const storedGame = window.localStorage.getItem(ACTIVE_GAME_STORAGE_KEY);
      const game = isTrackedGameId(storedGame) ? storedGame : "anil";
      const gameKey = getGameStorageKey(game);
      const rawState = window.localStorage.getItem(gameKey)
        ?? (game === "anil" ? window.localStorage.getItem(LEGACY_STORAGE_KEY) : null);

      setActiveGame(game);
      setState(rawState ? parseStoredGameState(rawState) : createInitialGameStateForGame(game));
      setIsReady(true);
    }, 0);
  }, []);

  useEffect(() => {
    if (isReady) {
      window.localStorage.setItem(getGameStorageKey(activeGame), serializeGameState(state));
    }
  }, [activeGame, isReady, state]);

  const selectGame = useCallback((game: TrackedGameId) => {
    if (!isReady || game === activeGame) return;

    window.localStorage.setItem(getGameStorageKey(activeGame), serializeGameState(state));
    window.localStorage.setItem(ACTIVE_GAME_STORAGE_KEY, game);
    const rawState = window.localStorage.getItem(getGameStorageKey(game));
    setActiveGame(game);
    setState(rawState ? parseStoredGameState(rawState) : createInitialGameStateForGame(game));
  }, [activeGame, isReady, state]);

  return useMemo(
    () => ({
      state,
      setState,
      isReady,
      activeGame,
      selectGame,
      exportJson: () => serializeGameState(state),
      importJson: (json: string) => setState(parseStoredGameState(json)),
      reset: () => setState(createInitialGameStateForGame(activeGame)),
    }),
    [activeGame, isReady, selectGame, state],
  );
}
