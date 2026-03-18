import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { RouteProp, useNavigation } from '@react-navigation/native';
import RNPickerSelect from 'react-native-picker-select';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { DraxProvider, DraxView, DraxList } from 'react-native-drax';
import Animated, { Layout } from 'react-native-reanimated';
import { Player } from '../models/Player';
import { getPlayers } from '../database';
import { theme } from '../theme';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import FieldBackground from '../components/FieldBackground';

type GameFlowStackParamList = {
    GameDay: undefined;
    TacticsBoard: { activePlayers: string[] };
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

const formations = {
  '4-4-2': [
    { top: '85%', left: '42%' }, // Goalkeeper
    { top: '70%', left: '10%' }, { top: '70%', left: '30%' }, { top: '70%', left: '55%' }, { top: '70%', left: '75%' }, // Defenders
    { top: '45%', left: '10%' }, { top: '45%', left: '30%' }, { top: '45%', left: '55%' }, { top: '45%', left: '75%' }, // Midfielders
    { top: '20%', left: '30%' }, { top: '20%', left: '55%' } // Forwards
  ],
  '4-3-3': [
    { top: '85%', left: '42%' }, // Goalkeeper
    { top: '70%', left: '10%' }, { top: '70%', left: '30%' }, { top: '70%', left: '55%' }, { top: '70%', left: '75%' }, // Defenders
    { top: '45%', left: '20%' }, { top: '50%', left: '42%' }, { top: '45%', left: '65%' }, // Midfielders
    { top: '25%', left: '15%' }, { top: '20%', left: '42%' }, { top: '25%', left: '70%' } // Forwards
  ],
  '4-2-3-1': [
    { top: '85%', left: '42%' }, // Goalkeeper
    { top: '70%', left: '10%' }, { top: '70%', left: '30%' }, { top: '70%', left: '55%' }, { top: '70%', left: '75%' }, // Defenders
    { top: '55%', left: '30%' }, { top: '55%', left: '55%' }, // CDMs
    { top: '35%', left: '15%' }, { top: '35%', left: '42%' }, { top: '35%', left: '70%' }, // CAMs
    { top: '15%', left: '42%' } // Forward
  ],
  '3-5-2': [
    { top: '85%', left: '42%' }, // Goalkeeper
    { top: '70%', left: '20%' }, { top: '75%', left: '42%' }, { top: '70%', left: '65%' }, // Defenders
    { top: '50%', left: '5%' }, { top: '45%', left: '25%' }, { top: '50%', left: '42%' }, { top: '45%', left: '60%' }, { top: '50%', left: '80%' }, // Midfielders
    { top: '20%', left: '30%' }, { top: '20%', left: '55%' } // Forwards
  ],
  '4-5-1': [
    { top: '85%', left: '42%' }, // Goalkeeper
    { top: '70%', left: '10%' }, { top: '70%', left: '30%' }, { top: '70%', left: '55%' }, { top: '70%', left: '75%' }, // Defenders
    { top: '45%', left: '5%' }, { top: '50%', left: '25%' }, { top: '45%', left: '42%' }, { top: '50%', left: '60%' }, { top: '45%', left: '80%' }, // Midfielders
    { top: '20%', left: '42%' } // Forward
  ],
  '3-4-3': [
    { top: '85%', left: '42%' }, // Goalkeeper
    { top: '70%', left: '20%' }, { top: '75%', left: '42%' }, { top: '70%', left: '65%' }, // Defenders
    { top: '50%', left: '10%' }, { top: '50%', left: '30%' }, { top: '50%', left: '55%' }, { top: '50%', left: '75%' }, // Midfielders
    { top: '25%', left: '15%' }, { top: '20%', left: '42%' }, { top: '25%', left: '70%' } // Forwards
  ]
};

const TacticsBoardScreen = ({ route }: Props) => {
  const navigation = useNavigation<TacticsBoardScreenNavigationProp>();
  const { activePlayers: activePlayerIds } = route.params;
  const [formation, setFormation] = useState<keyof typeof formations>('4-4-2');
  const [players, setPlayers] = useState<Player[]>([]);
  const [assignedPlayers, setAssignedPlayers] = useState<{ [positionIndex: number]: Player | null }>(
    Object.fromEntries(Array(11).fill(0).map((_, i) => [i, null]))
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

  const formationItems = Object.keys(formations).map(f => ({ label: f, value: f }));

  const handleDrop = (event: any, targetPositionIndex: number | null) => {
    const droppedPlayer = event.dragged.payload as Player;
    const sourcePositionIndex = Object.entries(assignedPlayers).find(([, player]) => player?.id === droppedPlayer.id)?.[0];

    const newAssignedPlayers = { ...assignedPlayers };
    if (sourcePositionIndex !== undefined) {
      newAssignedPlayers[parseInt(sourcePositionIndex)] = null;
    }

    if (targetPositionIndex !== null) {
        const playerAtTarget = newAssignedPlayers[targetPositionIndex];
        if (playerAtTarget && sourcePositionIndex !== undefined) {
            newAssignedPlayers[parseInt(sourcePositionIndex)] = playerAtTarget;
        } else if (playerAtTarget) {
            setUnassignedPlayers(prev => [...prev.filter(p => p.id !== droppedPlayer.id), playerAtTarget]);
        }
        newAssignedPlayers[targetPositionIndex] = droppedPlayer;
    } else {
        setUnassignedPlayers(prev => [...prev, droppedPlayer]);
    }
    
    setAssignedPlayers(newAssignedPlayers);
    setUnassignedPlayers(prev => prev.filter(p => p.id !== droppedPlayer.id));
  };

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('');
  }
  
  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <DraxProvider>
        <View style={styles.container}>
          <TouchableOpacity
            style={styles.button}
            onPress={() => navigation.navigate('SubstitutionMatrix', { assignedPlayers, unassignedPlayers })}
          >
            <Text style={styles.buttonText}>Start Game</Text>
          </TouchableOpacity>
          <RNPickerSelect
            onValueChange={(value) => setFormation(value)}
            items={formationItems}
            style={pickerSelectStyles}
            value={formation}
          />
          <View style={styles.field}>
            <FieldBackground />
            {formations[formation].map((pos, index) => (
              <DraxView
                key={index}
                style={[styles.dropZone, pos]}
                payload={assignedPlayers[index]}
                onReceiveDragDrop={(e) => handleDrop(e, index)}
              >
                {assignedPlayers[index] && (
                    <Animated.View layout={Layout.springify()}>
                        <DraxView payload={assignedPlayers[index]} style={styles.playerNode}>
                            <Text style={styles.playerText}>{getInitials(assignedPlayers[index]!.name)}</Text>
                        </DraxView>
                    </Animated.View>
                )}
              </DraxView>
            ))}
          </View>
          <DraxView style={styles.bench} onReceiveDragDrop={(e) => handleDrop(e, null)}>
             <DraxList
                data={unassignedPlayers}
                keyExtractor={(item) => item.id}
                renderItemContent={({ item }) => (
                    <Animated.View layout={Layout.springify()}>
                        <DraxView payload={item} style={styles.playerNode}>
                            <Text style={styles.playerText}>{getInitials(item.name)}</Text>
                        </DraxView>
                    </Animated.View>
                )}
                horizontal
              />
          </DraxView>
        </View>
      </DraxProvider>
    </GestureHandlerRootView>
  );
};

