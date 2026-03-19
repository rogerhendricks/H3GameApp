import React from 'react';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

import TeamRosterScreen from '../screens/TeamRosterScreen';
import GameDayScreen from '../screens/GameDayScreen';
import TacticsBoardScreen from '../screens/TacticsBoardScreen';
import SubstitutionMatrixScreen from '../screens/SubstitutionMatrixScreen';
import { theme } from '../theme';
import { GameProvider } from '../context/GameContext';

const Tab = createBottomTabNavigator();
const Stack = createNativeStackNavigator();

const RosterStack = () => (
    <Stack.Navigator>
        <Stack.Screen name="TeamRoster" component={TeamRosterScreen} options={{ headerShown: false }} />
    </Stack.Navigator>
);

const GameFlowStack = () => (
  <GameProvider>
    <Stack.Navigator>
        <Stack.Screen name="GameDay" component={GameDayScreen} options={{ headerShown: false }} />
        <Stack.Screen name="TacticsBoard" component={TacticsBoardScreen} />
        <Stack.Screen name="SubstitutionMatrix" component={SubstitutionMatrixScreen} />
    </Stack.Navigator>
  </GameProvider>
);


const AppNavigator = () => {
  return (
    <NavigationContainer theme={{
        ...DefaultTheme,
        colors: {
            ...DefaultTheme.colors,
            primary: theme.colors.primary,
            background: theme.colors.background,
            card: theme.colors.card,
            text: theme.colors.text,
            border: theme.colors.border,
            notification: theme.colors.accent,
        }
    }}>
      <Tab.Navigator
        screenOptions={({ route }) => ({
          tabBarIcon: ({ focused, color, size }) => {
            let iconName: string = '';

            if (route.name === 'Roster') {
              iconName = focused ? 'people' : 'people-outline';
            } else if (route.name === 'Game Day') {
              iconName = focused ? 'calendar' : 'calendar-outline';
            } 

            return <Icon name={iconName} size={size} color={color} />;
          },
          tabBarActiveTintColor: theme.colors.primary,
          tabBarInactiveTintColor: 'gray',
        })}
      >
        <Tab.Screen name="Roster" component={RosterStack} />
        <Tab.Screen name="Game Day" component={GameFlowStack} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

export default AppNavigator;
