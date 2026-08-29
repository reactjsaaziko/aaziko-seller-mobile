import { Ionicons } from '@expo/vector-icons';
import { Image } from 'expo-image';
import { useRouter } from 'expo-router';
import { useEffect, useRef, useState } from 'react';

import {
  ActivityIndicator,
  Keyboard,
  KeyboardAvoidingView,
  Linking,
  Platform,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { getAccessToken, login as vendorLogin } from '@/lib/auth';

const BLUE = '#5B9BD5';
const INPUT_BG = '#f1f2f4';
const PLACEHOLDER = '#9aa4ad';
const ERROR = '#e5484d';

export default function LoginScreen() {
  const router = useRouter();
  const scrollRef = useRef<ScrollView>(null);
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [keyboardOpen, setKeyboardOpen] = useState(false);
  // Stay-logged-in: while we check for a saved token we show a spinner instead
  // of the login form, so a returning user is sent straight to their orders and
  // never has to log in again (the token no longer expires). Only if there is no
  // saved token do we reveal the login form.
  const [checkingSession, setCheckingSession] = useState(true);

  useEffect(() => {
    let active = true;
    (async () => {
      const token = await getAccessToken();
      if (!active) return;
      if (token) {
        router.replace('/orders');
      } else {
        setCheckingSession(false);
      }
    })();
    return () => {
      active = false;
    };
  }, [router]);

  // Track the keyboard so we can lift the form up (and hide the big
  // illustration) when it opens — otherwise the focused input hides behind it.
  useEffect(() => {
    const showEvt = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvt = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvt, () => setKeyboardOpen(true));
    const hideSub = Keyboard.addListener(hideEvt, () => setKeyboardOpen(false));
    return () => {
      showSub.remove();
      hideSub.remove();
    };
  }, []);

  const canSubmit = username.trim().length > 0 && password.length > 0 && !loading;

  const onLogin = async () => {
    if (!canSubmit) {
      setError('Please enter your username and password.');
      return;
    }
    Keyboard.dismiss();
    setError('');
    setLoading(true);
    try {
      const result = await vendorLogin(username.trim(), password);
      if (result.ok) {
        router.replace('/orders');
        return;
      }
      setError(result.error);
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  // Open our website's Forgot Password page in the phone's browser (Chrome).
  const FORGOT_PASSWORD_URL = 'https://vendor.aaziko.com/auth/forgot-password';
  const openForgotPassword = () => {
    Linking.openURL(FORGOT_PASSWORD_URL).catch(() => {
      setError('Could not open the browser. Please try again.');
    });
  };

  // When a field is focused, make sure the form is scrolled into view.
  const revealForm = () => {
    setTimeout(() => scrollRef.current?.scrollToEnd({ animated: true }), 120);
  };

  // Checking for a saved session — show a plain spinner, not the login form.
  if (checkingSession) {
    return (
      <SafeAreaView style={[styles.safe, styles.centerAll]} edges={['top', 'bottom']}>
        <ActivityIndicator color={BLUE} size="large" />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top', 'bottom']}>
      <KeyboardAvoidingView
        style={styles.flex}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}>
        <ScrollView
          ref={scrollRef}
          style={styles.flex}
          contentContainerStyle={[
            styles.scrollContent,
            keyboardOpen && styles.scrollContentKeyboard,
          ]}
          keyboardShouldPersistTaps="handled"
          showsVerticalScrollIndicator={false}
          bounces={false}>
          {/* Aaziko logo */}
          <Image
            source={require('@/assets/images/aaziko-logo.png')}
            style={styles.logo}
            contentFit="contain"
          />

          {/* Illustration — hidden while typing so the fields stay visible */}
          {!keyboardOpen && (
            <Image
              source={require('@/assets/images/login-illustration.png')}
              style={styles.illustration}
              contentFit="contain"
            />
          )}

          {/* Form */}
          <View style={styles.form}>
            <View style={styles.inputWrap}>
              <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor={PLACEHOLDER}
                autoCapitalize="none"
                autoCorrect={false}
                value={username}
                onFocus={revealForm}
                onChangeText={(t) => {
                  setUsername(t);
                  if (error) setError('');
                }}
                editable={!loading}
                returnKeyType="next"
              />
            </View>

            <View style={styles.inputWrap}>
              <TextInput
                style={[styles.input, styles.inputWithIcon]}
                placeholder="Password"
                placeholderTextColor={PLACEHOLDER}
                secureTextEntry={!showPassword}
                autoCapitalize="none"
                autoCorrect={false}
                value={password}
                onFocus={revealForm}
                onChangeText={(t) => {
                  setPassword(t);
                  if (error) setError('');
                }}
                editable={!loading}
                returnKeyType="go"
                onSubmitEditing={onLogin}
              />
              <Pressable
                onPress={() => setShowPassword((v) => !v)}
                hitSlop={12}
                style={styles.eyeBtn}
                accessibilityRole="button"
                accessibilityLabel={showPassword ? 'Hide password' : 'Show password'}>
                <Ionicons
                  name={showPassword ? 'eye-outline' : 'eye-off-outline'}
                  size={22}
                  color={PLACEHOLDER}
                />
              </Pressable>
            </View>

            <TouchableOpacity
              onPress={openForgotPassword}
              style={styles.adminLinkWrap}
              activeOpacity={0.7}>
              <Text style={styles.adminLink}>Forgot Password?</Text>
            </TouchableOpacity>

            {error ? <Text style={styles.errorText}>{error}</Text> : null}
          </View>

          {/* Log in */}
          <TouchableOpacity
            style={[styles.loginBtn, !canSubmit && styles.loginBtnDisabled]}
            onPress={onLogin}
            activeOpacity={0.85}
            disabled={!canSubmit}>
            {loading ? (
              <ActivityIndicator color="#ffffff" />
            ) : (
              <Text style={styles.loginText}>Log in</Text>
            )}
          </TouchableOpacity>
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: { flex: 1, backgroundColor: '#ffffff' },
  centerAll: { alignItems: 'center', justifyContent: 'center' },
  flex: { flex: 1 },
  scrollContent: {
    flexGrow: 1,
    justifyContent: 'center',
    paddingHorizontal: 24,
    paddingTop: 8,
    paddingBottom: 24,
  },
  // When the keyboard is open, anchor content to the top so the fields sit
  // above the keyboard instead of being centered (and hidden behind it).
  scrollContentKeyboard: {
    justifyContent: 'flex-start',
    paddingTop: 24,
  },
  logo: {
    width: 150,
    height: 40,
    alignSelf: 'center',
    marginTop: 8,
    marginBottom: 6,
  },
  illustration: {
    width: '100%',
    height: 260,
    alignSelf: 'center',
    marginTop: 4,
    marginBottom: 18,
  },
  form: { gap: 14 },
  inputWrap: {
    backgroundColor: INPUT_BG,
    borderRadius: 8,
    height: 52,
    justifyContent: 'center',
  },
  input: {
    height: 52,
    paddingHorizontal: 16,
    fontSize: 15,
    color: '#2b3138',
  },
  inputWithIcon: { paddingRight: 48 },
  eyeBtn: {
    position: 'absolute',
    right: 14,
    height: 52,
    justifyContent: 'center',
  },
  adminLinkWrap: { alignSelf: 'flex-end', paddingVertical: 2 },
  adminLink: { color: BLUE, fontSize: 13, fontWeight: '500' },
  errorText: { color: ERROR, fontSize: 13, marginTop: 2 },
  loginBtn: {
    backgroundColor: BLUE,
    borderRadius: 8,
    height: 52,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: 28,
  },
  loginBtnDisabled: { opacity: 0.6 },
  loginText: { color: '#ffffff', fontSize: 16, fontWeight: '600' },
});
