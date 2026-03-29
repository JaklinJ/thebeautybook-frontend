import React, { useEffect, useRef } from 'react';
import { View, Text, Animated, StyleSheet, Dimensions } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';

const { width, height } = Dimensions.get('window');

export default function AnimatedSplashScreen({ isAppReady, onAnimationComplete }) {
  const orb1Opacity = useRef(new Animated.Value(0)).current;
  const orb2Opacity = useRef(new Animated.Value(0)).current;
  const iconOpacity = useRef(new Animated.Value(0)).current;
  const iconScale = useRef(new Animated.Value(0.4)).current;
  const textOpacity = useRef(new Animated.Value(0)).current;
  const textTranslateY = useRef(new Animated.Value(12)).current;
  const pulseScale = useRef(new Animated.Value(1)).current;
  const ringOpacity = useRef(new Animated.Value(0)).current;
  const ringScale = useRef(new Animated.Value(0.8)).current;
  const exitOpacity = useRef(new Animated.Value(1)).current;

  const pulseLoop = useRef(null);

  useEffect(() => {
    Animated.sequence([
      // Orbs fade in
      Animated.parallel([
        Animated.timing(orb1Opacity, { toValue: 0.6, duration: 700, useNativeDriver: true }),
        Animated.timing(orb2Opacity, { toValue: 0.4, duration: 900, useNativeDriver: true }),
      ]),
      // Icon spring in
      Animated.parallel([
        Animated.spring(iconScale, {
          toValue: 1,
          tension: 45,
          friction: 6,
          useNativeDriver: true,
        }),
        Animated.timing(iconOpacity, { toValue: 1, duration: 350, useNativeDriver: true }),
      ]),
      // Ring ripple
      Animated.parallel([
        Animated.timing(ringOpacity, { toValue: 0.35, duration: 300, useNativeDriver: true }),
        Animated.spring(ringScale, { toValue: 1.5, tension: 30, friction: 8, useNativeDriver: true }),
      ]),
      // Text slide up
      Animated.parallel([
        Animated.timing(textOpacity, { toValue: 1, duration: 450, useNativeDriver: true }),
        Animated.timing(textTranslateY, { toValue: 0, duration: 450, useNativeDriver: true }),
      ]),
    ]).start(() => {
      // Gentle pulse loop on icon
      pulseLoop.current = Animated.loop(
        Animated.sequence([
          Animated.timing(pulseScale, { toValue: 1.06, duration: 1100, useNativeDriver: true }),
          Animated.timing(pulseScale, { toValue: 1, duration: 1100, useNativeDriver: true }),
        ])
      );
      pulseLoop.current.start();
    });

    return () => pulseLoop.current?.stop();
  }, []);

  useEffect(() => {
    if (isAppReady) {
      pulseLoop.current?.stop();
      Animated.timing(exitOpacity, {
        toValue: 0,
        duration: 550,
        useNativeDriver: true,
      }).start(() => onAnimationComplete?.());
    }
  }, [isAppReady]);

  const animatedIconScale = Animated.multiply(iconScale, pulseScale);

  return (
    <Animated.View style={[styles.container, { opacity: exitOpacity }]} pointerEvents="none">
      <LinearGradient
        colors={['#0A0E1A', '#0F1629', '#0A0E1A']}
        start={{ x: 0, y: 0 }}
        end={{ x: 1, y: 1 }}
        style={StyleSheet.absoluteFill}
      />

      {/* Decorative orbs */}
      <Animated.View style={[styles.orb1, { opacity: orb1Opacity }]} />
      <Animated.View style={[styles.orb2, { opacity: orb2Opacity }]} />

      {/* Ring ripple behind icon */}
      <Animated.View
        style={[
          styles.ring,
          { opacity: ringOpacity, transform: [{ scale: ringScale }] },
        ]}
      />

      {/* Icon */}
      <Animated.View
        style={[
          styles.iconWrapper,
          { opacity: iconOpacity, transform: [{ scale: animatedIconScale }] },
        ]}
      >
        <View style={styles.iconBackground}>
          <Ionicons name="flower-outline" size={68} color="#F59E0B" />
        </View>
      </Animated.View>

      {/* Text */}
      <Animated.View
        style={[
          styles.textContainer,
          { opacity: textOpacity, transform: [{ translateY: textTranslateY }] },
        ]}
      >
        <Text style={styles.appName}>LASERIA</Text>
        <Text style={styles.tagline}>Beauty Management</Text>
      </Animated.View>

      {/* Bottom accent line */}
      <Animated.View style={[styles.accentLine, { opacity: textOpacity }]} />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 999,
  },
  orb1: {
    position: 'absolute',
    width: 280,
    height: 280,
    borderRadius: 140,
    backgroundColor: '#F59E0B',
    top: height * 0.08,
    left: -80,
    // React Native doesn't support blur natively without a library,
    // so we simulate with a very large border radius and low opacity
    transform: [{ scaleY: 0.55 }],
  },
  orb2: {
    position: 'absolute',
    width: 220,
    height: 220,
    borderRadius: 110,
    backgroundColor: '#7C3AED',
    bottom: height * 0.1,
    right: -60,
    transform: [{ scaleX: 0.6 }],
  },
  ring: {
    position: 'absolute',
    width: 160,
    height: 160,
    borderRadius: 80,
    borderWidth: 1.5,
    borderColor: '#F59E0B',
  },
  iconWrapper: {
    marginBottom: 28,
  },
  iconBackground: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: 'rgba(245, 158, 11, 0.12)',
    borderWidth: 1,
    borderColor: 'rgba(245, 158, 11, 0.3)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  textContainer: {
    alignItems: 'center',
  },
  appName: {
    fontSize: 32,
    fontWeight: '800',
    color: '#F9FAFB',
    letterSpacing: 8,
    marginBottom: 8,
  },
  tagline: {
    fontSize: 14,
    fontWeight: '400',
    color: '#F59E0B',
    letterSpacing: 3,
    textTransform: 'uppercase',
  },
  accentLine: {
    position: 'absolute',
    bottom: height * 0.12,
    width: 40,
    height: 2,
    borderRadius: 1,
    backgroundColor: '#F59E0B',
  },
});
