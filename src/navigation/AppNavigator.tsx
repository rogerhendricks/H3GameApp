import React from 'react';
import { TouchableOpacity } from 'react-native';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { NavigationContainer, DefaultTheme } from '@react-navigation/native';
import Icon from 'react-native-vector-icons/Ionicons';

import TeamRosterScreen from '../screens/TeamRosterScreen';
import GameDayScreen from '../screens/GameDayScreen';
import TacticsBoardScreen from '../screens/TacticsBoardScreen';
import SubstitutionMatrixScreen from '../screens/SubstitutionMatrixScreen';
import { GameProvider } from '../context/GameContext';
import { ThemeProvider, useTheme } from '../context/ThemeContext';

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

// Inner navigator — can call useTheme() because it sits inside ThemeProvider.
const AppNavigatorInner = () => {
  const { theme, isHighContrast, toggleTheme } = useTheme();

  const ThemeToggle = () => (
    <TouchableOpacity
      onPress={toggleTheme}
      style={{ marginRight: 14 }}
      accessibilityRole="button"
      accessibilityLabel={isHighContrast ? 'Switch to default theme' : 'Switch to high-contrast theme'}
    >
      <Icon
        name={isHighContrast ? 'sunny' : 'sunny-outline'}
        size={22}
        color={isHighContrast ? theme.colors.accent : theme.colors.text}
      />
    </TouchableOpacity>
  );

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
          headerShown: true,
          headerRight: () => <ThemeToggle />,
          headerStyle: { backgroundColor: theme.colors.card },
          headerTitleStyle: { color: theme.colors.text },
          headerShadowVisible: false,
        })}
      >
        <Tab.Screen name="Roster" component={RosterStack} />
        <Tab.Screen name="Game Day" component={GameFlowStack} />
      </Tab.Navigator>
    </NavigationContainer>
  );
};

// Outer wrapper — provides ThemeContext to the whole app.
const AppNavigator = () => (
  <ThemeProvider>
    <AppNavigatorInner />
  </ThemeProvider>
);

export default AppNavigator;
