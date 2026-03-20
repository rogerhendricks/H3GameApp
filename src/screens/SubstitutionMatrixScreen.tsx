/**
 * SubstitutionMatrixScreen
 *
 * Features
 * ────────
 * • 5 min / 10 min interval picker — shown before the game starts
 * • Shared timer that persists if the user navigates back to TacticsBoard
 * • Column navigation (‹ ›) so the coach can look ahead / behind the clock
 * • Auto-advance to new column + Alert at every interval boundary
 * • Bench-first layout
 *     - Bench section at the top: each player has a "Sub In" button
 *     - On-Field section below: compact list
 * • Position-match highlighting when a Sub-In flow is active
 *     - Primary position match  → green tint
 *     - Secondary position match → yellow tint
 *     - Tap an on-field player to confirm the swap
 * • Scrollable matrix (full history) below the live panels
 * • Scoreboard with editable team names
 */

import React, { useMemo, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  FlatList,
  TouchableOpacity,
  TextInput,
} from 'react-native';
import { Svg, Circle } from 'react-native-svg';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';
import { AppTheme } from '../theme';
import { useGame } from '../context/GameContext';
import { Player } from '../models/Player';

// ── Layout constants ───────────────────────────────────────────────────────────
const CIRCLE_RADIUS = 60;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;
const PLAYER_NAME_COL_WIDTH = 110;
const STATUS_BLOCK_SIZE = 22;
const PLAYTIME_COL_WIDTH = 36;

// ── Position compatibility helper ─────────────────────────────────────────────
/**
 * Given the label of the slot being vacated and a player's positions,
 * return 'primary' | 'secondary' | 'none'.
 */
function positionMatch(
  slotLabel: string,
  player: Player
): 'primary' | 'secondary' | 'none' {
  const norm = (s: string) => s.trim().toUpperCase();
  const slot = norm(slotLabel);
  if (norm(player.primaryPosition) === slot) return 'primary';
  if (player.secondaryPosition && norm(player.secondaryPosition) === slot)
    return 'secondary';
  return 'none';
}

// ── Component ─────────────────────────────────────────────────────────────────

