import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity, TextInput, Alert } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import { Player } from '../models/Player';
import { theme } from '../theme';
import Icon from 'react-native-vector-icons/Ionicons';
import { Svg, Circle } from 'react-native-svg';

type GameFlowStackParamList = {
    SubstitutionMatrix: {
      assignedPlayers: { [positionIndex: string]: Player | null };
      unassignedPlayers: Player[];
    };
  };

type SubstitutionMatrixScreenRouteProp = RouteProp<
  GameFlowStackParamList,
  'SubstitutionMatrix'
>;

type Props = {
  route: SubstitutionMatrixScreenRouteProp;
};

const GAME_DURATION = 90 * 60;
const TIME_INTERVAL = 10 * 60;
const NUM_INTERVALS = GAME_DURATION / TIME_INTERVAL; // 9 intervals
const CIRCLE_RADIUS = 60;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;
const INTERVAL_LABELS = Array.from({ length: NUM_INTERVALS }, (_, i) => `${i * 10}'`);
const PLAYER_NAME_COL_WIDTH = 110;
const STATUS_BLOCK_SIZE = 22;
const PLAYTIME_COL_WIDTH = 36;

const SubstitutionMatrixScreen = ({ route }: Props) => {
  const { assignedPlayers, unassignedPlayers } = route.params;
  const [gameTime, setGameTime] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Scoreboard
  const [homeScore, setHomeScore] = useState(0);
  const [awayScore, setAwayScore] = useState(0);
  const [homeName, setHomeName] = useState('Home');
  const [awayName, setAwayName] = useState('Away');
  const [editingHome, setEditingHome] = useState(false);
  const [editingAway, setEditingAway] = useState(false);

  const allPlayers = useMemo(() => [
    ...Object.values(assignedPlayers).filter((p): p is Player => p !== null),
    ...unassignedPlayers,
  ].sort((a, b) => a.name.localeCompare(b.name)), [assignedPlayers, unassignedPlayers]);

  const buildInitialStatus = () => {
    const initialStatus: { [playerId: string]: ('on' | 'off')[] } = {};
    allPlayers.forEach(player => {
      initialStatus[player.id] = Array(NUM_INTERVALS).fill('off');
      const isOnField = Object.values(assignedPlayers).some(p => p?.id === player.id);
      if (isOnField) {
        initialStatus[player.id][0] = 'on';
      }
    });
    return initialStatus;
  };

  const [playerStatus, setPlayerStatus] = useState(buildInitialStatus);

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setGameTime(prev => {
          if (prev >= GAME_DURATION) {
            clearInterval(timerRef.current!);
            setIsActive(false);
            return GAME_DURATION;
          }
          return prev + 1;
        });
      }, 1000);
    } else if (timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);

  const currentInterval = Math.min(Math.floor(gameTime / TIME_INTERVAL), NUM_INTERVALS - 1);

  // Find the bench player who has been off the field the longest.
  // Lower lastIndexOf('on') = sat out longer. -1 = never played.
  const longestBenchPlayerId = useMemo(() => {
    let earliestLastOn = Infinity;
    let suggestedId: string | null = null;

    allPlayers.forEach(p => {
      const statusSoFar = playerStatus[p.id].slice(0, currentInterval + 1);
      const isCurrentlyOff = statusSoFar[statusSoFar.length - 1] === 'off';
      if (isCurrentlyOff) {
        const lastOnIndex = statusSoFar.lastIndexOf('on'); // -1 if never played
        if (lastOnIndex < earliestLastOn) {
          earliestLastOn = lastOnIndex;
          suggestedId = p.id;
        }
      }
    });

    return suggestedId;
  }, [playerStatus, currentInterval, allPlayers]);

  // Find the on-field player who has played the most intervals (candidate to sub out).
  const longestFieldPlayerId = useMemo(() => {
    if (!longestBenchPlayerId) return null;
    let mostIntervals = -1;
    let suggestedId: string | null = null;

    allPlayers.forEach(p => {
      const statusSoFar = playerStatus[p.id].slice(0, currentInterval + 1);
      const isCurrentlyOn = statusSoFar[statusSoFar.length - 1] === 'on';
      if (isCurrentlyOn) {
        const onCount = statusSoFar.filter(s => s === 'on').length;
        if (onCount > mostIntervals) {
          mostIntervals = onCount;
          suggestedId = p.id;
        }
      }
    });

    return suggestedId;
  }, [longestBenchPlayerId, playerStatus, currentInterval, allPlayers]);

  const getPlayMinutes = (playerId: string) =>
    playerStatus[playerId].filter(s => s === 'on').length * 10;

  const toggleStatus = (playerId: string, intervalIndex: number) => {
    setPlayerStatus(prev => {
      const updated = { ...prev, [playerId]: [...prev[playerId]] };
      updated[playerId][intervalIndex] = updated[playerId][intervalIndex] === 'on' ? 'off' : 'on';
      return updated;
    });
  };

  const handleStart = () => setIsActive(true);
  const handleStop = () => setIsActive(false);
  const handleReset = () => {
    setIsActive(false);
    setGameTime(0);
  };

  const handleNewGame = () => {
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
            setHomeScore(0);
            setAwayScore(0);
            setPlayerStatus(buildInitialStatus());
          },
        },
      ],
    );
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = gameTime / GAME_DURATION;
  const strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - progress);

  const suggestedBenchPlayer = allPlayers.find(p => p.id === longestBenchPlayerId);
  const suggestedFieldPlayer = allPlayers.find(p => p.id === longestFieldPlayerId);

  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

      {/* ── Scoreboard ── */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreRow}>

          {/* Home Team */}
          <View style={styles.teamBlock}>
            <TouchableOpacity
              onPress={() => setEditingHome(true)}
              activeOpacity={editingHome ? 1 : 0.6}
              accessibilityLabel="Edit home team name"
              accessibilityRole="button"
            >
              {editingHome ? (
                <TextInput
                  style={styles.teamNameInput}
                  value={homeName}
                  onChangeText={setHomeName}
                  onBlur={() => setEditingHome(false)}
                  autoFocus
                  maxLength={14}
                  returnKeyType="done"
                  onSubmitEditing={() => setEditingHome(false)}
                  selectTextOnFocus
                />
              ) : (
                <Text style={styles.teamNameLabel}>{homeName}</Text>
              )}
            </TouchableOpacity>
            <View style={styles.scorerRow}>
              <TouchableOpacity
                onPress={() => setHomeScore(s => Math.max(0, s - 1))}
                style={styles.scoreBtn}
                accessibilityLabel="Decrease home score"
                accessibilityRole="button"
              >
                <Icon name="remove" size={18} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={styles.scoreDigit}>{homeScore}</Text>
              <TouchableOpacity
                onPress={() => setHomeScore(s => s + 1)}
                style={styles.scoreBtn}
                accessibilityLabel="Increase home score"
                accessibilityRole="button"
              >
                <Icon name="add" size={18} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          </View>

          {/* Score divider */}
          <View style={styles.scoreDivider}>
            <Text style={styles.scoreDividerText}>–</Text>
          </View>

          {/* Away Team */}
          <View style={styles.teamBlock}>
            <TouchableOpacity
              onPress={() => setEditingAway(true)}
              activeOpacity={editingAway ? 1 : 0.6}
              accessibilityLabel="Edit away team name"
              accessibilityRole="button"
            >
              {editingAway ? (
                <TextInput
                  style={styles.teamNameInput}
                  value={awayName}
                  onChangeText={setAwayName}
                  onBlur={() => setEditingAway(false)}
                  autoFocus
                  maxLength={14}
                  returnKeyType="done"
                  onSubmitEditing={() => setEditingAway(false)}
                  selectTextOnFocus
                />
              ) : (
                <Text style={styles.teamNameLabel}>{awayName}</Text>
              )}
            </TouchableOpacity>
            <View style={styles.scorerRow}>
              <TouchableOpacity
                onPress={() => setAwayScore(s => Math.max(0, s - 1))}
                style={styles.scoreBtn}
                accessibilityLabel="Decrease away score"
                accessibilityRole="button"
              >
                <Icon name="remove" size={18} color={theme.colors.text} />
              </TouchableOpacity>
              <Text style={styles.scoreDigit}>{awayScore}</Text>
              <TouchableOpacity
                onPress={() => setAwayScore(s => s + 1)}
                style={styles.scoreBtn}
                accessibilityLabel="Increase away score"
                accessibilityRole="button"
              >
                <Icon name="add" size={18} color={theme.colors.text} />
              </TouchableOpacity>
            </View>
          </View>

        </View>

        {/* Reset score */}
        <TouchableOpacity
          style={styles.resetScoreBtn}
          onPress={() => { setHomeScore(0); setAwayScore(0); }}
          accessibilityLabel="Reset score to 0–0"
          accessibilityRole="button"
        >
          <Icon name="refresh-outline" size={12} color={theme.colors.text} />
          <Text style={styles.resetScoreText}>Reset Score</Text>
        </TouchableOpacity>
      </View>

      {/* ── Timer ── */}
      <View style={styles.timerSection}>
        <View style={styles.timerCircleWrapper}>
          <Svg width={CIRCLE_RADIUS * 2 + 20} height={CIRCLE_RADIUS * 2 + 20}>
            <Circle
              cx={CIRCLE_RADIUS + 10}
              cy={CIRCLE_RADIUS + 10}
              r={CIRCLE_RADIUS}
              stroke={theme.colors.border}
              strokeWidth="10"
              fill="transparent"
            />
            <Circle
              cx={CIRCLE_RADIUS + 10}
              cy={CIRCLE_RADIUS + 10}
              r={CIRCLE_RADIUS}
              stroke={theme.colors.primary}
              strokeWidth="10"
              fill="transparent"
              strokeDasharray={CIRCLE_CIRCUMFERENCE}
              strokeDashoffset={strokeDashoffset}
              rotation="-90"
              originX={`${CIRCLE_RADIUS + 10}`}
              originY={`${CIRCLE_RADIUS + 10}`}
            />
          </Svg>
          {/* Overlaid text — centered via absoluteFill */}
          <View style={StyleSheet.absoluteFill} pointerEvents="none">
            <View style={styles.timerTextWrapper}>
              <Text style={styles.timerText}>{formatTime(gameTime)}</Text>
              <Text style={styles.timerSubText}>
                {gameTime >= GAME_DURATION ? 'Full Time' : `${Math.floor(gameTime / 60)}'`}
              </Text>
            </View>
          </View>
        </View>

        <View style={styles.timerControls}>
          <TouchableOpacity
            onPress={handleStart}
            disabled={isActive || gameTime >= GAME_DURATION}
            style={styles.controlButton}
            accessibilityLabel="Start timer"
            accessibilityRole="button"
          >
            <Icon
              name="play-circle-outline"
              size={36}
              color={isActive || gameTime >= GAME_DURATION ? theme.colors.border : theme.colors.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleStop}
            disabled={!isActive}
            style={styles.controlButton}
            accessibilityLabel="Pause timer"
            accessibilityRole="button"
          >
            <Icon
              name="pause-circle-outline"
              size={36}
              color={!isActive ? theme.colors.border : theme.colors.primary}
            />
          </TouchableOpacity>
          <TouchableOpacity
            onPress={handleReset}
            style={styles.controlButton}
            accessibilityLabel="Reset timer"
            accessibilityRole="button"
          >
            <Icon name="refresh-circle-outline" size={36} color={theme.colors.primary} />
          </TouchableOpacity>
        </View>

        {/* New Game button */}
        <TouchableOpacity
          onPress={handleNewGame}
          style={styles.newGameBtn}
          accessibilityLabel="Start a new game"
          accessibilityRole="button"
        >
          <Icon name="flag-outline" size={14} color={theme.colors.danger} />
          <Text style={styles.newGameBtnText}>New Game</Text>
        </TouchableOpacity>
      </View>

      {/* ── Substitution Suggestion Banner ── */}
      {suggestedBenchPlayer ? (
        <View style={styles.suggestionBanner}>
          <Icon name="swap-horizontal-outline" size={18} color={theme.colors.text} style={styles.suggestionIcon} />
          <View style={styles.suggestionContent}>
            <Text style={styles.suggestionLabel}>Suggested Substitution</Text>
            <Text style={styles.suggestionDetail}>
              <Text style={styles.suggestionIn}>▲ {suggestedBenchPlayer.name}</Text>
              {suggestedFieldPlayer ? (
                <Text style={styles.suggestionOut}>{'  ▼ '}{suggestedFieldPlayer.name}</Text>
              ) : null}
            </Text>
          </View>
        </View>
      ) : null}

      {/* ── Matrix ── */}
      <View style={styles.matrixContainer}>

        {/* Legend */}
        <View style={styles.legend}>
          <View style={[styles.legendBlock, { backgroundColor: theme.colors.primary }]} />
          <Text style={styles.legendText}>On Field</Text>
          <View style={[styles.legendBlock, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderWidth: 1 }]} />
          <Text style={styles.legendText}>Bench</Text>
          <View style={[styles.legendBlock, { backgroundColor: theme.colors.card, borderColor: theme.colors.accent, borderWidth: 2 }]} />
          <Text style={styles.legendText}>Current</Text>
        </View>

        {/* Horizontally scrollable header + rows */}
        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            {/* Header row */}
            <View style={styles.headerRow}>
              <View style={{ width: PLAYER_NAME_COL_WIDTH }} />
              {INTERVAL_LABELS.map(label => (
                <Text key={label} style={styles.intervalLabel}>{label}</Text>
              ))}
              <Text style={styles.playTimeHeader}>Min</Text>
            </View>

            {/* Player rows */}
            <FlatList
              data={allPlayers}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              renderItem={({ item: player, index }) => {
                const isBenchSuggestion = player.id === longestBenchPlayerId;
                const isFieldSuggestion = player.id === longestFieldPlayerId;
                return (
                  <View
                    style={[
                      styles.playerRow,
                      index % 2 === 1 && styles.alternatingRow,
                      isBenchSuggestion && styles.benchSuggestionRow,
                      isFieldSuggestion && styles.fieldSuggestionRow,
                    ]}
                  >
                    <Text style={styles.playerName} numberOfLines={1}>
                      {isBenchSuggestion ? '▲ ' : isFieldSuggestion ? '▼ ' : '   '}
                      {player.name}
                    </Text>
                    <View style={styles.statusRow}>
                      {playerStatus[player.id].map((status, idx) => (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => toggleStatus(player.id, idx)}
                          accessibilityLabel={`Toggle ${player.name} interval ${idx * 10} minutes`}
                          accessibilityRole="button"
                        >
                          <View
                            style={[
                              styles.statusBlock,
                              status === 'on' ? styles.statusOn : styles.statusOff,
                              idx === currentInterval && styles.activeInterval,
                            ]}
                          />
                        </TouchableOpacity>
                      ))}
                    </View>
                    <Text style={styles.playTimeText}>{getPlayMinutes(player.id)}'</Text>
                  </View>
                );
              }}
            />
          </View>
        </ScrollView>
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  contentContainer: { paddingBottom: theme.spacing.xl },

  // Timer
  timerSection: { alignItems: 'center', padding: theme.spacing.lg, backgroundColor: theme.colors.card, marginBottom: theme.spacing.sm },
  timerCircleWrapper: {
    width: CIRCLE_RADIUS * 2 + 20,
    height: CIRCLE_RADIUS * 2 + 20,
  },
  timerTextWrapper: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  timerText: { fontSize: 28, fontWeight: 'bold', color: theme.colors.text },
  timerSubText: { fontSize: 12, color: theme.colors.border, marginTop: 2 },
  timerControls: { flexDirection: 'row', justifyContent: 'center', gap: theme.spacing.xl, marginTop: theme.spacing.md },
  controlButton: { padding: theme.spacing.sm },

  // Suggestion banner
  suggestionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: theme.colors.accent,
    marginHorizontal: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    padding: theme.spacing.sm,
    borderRadius: 8,
  },
  suggestionIcon: { marginRight: theme.spacing.sm },
  suggestionContent: { flex: 1 },
  suggestionLabel: { fontSize: 11, fontWeight: '600', color: theme.colors.text, opacity: 0.7, textTransform: 'uppercase', letterSpacing: 0.5 },
  suggestionDetail: { marginTop: 2 },
  suggestionIn: { fontSize: 14, fontWeight: 'bold', color: '#1a6e00' },
  suggestionOut: { fontSize: 14, fontWeight: 'bold', color: '#8b0000' },

  // Matrix
  matrixContainer: { paddingHorizontal: theme.spacing.sm },
  legend: { flexDirection: 'row', alignItems: 'center', gap: theme.spacing.xs, marginBottom: theme.spacing.sm, marginLeft: theme.spacing.xs },
  legendBlock: { width: 14, height: 14, borderRadius: 3 },
  legendText: { ...theme.typography.body, fontSize: 12, color: theme.colors.text, opacity: 0.7, marginRight: theme.spacing.sm },

  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: theme.spacing.xs,
    marginBottom: 2,
  },
  intervalLabel: {
    width: STATUS_BLOCK_SIZE + 2,
    fontSize: 10,
    color: theme.colors.border,
    textAlign: 'center',
  },
  playTimeHeader: {
    width: PLAYTIME_COL_WIDTH,
    fontSize: 10,
    color: theme.colors.border,
    textAlign: 'center',
    fontWeight: 'bold',
  },

  playerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: theme.spacing.xs,
    paddingHorizontal: theme.spacing.xs,
    borderRadius: 6,
    marginBottom: 2,
  },
  alternatingRow: { backgroundColor: theme.colors.card },
  benchSuggestionRow: { backgroundColor: '#e6f4ea', borderWidth: 1, borderColor: '#1a6e00' },
  fieldSuggestionRow: { backgroundColor: '#fde8e8', borderWidth: 1, borderColor: '#8b0000' },

  playerName: {
    ...theme.typography.body,
    fontSize: 13,
    width: PLAYER_NAME_COL_WIDTH,
    color: theme.colors.text,
  },
  statusRow: { flexDirection: 'row', gap: 2 },
  statusBlock: {
    width: STATUS_BLOCK_SIZE,
    height: STATUS_BLOCK_SIZE,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusOn: { backgroundColor: theme.colors.primary, borderColor: theme.colors.primary },
  statusOff: { backgroundColor: theme.colors.background, borderColor: theme.colors.border },
  activeInterval: { borderWidth: 2, borderColor: theme.colors.accent },

  playTimeText: {
    width: PLAYTIME_COL_WIDTH,
    fontSize: 12,
    fontWeight: '600',
    color: theme.colors.text,
    textAlign: 'center',
    marginLeft: 4,
  },

  // ── Scoreboard
  scoreCard: {
    backgroundColor: theme.colors.card,
    marginHorizontal: theme.spacing.md,
    marginTop: theme.spacing.md,
    marginBottom: theme.spacing.sm,
    borderRadius: 16,
    paddingVertical: theme.spacing.md,
    paddingHorizontal: theme.spacing.sm,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  scoreRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  teamBlock: {
    flex: 1,
    alignItems: 'center',
  },
  teamNameLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.text,
    opacity: 0.45,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: theme.spacing.sm,
  },
  teamNameInput: {
    fontSize: 12,
    fontWeight: '700',
    color: theme.colors.primary,
    letterSpacing: 0.8,
    marginBottom: theme.spacing.sm,
    borderBottomWidth: 1.5,
    borderBottomColor: theme.colors.primary,
    textAlign: 'center',
    minWidth: 60,
    paddingVertical: 0,
    paddingHorizontal: 2,
  },
  scorerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: theme.spacing.xs,
  },
  scoreBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: theme.colors.background,
    borderWidth: 1,
    borderColor: theme.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreDigit: {
    fontSize: 44,
    fontWeight: '800',
    color: theme.colors.text,
    minWidth: 54,
    textAlign: 'center',
    lineHeight: 52,
  },
  scoreDivider: {
    paddingHorizontal: theme.spacing.xs,
    paddingTop: theme.spacing.xl,
  },
  scoreDividerText: {
    fontSize: 24,
    fontWeight: '300',
    color: theme.colors.text,
    opacity: 0.25,
  },
  resetScoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  resetScoreText: {
    fontSize: 11,
    color: theme.colors.text,
    opacity: 0.35,
    fontWeight: '600',
  },

  // New Game
  newGameBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: theme.spacing.sm,
    paddingVertical: theme.spacing.xs,
  },
  newGameBtnText: {
    fontSize: 13,
    fontWeight: '600',
    color: theme.colors.danger,
  },
});

export default SubstitutionMatrixScreen;
