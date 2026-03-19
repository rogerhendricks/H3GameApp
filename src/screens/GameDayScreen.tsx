import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Player } from '../models/Player';
import { getPlayers } from '../database';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { GameFormat } from './TacticsBoardScreen';

const GAME_FORMATS: { label: string; value: GameFormat; count: number }[] = [
  { label: '11v11', value: '11v11', count: 11 },
  { label: '9v9',   value: '9v9',   count: 9  },
  { label: '7v7',   value: '7v7',   count: 7  },
];

type GameFlowStackParamList = {
  GameDay: undefined;
  TacticsBoard: { activePlayers: string[]; format: GameFormat };
  SubstitutionMatrix: {
    assignedPlayers: { [positionIndex: string]: Player | null };
    unassignedPlayers: Player[];
  };
};

type GameDayScreenNavigationProp = NativeStackNavigationProp<GameFlowStackParamList, 'GameDay'>;

// ── Defined outside the component so it is never recreated on re-render ──
const EmptyRoster = () => (
  <View style={styles.emptyContainer}>
    <Icon name="people-outline" size={52} color={theme.colors.border} />
    <Text style={styles.emptyText}>No players on the roster</Text>
    <Text style={styles.emptySubText}>Go to the Roster tab to add players first.</Text>
  </View>
);

