/**
 * GameContext — shared game state that persists across TacticsBoard,
 * SubstitutionMatrix, and any future game-day screens.
 *
 * Key decisions kept here:
 *  - Timer (gameTime, isActive, timerInterval)
 *  - displayInterval — the column the coach is currently viewing in the matrix
 *    (independent of the timer-driven currentInterval so they can look ahead/back)
 *  - assignedPlayers — keyed by slot index, value is { player, positionLabel }
 *    so that future substitution screens can match by position
 *  - unassignedPlayers — bench squad
 *  - playerStatus — 2-D array [playerId][intervalIndex]
 *  - Scoreboard (homeName, awayName, homeScore, awayScore)
 */

import React, {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
} from 'react';
import { Alert } from 'react-native';
import { Player } from '../models/Player';

// ── Types ────────────────────────────────────────────────────────────────────

export type TimerInterval = 300 | 600; // 5 min or 10 min in seconds

/** A slot on the tactics board — carries the position label for matching */
export interface SlotAssignment {
  player: Player | null;
  /** Formation position label, e.g. 'GK', 'CB', 'ST' */
  positionLabel: string;
}

export interface GameContextValue {
  // ── Timer ──
  gameTime: number;
  isActive: boolean;
  timerInterval: TimerInterval;
  setTimerInterval: (v: TimerInterval) => void;
  handleStart: () => void;
  handleStop: () => void;
  handleReset: () => void;

  // ── Interval / column navigation ──
  /** Timer-driven column index (read-only) */
  currentInterval: number;
  /** Coach-controlled display column (can be ahead/behind the timer) */
  displayInterval: number;
  numIntervals: number;
  intervalLabels: string[];
  advanceDisplayInterval: () => void;
  retreatDisplayInterval: () => void;

  // ── Squad ──
  /**
   * assignedPlayers[slotIndex] = { player, positionLabel }
   * positionLabel is the formation label at that slot (e.g. 'CB').
   */
  assignedPlayers: { [slotIndex: string]: SlotAssignment };
  unassignedPlayers: Player[];
  setSquad: (
    assigned: { [slotIndex: string]: SlotAssignment },
    unassigned: Player[]
  ) => void;

  // ── Player status matrix ──
  playerStatus: { [playerId: string]: ('on' | 'off')[] };
  toggleStatus: (playerId: string, intervalIndex: number) => void;
  /** Execute a substitution: benchPlayer goes on, fieldPlayer goes off, starting at displayInterval */
  executeSubstitution: (benchPlayerId: string, fieldPlayerId: string) => void;

  // ── Scoreboard ──
  homeScore: number;
  awayScore: number;
  homeName: string;
  awayName: string;
  setHomeScore: React.Dispatch<React.SetStateAction<number>>;
  setAwayScore: React.Dispatch<React.SetStateAction<number>>;
  setHomeName: React.Dispatch<React.SetStateAction<string>>;
  setAwayName: React.Dispatch<React.SetStateAction<string>>;

  // ── New game ──
  handleNewGame: () => void;

  // ── Game Duration ──
  GAME_DURATION: number;
}

// ── Constants ─────────────────────────────────────────────────────────────────

const GAME_DURATION = 90 * 60; // 5400 s

function buildIntervalLabels(interval: TimerInterval): string[] {
  const num = GAME_DURATION / interval;
  return Array.from({ length: num }, (_, i) => `${(i * interval) / 60}'`);
}

function buildInitialStatus(
  assigned: { [slotIndex: string]: SlotAssignment },
  unassigned: Player[],
  numIntervals: number
): { [playerId: string]: ('on' | 'off')[] } {
  const status: { [playerId: string]: ('on' | 'off')[] } = {};

  const onFieldIds = new Set(
    Object.values(assigned)
      .map(s => s.player?.id)
      .filter(Boolean) as string[]
  );

  const allPlayers: Player[] = [
    ...Object.values(assigned)
      .map(s => s.player)
      .filter((p): p is Player => p !== null),
    ...unassigned,
  ];

  // Deduplicate in case a player appears in both
  const seen = new Set<string>();
  allPlayers.forEach(p => {
    if (seen.has(p.id)) return;
    seen.add(p.id);
    status[p.id] = Array(numIntervals).fill('off');
    if (onFieldIds.has(p.id)) {
      status[p.id][0] = 'on';
    }
  });

  return status;
}

