import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TextInput,
  Button,
  FlatList,
  TouchableOpacity,
} from 'react-native';
import { Player } from '../models/Player';
import { openDB, getPlayers, addPlayerDB, deletePlayerDB } from '../database';
import { useNavigation, CompositeNavigationProp } from '@react-navigation/native';
import { BottomTabNavigationProp } from '@react-navigation/bottom-tabs';
import { NativeStackNavigationProp } from '@react-navigation/native-stack';
import Icon from 'react-native-vector-icons/Ionicons';
import { theme } from '../theme';

type RootStackParamList = {
  TeamRoster: undefined;
  GameDay: undefined;
};

type RootTabParamList = {
    Roster: undefined;
    "Game Day": undefined;
}

type TeamRosterScreenNavigationProp = CompositeNavigationProp<
  NativeStackNavigationProp<RootStackParamList, 'TeamRoster'>,
  BottomTabNavigationProp<RootTabParamList>
>;


const TeamRosterScreen = () => {
    const navigation = useNavigation<TeamRosterScreenNavigationProp>();
    const [players, setPlayers] = useState<Player[]>([]);
    const [name, setName] = useState('');
    const [jerseyNumber, setJerseyNumber] = useState('');
    const [primaryPosition, setPrimaryPosition] = useState('');
    const [secondaryPosition, setSecondaryPosition] = useState('');
  
    const loadPlayers = useCallback(async () => {
      try {
        const storedPlayers = await getPlayers();
        setPlayers(storedPlayers);
      } catch (error) {
        console.error('Failed to load players', error);
      }
    }, []);
  
    useEffect(() => {
      const unsubscribe = navigation.addListener('focus', () => {
        openDB().then(() => {
          loadPlayers();
        });
      });
  
      return unsubscribe;
    }, [navigation, loadPlayers]);
  
    const addPlayer = async () => {
      if (name && jerseyNumber && primaryPosition) {
        const newPlayer: Player = {
          id: Math.random().toString(),
          name,
          jerseyNumber: parseInt(jerseyNumber, 10),
          primaryPosition,
          secondaryPosition,
        };
        await addPlayerDB(newPlayer);
        loadPlayers();
        setName('');
        setJerseyNumber('');
        setPrimaryPosition('');
        setSecondaryPosition('');
      }
    };
  
    const deletePlayer = async (id: string) => {
      await deletePlayerDB(id);
      loadPlayers();
    };

    const EmptyRoster = () => (
        <View style={styles.emptyContainer}>
            <Text style={styles.emptyText}>No players yet!</Text>
            <Text style={styles.emptySubText}>Add a player to get started.</Text>
        </View>
    )
  
    return (
      <View style={styles.container}>
        <Text style={styles.title}>Team Roster</Text>
        <View style={styles.inputContainer}>
          <TextInput
            style={styles.input}
            placeholder="Player Name"
            value={name}
            onChangeText={setName}
            placeholderTextColor={theme.colors.border}
          />
          <TextInput
            style={styles.input}
            placeholder="Jersey Number"
            value={jerseyNumber}
            onChangeText={setJerseyNumber}
            keyboardType="numeric"
            placeholderTextColor={theme.colors.border}
          />
          <TextInput
            style={styles.input}
            placeholder="Primary Position"
            value={primaryPosition}
            onChangeText={setPrimaryPosition}
            placeholderTextColor={theme.colors.border}
          />
          <TextInput
            style={styles.input}
            placeholder="Secondary Position (Optional)"
            value={secondaryPosition}
            onChangeText={setSecondaryPosition}
            placeholderTextColor={theme.colors.border}
          />
          <Button title="Add Player" onPress={addPlayer} color={theme.colors.primary} />
        </View>
        <FlatList
          data={players}
          keyExtractor={item => item.id}
          ListEmptyComponent={EmptyRoster}
          renderItem={({ item }) => (
            <View style={styles.playerItem}>
              <View>
                <Text style={styles.playerName}>{item.name} (#{item.jerseyNumber})</Text>
                <Text style={styles.playerPosition}>{item.primaryPosition}{item.secondaryPosition ? ` / ${item.secondaryPosition}` : ''}</Text>
              </View>
              <TouchableOpacity onPress={() => deletePlayer(item.id)} style={styles.deleteButton}>
                <Icon name="trash-outline" size={24} color={theme.colors.danger} />
              </TouchableOpacity>
            </View>
          )}
        />
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
    inputContainer: {
      marginBottom: theme.spacing.md,
      backgroundColor: theme.colors.card,
      padding: theme.spacing.md,
      borderRadius: theme.spacing.sm,
    },
    input: {
      ...theme.typography.body,
      height: 40,
      borderColor: theme.colors.border,
      borderWidth: 1,
      marginBottom: theme.spacing.sm,
      paddingHorizontal: theme.spacing.sm,
      borderRadius: theme.spacing.xs,
    },
    playerItem: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      padding: theme.spacing.sm,
      borderBottomWidth: 1,
      borderBottomColor: theme.colors.border,
      backgroundColor: theme.colors.card,
    },
    playerName: {
        ...theme.typography.body,
        fontWeight: 'bold',
    },
    playerPosition: {
      ...theme.typography.body,
      color: theme.colors.text,
      opacity: 0.7
    },
    deleteButton: {
      padding: theme.spacing.sm,
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
  
  export default TeamRosterScreen;

