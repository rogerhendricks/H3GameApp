import React, { useState, useEffect, useCallback, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { GestureHandlerRootView, GestureDetector, Gesture } from 'react-native-gesture-handler';
import Animated, { useSharedValue, useAnimatedStyle, runOnJS } from 'react-native-reanimated';

import { Player } from '../models/Player';
import { getPlayers } from '../database';
import { theme } from '../theme';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import FieldBackground from '../components/FieldBackground';
import Icon from 'react-native-vector-icons/Ionicons';

// ── Exported so GameDayScreen can type the navigation param correctly ──
export type GameFormat = '11v11' | '9v9' | '7v7';

type GameFlowStackParamList = {
  GameDay: undefined;
  TacticsBoard: { activePlayers: string[]; format: GameFormat };
  SubstitutionMatrix: {
    assignedPlayers: { [positionIndex: string]: Player | null };
    unassignedPlayers: Player[];
  };
};

type TacticsBoardScreenRouteProp = RouteProp<GameFlowStackParamList, 'TacticsBoard'>;
type TacticsBoardScreenNavigationProp = NativeStackNavigationProp<GameFlowStackParamList, 'TacticsBoard'>;

type Props = {
  route: TacticsBoardScreenRouteProp;
};

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

  // ── Shared values (readable on the UI thread) ──
  const ghostX = useSharedValue(0);
  const ghostY = useSharedValue(0);
  const isDragging = useSharedValue(0);
  const rootOffsetY = useSharedValue(0);

  // ── JS-thread refs ──
  const fieldRef = useRef<View>(null);
  const rootRef = useRef<View>(null);
  const fieldPageRef = useRef({ x: 0, y: 0 });
  const slotLayoutsRef = useRef<SlotLayout[]>([]);
  const dragSourceIndexRef = useRef<number | null>(null);
  // Mirrors of state kept in refs so stable callbacks can always read current values
  const assignedPlayersRef = useRef(assignedPlayers);
  const unassignedPlayersRef = useRef(unassignedPlayers);
  const selectedBenchPlayerRef = useRef(selectedBenchPlayer);
  useEffect(() => { assignedPlayersRef.current = assignedPlayers; }, [assignedPlayers]);
  useEffect(() => { unassignedPlayersRef.current = unassignedPlayers; }, [unassignedPlayers]);
  useEffect(() => { selectedBenchPlayerRef.current = selectedBenchPlayer; }, [selectedBenchPlayer]);

  // ── Load players ──
  const loadPlayers = useCallback(async () => {
    const allPlayers = await getPlayers();
    const active = allPlayers.filter(p => activePlayerIds.includes(p.id));
    setPlayers(active);
    setUnassignedPlayers(active);
  }, [activePlayerIds]);

  useEffect(() => { loadPlayers(); }, [loadPlayers]);

  // ── Formation change resets all assignments ──
  const handleFormationChange = (value: string) => {
    setFormation(value);
    setAssignedPlayers(Object.fromEntries(Array(playerCount).fill(0).map((_, i) => [i, null])));
    setUnassignedPlayers(players);
    setSelectedBenchPlayer(null);
    setDraggingSlotIndex(null);
    slotLayoutsRef.current = [];
  };

  const handleClear = () => {
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
    const benchPlayer = selectedBenchPlayerRef.current;
    if (!benchPlayer) return;
    const displaced = assignedPlayersRef.current[slotIndex];
    setAssignedPlayers(prev => { const n = { ...prev }; n[slotIndex] = benchPlayer; return n; });
    setUnassignedPlayers(prev => {
      const filtered = prev.filter(p => p.id !== benchPlayer.id);
      return displaced ? [...filtered, displaced] : filtered;
    });
    setSelectedBenchPlayer(null);
  }, []);

  // ── Drag start — called from worklet via runOnJS ──
  const onDragStart = useCallback((slotIndex: number) => {
    const player = assignedPlayersRef.current[slotIndex];
    if (!player) return;
    dragSourceIndexRef.current = slotIndex;
    setGhostInfo({ player, isGK: slotIndex === 0 });
    setDraggingSlotIndex(slotIndex);
    setSelectedBenchPlayer(null);
  }, []);

  // ── Drag end — called from worklet via runOnJS ──
  const onDragEnd = useCallback((screenX: number, screenY: number) => {
    const sourceIndex = dragSourceIndexRef.current;
    const droppedPlayer = sourceIndex !== null ? assignedPlayersRef.current[sourceIndex] : null;
    dragSourceIndexRef.current = null;
    setGhostInfo(null);
    setDraggingSlotIndex(null);
    if (!droppedPlayer || sourceIndex === null) return;

    // Hit-test the final touch position against stored slot bounds
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

    const current = assignedPlayersRef.current;
    const newAssigned = { ...current };
    const newUnassigned = [...unassignedPlayersRef.current].filter(p => p.id !== droppedPlayer.id);
    newAssigned[sourceIndex] = null;

    if (targetIndex !== null && targetIndex !== sourceIndex) {
      const displaced = current[targetIndex];
      if (displaced) {
        newAssigned[sourceIndex] = displaced; // swap displaced back to source
      }
      newAssigned[targetIndex] = droppedPlayer;
      setAssignedPlayers(newAssigned);
      setUnassignedPlayers(newUnassigned);
    } else if (targetIndex === sourceIndex) {
      newAssigned[sourceIndex] = droppedPlayer; // dropped back on own slot
      setAssignedPlayers(newAssigned);
    } else {
      // Missed all slots → return to bench
      setAssignedPlayers(newAssigned);
      setUnassignedPlayers([...newUnassigned, droppedPlayer]);
    }
  }, []);

  // ── Cancel drag (gesture interrupted) ──
  const cancelDrag = useCallback(() => {
    dragSourceIndexRef.current = null;
    setGhostInfo(null);
    setDraggingSlotIndex(null);
  }, []);

  // ── Ghost animated style ──
  const ghostAnimStyle = useAnimatedStyle(() => ({
    opacity: isDragging.value,
    transform: [
      { translateX: ghostX.value - NODE_SIZE / 2 },
      { translateY: ghostY.value - NODE_SIZE / 2 - rootOffsetY.value },
    ],
  }));

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase();

  const filledCount = Object.values(assignedPlayers).filter(p => p !== null).length;

  return (
    <GestureHandlerRootView style={styles.rootView}>
      <View
        ref={rootRef}
        style={styles.container}
        onLayout={() => {
          rootRef.current?.measure((_x, _y, _w, _h, _px, pageY) => {
            rootOffsetY.value = pageY;
          });
        }}
      >

        {/* ── Formation Chips ── */}
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
              style={[styles.chip, formation === f && styles.chipActive]}
              accessibilityRole="button"
              accessibilityLabel={`Select ${f} formation`}
            >
              <Text style={[styles.chipText, formation === f && styles.chipTextActive]}>{f}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>

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
            const showDropTarget = selectedBenchPlayer !== null && !player;

            const panGesture = Gesture.Pan()
              .enabled(player !== null && !isDraggingThis)
              .minDistance(10)
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

          {/* Start Game FAB — bottom-right of field */}
          <TouchableOpacity
            style={styles.fab}
            onPress={() => navigation.navigate('SubstitutionMatrix', { assignedPlayers, unassignedPlayers })}
            accessibilityRole="button"
            accessibilityLabel="Start Game"
          >
            <Icon name="play" size={18} color="white" />
            <Text style={styles.fabText}>Start</Text>
          </TouchableOpacity>
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
            <TouchableOpacity
              onPress={handleClear}
              style={styles.clearBtn}
              accessibilityRole="button"
              accessibilityLabel="Clear all positions"
            >
              <Icon name="refresh-outline" size={14} color={theme.colors.border} />
              <Text style={styles.clearBtnText}> Clear</Text>
            </TouchableOpacity>
          </View>
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
              unassignedPlayers.map(p => (
                <TouchableOpacity
                  key={p.id}
                  onPress={() => handleBenchPlayerTap(p)}
                  style={[
                    styles.benchNode,
                    selectedBenchPlayer?.id === p.id && styles.benchNodeSelected,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`Select ${p.name}`}
                >
                  <Text style={styles.benchInitials}>{getInitials(p.name)}</Text>
                  <Text style={styles.benchJersey}>#{p.jerseyNumber}</Text>
                </TouchableOpacity>
              ))
            )}
          </ScrollView>
        </View>

      </View>

      {/* ── Drag ghost — rendered outside container so it floats over everything ── */}
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

