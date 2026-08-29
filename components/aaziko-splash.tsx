import { useEffect, useRef } from 'react';
import { Animated, StyleSheet, View } from 'react-native';

/**
 * In-app Aaziko splash shown when the app opens. Fades the Aaziko logo in on a
 * white background, holds briefly, then fades out and calls onDone. Used instead
 * of relying only on the native splash because Expo Go often skips that.
 */
export default function AazikoSplash({ onDone }: { onDone: () => void }) {
  const opacity = useRef(new Animated.Value(0)).current;
  const scale = useRef(new Animated.Value(0.9)).current;

  useEffect(() => {
    Animated.sequence([
      Animated.parallel([
        Animated.timing(opacity, { toValue: 1, duration: 380, useNativeDriver: true }),
        Animated.spring(scale, { toValue: 1, friction: 6, tension: 60, useNativeDriver: true }),
      ]),
      Animated.delay(750),
      Animated.timing(opacity, { toValue: 0, duration: 380, useNativeDriver: true }),
    ]).start(({ finished }) => {
      if (finished) onDone();
    });
  }, [opacity, scale, onDone]);

  return (
    <View style={styles.container}>
      <Animated.Image
        source={require('@/assets/images/aaziko-logo.png')}
        style={[styles.logo, { opacity, transform: [{ scale }] }]}
        resizeMode="contain"
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: '#ffffff',
    alignItems: 'center',
    justifyContent: 'center',
    zIndex: 1000,
    elevation: 1000,
  },
  logo: { width: 230, height: 84 },
});