// ── Context ───────────────────────────────────────────────────────────────────

const GameContext = createContext<GameContextValue | null>(null);

export const GameProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  // ── Timer ──
  const [gameTime, setGameTime] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [timerInterval, setTimerIntervalState] = useState<TimerInterval>(600);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const numIntervals = GAME_DURATION / timerInterval;
  const intervalLabels = buildIntervalLabels(timerInterval);

  // ── Column navigation ──
  const [displayInterval, setDisplayInterval] = useState(0);
  const currentInterval = Math.min(
    Math.floor(gameTime / timerInterval),
    numIntervals - 1
  );

  // ── Squad ──
  const [assignedPlayers, setAssignedPlayersState] = useState<{
    [slotIndex: string]: SlotAssignment;
  }>({});
  const [unassignedPlayers, setUnassignedPlayers] = useState<Player[]>([]);

  // ── Player status matrix ──
  const [playerStatus, setPlayerStatus] = useState<{
    [playerId: string]: ('on' | 'off')[];
  }>({});

  // ── Scoreboard ──
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [homeName, setHomeName] = useState('Home');
  const [awayName, setAwayName] = useState('Away');

  // ── Alert ref to prevent double-alerting ──
  const lastAlertedIntervalRef = useRef<number>(-1);

  // ── Timer effect ──
  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setGameTime(prev => {
          if (prev >= GAME_DURATION) {
            clearInterval(timerRef.current!);
            setIsActive(false);
            return GAME_DURATION;
          }
          const next = prev + 1;

          // Detect interval boundary
          if (next % timerInterval === 0 && next < GAME_DURATION) {
            const crossedInterval = Math.floor(next / timerInterval);
            if (crossedInterval > lastAlertedIntervalRef.current) {
              lastAlertedIntervalRef.current = crossedInterval;
              // Alert is fired outside the tick via setTimeout to avoid
              // calling setState (setIsActive) inside another setState updater.
              setTimeout(() => {
                Alert.alert(
                  '⏱ Substitution Time',
                  `${(next / 60).toFixed(0)} minutes — time to consider a substitution!`,
                  [{ text: 'Got it' }]
                );
              }, 0);
              // Auto-advance the display column to the new interval
              setDisplayInterval(crossedInterval);
            }
          }

          return next;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive, timerInterval]);

  // ── Squad setter — also rebuilds playerStatus ──
  const setSquad = useCallback(
    (
      assigned: { [slotIndex: string]: SlotAssignment },
      unassigned: Player[]
    ) => {
      setAssignedPlayersState(assigned);
      setUnassignedPlayers(unassigned);
      setPlayerStatus(buildInitialStatus(assigned, unassigned, numIntervals));
      setDisplayInterval(0);
      lastAlertedIntervalRef.current = -1;
    },
    [numIntervals]
  );

  // ── timerInterval change: rebuild status arrays to match new column count ──
  const setTimerInterval = useCallback(
    (v: TimerInterval) => {
      setTimerIntervalState(v);
      const newNum = GAME_DURATION / v;
      setPlayerStatus(prev => {
        const updated: { [playerId: string]: ('on' | 'off')[] } = {};
        Object.entries(prev).forEach(([id, arr]) => {
          // Expand or truncate
          if (arr.length < newNum) {
            updated[id] = [...arr, ...Array(newNum - arr.length).fill('off')];
          } else {
            updated[id] = arr.slice(0, newNum);
          }
        });
        return updated;
      });
      setDisplayInterval(0);
      lastAlertedIntervalRef.current = -1;
    },
    []
  );

  // ── Toggle a single cell ──
  const toggleStatus = useCallback(
    (playerId: string, intervalIndex: number) => {
      setPlayerStatus(prev => {
        const updated = { ...prev, [playerId]: [...(prev[playerId] ?? [])] };
        updated[playerId][intervalIndex] =
          updated[playerId][intervalIndex] === 'on' ? 'off' : 'on';
        return updated;
      });
    },
    []
  );

  // ── Execute a substitution from displayInterval onwards ──
  const executeSubstitution = useCallback(
    (benchPlayerId: string, fieldPlayerId: string) => {
      const playerToField =
        unassignedPlayers.find(p => p.id === benchPlayerId) ?? null;
      const playerToBench =
        Object.values(assignedPlayers)
          .map(s => s.player)
          .find(p => p?.id === fieldPlayerId) ?? null;

      if (!playerToField || !playerToBench) {
        console.warn('Substitution failed: player not found');
        return;
      }

      setPlayerStatus(prev => {
        const updated = { ...prev };
        const bench = [...(prev[benchPlayerId] ?? [])];
        const field = [...(prev[fieldPlayerId] ?? [])];

        // From displayInterval onwards: bench goes 'on', field goes 'off'
        for (let i = displayInterval; i < bench.length; i++) {
          bench[i] = 'on';
          field[i] = 'off';
        }
        updated[benchPlayerId] = bench;
        updated[fieldPlayerId] = field;
        return updated;
      });

      // Move bench player onto field in assignedPlayers, field player to bench
      setAssignedPlayersState(prev => {
        const updated = { ...prev };
        // Find the slot occupied by the field player
        const slotEntry = Object.entries(updated).find(
          ([, s]) => s.player?.id === fieldPlayerId
        );
        if (slotEntry) {
          const slotKey = slotEntry[0];
          const positionLabel = slotEntry[1].positionLabel;
          updated[slotKey] = { player: playerToField, positionLabel };
        }
        return updated;
      });

      setUnassignedPlayers(prev => {
        const filtered = prev.filter(p => p.id !== benchPlayerId);
        return [...filtered, playerToBench];
      });
    },
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [displayInterval, assignedPlayers, unassignedPlayers]
  );

  // ── Timer controls ──
  const handleStart = useCallback(() => setIsActive(true), []);
  const handleStop = useCallback(() => setIsActive(false), []);
  const handleReset = useCallback(() => {
    setIsActive(false);
    setGameTime(0);
    setDisplayInterval(0);
    lastAlertedIntervalRef.current = -1;
  }, []);

  // ── Column navigation ──
  const advanceDisplayInterval = useCallback(() => {
    setDisplayInterval(prev => Math.min(prev + 1, numIntervals - 1));
  }, [numIntervals]);

  const retreatDisplayInterval = useCallback(() => {
    setDisplayInterval(prev => Math.max(prev - 1, 0));
  }, []);

  // ── New game ──
  const handleNewGame = useCallback(() => {
    Alert.alert(
      'New Game',
      'This will reset the timer, scoreboard, and all substitution records. Start fresh?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'New Game',
          style: 'destructive',
          onPress: () => {
            setIsActive(false);
            setGameTime(0);
            setDisplayInterval(0);
            setHomeScore(0);
            setAwayScore(0);
            lastAlertedIntervalRef.current = -1;
            // Rebuild status from current squad
            setPlayerStatus(
              buildInitialStatus(assignedPlayers, unassignedPlayers, numIntervals)
            );
          },
        },
      ]
    );
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [assignedPlayers, unassignedPlayers, numIntervals]);

  return (
    <GameContext.Provider
      value={{
        gameTime,
        isActive,
        timerInterval,
        setTimerInterval,
        handleStart,
        handleStop,
        handleReset,
        currentInterval,
        displayInterval,
        numIntervals,
        intervalLabels,
        advanceDisplayInterval,
        retreatDisplayInterval,
        assignedPlayers,
        unassignedPlayers,
        setSquad,
        playerStatus,
        toggleStatus,
        executeSubstitution,
        homeScore,
        awayScore,
        homeName,
        awayName,
        setHomeScore,
        setAwayScore,
        setHomeName,
        setAwayName,
        handleNewGame,
        GAME_DURATION,
      }}
    >
      {children}
    </GameContext.Provider>
  );
};

export const useGame = (): GameContextValue => {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used inside <GameProvider>');
  return ctx;
};