const styles = StyleSheet.create({
  rootView: { flex: 1 },
  container: { flex: 1, backgroundColor: theme.colors.background },

  // ── Formation chips
  chipsContainer: {
    maxHeight: 50,
    backgroundColor: theme.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  chipsContent: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: theme.spacing.sm,
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  chipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  chipTextActive: { color: '#FFFFFF' },

  // ── Field
  field: {
    flex: 1,
    margin: theme.spacing.sm,
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
    backgroundColor: theme.colors.primary,
  },
  // Glows when a bench player is selected and the slot is empty
  slotDropTarget: {
    borderColor: theme.colors.accent,
    borderWidth: 2,
    borderRadius: NODE_SIZE / 2,
    backgroundColor: 'rgba(255,193,7,0.25)',
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
    backgroundColor: theme.colors.primary,
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
    backgroundColor: theme.colors.primary,
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

  // ── FAB
  fab: {
    position: 'absolute',
    bottom: theme.spacing.md,
    right: theme.spacing.md,
    backgroundColor: theme.colors.primary,
    borderRadius: 28,
    paddingHorizontal: theme.spacing.md,
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
  fabText: {
    color: 'white',
    fontWeight: 'bold',
    fontSize: 15,
  },

  // ── Bench
  bench: {
    backgroundColor: theme.colors.card,
    borderTopWidth: 1,
    borderTopColor: theme.colors.border,
    minHeight: 90,
    paddingBottom: theme.spacing.sm,
  },
  benchHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    paddingBottom: 4,
  },
  benchLabel: {
    fontSize: 13,
    color: theme.colors.text,
    opacity: 0.8,
  },
  benchCount: {
    fontWeight: 'bold',
    color: theme.colors.primary,
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
    color: theme.colors.border,
  },
  benchScrollContent: {
    paddingHorizontal: theme.spacing.sm,
    paddingVertical: 4,
    alignItems: 'center',
  },
  // Outlined style (white bg, blue border) to visually differ from filled field nodes
  benchNode: {
    width: 50,
    height: 50,
    borderRadius: 25,
    backgroundColor: theme.colors.card,
    justifyContent: 'center',
    alignItems: 'center',
    borderWidth: 2,
    borderColor: theme.colors.primary,
    marginHorizontal: 4,
    elevation: 2,
  },
  // Selected bench player gets an accent ring + slight scale
  benchNodeSelected: {
    backgroundColor: theme.colors.accent,
    borderColor: theme.colors.primary,
    borderWidth: 3,
    transform: [{ scale: 1.12 }],
  },
  benchInitials: {
    color: theme.colors.primary,
    fontWeight: 'bold',
    fontSize: 13,
    lineHeight: 15,
  },
  benchJersey: {
    color: theme.colors.text,
    fontSize: 9,
    lineHeight: 11,
    opacity: 0.6,
  },
  benchEmpty: {
    height: 50,
    paddingHorizontal: theme.spacing.md,
    justifyContent: 'center',
  },
  benchEmptyText: {
    fontSize: 13,
    color: '#15803d',
    fontStyle: 'italic',
  },
});

export default TacticsBoardScreen;