const SubstitutionMatrixScreen = () => {
  const { theme } = useTheme();
  const styles = useMemo(() => makeStyles(theme), [theme]);
  const {
    gameTime,
    isActive,
    timerInterval,
    setTimerInterval,
    handleStart,
    handleStop,
    handleReset,
    handleNewGame,
    currentInterval,
    displayInterval,
    numIntervals,
    intervalLabels,
    advanceDisplayInterval,
    retreatDisplayInterval,
    assignedPlayers,
    unassignedPlayers,
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
    GAME_DURATION,
  } = useGame();

  // ── Local UI state ──
  const [editingHome, setEditingHome] = useState(false);
  const [editingAway, setEditingAway] = useState(false);
  /** The bench player the coach has tapped "Sub In" for */
  const [pendingSubIn, setPendingSubIn] = useState<Player | null>(null);

  const gameStarted = gameTime > 0 || isActive;

  // ── Derived player lists ───────────────────────────────────────────────────
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

  /** Players currently on the field at displayInterval */
  const onFieldPlayers = useMemo(
    () =>
      allPlayers.filter(
        p => (playerStatus[p.id]?.[displayInterval] ?? 'off') === 'on'
      ),
    [allPlayers, playerStatus, displayInterval]
  );

  /** Players currently on the bench at displayInterval */
  const benchPlayers = useMemo(
    () =>
      allPlayers.filter(
        p => (playerStatus[p.id]?.[displayInterval] ?? 'off') === 'off'
      ),
    [allPlayers, playerStatus, displayInterval]
  );

  // ── Suggestion logic (based on currentInterval / clock) ───────────────────
  const longestBenchPlayerId = useMemo(() => {
    let earliestLastOn = Infinity;
    let suggestedId: string | null = null;
    allPlayers.forEach(p => {
      const slice = playerStatus[p.id]?.slice(0, currentInterval + 1) ?? [];
      if (slice[slice.length - 1] !== 'off') return;
      const lastOn = slice.lastIndexOf('on');
      if (lastOn < earliestLastOn) {
        earliestLastOn = lastOn;
        suggestedId = p.id;
      }
    });
    return suggestedId;
  }, [allPlayers, playerStatus, currentInterval]);

  const longestFieldPlayerId = useMemo(() => {
    if (!longestBenchPlayerId) return null;
    let mostIntervals = -1;
    let suggestedId: string | null = null;
    allPlayers.forEach(p => {
      const slice = playerStatus[p.id]?.slice(0, currentInterval + 1) ?? [];
      if (slice[slice.length - 1] !== 'on') return;
      const onCount = slice.filter(s => s === 'on').length;
      if (onCount > mostIntervals) {
        mostIntervals = onCount;
        suggestedId = p.id;
      }
    });
    return suggestedId;
  }, [longestBenchPlayerId, allPlayers, playerStatus, currentInterval]);

  const suggestedBenchPlayer = allPlayers.find(p => p.id === longestBenchPlayerId);
  const suggestedFieldPlayer = allPlayers.find(p => p.id === longestFieldPlayerId);

  // ── Sub-In flow ────────────────────────────────────────────────────────────
  const handleSubInTap = (player: Player) => {
    setPendingSubIn(prev => (prev?.id === player.id ? null : player));
  };

  const handleFieldPlayerTap = (fieldPlayer: Player) => {
    if (!pendingSubIn) return;
    executeSubstitution(pendingSubIn.id, fieldPlayer.id);
    setPendingSubIn(null);
  };

  /** Given a field player, find the label of the slot they occupy */
  const getSlotLabelForPlayer = (playerId: string): string | null => {
    const entry = Object.values(assignedPlayers).find(
      s => s.player?.id === playerId
    );
    return entry?.positionLabel ?? null;
  };

  // ── Helpers ───────────────────────────────────────────────────────────────
  const getPlayMinutes = (playerId: string) =>
    (playerStatus[playerId]?.filter(s => s === 'on').length ?? 0) *
    (timerInterval / 60);

  const formatTime = (time: number) => {
    const m = Math.floor(time / 60);
    const s = time % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const progress = gameTime / GAME_DURATION;
  const strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - progress);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <ScrollView style={styles.container} contentContainerStyle={styles.contentContainer}>

      {/* ══════════════════════════════════════════════════════════════════════
          SCOREBOARD
      ══════════════════════════════════════════════════════════════════════ */}
      <View style={styles.scoreCard}>
        <View style={styles.scoreRow}>

          {/* Home */}
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

          <View style={styles.scoreDivider}>
            <Text style={styles.scoreDividerText}>–</Text>
          </View>

          {/* Away */}
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

      {/* ══════════════════════════════════════════════════════════════════════
          TIMER
      ══════════════════════════════════════════════════════════════════════ */}
      <View style={styles.timerSection}>

        {/* Interval picker — only before the game starts */}
        {!gameStarted && (
          <View style={styles.intervalPickerRow}>
            <Text style={styles.intervalPickerLabel}>Sub Interval</Text>
            <View style={styles.intervalChips}>
              {([300, 600] as const).map(iv => (
                <TouchableOpacity
                  key={iv}
                  onPress={() => setTimerInterval(iv)}
                  style={[
                    styles.intervalChip,
                    timerInterval === iv && styles.intervalChipActive,
                  ]}
                  accessibilityRole="button"
                  accessibilityLabel={`${iv / 60} minute intervals`}
                >
                  <Text
                    style={[
                      styles.intervalChipText,
                      timerInterval === iv && styles.intervalChipTextActive,
                    ]}
                  >
                    {iv / 60} min
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          </View>
        )}

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

      {/* ══════════════════════════════════════════════════════════════════════
          SUGGESTION BANNER (clock-driven)
      ══════════════════════════════════════════════════════════════════════ */}
      {suggestedBenchPlayer ? (
        <View style={styles.suggestionBanner}>
          <Icon
            name="swap-horizontal-outline"
            size={18}
            color={theme.colors.text}
            style={styles.suggestionIcon}
          />
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

      {/* ══════════════════════════════════════════════════════════════════════
          COLUMN NAVIGATOR  (current viewed interval)
      ══════════════════════════════════════════════════════════════════════ */}
      <View style={styles.columnNavRow}>
        <TouchableOpacity
          onPress={retreatDisplayInterval}
          disabled={displayInterval === 0}
          style={[styles.columnNavBtn, displayInterval === 0 && styles.columnNavBtnDisabled]}
          accessibilityRole="button"
          accessibilityLabel="Previous interval"
        >
          <Icon
            name="chevron-back"
            size={20}
            color={displayInterval === 0 ? theme.colors.border : theme.colors.primary}
          />
        </TouchableOpacity>

        <View style={styles.columnNavCenter}>
          <Text style={styles.columnNavTitle}>
            {intervalLabels[displayInterval]} – {intervalLabels[displayInterval + 1] ?? 'FT'}
          </Text>
          {displayInterval === currentInterval && (
            <View style={styles.liveTag}>
              <Text style={styles.liveTagText}>LIVE</Text>
            </View>
          )}
        </View>

        <TouchableOpacity
          onPress={advanceDisplayInterval}
          disabled={displayInterval >= numIntervals - 1}
          style={[
            styles.columnNavBtn,
            displayInterval >= numIntervals - 1 && styles.columnNavBtnDisabled,
          ]}
          accessibilityRole="button"
          accessibilityLabel="Next interval"
        >
          <Icon
            name="chevron-forward"
            size={20}
            color={
              displayInterval >= numIntervals - 1 ? theme.colors.border : theme.colors.primary
            }
          />
        </TouchableOpacity>
      </View>

      {/* ══════════════════════════════════════════════════════════════════════
          BENCH SECTION (bench-first — the important actions are here)
      ══════════════════════════════════════════════════════════════════════ */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Icon name="time-outline" size={16} color={theme.colors.text} style={{ opacity: 0.6 }} />
          <Text style={styles.sectionTitle}>
            Bench{' '}
            <Text style={styles.sectionCount}>{benchPlayers.length}</Text>
          </Text>
          {pendingSubIn && (
            <TouchableOpacity
              onPress={() => setPendingSubIn(null)}
              style={styles.cancelSubBtn}
              accessibilityRole="button"
              accessibilityLabel="Cancel substitution"
            >
              <Icon name="close-circle" size={16} color={theme.colors.danger} />
              <Text style={styles.cancelSubText}>Cancel Sub</Text>
            </TouchableOpacity>
          )}
        </View>

        {benchPlayers.length === 0 ? (
          <Text style={styles.emptySection}>All players are on the field</Text>
        ) : (
          benchPlayers.map(player => {
            const isPending = pendingSubIn?.id === player.id;
            return (
              <View
                key={player.id}
                style={[
                  styles.playerListRow,
                  isPending && styles.playerListRowPending,
                  player.id === longestBenchPlayerId && !isPending && styles.benchSuggestionRow,
                ]}
              >
                {/* Jersey badge */}
                <View style={[styles.jerseyBadge, isPending && styles.jerseyBadgePending]}>
                  <Text style={[styles.jerseyBadgeText, isPending && styles.jerseyBadgeTextPending]}>
                    #{player.jerseyNumber}
                  </Text>
                </View>

                {/* Name + position */}
                <View style={styles.playerInfoCol}>
                  <Text style={styles.playerNameText} numberOfLines={1}>
                    {player.id === longestBenchPlayerId ? '▲ ' : ''}{player.name}
                  </Text>
                  <Text style={styles.playerPosText}>
                    {player.primaryPosition}
                    {player.secondaryPosition ? ` · ${player.secondaryPosition}` : ''}
                  </Text>
                </View>

                {/* Play minutes */}
                <Text style={styles.playMinsText}>{getPlayMinutes(player.id)}'</Text>

                {/* Sub In button */}
                <TouchableOpacity
                  onPress={() => handleSubInTap(player)}
                  style={[styles.subInBtn, isPending && styles.subInBtnActive]}
                  accessibilityRole="button"
                  accessibilityLabel={`Sub in ${player.name}`}
                >
                  <Icon
                    name={isPending ? 'checkmark' : 'arrow-up-circle-outline'}
                    size={15}
                    color={isPending ? '#fff' : theme.colors.primary}
                  />
                  <Text style={[styles.subInBtnText, isPending && styles.subInBtnTextActive]}>
                    {isPending ? 'Picking…' : 'Sub In'}
                  </Text>
                </TouchableOpacity>
              </View>
            );
          })
        )}
      </View>

      {/* ══════════════════════════════════════════════════════════════════════
          ON FIELD SECTION
          When pendingSubIn is set, each row shows a position-match colour
          and is tappable to confirm the swap.
      ══════════════════════════════════════════════════════════════════════ */}
      <View style={styles.sectionCard}>
        <View style={styles.sectionHeader}>
          <Icon name="football-outline" size={16} color={theme.colors.text} style={{ opacity: 0.6 }} />
          <Text style={styles.sectionTitle}>
            On Field{' '}
            <Text style={styles.sectionCount}>{onFieldPlayers.length}</Text>
          </Text>
        </View>

        {pendingSubIn && (
          <View style={styles.posMatchLegend}>
            <View style={[styles.legendDot, { backgroundColor: '#15803d' }]} />
            <Text style={styles.legendText}>Primary match</Text>
            <View style={[styles.legendDot, { backgroundColor: '#D97706' }]} />
            <Text style={styles.legendText}>Secondary match</Text>
            <View style={[styles.legendDot, { backgroundColor: theme.colors.card, borderWidth: 1, borderColor: theme.colors.border }]} />
            <Text style={styles.legendText}>No match</Text>
          </View>
        )}

        {onFieldPlayers.length === 0 ? (
          <Text style={styles.emptySection}>No players on the field</Text>
        ) : (
          onFieldPlayers.map(player => {
            const slotLabel = getSlotLabelForPlayer(player.id);
            const match = pendingSubIn && slotLabel
              ? positionMatch(slotLabel, pendingSubIn)
              : 'none';

            const rowBg =
              pendingSubIn
                ? match === 'primary'
                  ? styles.matchPrimaryRow
                  : match === 'secondary'
                  ? styles.matchSecondaryRow
                  : styles.matchNoneRow
                : player.id === longestFieldPlayerId
                ? styles.fieldSuggestionRow
                : undefined;

            return (
              <TouchableOpacity
                key={player.id}
                onPress={() => pendingSubIn && handleFieldPlayerTap(player)}
                activeOpacity={pendingSubIn ? 0.6 : 1}
                style={[styles.playerListRow, rowBg]}
                accessibilityRole={pendingSubIn ? 'button' : 'none'}
                accessibilityLabel={`Sub out ${player.name}`}
              >
                {/* Jersey badge */}
                <View style={[styles.jerseyBadge, styles.jerseyBadgeOnField]}>
                  <Text style={[styles.jerseyBadgeText, styles.jerseyBadgeTextOnField]}>
                    #{player.jerseyNumber}
                  </Text>
                </View>

                {/* Name + position */}
                <View style={styles.playerInfoCol}>
                  <Text style={styles.playerNameText} numberOfLines={1}>
                    {player.id === longestFieldPlayerId ? '▼ ' : ''}{player.name}
                  </Text>
                  <Text style={styles.playerPosText}>
                    {player.primaryPosition}
                    {player.secondaryPosition ? ` · ${player.secondaryPosition}` : ''}
                    {slotLabel ? `  →  ${slotLabel}` : ''}
                  </Text>
                </View>

                {/* Play minutes */}
                <Text style={styles.playMinsText}>{getPlayMinutes(player.id)}'</Text>

                {/* Arrow shown when a swap is pending */}
                {pendingSubIn ? (
                  <View style={styles.subOutIndicator}>
                    <Icon
                      name="arrow-down-circle-outline"
                      size={22}
                      color={
                        match === 'primary'
                          ? '#15803d'
                          : match === 'secondary'
                          ? '#D97706'
                          : theme.colors.border
                      }
                    />
                  </View>
                ) : null}
              </TouchableOpacity>
            );
          })
        )}
      </View>

      {/* ══════════════════════════════════════════════════════════════════════
          FULL MATRIX (scrollable history)
      ══════════════════════════════════════════════════════════════════════ */}
      <View style={styles.matrixContainer}>
        {/* Legend */}
        <View style={styles.legend}>
          <View style={[styles.legendBlock, { backgroundColor: theme.colors.primary }]} />
          <Text style={styles.legendLabelText}>On Field</Text>
          <View style={[styles.legendBlock, { backgroundColor: theme.colors.card, borderColor: theme.colors.border, borderWidth: 1 }]} />
          <Text style={styles.legendLabelText}>Bench</Text>
          <View style={[styles.legendBlock, { backgroundColor: theme.colors.card, borderColor: theme.colors.accent, borderWidth: 2 }]} />
          <Text style={styles.legendLabelText}>Current</Text>
        </View>

        <ScrollView horizontal showsHorizontalScrollIndicator={false}>
          <View>
            {/* Header row */}
            <View style={styles.headerRow}>
              <View style={{ width: PLAYER_NAME_COL_WIDTH }} />
              {intervalLabels.map((label, idx) => (
                <Text
                  key={label}
                  style={[
                    styles.intervalLabel,
                    idx === displayInterval && styles.intervalLabelActive,
                  ]}
                >
                  {label}
                </Text>
              ))}
              <Text style={styles.playTimeHeader}>Min</Text>
            </View>

            {/* Player rows */}
            <FlatList
              data={allPlayers}
              keyExtractor={item => item.id}
              scrollEnabled={false}
              renderItem={({ item: player, index }) => {
                const isBenchSugg = player.id === longestBenchPlayerId;
                const isFieldSugg = player.id === longestFieldPlayerId;
                return (
                  <View
                    style={[
                      styles.matrixPlayerRow,
                      index % 2 === 1 && styles.alternatingRow,
                      isBenchSugg && styles.benchSuggestionRowMatrix,
                      isFieldSugg && styles.fieldSuggestionRowMatrix,
                    ]}
                  >
                    <Text style={styles.matrixPlayerName} numberOfLines={1}>
                      {isBenchSugg ? '▲ ' : isFieldSugg ? '▼ ' : '   '}
                      {player.name}
                    </Text>
                    <View style={styles.statusRow}>
                      {(playerStatus[player.id] ?? []).map((status, idx) => (
                        <TouchableOpacity
                          key={idx}
                          onPress={() => toggleStatus(player.id, idx)}
                          accessibilityLabel={`Toggle ${player.name} at ${intervalLabels[idx]}`}
                          accessibilityRole="button"
                        >
                          <View
                            style={[
                              styles.statusBlock,
                              status === 'on' ? styles.statusOn : styles.statusOff,
                              idx === displayInterval && styles.activeInterval,
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

// ── Styles ────────────────────────────────────────────────────────────────────

const makeStyles = (t: AppTheme) => StyleSheet.create({
  container: { flex: 1, backgroundColor: t.colors.background },
  contentContainer: { paddingBottom: t.spacing.xl },

  // ── Scoreboard ──────────────────────────────────────────────────────────────
  scoreCard: {
    backgroundColor: t.colors.card,
    marginHorizontal: t.spacing.md,
    marginTop: t.spacing.md,
    marginBottom: t.spacing.sm,
    borderRadius: 16,
    paddingVertical: t.spacing.md,
    paddingHorizontal: t.spacing.sm,
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.08,
    shadowRadius: 6,
  },
  scoreRow: { flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between' },
  teamBlock: { flex: 1, alignItems: 'center' },
  teamNameLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: t.colors.text,
    opacity: 0.45,
    textTransform: 'uppercase',
    letterSpacing: 0.8,
    marginBottom: t.spacing.sm,
  },
  teamNameInput: {
    fontSize: 12,
    fontWeight: '700',
    color: t.colors.primary,
    letterSpacing: 0.8,
    marginBottom: t.spacing.sm,
    borderBottomWidth: 1.5,
    borderBottomColor: t.colors.primary,
    textAlign: 'center',
    minWidth: 60,
    paddingVertical: 0,
    paddingHorizontal: 2,
  },
  scorerRow: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs },
  scoreBtn: {
    width: 34,
    height: 34,
    borderRadius: 17,
    backgroundColor: t.colors.background,
    borderWidth: 1,
    borderColor: t.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  scoreDigit: {
    fontSize: 44,
    fontWeight: '800',
    color: t.colors.text,
    minWidth: 54,
    textAlign: 'center',
    lineHeight: 52,
  },
  scoreDivider: { paddingHorizontal: t.spacing.xs, paddingTop: t.spacing.xl },
  scoreDividerText: { fontSize: 24, fontWeight: '300', color: t.colors.text, opacity: 0.25 },
  resetScoreBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 4,
    marginTop: t.spacing.sm,
    paddingVertical: t.spacing.xs,
  },
  resetScoreText: { fontSize: 11, color: t.colors.text, opacity: 0.35, fontWeight: '600' },

  // ── Timer ────────────────────────────────────────────────────────────────────
  timerSection: {
    alignItems: 'center',
    padding: t.spacing.lg,
    backgroundColor: t.colors.card,
    marginBottom: t.spacing.sm,
  },
  intervalPickerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.sm,
    marginBottom: t.spacing.md,
  },
  intervalPickerLabel: {
    fontSize: 12,
    fontWeight: '700',
    color: t.colors.text,
    opacity: 0.5,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
  },
  intervalChips: { flexDirection: 'row', gap: t.spacing.xs },
  intervalChip: {
    paddingHorizontal: 14,
    paddingVertical: 6,
    borderRadius: 20,
    borderWidth: 1,
    borderColor: t.colors.border,
    backgroundColor: t.colors.background,
  },
  intervalChipActive: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
  intervalChipText: { fontSize: 13, fontWeight: '600', color: t.colors.text },
  intervalChipTextActive: { color: '#FFFFFF' },

  timerCircleWrapper: {
    width: CIRCLE_RADIUS * 2 + 20,
    height: CIRCLE_RADIUS * 2 + 20,
  },
  timerTextWrapper: { flex: 1, justifyContent: 'center', alignItems: 'center' },
  timerText: { fontSize: 28, fontWeight: 'bold', color: t.colors.text },
  timerSubText: { fontSize: 12, color: t.colors.border, marginTop: 2 },
  timerControls: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: t.spacing.xl,
    marginTop: t.spacing.md,
  },
  controlButton: { padding: t.spacing.sm },
  newGameBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 5,
    marginTop: t.spacing.sm,
    paddingVertical: t.spacing.xs,
  },
  newGameBtnText: { fontSize: 13, fontWeight: '600', color: t.colors.danger },

  // ── Suggestion banner ─────────────────────────────────────────────────────────
  suggestionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: t.colors.accent,
    marginHorizontal: t.spacing.md,
    marginBottom: t.spacing.sm,
    padding: t.spacing.sm,
    borderRadius: 8,
  },
  suggestionIcon: { marginRight: t.spacing.sm },
  suggestionContent: { flex: 1 },
  suggestionLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: t.colors.text,
    opacity: 0.7,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  suggestionDetail: { marginTop: 2 },
  suggestionIn: { fontSize: 14, fontWeight: 'bold', color: '#1a6e00' },
  suggestionOut: { fontSize: 14, fontWeight: 'bold', color: '#8b0000' },

  // ── Column navigator ──────────────────────────────────────────────────────────
  columnNavRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: t.colors.card,
    marginHorizontal: t.spacing.md,
    marginBottom: t.spacing.sm,
    borderRadius: 12,
    paddingHorizontal: t.spacing.sm,
    paddingVertical: t.spacing.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  columnNavBtn: { padding: t.spacing.xs },
  columnNavBtnDisabled: { opacity: 0.3 },
  columnNavCenter: { flexDirection: 'row', alignItems: 'center', gap: t.spacing.xs },
  columnNavTitle: { fontSize: 15, fontWeight: '700', color: t.colors.text },
  liveTag: {
    backgroundColor: t.colors.danger,
    borderRadius: 4,
    paddingHorizontal: 5,
    paddingVertical: 2,
  },
  liveTagText: { fontSize: 9, fontWeight: '800', color: '#fff', letterSpacing: 1 },

  // ── Section cards (Bench / On Field) ─────────────────────────────────────────
  sectionCard: {
    backgroundColor: t.colors.card,
    marginHorizontal: t.spacing.md,
    marginBottom: t.spacing.sm,
    borderRadius: 12,
    paddingVertical: t.spacing.sm,
    paddingHorizontal: t.spacing.sm,
    elevation: 2,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.06,
    shadowRadius: 3,
  },
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs,
    marginBottom: t.spacing.sm,
  },
  sectionTitle: {
    fontSize: 13,
    fontWeight: '700',
    color: t.colors.text,
    opacity: 0.6,
    textTransform: 'uppercase',
    letterSpacing: 0.6,
    flex: 1,
  },
  sectionCount: { fontWeight: '800', color: t.colors.primary, opacity: 1 },
  emptySection: {
    fontSize: 13,
    color: t.colors.text,
    opacity: 0.4,
    fontStyle: 'italic',
    paddingVertical: t.spacing.sm,
    paddingHorizontal: t.spacing.xs,
  },

  cancelSubBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: t.spacing.xs,
    paddingVertical: 4,
  },
  cancelSubText: { fontSize: 12, fontWeight: '600', color: t.colors.danger },

  // ── Player list rows ─────────────────────────────────────────────────────────
  playerListRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: t.spacing.xs,
    borderRadius: 8,
    marginBottom: 2,
    gap: t.spacing.xs,
  },
  playerListRowPending: {
    backgroundColor: '#EEF2FF',
    borderWidth: 1.5,
    borderColor: '#6366F1',
  },
  benchSuggestionRow: { backgroundColor: '#e6f4ea', borderWidth: 1, borderColor: '#15803d' },
  fieldSuggestionRow: { backgroundColor: '#fde8e8', borderWidth: 1, borderColor: '#8b0000' },

  matchPrimaryRow: { backgroundColor: '#dcfce7', borderWidth: 1.5, borderColor: '#15803d' },
  matchSecondaryRow: { backgroundColor: '#fef9c3', borderWidth: 1.5, borderColor: '#D97706' },
  matchNoneRow: { backgroundColor: t.colors.card },

  jerseyBadge: {
    width: 36,
    height: 36,
    borderRadius: 18,
    backgroundColor: t.colors.background,
    borderWidth: 1.5,
    borderColor: t.colors.border,
    justifyContent: 'center',
    alignItems: 'center',
  },
  jerseyBadgePending: { borderColor: '#6366F1', backgroundColor: '#EEF2FF' },
  jerseyBadgeOnField: { borderColor: t.colors.primary, backgroundColor: t.colors.primary },
  jerseyBadgeText: { fontSize: 10, fontWeight: '700', color: t.colors.text },
  jerseyBadgeTextPending: { color: '#6366F1' },
  jerseyBadgeTextOnField: { color: '#fff' },

  playerInfoCol: { flex: 1 },
  playerNameText: { fontSize: 14, fontWeight: '600', color: t.colors.text },
  playerPosText: { fontSize: 11, color: t.colors.text, opacity: 0.5, marginTop: 1 },
  playMinsText: {
    fontSize: 12,
    fontWeight: '600',
    color: t.colors.text,
    opacity: 0.6,
    minWidth: 28,
    textAlign: 'right',
  },

  subInBtn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 3,
    paddingHorizontal: 10,
    paddingVertical: 6,
    borderRadius: 8,
    borderWidth: 1.5,
    borderColor: t.colors.primary,
    backgroundColor: t.colors.background,
  },
  subInBtnActive: { backgroundColor: '#6366F1', borderColor: '#6366F1' },
  subInBtnText: { fontSize: 12, fontWeight: '700', color: t.colors.primary },
  subInBtnTextActive: { color: '#fff' },

  subOutIndicator: { padding: 4 },

  posMatchLegend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs,
    marginBottom: t.spacing.sm,
    flexWrap: 'wrap',
  },
  legendDot: { width: 12, height: 12, borderRadius: 6 },
  legendText: { fontSize: 11, color: t.colors.text, opacity: 0.6, marginRight: 6 },

  // ── Matrix ───────────────────────────────────────────────────────────────────
  matrixContainer: { paddingHorizontal: t.spacing.sm, marginTop: t.spacing.xs },
  legend: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: t.spacing.xs,
    marginBottom: t.spacing.sm,
    marginLeft: t.spacing.xs,
  },
  legendBlock: { width: 14, height: 14, borderRadius: 3 },
  legendLabelText: {
    fontSize: 12,
    color: t.colors.text,
    opacity: 0.7,
    marginRight: t.spacing.sm,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: t.spacing.xs,
    marginBottom: 2,
  },
  intervalLabel: {
    width: STATUS_BLOCK_SIZE + 2,
    fontSize: 10,
    color: t.colors.border,
    textAlign: 'center',
  },
  intervalLabelActive: {
    color: t.colors.primary,
    fontWeight: '700',
  },
  playTimeHeader: {
    width: PLAYTIME_COL_WIDTH,
    fontSize: 10,
    color: t.colors.border,
    textAlign: 'center',
    fontWeight: 'bold',
  },
  matrixPlayerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: t.spacing.xs,
    paddingHorizontal: t.spacing.xs,
    borderRadius: 6,
    marginBottom: 2,
  },
  alternatingRow: { backgroundColor: t.colors.card },
  benchSuggestionRowMatrix: { backgroundColor: '#e6f4ea', borderWidth: 1, borderColor: '#1a6e00' },
  fieldSuggestionRowMatrix: { backgroundColor: '#fde8e8', borderWidth: 1, borderColor: '#8b0000' },
  matrixPlayerName: {
    fontSize: 13,
    width: PLAYER_NAME_COL_WIDTH,
    color: t.colors.text,
  },
  statusRow: { flexDirection: 'row', gap: 2 },
  statusBlock: {
    width: STATUS_BLOCK_SIZE,
    height: STATUS_BLOCK_SIZE,
    borderRadius: 4,
    borderWidth: 1,
  },
  statusOn: { backgroundColor: t.colors.primary, borderColor: t.colors.primary },
  statusOff: { backgroundColor: t.colors.background, borderColor: t.colors.border },
  activeInterval: { borderWidth: 2, borderColor: t.colors.accent },
  playTimeText: {
    width: PLAYTIME_COL_WIDTH,
    fontSize: 12,
    fontWeight: '600',
    color: t.colors.text,
    textAlign: 'center',
    marginLeft: 4,
  },
});


export default SubstitutionMatrixScreen;
