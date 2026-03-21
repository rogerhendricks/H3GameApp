import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, TextInput } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';

import { Player } from '../models/Player';
import { getPlayers } from '../database';
import { useTheme } from '../context/ThemeContext';
import { AppTheme } from '../theme';
import { NativeStackNavigationProp, NativeStackScreenProps } from '@react-navigation/native-stack';
import FieldBackground from '../components/FieldBackground';
import Icon from 'react-native-vector-icons/Ionicons';
import { useGame } from '../context/GameContext';

// ── Exported so GameDayScreen can type the navigation param correctly ──
export type GameFormat = '11v11' | '9v9' | '7v7';

type GameFlowStackParamList = {
  GameDay: undefined;
  TacticsBoard: { activePlayers: string[]; format: GameFormat };
  SubstitutionMatrix: undefined;
};

type TacticsBoardScreenRouteProp = RouteProp<GameFlowStackParamList, 'TacticsBoard'>;
type TacticsBoardScreenNavigationProp = NativeStackNavigationProp<GameFlowStackParamList, 'TacticsBoard'>;

type Props = NativeStackScreenProps<GameFlowStackParamList, 'TacticsBoard'>;

type FormationPosition = { top: `${number}%`; left: `${number}%`; label: string };
type SlotLayout = { x: number; y: number; width: number; height: number };

const NODE_SIZE = 48;
const HIT_SLOP = 14; // extra hit area in px around each slot for easier drops

/** How many field players (including GK) each format uses */
const FORMAT_PLAYER_COUNT: Record<GameFormat, number> = {
  '11v11': 11,
  '9v9':   9,
  '7v7':   7,
};

/** Which formation chip is pre-selected when entering TacticsBoard */
const DEFAULT_FORMATION: Record<GameFormat, string> = {
  '11v11': '4-4-2',
  '9v9':   '3-3-2',
  '7v7':   '2-3-1',
};

