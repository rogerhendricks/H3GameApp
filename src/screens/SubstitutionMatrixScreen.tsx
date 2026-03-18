import React, { useState, useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ScrollView, FlatList, TouchableOpacity } from 'react-native';
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
const NUM_INTERVALS = GAME_DURATION / TIME_INTERVAL;
const CIRCLE_RADIUS = 60;
const CIRCLE_CIRCUMFERENCE = 2 * Math.PI * CIRCLE_RADIUS;


const SubstitutionMatrixScreen = ({ route }: Props) => {
  const { assignedPlayers, unassignedPlayers } = route.params;
  const [gameTime, setGameTime] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const timerRef = useRef<NodeJS.Timeout | null>(null);

  const allPlayers = useMemo(() => [
    ...Object.values(assignedPlayers).filter((p): p is Player => p !== null), 
    ...unassignedPlayers
  ].sort((a, b) => a.name.localeCompare(b.name)), [assignedPlayers, unassignedPlayers]);

  const [playerStatus, setPlayerStatus] = useState(() => {
    const initialStatus: { [playerId: string]: ('on' | 'off')[] } = {};
    allPlayers.forEach(player => {
        initialStatus[player.id] = Array(NUM_INTERVALS).fill('off');
        const isOnField = Object.values(assignedPlayers).some(p => p?.id === player.id);
        if (isOnField) {
            initialStatus[player.id][0] = 'on';
        }
    });
    return initialStatus;
  });

  useEffect(() => {
    if (isActive) {
      timerRef.current = setInterval(() => {
        setGameTime(prev => prev + 1);
      }, 1000);
    } else if(timerRef.current) {
      clearInterval(timerRef.current);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [isActive]);
  
  const currentInterval = Math.floor(gameTime / TIME_INTERVAL);

  const longestBenchPlayer = useMemo(() => {
    let longestBench = -1;
    let playerId = null;

    allPlayers.forEach(p => {
        const benchDuration = playerStatus[p.id].slice(0, currentInterval + 1).lastIndexOf('on');
        if (benchDuration > longestBench) {
            longestBench = benchDuration;
            playerId = p.id;
        }
    });

    return playerId;
  }, [playerStatus, currentInterval, allPlayers]);


  const toggleStatus = (playerId: string, intervalIndex: number) => {
    const newStatus = { ...playerStatus };
    newStatus[playerId][intervalIndex] = newStatus[playerId][intervalIndex] === 'on' ? 'off' : 'on';
    setPlayerStatus(newStatus);
  };

  const handleStart = () => setIsActive(true);
  const handleStop = () => setIsActive(false);
  const handleReset = () => {
    setIsActive(false);
    setGameTime(0);
  };

  const formatTime = (time: number) => {
    const minutes = Math.floor(time / 60);
    const seconds = time % 60;
    return `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
  };

  const progress = gameTime / GAME_DURATION;
  const strokeDashoffset = CIRCLE_CIRCUMFERENCE * (1 - progress);

  return (
    <ScrollView style={styles.container}>
      <View style={styles.timerContainer}>
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
        <Text style={styles.timer}>{formatTime(gameTime)}</Text>
        <View style={styles.timerControls}>
            <TouchableOpacity onPress={handleStart} disabled={isActive} style={styles.controlButton}>
                <Icon name="play-outline" size={30} color={isActive ? theme.colors.border : theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleStop} disabled={!isActive} style={styles.controlButton}>
                <Icon name="pause-outline" size={30} color={!isActive ? theme.colors.border : theme.colors.primary} />
            </TouchableOpacity>
            <TouchableOpacity onPress={handleReset} style={styles.controlButton}>
                <Icon name="refresh-outline" size={30} color={theme.colors.primary} />
            </TouchableOpacity>
        </View>
      </View>
      <View style={styles.matrixContainer}>
        <FlatList
            data={allPlayers}
            keyExtractor={item => item.id}
            renderItem={({ item: player, index }) => (
                <View style={[styles.playerRow, index % 2 === 1 && styles.alternatingRow, player.id === longestBenchPlayer && styles.suggestion]}>
                    <Text style={styles.playerName}>{player.name}</Text>
                    <View style={styles.statusRow}>
                        {playerStatus[player.id].map((status, index) => (
                          <TouchableOpacity key={index} onPress={() => toggleStatus(player.id, index)}>
                            <View 
                                style={[
                                    styles.statusBlock,
                                    { backgroundColor: status === 'on' ? theme.colors.primary : theme.colors.border },
                                    index === currentInterval && styles.activeInterval
                                ]} 
                            />
                          </TouchableOpacity>
                        ))}
                    </View>
                </View>
            )}
        />
      </View>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: theme.colors.background },
  timerContainer: { padding: theme.spacing.lg, alignItems: 'center' },
  timer: { ...theme.typography.h1, position: 'absolute', top: '50%', left: '50%', transform: [{translateX: -50}, {translateY: -20}], color: theme.colors.text },
  timerControls: { flexDirection: 'row', justifyContent: 'space-around', width: '100%', marginTop: theme.spacing.md },
  controlButton: { padding: theme.spacing.sm },
  matrixContainer: { padding: theme.spacing.sm },
  playerRow: { flexDirection: 'row', alignItems: 'center', marginBottom: 5, padding: theme.spacing.sm, borderRadius: 5 },
  alternatingRow: { backgroundColor: theme.colors.card },
  playerName: { ...theme.typography.body, width: 120, },
  statusRow: { flexDirection: 'row' },
  statusBlock: { width: 18, height: 18, borderWidth: 1, borderColor: '#ccc' },
  activeInterval: { borderWidth: 2, borderColor: theme.colors.accent },
  suggestion: { backgroundColor: theme.colors.accent, opacity: 0.8 }
});

export default SubstitutionMatrixScreen;
