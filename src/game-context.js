// The engine API, shared with every component. Until the town has loaded, calls are ignored.
import { createContext, useContext } from 'react';

export const GameContext = createContext(null);
const NOOP = new Proxy({}, { get: () => () => { } });
/** @returns {any} */
export function useGame() { return useContext(GameContext) || NOOP; }
export function useGameReady() { return !!useContext(GameContext); }
