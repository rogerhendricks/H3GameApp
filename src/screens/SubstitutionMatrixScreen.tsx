import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
} from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { AppTheme } from '../theme';
import { useGame } from '../context/GameContext';
import { Player } from '../models/Player';

// ── Layout constants ───────────────────────────────────────────────────────────
const PLAYER_NAME_COL_WIDTH = 120;
const STATUS_BLOCK_SIZE = 28;

const SubstitutionMatrixScreen = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const {
    gameTime,
    timerInterval,
    displayInterval,
    intervalLabels,
    assignedPlayers,
    unassignedPlayers,
    playerStatus,
    homeScore,
    awayScore,
    homeName,
    awayName,
  } = useGame();

  // ── Derived Data ───────────────────────────────────────────────────────────
  const allPlayers = useMemo(() => {
    const onField = Object.values(assignedPlayers)
      .map(s => s.player)
      .filter((p): p is Player => p !== null);
    const combined = [...onField, ...unassignedPlayers];
    const seen = new Set<string>();
    return combined.filter(p => {
      if (seen.has(p.id)) return false;
      seen.add(p.id);
      return true;
    });
  }, [assignedPlayers, unassignedPlayers]);

  const getPlayMinutes = (playerId: string) =>
    (playerStatus[playerId]?.filter(s => s === 'on').length ?? 0) *
    (timerInterval / 60);

  const sortedPlayers = useMemo(() => 
    [...allPlayers].sort((a, b) => getPlayMinutes(b.id) - getPlayMinutes(a.id)),
    [allPlayers, playerStatus, timerInterval]
  );

  const formatTime = (time: number) => {
    const m = Math.floor(time / 60);
    const s = time % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  return (
    <View style={styles.container}>
      {/* ── Summary Header ── */}
      <View style={styles.header}>
        <View style={styles.scoreSummary}>
           <Text style={styles.scoreText}>{homeName} {homeScore} - {awayScore} {awayName}</Text>
           <Text style={styles.matchTimeText}>Match Time: {formatTime(gameTime)}</Text>
        </View>
      </View>

      <ScrollView contentContainerStyle={styles.contentScroll}>
        
        {/* ── Playtime Analytics ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
             <Icon name="stats-chart-outline" size={18} color={theme.colors.primary} />
             <Text style={styles.sectionTitle}>PLAYTIME LEADERBOARD</Text>
          </View>
          {sortedPlayers.map((player, index) => (
            <View key={player.id} style={[styles.statsRow, index % 2 === 1 && styles.alternatingRow]}>
               <Text style={styles.statsName}>{player.name}</Text>
               <View style={styles.progressTrack}>
                  <View style={[styles.progressBar, { width: `${Math.min(100, (getPlayMinutes(player.id) / 90) * 100)}%` }]} />
               </View>
               <Text style={styles.statsMinutes}>{getPlayMinutes(player.id)}'</Text>
            </View>
          ))}
        </View>

        {/* ── Visual Match Timeline (Read Only) ── */}
        <View style={styles.section}>
          <View style={styles.sectionHeader}>
             <Icon name="calendar-outline" size={18} color={theme.colors.primary} />
             <Text style={styles.sectionTitle}>MATCH TIMELINE</Text>
          </View>
          
          <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.matrixScroll}>
            <View>
              {/* Labels Row */}
              <View style={styles.matrixHeaderRow}>
                <View style={{ width: PLAYER_NAME_COL_WIDTH }} />
                {intervalLabels.map((label, idx) => (
                  <Text key={idx} style={[styles.intervalLabel, idx === displayInterval && styles.activeIntervalLabel]}>
                    {label}
                  </Text>
                ))}
              </View>

              {/* Matrix Rows */}
              {allPlayers.map((player, pIdx) => (
                <View key={player.id} style={[styles.matrixRow, pIdx % 2 === 1 && styles.alternatingRow]}>
                  <Text style={styles.matrixName} numberOfLines={1}>{player.name}</Text>
                  <View style={styles.statusRow}>
                    {(playerStatus[player.id] ?? []).map((status, sIdx) => (
                      <View 
                        key={sIdx} 
                        style={[
                          styles.statusBlock, 
                          status === 'on' ? styles.statusOn : styles.statusOff,
                          sIdx === displayInterval && styles.activeStatusBlock
                        ]}
                      />
                    ))}
                  </View>
                </View>
              ))}
            </View>
          </ScrollView>
        </View>

      </ScrollView>
    </View>
  );
};

const makeStyles = (t: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.background },
  header: {
    padding: t.spacing.md,
    backgroundColor: t.colors.card,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
  },
  scoreSummary: { alignItems: 'center' },
  scoreText: { fontSize: 20, fontWeight: '900', color: t.colors.text, letterSpacing: 1 },
  matchTimeText: { fontSize: 12, color: t.colors.text, opacity: 0.5, marginTop: 4, fontWeight: '700' },
  
  contentScroll: { paddingBottom: t.spacing.xl },
  
  section: {
    marginTop: t.spacing.md,
    backgroundColor: t.colors.card,
    marginHorizontal: t.spacing.sm,
    borderRadius: 12,
    padding: t.spacing.sm,
    elevation: 2,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: t.spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: t.colors.border,
    paddingBottom: 8,
  },
  sectionTitle: {
    fontSize: 11,
    fontWeight: '800',
    color: t.colors.text,
    opacity: 0.6,
    letterSpacing: 1.5,
  },

  // Stats
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 4,
    borderRadius: 6,
  },
  alternatingRow: { backgroundColor: t.colors.background },
  statsName: { fontSize: 13, fontWeight: '600', color: t.colors.text, width: 100 },
  progressTrack: {
    flex: 1,
    height: 6,
    backgroundColor: t.colors.border,
    borderRadius: 3,
    marginHorizontal: t.spacing.sm,
    overflow: 'hidden',
  },
  progressBar: { height: '100%', backgroundColor: t.colors.primary },
  statsMinutes: { fontSize: 13, fontWeight: '800', color: t.colors.primary, width: 30, textAlign: 'right' },

  // Matrix
  matrixScroll: { marginTop: 4 },
  matrixHeaderRow: { flexDirection: 'row', marginBottom: 8 },
  intervalLabel: {
    width: STATUS_BLOCK_SIZE + 4,
    textAlign: 'center',
    fontSize: 10,
    color: t.colors.text,
    opacity: 0.4,
    fontWeight: '700',
  },
  activeIntervalLabel: { color: t.colors.primary, opacity: 1 },
  matrixRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 4, paddingHorizontal: 4, borderRadius: 6 },
  matrixName: { width: PLAYER_NAME_COL_WIDTH, fontSize: 12, color: t.colors.text, fontWeight: '500' },
  statusRow: { flexDirection: 'row', gap: 4 },
  statusBlock: { width: STATUS_BLOCK_SIZE, height: STATUS_BLOCK_SIZE, borderRadius: 4 },
  statusOn: { backgroundColor: t.colors.primary },
  statusOff: { backgroundColor: t.colors.border, opacity: 0.3 },
  activeStatusBlock: { borderWidth: 2, borderColor: t.colors.accent },
});

export default SubstitutionMatrixScreen;