const GameDayScreen = () => {
  const navigation = useNavigation<GameDayScreenNavigationProp>();
  const [roster, setRoster] = useState<Player[]>([]);
  const [activePlayers, setActivePlayers] = useState<string[]>([]);
  const [format, setFormat] = useState<GameFormat>('11v11');

  const loadRoster = useCallback(async () => {
    const players = await getPlayers();
    setRoster(players);
    // Bug fix: reset selection on every focus so stale IDs from a
    // previous session can't reference deleted players.
    setActivePlayers([]);
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadRoster();
    });
    return unsubscribe;
  }, [navigation, loadRoster]);

  const togglePlayerActive = (id: string) => {
    setActivePlayers(prev =>
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id],
    );
  };

  const selectAll = () => setActivePlayers(roster.map(p => p.id));
  const clearAll = () => setActivePlayers([]);

  const allSelected = roster.length > 0 && activePlayers.length === roster.length;
  const canProceed = activePlayers.length > 0;

  return (
    <View style={styles.container}>

      {/* ── Header ── */}
      <View style={styles.header}>
        <View>
          <Text style={styles.sectionLabel}>Game Day</Text>
          <Text style={styles.title}>Select Squad</Text>
        </View>
        {roster.length > 0 && (
          <TouchableOpacity
            onPress={allSelected ? clearAll : selectAll}
            style={styles.selectAllBtn}
            accessibilityRole="button"
            accessibilityLabel={allSelected ? 'Deselect all players' : 'Select all players'}
          >
            <Text style={styles.selectAllText}>
              {allSelected ? 'Clear All' : 'Select All'}
            </Text>
          </TouchableOpacity>
        )}
      </View>

      {/* ── Format Selector ── */}
      <View style={styles.formatRow}>
        <Text style={styles.formatLabel}>Format</Text>
        <View style={styles.formatChips}>
          {GAME_FORMATS.map(f => (
            <TouchableOpacity
              key={f.value}
              onPress={() => setFormat(f.value)}
              style={[styles.formatChip, format === f.value && styles.formatChipActive]}
              accessibilityRole="button"
              accessibilityLabel={`Select ${f.label} format, ${f.count} players per side`}
            >
              <Text style={[styles.formatChipText, format === f.value && styles.formatChipTextActive]}>
                {f.label}
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      </View>

      {/* ── Helper text ── */}
      {roster.length > 0 && (
        <Text style={styles.helperText}>
          Tap players who are available today.{' '}
          <Text style={styles.helperCount}>
            {activePlayers.length}/{roster.length} selected
          </Text>
        </Text>
      )}

      {/* ── Player List ── */}
      <FlatList
        data={roster}
        keyExtractor={item => item.id}
        ListEmptyComponent={EmptyRoster}
        keyboardShouldPersistTaps="handled"
        contentContainerStyle={styles.listContent}
        renderItem={({ item, index }) => {
          const isActive = activePlayers.includes(item.id);
          return (
            <TouchableOpacity
              style={[
                styles.playerItem,
                isActive && styles.activePlayer,
                index === 0 && styles.playerItemFirst,
                index === roster.length - 1 && styles.playerItemLast,
              ]}
              onPress={() => togglePlayerActive(item.id)}
              accessibilityRole="checkbox"
              accessibilityLabel={`${item.name}, ${item.primaryPosition}`}
              accessibilityState={{ checked: isActive }}
            >
              {/* Jersey badge */}
              <View style={[styles.jerseyBadge, isActive && styles.jerseyBadgeActive]}>
                <Text style={[styles.jerseyBadgeText, isActive && styles.jerseyBadgeTextActive]}>
                  #{item.jerseyNumber}
                </Text>
              </View>

              {/* Name + position */}
              <View style={styles.playerInfo}>
                <Text style={[styles.playerName, isActive && styles.playerNameActive]}>
                  {item.name}
                </Text>
                <Text style={[styles.playerPosition, isActive && styles.playerPositionActive]}>
                  {item.primaryPosition}
                  {item.secondaryPosition ? ` · ${item.secondaryPosition}` : ''}
                </Text>
              </View>

              {/* Checkmark */}
              <Icon
                name={isActive ? 'checkmark-circle' : 'ellipse-outline'}
                size={24}
                color={isActive ? '#FFFFFF' : theme.colors.border}
              />
            </TouchableOpacity>
          );
        }}
      />

      {/* ── Footer ── */}
      <View style={styles.footer}>
        {!canProceed && roster.length > 0 && (
          <Text style={styles.footerHint}>Select at least one player to continue.</Text>
        )}
        <TouchableOpacity
          style={[styles.proceedButton, !canProceed && styles.proceedButtonDisabled]}
          onPress={() => navigation.navigate('TacticsBoard', { activePlayers, format })}
          disabled={!canProceed}
          accessibilityRole="button"
          accessibilityLabel={`Go to tactics board with ${activePlayers.length} players`}
        >
          <Icon
            name="american-football-outline"
            size={18}
            color={canProceed ? '#FFFFFF' : theme.colors.card}
          />
          <Text style={[styles.proceedButtonText, !canProceed && styles.proceedButtonTextDisabled]}>
            {canProceed
              ? `Tactics Board  ·  ${activePlayers.length} player${activePlayers.length === 1 ? '' : 's'}`
              : 'Tactics Board'}
          </Text>
        </TouchableOpacity>
      </View>

    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: theme.colors.background,
  },

  // ── Header
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingHorizontal: theme.spacing.md,
    paddingTop: theme.spacing.md,
    paddingBottom: theme.spacing.xs,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
    opacity: 0.45,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
  },
  title: {
    fontSize: 26,
    fontWeight: '700',
    color: theme.colors.text,
  },
  selectAllBtn: {
    paddingVertical: 6,
    paddingHorizontal: 10,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: theme.colors.primary,
  },
  selectAllText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.primary,
  },

  helperText: {
    fontSize: 13,
    color: theme.colors.text,
    opacity: 0.55,
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },
  helperCount: {
    fontWeight: '700',
    opacity: 1,
    color: theme.colors.primary,
  },

  // ── List
  listContent: {
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
  },

  playerItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.card,
    paddingVertical: theme.spacing.sm,
    paddingHorizontal: theme.spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: theme.colors.border,
  },
  playerItemFirst: {
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  playerItemLast: {
    borderBottomWidth: 0,
    borderBottomLeftRadius: 12,
    borderBottomRightRadius: 12,
  },
  activePlayer: {
    backgroundColor: theme.colors.primary,
    borderBottomColor: 'rgba(255,255,255,0.15)',
  },

  // Jersey badge
  jerseyBadge: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: theme.colors.background,
    borderWidth: 1.5,
    borderColor: theme.colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: theme.spacing.sm,
  },
  jerseyBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.2)',
    borderColor: 'rgba(255,255,255,0.6)',
  },
  jerseyBadgeText: {
    fontSize: 11,
    fontWeight: '700',
    color: theme.colors.primary,
  },
  jerseyBadgeTextActive: {
    color: '#FFFFFF',
  },

  playerInfo: {
    flex: 1,
  },
  playerName: {
    fontSize: 15,
    fontWeight: '600',
    color: theme.colors.text,
  },
  playerNameActive: {
    color: '#FFFFFF',
  },
  playerPosition: {
    fontSize: 13,
    color: theme.colors.text,
    opacity: 0.55,
    marginTop: 1,
  },
  playerPositionActive: {
    color: 'rgba(255,255,255,0.8)',
    opacity: 1,
  },

  // ── Empty state
  emptyContainer: {
    alignItems: 'center',
    marginTop: theme.spacing.xl,
    paddingHorizontal: theme.spacing.lg,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '700',
    color: theme.colors.text,
    marginTop: theme.spacing.md,
  },
  emptySubText: {
    fontSize: 14,
    color: theme.colors.text,
    opacity: 0.5,
    marginTop: theme.spacing.xs,
    textAlign: 'center',
  },

  // ── Footer
  footer: {
    padding: theme.spacing.md,
    paddingTop: theme.spacing.sm,
    backgroundColor: theme.colors.background,
  },
  footerHint: {
    fontSize: 12,
    color: theme.colors.text,
    opacity: 0.45,
    textAlign: 'center',
    marginBottom: theme.spacing.xs,
  },
  proceedButton: {
    backgroundColor: theme.colors.primary,
    paddingVertical: 14,
    paddingHorizontal: theme.spacing.md,
    borderRadius: 12,
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: theme.spacing.sm,
    elevation: 4,
    shadowColor: theme.colors.primary,
    shadowOffset: { width: 0, height: 3 },
    shadowOpacity: 0.3,
    shadowRadius: 5,
  },
  proceedButtonDisabled: {
    backgroundColor: theme.colors.border,
    elevation: 0,
    shadowOpacity: 0,
  },
  proceedButtonText: {
    fontSize: 16,
    fontWeight: '700',
    color: '#FFFFFF',
  },
  proceedButtonTextDisabled: {
    color: theme.colors.card,
  },

  // ── Format selector
  formatRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.md,
    paddingBottom: theme.spacing.sm,
    gap: theme.spacing.sm,
  },
  formatLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
    opacity: 0.45,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    minWidth: 48,
  },
  formatChips: {
    flexDirection: 'row',
    gap: theme.spacing.xs,
  },
  formatChip: {
    paddingHorizontal: 16,
    paddingVertical: 7,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: theme.colors.border,
    backgroundColor: theme.colors.background,
  },
  formatChipActive: {
    backgroundColor: theme.colors.primary,
    borderColor: theme.colors.primary,
  },
  formatChipText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.text,
  },
  formatChipTextActive: {
    color: '#FFFFFF',
  },
});

export default GameDayScreen;

