import React, { useState } from 'react';
import {
  View,
  Text,
  TextInput,
  TouchableOpacity,
  StyleSheet,
  Image,
  Dimensions,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Alert,
  ActivityIndicator
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AuthBackground from '../components/layout/AuthBackground';
import { supabase } from '../supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

const { width, height } = Dimensions.get('window');

export default function LogIn({ onNavigateToRegister, onSignIn }: { 
  onNavigateToRegister: () => void;
  onSignIn: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  const handleSignIn = async () => {
    if (!email || !password) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    setLoading(true);
    const { data, error } = await supabase.auth.signInWithPassword({
      email: email,
      password: password,
    });
    if (error) {
      Alert.alert('Sign In Error', error.message);
      console.error('❌ Sign in failed:', error.message);
    } else {
      console.log('✅ Sign in successful! User:', data.user?.email);
      console.log('💾 Session being saved to AsyncStorage...');
      // Wait a moment for Supabase to save the session
      await new Promise(resolve => setTimeout(resolve, 500));
      console.log('🚀 Navigating to dashboard...');
      onSignIn();
    }
    setLoading(false);
  };

  const handleGoogleSignIn = async () => {
    // Use the exact string you found in your console log
    const redirectUrl = Linking.createURL('/');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'google',
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) {
      Alert.alert('Google Error', error.message);
      return;
    }

    // Use openAuthSessionAsync instead of openBrowserAsync
    // This helps the browser "redirect" back into your app automatically
    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      // Optional: Handle the result if you need to perform actions after login
      if (result.type === 'success' && result.url) {
        // Logic for successful return can go here
      }
    }
  };

  const handleFacebookSignIn = async () => {
    // Use the exact Expo URL to match your Supabase Whitelist
    const redirectUrl = Linking.createURL('/');

    const { data, error } = await supabase.auth.signInWithOAuth({
      provider: 'facebook',
      options: {
        redirectTo: redirectUrl,
      },
    });

    if (error) {
      Alert.alert('Facebook Error', error.message);
      return;
    }

    // openAuthSessionAsync handles the redirect back to Expo much better
    if (data?.url) {
      const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

      if (result.type === 'success' && result.url) {
        // User is back in the app!
        // Supabase handles the session automatically in the background.
      }
    }
  };

  return (
    <AuthBackground>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        style={{ flex: 1 }}
      >
        <ScrollView
          contentContainerStyle={{ flexGrow: 1 }}
          bounces={false}
          keyboardShouldPersistTaps="handled"
        >
          <View style={styles.heroSection} />

          <View style={styles.whiteSheet}>
            <Image
              source={require('../assets/dumbell.png')}
              style={styles.smallIcon}
              resizeMode="contain"
            />

            <Text style={styles.title}>Welcome Back!</Text>
            <Text style={styles.subtitle}>Continue what you started.</Text>

            <View style={styles.titleDivider} />

            <View style={styles.form}>
              <Text style={styles.label}>     Email Address</Text>
              <TextInput
                style={styles.input}
                placeholder="Enter your email"
                placeholderTextColor="#999"
                keyboardType="email-address"
                autoCapitalize="none"
                value={email}
                onChangeText={setEmail}
              />

              <Text style={styles.label}>     Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Enter your password"
                  placeholderTextColor="#999"
                  secureTextEntry={!showPassword}
                  value={password}
                  onChangeText={setPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowPassword(!showPassword)}
                  style={styles.eyeBtn}
                >
                  <View style={styles.eyeIcon}>
                    <Image
                      source={showPassword ? require('../assets/show.png') : require('../assets/hide.png')}
                      style={{ width: 22, height: 22 }}
                      resizeMode="contain"
                    />
                  </View>
                </TouchableOpacity>
              </View>

              <TouchableOpacity>
                <Text style={styles.forgotPass}>         Forgot your password?</Text>
              </TouchableOpacity>

              <TouchableOpacity
                style={[styles.signInButton, loading && { opacity: 0.8 }]}
                activeOpacity={0.8}
                onPress={handleSignIn}
                disabled={loading}
              >
                <LinearGradient
                  colors={['#CCFF00', '#7A9900']}
                  locations={[0.3, 1]}
                  start={{ x: 0, y: 0 }}
                  end={{ x: 1, y: 0 }}
                  style={StyleSheet.absoluteFillObject}
                />
                {loading ? (
                  <ActivityIndicator color="#000" />
                ) : (
                  <Text style={styles.signInText}>Sign In</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.dividerRow}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.line} />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity style={styles.socialBtn} onPress={handleGoogleSignIn}>
                <Image
                  source={{ uri: 'https://www.google.com/favicon.ico' }}
                  style={styles.socialLogo}
                />
                <Text style={styles.socialText}>Google</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.socialBtn} onPress={handleFacebookSignIn}>
                <Image
                  source={{ uri: 'https://www.facebook.com/favicon.ico' }}
                  style={styles.socialLogo}
                />
                <Text style={styles.socialText}>Facebook</Text>
              </TouchableOpacity>
            </View>

            <TouchableOpacity
              style={styles.footer}
              activeOpacity={0.7}
              onPress={onNavigateToRegister}
            >
              <Text style={styles.footerText}>
                Don't have an account yet?{' '}
                <Text style={styles.signUpLink}>  Sign Up</Text>
              </Text>
            </TouchableOpacity>

          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  heroSection: {
    height: height * 0.22,
  },
  whiteSheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 45,
    borderTopRightRadius: 45,
    paddingHorizontal: 30,
    paddingTop: 28,
    alignItems: 'center',
    minHeight: height * 0.78,
  },
  smallIcon: {
    width: 44,
    height: 44,
    marginBottom: 5,
    tintColor: '#000',
  },
  title: {
    fontFamily: 'Montserrat-Black',
    fontSize: 36,
    color: '#000',
    textAlign: 'center',
  },
  subtitle: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 15,
    color: '#000000',
    marginTop: 2,
    textAlign: 'center',
  },
  titleDivider: {
    width: 340,
    height: 3.5,
    backgroundColor: '#000000',
    marginTop: 18,
    marginBottom: 4,
  },
  form: { width: '100%' },
  label: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 15,
    color: '#000',
    marginTop: 14,
    marginBottom: 6,
  },
  input: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#000000',
    paddingHorizontal: 15,
    fontFamily: 'Montserrat-Regular',
    fontSize: 15,
    color: '#000',
    backgroundColor: '#FAFAFA',
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#FAFAFA',
    height: 50,
    paddingRight: 10,
  },
  eyeIcon: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeBtn: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeImage: {
    width: 22,
    height: 22,
    tintColor: '#666',
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 15,
    fontFamily: 'Montserrat-Regular',
    fontSize: 14,
    color: '#000',
  },
  forgotPass: {
    fontFamily: 'Montserrat-MediumItalic',
    fontSize: 12,
    color: '#000',
    textAlign: 'left',
    marginTop: 10,
    marginBottom: 22,
  },
  signInButton: {
    width: '100%',
    height: 56,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#000000',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
  },
  signInText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 24,
    color: '#000',
  },
  dividerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginVertical: 22,
    width: '100%',
  },
  line: { flex: 1, height: 1, backgroundColor: '#EEE' },
  dividerText: {
    marginHorizontal: 10,
    fontFamily: 'Montserrat-Regular',
    fontSize: 12,
    color: '#AAA',
  },
  socialRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    width: '100%',
    gap: 15,
  },
  socialBtn: {
    flex: 1,
    width: 130,
    height: 30,
    borderWidth: 1,
    borderColor: '#a1a1a1',
    borderRadius: 12,
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: 8,
    backgroundColor: '#FAFAFA',
  },
  socialLogo: {
    width: 20,
    height: 20,
  },
  socialText: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 14,
    color: '#333',
  },
  footer: {
    marginTop: 'auto',
    paddingBottom: 65,
    paddingTop: 10,
  },
  footerText: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 13,
    color: '#666',
  },
  signUpLink: {
    fontFamily: 'Montserrat-Bold',
    color: '#000',
  },
});