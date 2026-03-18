import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Player } from '../models/Player';
import { getPlayers } from '../database';
import { useNavigation } from '@react-navigation/native';
import { theme } from '../theme';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';

type GameFlowStackParamList = {
    GameDay: undefined;
    TacticsBoard: { activePlayers: string[] };
    SubstitutionMatrix: {
      assignedPlayers: { [positionIndex: string]: Player | null };
      unassignedPlayers: Player[];
    };
  };
  
type GameDayScreenNavigationProp = NativeStackNavigationProp<GameFlowStackParamList, 'GameDay'>;

const GameDayScreen = () => {
  const navigation = useNavigation<GameDayScreenNavigationProp>();
  const [roster, setRoster] = useState<Player[]>([]);
  const [activePlayers, setActivePlayers] = useState<string[]>([]);

  const loadRoster = useCallback(async () => {
    const players = await getPlayers();
    setRoster(players);
  }, []);

  useEffect(() => {
    const unsubscribe = navigation.addListener('focus', () => {
      loadRoster();
    });

    return unsubscribe;
  }, [navigation, loadRoster]);

  const togglePlayerActive = (id: string) => {
    setActivePlayers(prev => 
      prev.includes(id) ? prev.filter(pId => pId !== id) : [...prev, id]
    );
  };

  const EmptyRoster = () => (
    <View style={styles.emptyContainer}>
        <Text style={styles.emptyText}>No players on the roster!</Text>
        <Text style={styles.emptySubText}>Go to the Roster tab to add players.</Text>
    </View>
    )

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Game Day Roster</Text>
      <FlatList
        data={roster}
        keyExtractor={item => item.id}
        ListEmptyComponent={EmptyRoster}
        renderItem={({ item }) => (
          <TouchableOpacity 
            style={[styles.playerItem, activePlayers.includes(item.id) && styles.activePlayer]}
            onPress={() => togglePlayerActive(item.id)}
          >
            <Text style={[styles.playerName, activePlayers.includes(item.id) && {color: 'white'}]}>{item.name} (#{item.jerseyNumber})</Text>
            <Text style={[styles.playerPosition, activePlayers.includes(item.id) && {color: 'white'}]}>{item.primaryPosition}</Text>
          </TouchableOpacity>
        )}
      />
      <TouchableOpacity 
        style={[styles.startButton, activePlayers.length === 0 && styles.disabledButton]}
        onPress={() => navigation.navigate('TacticsBoard', { activePlayers })} 
        disabled={activePlayers.length === 0}
      >
        <Text style={styles.startButtonText}>Go to Tactics Board ({activePlayers.length})</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
    container: {
      flex: 1,
      padding: theme.spacing.md,
      backgroundColor: theme.colors.background,
    },
    title: {
      ...theme.typography.h2,
      color: theme.colors.text,
      marginBottom: theme.spacing.md,
    },
    playerItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      padding: theme.spacing.md,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.card,
    },
    activePlayer: {
      backgroundColor: theme.colors.primary,
    },
    playerName: {
        ...theme.typography.body,
    },
    playerPosition: {
        ...theme.typography.body,
        color: theme.colors.text,
        opacity: 0.7
    },
    startButton: {
        backgroundColor: theme.colors.primary,
        padding: theme.spacing.md,
        borderRadius: theme.spacing.sm,
        alignItems: 'center',
        marginTop: theme.spacing.md,
    },
    disabledButton: {
        backgroundColor: theme.colors.border,
    },
    startButtonText: {
        ...theme.typography.body,
        color: 'white',
        fontWeight: 'bold',
    },
    emptyContainer: {
        flex: 1,
        justifyContent: 'center',
        alignItems: 'center',
        marginTop: theme.spacing.xl,
    },
    emptyText: {
        ...theme.typography.h2,
        color: theme.colors.text,
    },
    emptySubText: {
        ...theme.typography.body,
        color: theme.colors.text,
        opacity: 0.7,
        marginTop: theme.spacing.sm,
    }
  });

export default GameDayScreen;
