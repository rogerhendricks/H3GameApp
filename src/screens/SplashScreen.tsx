import React, { useEffect, useRef, useMemo } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Animated } from 'react-native';
import Icon from 'react-native-vector-icons/Ionicons';
import { useTheme } from '../context/ThemeContext';

const SplashScreen = () => {
  const { theme } = useTheme();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const slideAnim = useRef(new Animated.Value(24)).current;

  const styles = useMemo(() => StyleSheet.create({
    container: {
      flex: 1,
      backgroundColor: theme.colors.primary,
      justifyContent: 'center',
      alignItems: 'center',
    },
    logoBlock: {
      alignItems: 'center',
      marginBottom: 80,
    },
    appName: {
      fontSize: 72,
      fontWeight: '900',
      color: '#FFFFFF',
      letterSpacing: 6,
      marginTop: theme.spacing.md,
    },
    divider: {
      width: 40,
      height: 2,
      backgroundColor: 'rgba(255,255,255,0.35)',
      borderRadius: 1,
      marginVertical: theme.spacing.sm,
    },
    tagline: {
      fontSize: 13,
      fontWeight: '600',
      color: 'rgba(255,255,255,0.70)',
      letterSpacing: 2.5,
      textTransform: 'uppercase',
    },
    loadingBlock: {
      position: 'absolute',
      bottom: 56,
      alignItems: 'center',
      gap: theme.spacing.xs,
    },
    loadingText: {
      fontSize: 12,
      color: 'rgba(255,255,255,0.45)',
      letterSpacing: 1,
    },
  }), [theme]);

  useEffect(() => {
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 500,
        useNativeDriver: true,
      }),
      Animated.timing(slideAnim, {
        toValue: 0,
        duration: 500,
        useNativeDriver: true,
      }),
    ]).start();
  }, [fadeAnim, slideAnim]);

  return (
    <View style={styles.container}>
      <Animated.View
        style={[
          styles.logoBlock,
          { opacity: fadeAnim, transform: [{ translateY: slideAnim }] },
        ]}
      >
        <Icon name="american-football" size={80} color="rgba(255,255,255,0.95)" />
        <Text style={styles.appName}>H3</Text>
        <View style={styles.divider} />
        <Text style={styles.tagline}>Game Day Manager</Text>
      </Animated.View>

      <Animated.View style={[styles.loadingBlock, { opacity: fadeAnim }]}>
        <ActivityIndicator size="small" color="rgba(255,255,255,0.6)" />
        <Text style={styles.loadingText}>Loading…</Text>
      </Animated.View>
    </View>
  );
};

export default SplashScreen;
