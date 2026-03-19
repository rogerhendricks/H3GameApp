import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DraxProvider, DraxView, DraxList } from 'react-native-drax';
import Animated, { Layout } from 'react-native-reanimated';
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
  const [formation, setFormation] = useState<string>(DEFAULT_FORMATION[format]);
  const [players, setPlayers] = useState<Player[]>([]);
  const [assignedPlayers, setAssignedPlayers] = useState<{ [positionIndex: number]: Player | null }>(
    Object.fromEntries(Array(playerCount).fill(0).map((_, i) => [i, null]))
  );
  const [unassignedPlayers, setUnassignedPlayers] = useState<Player[]>([]);

  const loadPlayers = useCallback(async () => {
    const allPlayers = await getPlayers();
    const active = allPlayers.filter(p => activePlayerIds.includes(p.id));
    setPlayers(active);
    setUnassignedPlayers(active);
  }, [activePlayerIds]);

  useEffect(() => {
    loadPlayers();
  }, [loadPlayers]);

  // Bug fix: reset all assignments when the formation changes so no ghost players remain.
  const handleFormationChange = (value: string) => {
    setFormation(value);
    setAssignedPlayers(Object.fromEntries(Array(playerCount).fill(0).map((_, i) => [i, null])));
    setUnassignedPlayers(players);
  };

  const handleClear = () => {
    setAssignedPlayers(Object.fromEntries(Array(playerCount).fill(0).map((_, i) => [i, null])));
    setUnassignedPlayers(players);
  };

  // Bug fix: use a single synchronous state build instead of multiple setState calls
  // that could race with each other.
  const handleDrop = (event: any, targetPositionIndex: number | null) => {
    const droppedPlayer = event.dragged.payload as Player | null;
    if (!droppedPlayer) return;

    const sourcePositionIndex = Object.entries(assignedPlayers).find(
      ([, player]) => player?.id === droppedPlayer.id,
    )?.[0];

    const newAssigned = { ...assignedPlayers };
    let newUnassigned = [...unassignedPlayers].filter(p => p.id !== droppedPlayer.id);

    if (sourcePositionIndex !== undefined) {
      newAssigned[parseInt(sourcePositionIndex, 10)] = null;
    }

    if (targetPositionIndex !== null) {
      const playerAtTarget = newAssigned[targetPositionIndex];
      if (playerAtTarget) {
        // Swap: displace the player already in the target slot
        if (sourcePositionIndex !== undefined) {
          newAssigned[parseInt(sourcePositionIndex, 10)] = playerAtTarget;
        } else {
          newUnassigned = [...newUnassigned, playerAtTarget];
        }
      }
      newAssigned[targetPositionIndex] = droppedPlayer;
    } else {
      newUnassigned = [...newUnassigned, droppedPlayer];
    }

    setAssignedPlayers(newAssigned);
    setUnassignedPlayers(newUnassigned);
  };

  const getInitials = (name: string) =>
    name.split(' ').map(n => n[0]).join('').toUpperCase();

  const filledCount = Object.values(assignedPlayers).filter(p => p !== null).length;

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DraxProvider>
        <View style={styles.container}>

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
          <View style={styles.field}>
            <FieldBackground />

            {(FORMATIONS[format][formation] ?? []).map((pos, index) => {
              const player = assignedPlayers[index];
              const isGK = index === 0;
              return (
                <DraxView
                  key={`${formation}-${index}`}
                  style={[styles.dropZone, { top: pos.top, left: pos.left }]}
                  receivingStyle={styles.dropZoneReceiving}
                  payload={player}
                  onReceiveDragDrop={e => handleDrop(e, index)}
                >
                  {player ? (
                    <Animated.View layout={Layout.springify()}>
                      <DraxView payload={player} style={[styles.playerNode, isGK && styles.gkNode]}>
                        <Text style={styles.nodeInitials}>{getInitials(player.name)}</Text>
                        <Text style={styles.nodeJersey}>#{player.jerseyNumber}</Text>
                      </DraxView>
                    </Animated.View>
                  ) : (
                    <View style={[styles.emptySlot, isGK && styles.emptyGkSlot]}>
                      <Text style={styles.emptySlotLabel}>{pos.label}</Text>
                    </View>
                  )}
                </DraxView>
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
          <DraxView style={styles.bench} onReceiveDragDrop={e => handleDrop(e, null)}>
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
            <DraxList
              data={unassignedPlayers}
              keyExtractor={item => item.id}
              renderItemContent={({ item }) => (
                <Animated.View layout={Layout.springify()}>
                  <DraxView payload={item} style={styles.benchNode}>
                    <Text style={styles.benchInitials}>{getInitials(item.name)}</Text>
                    <Text style={styles.benchJersey}>#{item.jerseyNumber}</Text>
                  </DraxView>
                </Animated.View>
              )}
              horizontal
              ListEmptyComponent={
                <View style={styles.benchEmpty}>
                  <Text style={styles.benchEmptyText}>✓ All players placed</Text>
                </View>
              }
            />
          </DraxView>

        </View>
      </DraxProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
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

  // ── Drop zones
  dropZone: {
    position: 'absolute',
    width: 52,
    height: 52,
    borderRadius: 26,
    justifyContent: 'center',
    alignItems: 'center',
  },
  // Glow effect when a player is dragged over a slot
  dropZoneReceiving: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderWidth: 2,
    borderColor: theme.colors.accent,
    borderRadius: 26,
  },

  // Empty slot — visible dashed circle with role label
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
  // GK empty slot uses amber tint to match the GK node
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
  // Goalkeeper is amber/gold — universal convention
  gkNode: {
    backgroundColor: '#F59E0B',
  },
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
  // Turns green when the full 11 are on the field
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

  // Bench nodes — outlined (white bg, blue border) to visually differ from field nodes
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