const styles = StyleSheet.create({
    container: { flex: 1, backgroundColor: theme.colors.background },
    field: { flex: 1, margin: theme.spacing.md, overflow: 'hidden' },
    dropZone: { position: 'absolute', width: 50, height: 50, borderRadius: 25, justifyContent: 'center', alignItems: 'center' },
    bench: { height: 100, padding: theme.spacing.sm, borderTopWidth: 1, borderColor: theme.colors.border, backgroundColor: theme.colors.card },
    playerNode: { width: 50, height: 50, borderRadius: 25, backgroundColor: theme.colors.primary, justifyContent: 'center', alignItems: 'center', margin: 5 },
    playerText: { color: 'white', fontWeight: 'bold' },
    button: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.md,
        borderRadius: theme.spacing.sm,
        alignItems: 'center',
        margin: theme.spacing.md,
    },
    buttonText: {
        ...theme.typography.body,
        color: 'white',
        fontWeight: 'bold',
    }
  });
  
  const pickerSelectStyles = StyleSheet.create({
    inputIOS: { fontSize: 16, paddingVertical: 12, paddingHorizontal: 10, borderWidth: 1, borderColor: theme.colors.border, borderRadius: 4, color: theme.colors.text, paddingRight: 30, backgroundColor: 'white', margin: theme.spacing.md },
    inputAndroid: { fontSize: 16, paddingHorizontal: 10, paddingVertical: 8, borderWidth: 0.5, borderColor: theme.colors.border, borderRadius: 8, color: theme.colors.text, paddingRight: 30, backgroundColor: 'white', margin: theme.spacing.md },
  });

export default TacticsBoardScreen;