const FORMATIONS: Record<GameFormat, Record<string, FormationPosition[]>> = {
  // ── 11 v 11 ───────────────────────────────────────────────────────────────
  '11v11': {
    '4-4-2': [
      { top: '85%', left: '42%', label: 'GK' },
      { top: '70%', left: '10%', label: 'RB' }, { top: '70%', left: '30%', label: 'CB' },
      { top: '70%', left: '55%', label: 'CB' }, { top: '70%', left: '75%', label: 'LB' },
      { top: '45%', left: '10%', label: 'RM' }, { top: '45%', left: '30%', label: 'CM' },
      { top: '45%', left: '55%', label: 'CM' }, { top: '45%', left: '75%', label: 'LM' },
      { top: '20%', left: '30%', label: 'ST' }, { top: '20%', left: '55%', label: 'ST' },
    ],
    '4-3-3': [
      { top: '85%', left: '42%', label: 'GK' },
      { top: '70%', left: '10%', label: 'RB' }, { top: '70%', left: '30%', label: 'CB' },
      { top: '70%', left: '55%', label: 'CB' }, { top: '70%', left: '75%', label: 'LB' },
      { top: '45%', left: '20%', label: 'CM' }, { top: '50%', left: '42%', label: 'CM' },
      { top: '45%', left: '65%', label: 'CM' },
      { top: '25%', left: '15%', label: 'RW' }, { top: '20%', left: '42%', label: 'ST' },
      { top: '25%', left: '70%', label: 'LW' },
    ],
    '4-2-3-1': [
      { top: '85%', left: '42%', label: 'GK' },
      { top: '70%', left: '10%', label: 'RB' }, { top: '70%', left: '30%', label: 'CB' },
      { top: '70%', left: '55%', label: 'CB' }, { top: '70%', left: '75%', label: 'LB' },
      { top: '55%', left: '30%', label: 'CDM' }, { top: '55%', left: '55%', label: 'CDM' },
      { top: '35%', left: '15%', label: 'RAM' }, { top: '35%', left: '42%', label: 'CAM' },
      { top: '35%', left: '70%', label: 'LAM' },
      { top: '15%', left: '42%', label: 'ST' },
    ],
    '3-5-2': [
      { top: '85%', left: '42%', label: 'GK' },
      { top: '70%', left: '20%', label: 'CB' }, { top: '75%', left: '42%', label: 'CB' },
      { top: '70%', left: '65%', label: 'CB' },
      { top: '50%', left: '5%',  label: 'RM' }, { top: '45%', left: '25%', label: 'CM' },
      { top: '50%', left: '42%', label: 'CM' }, { top: '45%', left: '60%', label: 'CM' },
      { top: '50%', left: '80%', label: 'LM' },
      { top: '20%', left: '30%', label: 'ST' }, { top: '20%', left: '55%', label: 'ST' },
    ],
    '4-5-1': [
      { top: '85%', left: '42%', label: 'GK' },
      { top: '70%', left: '10%', label: 'RB' }, { top: '70%', left: '30%', label: 'CB' },
      { top: '70%', left: '55%', label: 'CB' }, { top: '70%', left: '75%', label: 'LB' },
      { top: '45%', left: '5%',  label: 'RM' }, { top: '50%', left: '25%', label: 'CM' },
      { top: '45%', left: '42%', label: 'CM' }, { top: '50%', left: '60%', label: 'CM' },
      { top: '45%', left: '80%', label: 'LM' },
      { top: '20%', left: '42%', label: 'ST' },
    ],
    '3-4-3': [
      { top: '85%', left: '42%', label: 'GK' },
      { top: '70%', left: '20%', label: 'CB' }, { top: '75%', left: '42%', label: 'CB' },
      { top: '70%', left: '65%', label: 'CB' },
      { top: '50%', left: '10%', label: 'RM' }, { top: '50%', left: '30%', label: 'CM' },
      { top: '50%', left: '55%', label: 'CM' }, { top: '50%', left: '75%', label: 'LM' },
      { top: '25%', left: '15%', label: 'RW' }, { top: '20%', left: '42%', label: 'ST' },
      { top: '25%', left: '70%', label: 'LW' },
    ],
  },

  // ── 9 v 9 ─────────────────────────────────────────────────────────────────
  '9v9': {
    '3-3-2': [
      { top: '85%', left: '42%', label: 'GK' },
      { top: '68%', left: '15%', label: 'RB' }, { top: '68%', left: '42%', label: 'CB' }, { top: '68%', left: '70%', label: 'LB' },
      { top: '45%', left: '15%', label: 'RM' }, { top: '45%', left: '42%', label: 'CM' }, { top: '45%', left: '70%', label: 'LM' },
      { top: '20%', left: '28%', label: 'ST' }, { top: '20%', left: '57%', label: 'ST' },
    ],
    '2-4-2': [
      { top: '85%', left: '42%', label: 'GK' },
      { top: '70%', left: '25%', label: 'CB' }, { top: '70%', left: '60%', label: 'CB' },
      { top: '47%', left: '8%',  label: 'RM' }, { top: '47%', left: '28%', label: 'CM' }, { top: '47%', left: '55%', label: 'CM' }, { top: '47%', left: '75%', label: 'LM' },
      { top: '20%', left: '28%', label: 'ST' }, { top: '20%', left: '57%', label: 'ST' },
    ],
    '3-2-3': [
      { top: '85%', left: '42%', label: 'GK' },
      { top: '68%', left: '15%', label: 'RB' }, { top: '68%', left: '42%', label: 'CB' }, { top: '68%', left: '70%', label: 'LB' },
      { top: '47%', left: '28%', label: 'CM' }, { top: '47%', left: '57%', label: 'CM' },
      { top: '20%', left: '15%', label: 'RW' }, { top: '20%', left: '42%', label: 'ST' }, { top: '20%', left: '70%', label: 'LW' },
    ],
    '2-3-3': [
      { top: '85%', left: '42%', label: 'GK' },
      { top: '70%', left: '25%', label: 'CB' }, { top: '70%', left: '60%', label: 'CB' },
      { top: '46%', left: '15%', label: 'RM' }, { top: '46%', left: '42%', label: 'CM' }, { top: '46%', left: '70%', label: 'LM' },
      { top: '22%', left: '15%', label: 'RW' }, { top: '22%', left: '42%', label: 'ST' }, { top: '22%', left: '70%', label: 'LW' },
    ],
  },

  // ── 7 v 7 ─────────────────────────────────────────────────────────────────
  '7v7': {
    '2-3-1': [
      { top: '85%', left: '42%', label: 'GK' },
      { top: '65%', left: '25%', label: 'CB' }, { top: '65%', left: '62%', label: 'CB' },
      { top: '42%', left: '12%', label: 'RM' }, { top: '42%', left: '42%', label: 'CM' }, { top: '42%', left: '73%', label: 'LM' },
      { top: '18%', left: '42%', label: 'ST' },
    ],
    '3-2-1': [
      { top: '85%', left: '42%', label: 'GK' },
      { top: '65%', left: '15%', label: 'RB' }, { top: '68%', left: '42%', label: 'CB' }, { top: '65%', left: '70%', label: 'LB' },
      { top: '42%', left: '28%', label: 'CM' }, { top: '42%', left: '57%', label: 'CM' },
      { top: '18%', left: '42%', label: 'ST' },
    ],
    '2-2-2': [
      { top: '85%', left: '42%', label: 'GK' },
      { top: '65%', left: '25%', label: 'CB' }, { top: '65%', left: '62%', label: 'CB' },
      { top: '45%', left: '28%', label: 'CM' }, { top: '45%', left: '57%', label: 'CM' },
      { top: '22%', left: '28%', label: 'ST' }, { top: '22%', left: '57%', label: 'ST' },
    ],
    '1-3-2': [
      { top: '85%', left: '42%', label: 'GK' },
      { top: '65%', left: '42%', label: 'CB' },
      { top: '46%', left: '12%', label: 'RM' }, { top: '46%', left: '42%', label: 'CM' }, { top: '46%', left: '73%', label: 'LM' },
      { top: '20%', left: '28%', label: 'ST' }, { top: '20%', left: '57%', label: 'ST' },
    ],
  },
};

const TacticsBoardScreen = ({ route }: Props) => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const navigation = useNavigation<TacticsBoardScreenNavigationProp>();
  const { activePlayers: activePlayerIds, format } = route.params;
  const playerCount = FORMAT_PLAYER_COUNT[format];

  // ── React state ──
  const [formation, setFormation] = useState<string>(DEFAULT_FORMATION[format]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [assignedPlayers, setAssignedPlayers] = useState<{ [index: number]: Player | null }>(
    Object.fromEntries(Array(playerCount).fill(0).map((_, i) => [i, null]))
  );
  const [unassignedPlayers, setUnassignedPlayers] = useState<Player[]>([]);
  const [selectedBenchPlayer, setSelectedBenchPlayer] = useState<Player | null>(null);
  const [ghostInfo, setGhostInfo] = useState<{ player: Player; isGK: boolean } | null>(null);
  const [draggingSlotIndex, setDraggingSlotIndex] = useState<number | null>(null);
  const [draggingBenchPlayerId, setDraggingBenchPlayerId] = useState<string | null>(null);
  const [hoveredSlotIndex, setHoveredSlotIndex] = useState<number | null>(null);

  // ── Shared values (readable on the UI thread) ──
  const ghostX = useSharedValue(0);
  const ghostY = useSharedValue(0);
  const isDragging = useSharedValue(0);
  const rootOffsetX = useSharedValue(0);
  const rootOffsetY = useSharedValue(0);

  // ── JS-thread refs ──
  const fieldRef = useRef<View>(null);
  const rootRef = useRef<View>(null);
  const fieldPageRef = useRef({ x: 0, y: 0 });
  const slotLayoutsRef = useRef<SlotLayout[]>([]);
  const dragSourceIndexRef = useRef<number | null>(null);
  const dragSourceBenchPlayerIdRef = useRef<string | null>(null);

  const {
    setSquad,
    handleStart,
    handleStop,
    handleResetRotation,
    handleResetGame,
    executeSubstitution,
    playerStatus,
    gameTime,
    rotationTime,
    isActive,
    currentInterval,
    displayInterval,
    assignedPlayers: contextAssigned,
    unassignedPlayers: contextUnassigned,
    lastSubbedOffIds,
    homeScore,
    awayScore,
    homeName,
    awayName,
    setHomeScore,
    setAwayScore,
    setHomeName,
    setAwayName,
  } = useGame();

  // ── Local UI state ──
  const [editingHome, setEditingHome] = useState(false);
  const [editingAway, setEditingAway] = useState(false);

  // Sync with context ONLY if game is truly active and has context data
  useEffect(() => {
    if ((gameTime > 0 || isActive) && contextUnassigned.length > 0) {
      // Convert context structure to local structure
      const localAssigned: { [index: number]: Player | null } = {};
      Object.entries(contextAssigned).forEach(([idx, assignment]) => {
        localAssigned[parseInt(idx, 10)] = assignment.player;
      });
      setAssignedPlayers(localAssigned);
      setUnassignedPlayers(contextUnassigned);
    }
  }, [contextAssigned, contextUnassigned, gameTime, isActive]);

  // ── Load players (initial) ──
  const loadPlayers = useCallback(async () => {
    const allPlayers = await getPlayers();
    const active = allPlayers.filter(p => activePlayerIds.includes(p.id));
    setPlayers(active);
    
    // Always populate the bench if we don't have an active game with assignments
    const hasContextAssignments = Object.values(contextAssigned).some(s => s.player !== null);
    if (!gameStarted || !hasContextAssignments) {
      setUnassignedPlayers(active);
      // Also clear any previous assignments if we're starting fresh
      setAssignedPlayers(Object.fromEntries(Array(playerCount).fill(0).map((_, i) => [i, null])));
    }
  }, [activePlayerIds, gameStarted, contextAssigned, playerCount]);

  useEffect(() => { loadPlayers(); }, [loadPlayers]);

  // ── Bench Categorization ──
  const { readyPlayers, recoveringPlayers } = useMemo(() => {
    const ready: Player[] = [];
    const recovering: Player[] = [];
    
    // Deduplicate unassignedPlayers by ID to prevent key collisions
    const seenIds = new Set<string>();
    const uniqueUnassigned = unassignedPlayers.filter(p => {
      if (seenIds.has(p.id)) return false;
      seenIds.add(p.id);
      return true;
    });

    uniqueUnassigned.forEach(p => {
      // "Recovering" if they are in the lastSubbedOffIds list
      const isRecovering = lastSubbedOffIds.includes(p.id);
      
      if (isRecovering) {
        recovering.push(p);
      } else {
        ready.push(p);
      }
    });
    return { readyPlayers: ready, recoveringPlayers: recovering };
  }, [unassignedPlayers, lastSubbedOffIds]);

  // ── Formation change resets all assignments ──
  const handleFormationChange = (value: string) => {
    if (gameTime > 0 || isActive) return; // Disable during match
    setFormation(value);
    setAssignedPlayers(Object.fromEntries(Array(playerCount).fill(0).map((_, i) => [i, null])));
    setUnassignedPlayers(players);
    setSelectedBenchPlayer(null);
    setDraggingSlotIndex(null);
    slotLayoutsRef.current = [];
  };

  const handleClear = () => {
    if (gameTime > 0 || isActive) return; // Disable during match
    setAssignedPlayers(Object.fromEntries(Array(playerCount).fill(0).map((_, i) => [i, null])));
    setUnassignedPlayers(players);
    setSelectedBenchPlayer(null);
  };

  // ── Bench tap-to-select ──
  const handleBenchPlayerTap = (player: Player) => {
    setSelectedBenchPlayer(prev => (prev?.id === player.id ? null : player));
  };

  // ── Field slot tap: assign selected bench player ──
  const handleSlotTap = useCallback((slotIndex: number) => {
    const benchPlayer = selectedBenchPlayer;
    if (!benchPlayer) return;

    if (gameTime > 0 || isActive) {
      // If game is active, tapping an occupied slot with a bench player selected performs a sub
      const fieldPlayer = assignedPlayers[slotIndex];
      if (fieldPlayer) {
        executeSubstitution(benchPlayer.id, fieldPlayer.id);
        setSelectedBenchPlayer(null);
      } else {
        // Drop on empty slot - just move them
        executeSubstitution(benchPlayer.id, 'none'); // Need to handle 'none' or similar in context
      }
    } else {
      const displaced = assignedPlayers[slotIndex];
      setAssignedPlayers(prev => ({ ...prev, [slotIndex]: benchPlayer }));
      setUnassignedPlayers(prev => {
        const filtered = prev.filter(p => p.id !== benchPlayer.id);
        return displaced ? [...filtered, displaced] : filtered;
      });
      setSelectedBenchPlayer(null);
    }
  }, [selectedBenchPlayer, assignedPlayers, gameTime, isActive, executeSubstitution]);

  // ── Drag start ──
  const onDragStart = useCallback((id: string | number) => {
    if (typeof id === 'number') {
      // Dragging from field
      const player = assignedPlayers[id];
      if (!player) return;
      dragSourceIndexRef.current = id;
      setGhostInfo({ player, isGK: id === 0 });
      setDraggingSlotIndex(id);
    } else {
      // Dragging from bench
      const player = unassignedPlayers.find(p => p.id === id);
      if (!player) return;
      dragSourceBenchPlayerIdRef.current = id;
      setGhostInfo({ player, isGK: false });
      setDraggingBenchPlayerId(id);
    }
    setSelectedBenchPlayer(null);
  }, [assignedPlayers, unassignedPlayers]);

  const onDragUpdate = useCallback((screenX: number, screenY: number) => {
    const fp = fieldPageRef.current;
    let target: number | null = null;
    for (let i = 0; i < slotLayoutsRef.current.length; i++) {
      const sl = slotLayoutsRef.current[i];
      if (!sl) continue;
      const l = fp.x + sl.x - HIT_SLOP;
      const t = fp.y + sl.y - HIT_SLOP;
      const r = fp.x + sl.x + sl.width + HIT_SLOP;
      const b = fp.y + sl.y + sl.height + HIT_SLOP;
      if (screenX >= l && screenX <= r && screenY >= t && screenY <= b) {
        target = i;
        break;
      }
    }
    setHoveredSlotIndex(target);
  }, []);

  // ── Drag end ──
  const onDragEnd = useCallback((screenX: number, screenY: number) => {
    const sourceIndex = dragSourceIndexRef.current;
    const sourceBenchId = dragSourceBenchPlayerIdRef.current;
    const fp = fieldPageRef.current;

    let targetIndex: number | null = null;
    for (let i = 0; i < slotLayoutsRef.current.length; i++) {
      const sl = slotLayoutsRef.current[i];
      if (!sl) continue;
      const l = fp.x + sl.x - HIT_SLOP;
      const t = fp.y + sl.y - HIT_SLOP;
      const r = fp.x + sl.x + sl.width + HIT_SLOP;
      const b = fp.y + sl.y + sl.height + HIT_SLOP;
      if (screenX >= l && screenX <= r && screenY >= t && screenY <= b) {
        targetIndex = i;
        break;
      }
    }

    // Reset dragging state
    dragSourceIndexRef.current = null;
    dragSourceBenchPlayerIdRef.current = null;
    setGhostInfo(null);
    setDraggingSlotIndex(null);
    setDraggingBenchPlayerId(null);
    setHoveredSlotIndex(null);

    const isMatchActive = gameTime > 0 || isActive;

    // ── CASE 1: Dragging from FIELD ──
    if (sourceIndex !== null) {
      const droppedPlayer = assignedPlayers[sourceIndex];
      if (!droppedPlayer) return;

      if (targetIndex !== null && targetIndex !== sourceIndex) {
        const displaced = assignedPlayers[targetIndex];
        if (isMatchActive) {
          // If match active, swapping field positions is just a tactical move
          // But if we want it to reflect in context, we'd need a movePlayer function
          // For now, let's just update local and sync if possible
          setAssignedPlayers(prev => ({ ...prev, [sourceIndex]: displaced, [targetIndex]: droppedPlayer }));
        } else {
          setAssignedPlayers(prev => ({ ...prev, [sourceIndex]: displaced, [targetIndex]: droppedPlayer }));
        }
      } else if (targetIndex === null) {
        // Dropped off-field -> move to bench
        if (isMatchActive) {
          // In a match, taking someone off without putting someone on? 
          // Use executeSubstitution with a null/empty bench player if supported
          executeSubstitution('', droppedPlayer.id);
        } else {
          setAssignedPlayers(prev => ({ ...prev, [sourceIndex]: null }));
          setUnassignedPlayers(prev => {
             // Deduplicate by ID
             const exists = prev.some(p => p.id === droppedPlayer.id);
             return exists ? prev : [...prev, droppedPlayer];
          });
        }
      }
    }

    // ── CASE 2: Dragging from BENCH ──
    if (sourceBenchId !== null) {
      const droppedPlayer = unassignedPlayers.find(p => p.id === sourceBenchId);
      if (!droppedPlayer) return;

      if (targetIndex !== null) {
        const displaced = assignedPlayers[targetIndex];
        if (isMatchActive) {
          if (displaced) {
            executeSubstitution(droppedPlayer.id, displaced.id);
          } else {
            executeSubstitution(droppedPlayer.id, ''); // empty to field
          }
        } else {
          setAssignedPlayers(prev => ({ ...prev, [targetIndex]: droppedPlayer }));
          setUnassignedPlayers(prev => {
            const filtered = prev.filter(p => p.id !== droppedPlayer.id);
            return displaced ? [...filtered, displaced] : filtered;
          });
        }
      }
    }
  }, [assignedPlayers, unassignedPlayers, gameTime, isActive, executeSubstitution]);

  // ── Cancel drag ──
  const cancelDrag = useCallback(() => {
    dragSourceIndexRef.current = null;
    dragSourceBenchPlayerIdRef.current = null;
    setGhostInfo(null);
    setDraggingSlotIndex(null);
    setDraggingBenchPlayerId(null);
    setHoveredSlotIndex(null);
  }, []);

  // ── Ghost animated style ──
  const ghostAnimStyle = useAnimatedStyle(() => ({
    opacity: isDragging.value,
    transform: [
      { translateX: ghostX.value - NODE_SIZE / 2 - rootOffsetX.value },
      { translateY: ghostY.value - NODE_SIZE / 2 - rootOffsetY.value },
    ],
  }));

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase();

  const filledCount = Object.values(assignedPlayers).filter(p => p !== null).length;

  const renderBenchPlayer = (p: Player) => {
    const isDraggingThis = draggingBenchPlayerId === p.id;
    const isSelected = selectedBenchPlayer?.id === p.id;
    
    // Check if player has played (is in 'recovering' group)
    const status = playerStatus[p.id] || [];
    const hasPlayed = status.some(s => s === 'on');

    const panGesture = Gesture.Pan()
      .minDistance(5)
      .activeOffsetX([-10, 10])
      .activeOffsetY([-10, 10])
      .onStart(e => {
        'worklet';
        ghostX.value = e.absoluteX;
        ghostY.value = e.absoluteY;
        isDragging.value = 1;
        runOnJS(onDragStart)(p.id);
      })
      .onUpdate(e => {
        'worklet';
        ghostX.value = e.absoluteX;
        ghostY.value = e.absoluteY;
        runOnJS(onDragUpdate)(e.absoluteX, e.absoluteY);
      })
      .onEnd(e => {
        'worklet';
        isDragging.value = 0;
        runOnJS(onDragEnd)(e.absoluteX, e.absoluteY);
      })
      .onFinalize((_e, success) => {
        'worklet';
        if (!success) {
          isDragging.value = 0;
          runOnJS(cancelDrag)();
        }
      });

    const tapGesture = Gesture.Tap().onEnd(() => {
      'worklet';
      runOnJS(handleBenchPlayerTap)(p);
    });

    return (
      <GestureDetector key={p.id} gesture={Gesture.Race(panGesture, tapGesture)}>
        <View
          style={[
            styles.benchNode,
            isSelected && styles.benchNodeSelected,
            hasPlayed && !isSelected && styles.benchNodeRecovering,
            isDraggingThis && { opacity: 0 },
          ]}
        >
          <Text style={[styles.benchInitials, hasPlayed && !isSelected && styles.benchInitialsRecovering]}>
            {getInitials(p.name)}
          </Text>
          <Text style={styles.benchJersey}>#{p.jerseyNumber}</Text>
          {hasPlayed && !isSelected && (
             <View style={styles.recoveringBadge}>
                <Icon name="refresh-outline" size={8} color={theme.colors.text} />
             </View>
          )}
        </View>
      </GestureDetector>
    );
  };

  const formatTime = (time: number) => {
    const m = Math.floor(time / 60);
    const s = time % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const gameStarted = gameTime > 0 || isActive;

  return (
    <GestureHandlerRootView style={styles.rootView}>
      <View
        ref={rootRef}
        style={styles.container}
        onLayout={() => {
          rootRef.current?.measure((_x, _y, _w, _h, px, py) => {
            rootOffsetX.value = px;
            rootOffsetY.value = py;
          });
        }}
      >

        {/* ── Command Center Header ── */}
        <View style={styles.commandHeader}>
          
          {/* Scoreboard Row */}
          <View style={styles.scoreboardRow}>
            {/* Home */}
            <TouchableOpacity 
              style={styles.teamBlock} 
              onPress={() => setEditingHome(true)}
              onLongPress={() => setHomeScore(s => Math.max(0, s - 1))}
            >
              {editingHome ? (
                <TextInput
                  style={styles.teamInput}
                  value={homeName}
                  onChangeText={setHomeName}
                  onBlur={() => setEditingHome(false)}
                  autoFocus
                  selectTextOnFocus
                />
              ) : (
                <Text style={styles.teamName} numberOfLines={1}>{homeName}</Text>
              )}
              <TouchableOpacity onPress={() => setHomeScore(s => s + 1)}>
                <Text style={styles.scoreText}>{homeScore}</Text>
              </TouchableOpacity>
            </TouchableOpacity>

            <View style={styles.scoreDivider}><Text style={styles.scoreDividerText}>-</Text></View>

            {/* Away */}
            <TouchableOpacity 
              style={styles.teamBlock} 
              onPress={() => setEditingAway(true)}
              onLongPress={() => setAwayScore(s => Math.max(0, s - 1))}
            >
              {editingAway ? (
                <TextInput
                  style={styles.teamInput}
                  value={awayName}
                  onChangeText={setAwayName}
                  onBlur={() => setEditingAway(false)}
                  autoFocus
                  selectTextOnFocus
                />
              ) : (
                <Text style={styles.teamName} numberOfLines={1}>{awayName}</Text>
              )}
              <TouchableOpacity onPress={() => setAwayScore(s => s + 1)}>
                <Text style={styles.scoreText}>{awayScore}</Text>
              </TouchableOpacity>
            </TouchableOpacity>
          </View>

          {/* Timers Row */}
          <View style={styles.timersRow}>
            <View style={styles.mainClockBlock}>
               <Text style={styles.timerLabel}>MATCH CLOCK</Text>
               <Text style={styles.matchClockText}>{formatTime(gameTime)}</Text>
            </View>
            <View style={styles.rotationClockBlock}>
               <Text style={styles.timerLabel}>ROTATION</Text>
               <Text style={styles.rotationClockText}>{formatTime(rotationTime)}</Text>
            </View>
          </View>

          {/* Controls & Formations Row */}
          <View style={styles.controlsRow}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              style={styles.chipsContainer}
              contentContainerStyle={styles.chipsContent}
            >
              {Object.keys(FORMATIONS[format]).map(f => (
                <TouchableOpacity
                  key={f}
                  onPress={() => handleFormationChange(f)}
                  disabled={gameStarted}
                  style={[
                    styles.chip, 
                    formation === f && styles.chipActive,
                    gameStarted && { opacity: 0.3 }
                  ]}
                >
                  <Text style={[styles.chipText, formation === f && styles.chipTextActive]}>{f}</Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.headerActions}>
              <TouchableOpacity
                onPress={isActive ? handleStop : handleStart}
                style={[styles.actionBtn, isActive ? styles.pauseBtn : styles.playBtn]}
              >
                <Icon name={isActive ? "pause" : "play"} size={20} color="white" />
              </TouchableOpacity>
              
              {gameStarted && (
                <TouchableOpacity
                  onPress={handleResetRotation}
                  style={[styles.actionBtn, styles.nextRotationBtn]}
                >
                  <Icon name="refresh" size={20} color="white" />
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>

        {/* ── Field ── */}
        <View
          ref={fieldRef}
          style={styles.field}
          onLayout={() => {
            fieldRef.current?.measure((_x, _y, _w, _h, pageX, pageY) => {
              fieldPageRef.current = { x: pageX, y: pageY };
            });
          }}
        >
          <FieldBackground />

          {(FORMATIONS[format][formation] ?? []).map((pos, index) => {
            const player = assignedPlayers[index];
            const isGK = index === 0;
            const isDraggingThis = draggingSlotIndex === index;
            const isHovered = hoveredSlotIndex === index;
            const showDropTarget = selectedBenchPlayer !== null && !player;
            const isSwapTarget = isHovered && (draggingBenchPlayerId !== null || draggingSlotIndex !== null) && player;

            const panGesture = Gesture.Pan()
              .enabled(player !== null && !isDraggingThis)
              .minDistance(5)
              .activeOffsetX([-10, 10])
              .activeOffsetY([-10, 10])
              .onStart(e => {
                'worklet';
                ghostX.value = e.absoluteX;
                ghostY.value = e.absoluteY;
                isDragging.value = 1;
                runOnJS(onDragStart)(index);
              })
              .onUpdate(e => {
                'worklet';
                ghostX.value = e.absoluteX;
                ghostY.value = e.absoluteY;
                runOnJS(onDragUpdate)(e.absoluteX, e.absoluteY);
              })
              .onEnd(e => {
                'worklet';
                isDragging.value = 0;
                runOnJS(onDragEnd)(e.absoluteX, e.absoluteY);
              })
              .onFinalize((_e, success) => {
                'worklet';
                if (!success) {
                  isDragging.value = 0;
                  runOnJS(cancelDrag)();
                }
              });

            const tapGesture = Gesture.Tap().onEnd(() => {
              'worklet';
              runOnJS(handleSlotTap)(index);
            });

            return (
              <GestureDetector key={`${formation}-${index}`} gesture={Gesture.Race(panGesture, tapGesture)}>
                <View
                  style={[
                    styles.slot,
                    { top: pos.top, left: pos.left },
                    player && !isDraggingThis
                      ? [styles.playerNode, isGK && styles.gkNode]
                      : [styles.emptySlot, isGK && styles.emptyGkSlot],
                    isDraggingThis && styles.slotDragging,
                    showDropTarget && styles.slotDropTarget,
                    isSwapTarget && styles.slotSwapTarget,
                  ]}
                  onLayout={e => {
                    slotLayoutsRef.current[index] = e.nativeEvent.layout;
                  }}
                >
                  {player && !isDraggingThis ? (
                    <>
                      <Text style={styles.nodeInitials}>{getInitials(player.name)}</Text>
                      <Text style={styles.nodeJersey}>#{player.jerseyNumber}</Text>
                    </>
                  ) : (
                    <Text style={styles.emptySlotLabel}>{pos.label}</Text>
                  )}
                </View>
              </GestureDetector>
            );
          })}

          {/* FABs — bottom-right of field */}
          <View style={styles.fabStack}>
            <TouchableOpacity
              style={[styles.fab, styles.fabSub]}
              onPress={() => {
                const formationPositions = FORMATIONS[format][formation] ?? [];
                const slotAssignments: { [k: string]: import('../context/GameContext').SlotAssignment } = {};
                formationPositions.forEach((pos, idx) => {
                  slotAssignments[String(idx)] = {
                    player: assignedPlayers[idx] ?? null,
                    positionLabel: pos.label,
                  };
                });
                setSquad(slotAssignments, unassignedPlayers);
                navigation.navigate('SubstitutionMatrix');
              }}
              accessibilityRole="button"
              accessibilityLabel="Go to substitution screen"
            >
              <Icon name="swap-horizontal" size={18} color="white" />
              <Text style={styles.fabText}>Substitution</Text>
            </TouchableOpacity>

            {!isActive && gameTime === 0 && (
              <TouchableOpacity
                style={styles.fab}
                onPress={() => {
                  const formationPositions = FORMATIONS[format][formation] ?? [];
                  const slotAssignments: { [k: string]: import('../context/GameContext').SlotAssignment } = {};
                  formationPositions.forEach((pos, idx) => {
                    slotAssignments[String(idx)] = {
                      player: assignedPlayers[idx] ?? null,
                      positionLabel: pos.label,
                    };
                  });
                  setSquad(slotAssignments, unassignedPlayers);
                  handleStart();
                  navigation.navigate('SubstitutionMatrix');
                }}
                accessibilityRole="button"
                accessibilityLabel="Start Game"
              >
                <Icon name="play" size={18} color="white" />
                <Text style={styles.fabText}>Start</Text>
              </TouchableOpacity>
            )}
          </View>
        </View>

        {/* ── Bench ── */}
        <View style={styles.bench}>
          <View style={styles.benchHeader}>
            <Text style={styles.benchLabel}>
              {'Bench '}
              <Text style={styles.benchCount}>{unassignedPlayers.length}</Text>
              {'   ·   Field '}
              <Text style={[styles.benchCount, filledCount === playerCount && styles.benchFull]}>
                {filledCount}/{playerCount}
              </Text>
            </Text>
            {!(gameTime > 0 || isActive) && (
              <TouchableOpacity
                onPress={handleClear}
                style={styles.clearBtn}
                accessibilityRole="button"
                accessibilityLabel="Clear all positions"
              >
                <Icon name="refresh-outline" size={14} color={styles.clearBtnText.color} />
                <Text style={styles.clearBtnText}> Clear</Text>
              </TouchableOpacity>
            )}
          </View>
          
          <View style={styles.benchContent}>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              contentContainerStyle={styles.benchScrollContent}
            >
              {unassignedPlayers.length === 0 ? (
                <View style={styles.benchEmpty}>
                  <Text style={styles.benchEmptyText}>✓ All players placed</Text>
                </View>
              ) : (
                <>
                  {/* Ready Players */}
                  {readyPlayers.map(p => renderBenchPlayer(p))}

                  {/* Divider */}
                  {readyPlayers.length > 0 && recoveringPlayers.length > 0 && (
                    <View key="bench-divider-container" style={styles.benchDividerContainer}>
                       <View style={styles.benchDividerLine} />
                       <View style={styles.benchDividerIcon}>
                          <Icon name="swap-vertical-outline" size={12} color={theme.colors.text} />
                       </View>
                       <View style={styles.benchDividerLine} />
                    </View>
                  )}

                  {/* Recovering Players */}
                  {recoveringPlayers.map(p => renderBenchPlayer(p))}
                </>
              )}
            </ScrollView>
            
            {recoveringPlayers.length > 0 && (
              <View style={styles.benchSubLabels}>
                 <View style={styles.benchSubLabelReadyContainer}>
                    <Text style={styles.benchSubLabelReady}>READY</Text>
                    <View style={styles.dotReady} />
                 </View>
                 <View style={{ flex: 1 }} />
                 <View style={styles.benchSubLabelRecoveringContainer}>
                    <View style={styles.dotRecovering} />
                    <Text style={styles.benchSubLabelRecovering}>RECOVERING</Text>
                 </View>
              </View>
            )}
          </View>
        </View>

      </View>

      {/* ── Drag ghost ── */}
      {ghostInfo && (
        <Animated.View
          style={[styles.ghostNode, ghostInfo.isGK && styles.gkNode, ghostAnimStyle]}
          pointerEvents="none"
        >
          <Text style={styles.nodeInitials}>{getInitials(ghostInfo.player.name)}</Text>
          <Text style={styles.nodeJersey}>#{ghostInfo.player.jerseyNumber}</Text>
        </Animated.View>
      )}
    </GestureHandlerRootView>
  );
};

const makeStyles = (t: AppTheme) => StyleSheet.create({
  rootView: { flex: 1 },
  container: { flex: 1, backgroundColor: t.colors.background },

  // ── Command Header
  commandHeader: {
    backgroundColor: t.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
    paddingTop: t.spacing.sm,
  },
  
  // Scoreboard
  scoreboardRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: t.spacing.md,
    marginBottom: t.spacing.xs,
  },
  teamBlock: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: t.colors.background,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: 4,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  teamName: {
    fontSize: 12,
    fontWeight: '800',
    color: t.colors.text,
    opacity: 0.6,
    flex: 1,
    marginRight: 4,
  },
  teamInput: {
    fontSize: 12,
    fontWeight: '800',
    color: t.colors.primary,
    flex: 1,
    padding: 0,
  },
  scoreText: {
    fontSize: 20,
    fontWeight: '900',
    color: t.colors.text,
    minWidth: 24,
    textAlign: 'center',
  },
  scoreDivider: {
    paddingHorizontal: t.spacing.sm,
  },
  scoreDividerText: {
    fontSize: 18,
    color: t.colors.border,
    fontWeight: '300',
  },

  // Timers
  timersRow: {
    flexDirection: 'row',
    paddingHorizontal: t.spacing.md,
    gap: t.spacing.sm,
    marginBottom: t.spacing.xs,
  },
  mainClockBlock: {
    flex: 1.5,
    backgroundColor: t.colors.background,
    borderRadius: 8,
    paddingVertical: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  rotationClockBlock: {
    flex: 1,
    backgroundColor: t.colors.background,
    borderRadius: 8,
    paddingVertical: 4,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: t.colors.primary,
  },
  timerLabel: {
    fontSize: 8,
    fontWeight: '800',
    color: t.colors.text,
    opacity: 0.4,
    letterSpacing: 1,
  },
  matchClockText: {
    fontSize: 22,
    fontWeight: '800',
    color: t.colors.text,
    fontVariant: ['tabular-nums'],
  },
  rotationClockText: {
    fontSize: 22,
    fontWeight: '800',
    color: t.colors.primary,
    fontVariant: ['tabular-nums'],
  },

  // Controls Row
  controlsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingLeft: t.spacing.sm,
    paddingRight: t.spacing.md,
    paddingBottom: t.spacing.sm,
  },
  chipsContainer: {
    flex: 1,
    maxHeight: 40,
  },
  chipsContent: {
    alignItems: 'center',
    gap: 6,
    paddingRight: t.spacing.md,
  },
  headerActions: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
  },
  actionBtn: {
    width: 38,
    height: 38,
    borderRadius: 19,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 3,
  },
  playBtn: { backgroundColor: t.colors.primary },
  pauseBtn: { backgroundColor: t.colors.accent },
  nextRotationBtn: { backgroundColor: '#6366F1' },

  chip: {
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 16,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.background,
  },
  chipActive: {
    backgroundColor: t.colors.primary,
    borderColor: t.colors.primary,
  },
  chipText: {
    fontSize: 11,
    fontWeight: '700',
    color: t.colors.text,
  },
  chipTextActive: { color: '#FFFFFF' },

  // ── Field
  field: {
    flex: 1,
    margin: t.spacing.xs,
    overflow: 'hidden',
    borderRadius: 8,
  },

  // ── Slot circles on the field
  slot: {
    position: 'absolute',
    width: NODE_SIZE,
    height: NODE_SIZE,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Faded placeholder shown at the source slot while the player is being dragged
  slotDragging: {
    opacity: 0.35,
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.6)',
    borderRadius: NODE_SIZE / 2,
    backgroundColor: t.colors.primary,
  },
  // Glows when a bench player is selected and the slot is empty
  slotDropTarget: {
    borderColor: t.colors.accent,
    borderWidth: 2,
    borderRadius: NODE_SIZE / 2,
    backgroundColor: 'rgba(255,193,7,0.25)',
  },
  // Substitution pulse / swap target
  slotSwapTarget: {
    borderColor: '#6366F1', // Indigo
    borderWidth: 3,
    borderRadius: NODE_SIZE / 2,
    backgroundColor: 'rgba(99, 102, 241, 0.3)',
    transform: [{ scale: 1.1 }],
  },

  // Empty slot
  emptySlot: {
    width: 46,
    height: 46,
    borderRadius: 23,
    borderWidth: 1.5,
    borderColor: 'rgba(255,255,255,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.18)',
  },
  emptyGkSlot: {
    borderColor: 'rgba(245,158,11,0.8)',
    backgroundColor: 'rgba(245,158,11,0.15)',
  },
  emptySlotLabel: {
    fontSize: 10,
    fontWeight: 'bold',
    color: 'rgba(255,255,255,0.9)',
    letterSpacing: 0.5,
  },

  // ── Field player nodes
  playerNode: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: t.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    elevation: 5,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.35,
    shadowRadius: 3,
  },
  gkNode: { backgroundColor: '#F59E0B' },
  nodeInitials: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 13,
    lineHeight: 15,
  },
  nodeJersey: {
    color: 'rgba(255,255,255,0.85)',
    fontSize: 9,
    lineHeight: 11,
  },

  // ── Ghost (floating player bubble that follows the finger)
  ghostNode: {
    position: 'absolute',
    left: 0,
    top: 0,
    width: NODE_SIZE,
    height: NODE_SIZE,
    borderRadius: NODE_SIZE / 2,
    backgroundColor: t.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: 'rgba(255,255,255,0.9)',
    elevation: 20,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.4,
    shadowRadius: 6,
    zIndex: 999,
  },

  // ── FABs
  fabStack: {
    position: 'absolute',
    bottom: t.spacing.md,
    right: t.spacing.md,
    flexDirection: 'column',
    alignItems: 'flex-end',
    gap: t.spacing.sm,
  },
  fab: {
    backgroundColor: t.colors.primary,
    borderRadius: 28,
    paddingHorizontal: t.spacing.md,
    paddingVertical: 10,
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    elevation: 8,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  fabSub: {
    backgroundColor: '#6366F1', // indigo — visually distinct from the green Start
  },
  fabText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  },

  // ── Bench
  bench: {
    backgroundColor: t.colors.card,
    borderTopWidth: 1,
    borderTopColor: t.colors.border,
    minHeight: 110,
    paddingBottom: t.spacing.sm,
  },
  benchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: t.spacing.md,
    paddingTop: t.spacing.sm,
    paddingBottom: 4,
  },
  benchLabel: {
    fontSize: 13,
    color: t.colors.text,
    opacity: 0.8,
  },
  benchCount: {
    fontWeight: 'bold',
    color: t.colors.primary,
  },
  benchFull: { color: '#15803d' },
  clearBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    paddingHorizontal: 6,
  },
  clearBtnText: {
    fontSize: 12,
    color: t.colors.border,
  },
  benchContent: {
    flex: 1,
  },
  benchScrollContent: {
    paddingHorizontal: t.spacing.sm,
    paddingVertical: 4,
    alignItems: 'center',
  },
  benchNode: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: t.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: t.colors.primary,
    marginHorizontal: 4,
    elevation: 2,
  },
  benchNodeSelected: {
    backgroundColor: t.colors.accent,
    borderColor: t.colors.primary,
    borderWidth: 3,
    transform: [{ scale: 1.12 }],
  },
  benchNodeRecovering: {
    borderColor: t.colors.border,
    backgroundColor: t.colors.background,
    opacity: 0.6,
    elevation: 0,
  },
  benchInitials: {
    color: t.colors.primary,
    fontWeight: 'bold',
    fontSize: 13,
    lineHeight: 15,
  },
  benchInitialsRecovering: {
    color: t.colors.text,
    opacity: 0.6,
  },
  benchJersey: {
    color: t.colors.text,
    fontSize: 9,
    lineHeight: 11,
    opacity: 0.6,
  },
  recoveringBadge: {
    position: 'absolute',
    bottom: -2,
    right: -2,
    backgroundColor: t.colors.card,
    borderRadius: 6,
    padding: 1,
    borderWidth: 1,
    borderColor: t.colors.border,
  },
  benchDividerContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: 12,
    height: 50,
  },
  benchDividerLine: {
    width: 1.5,
    flex: 1,
    backgroundColor: t.colors.border,
    opacity: 0.5,
    borderRadius: 1,
  },
  benchDividerIcon: {
    paddingVertical: 4,
    opacity: 0.4,
  },
  benchSubLabels: {
    flexDirection: 'row',
    paddingHorizontal: t.spacing.md,
    marginTop: -4,
    paddingBottom: 2,
    alignItems: 'center',
  },
  benchSubLabelReadyContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  benchSubLabelRecoveringContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  dotReady: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: t.colors.primary,
  },
  dotRecovering: {
    width: 4,
    height: 4,
    borderRadius: 2,
    backgroundColor: t.colors.text,
    opacity: 0.3,
  },
  benchSubLabelReady: {
    fontSize: 10,
    fontWeight: '800',
    color: t.colors.primary,
    opacity: 0.8,
    letterSpacing: 1.2,
  },
  benchSubLabelRecovering: {
    fontSize: 10,
    fontWeight: '800',
    color: t.colors.text,
    opacity: 0.4,
    letterSpacing: 1.2,
  },
  benchEmpty: {
    height: 50,
    paddingHorizontal: t.spacing.md,
    justifyContent: 'center',
  },
  benchEmptyText: {
    fontSize: 13,
    color: '#15803d',
    fontStyle: 'italic',
  },
});

export default TacticsBoardScreen;

