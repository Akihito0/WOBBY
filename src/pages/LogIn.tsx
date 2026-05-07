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
  ActivityIndicator,
  Modal,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AuthBackground from '../components/layout/AuthBackground';
import { supabase } from '../supabase';
import * as WebBrowser from 'expo-web-browser';
import * as Linking from 'expo-linking';

const { width, height } = Dimensions.get('window');

export default function LogIn({ onNavigateToRegister, onSignIn, onNavigateToReset }: { 
  onNavigateToRegister: () => void;
  onSignIn: () => void;
  onNavigateToReset?: (email: string) => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [forgotPasswordModalVisible, setForgotPasswordModalVisible] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);

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
      console.log('🚀 Auth state listener will handle routing based on profile completeness...');
      // Don't call onSignIn directly - let onAuthStateChange listener handle routing
      // It will check profile completeness and route appropriately
    }
    setLoading(false);
  };

  const handleForgotPassword = async () => {
    if (!resetEmail) {
      Alert.alert('Error', 'Please enter your email address');
      return;
    }

    setResetLoading(true);
    try {
      // Send a recovery email with a code (not a deep link)
      const { error } = await supabase.auth.resetPasswordForEmail(resetEmail, {
        redirectTo: undefined, // Don't use deep link, code will be sent via email
      });

      if (error) {
        Alert.alert('Error', error.message);
        console.error('❌ Password reset failed:', error.message);
      } else {
        setResetSuccess(true);
        console.log('✅ Password reset code sent to:', resetEmail);
      }
    } catch (err) {
      console.error('❌ Unexpected error:', err);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setResetLoading(false);
    }
  };

  const closeForgotPasswordModal = () => {
    setForgotPasswordModalVisible(false);
    setResetEmail('');
    setResetSuccess(false);
  };

  // Helper function to extract session from URL manually since parseRedirectUrl works inconsistently
  const extractAndSetSession = async (url: string) => {
    console.log('📍 Extracting session directly from URL:', url);
    
    // URL usually has #access_token=...&refresh_token=...
    const paramString = url.includes('#') ? url.split('#')[1] : url.split('?')[1];
    
    if (!paramString) {
      console.warn('⚠️ No parameters found in URL hash/query');
      return false;
    }
    
    const params: Record<string, string> = {};
    paramString.split('&').forEach(pair => {
      const [key, value] = pair.split('=');
      if (key && value) {
        params[key] = decodeURIComponent(value);
      }
    });
    
    if (params.access_token && params.refresh_token) {
      console.log('✅ Found access_token and refresh_token in URL!');
      const { error: setError } = await supabase.auth.setSession({
        access_token: params.access_token,
        refresh_token: params.refresh_token,
      });
      
      if (setError) {
        throw setError;
      }
      return true;
    } else if (params.error_description) {
      throw new Error(params.error_description);
    }
    
    return false;
  };

  const handleGoogleSignIn = async () => {
    try {
      setLoading(true);
      const redirectUrl = Linking.createURL('/');

      const { data, error } = await supabase.auth.signInWithOAuth({
        provider: 'google',
        options: {
          redirectTo: redirectUrl,
          queryParams: {
            prompt: 'select_account' // Forces the account selector to show every time
          }
        },
      });

      if (error) {
        Alert.alert('Google Error', error.message);
        setLoading(false);
        return;
      }

      if (data?.url) {
        const result = await WebBrowser.openAuthSessionAsync(data.url, redirectUrl);

        if (result.type === 'dismiss') {
          console.log('User dismissed Google sign-in');
          setLoading(false);
        } else if (result.type === 'success') {
          console.log('✅ OAuth browser closed, parsing returned redirect URL...');
          
          if (result.url) {
            try {
              const sessionSet = await extractAndSetSession(result.url);
              
              if (sessionSet) {
                console.log('✅ Session set successfully! Auth listener will route you.');
              } else {
                console.warn('⚠️ No session info found in the redirect URL');
                Alert.alert('Error', 'Sign-in failed. Please try again.');
              }
            } catch (err: any) {
              console.error('❌ Error setting session from URL:', err);
              Alert.alert('Error', err.message || 'An error occurred processing your sign-in.');
            }
          } else {
            console.warn('⚠️ No redirect URL returned from browser');
            Alert.alert('Error', 'Sign-in failed. Please try again.');
          }
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('❌ Google sign-in error:', err);
      Alert.alert('Error', 'An error occurred during Google sign-in. Please try again.');
      setLoading(false);
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

              <TouchableOpacity onPress={() => setForgotPasswordModalVisible(true)}>
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
              <TouchableOpacity style={[styles.socialBtn, { width: '100%' }]} onPress={handleGoogleSignIn}>
                <Image
                  source={{ uri: 'https://www.google.com/favicon.ico' }}
                  style={styles.socialLogo}
                />
                <Text style={styles.socialText}>Google</Text>
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

      {/* ─── FORGOT PASSWORD MODAL ─── */}
      <Modal
        visible={forgotPasswordModalVisible}
        transparent
        animationType="fade"
        onRequestClose={closeForgotPasswordModal}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.modalContent}>
            {!resetSuccess ? (
              <>
                <Text style={styles.modalTitle}>Reset Password</Text>
                <Text style={styles.modalSubtitle}>
                  Enter your email address and we'll send you a code to reset your password.
                </Text>

                <TextInput
                  style={styles.modalInput}
                  placeholder="Enter your email"
                  placeholderTextColor="#999"
                  keyboardType="email-address"
                  autoCapitalize="none"
                  value={resetEmail}
                  onChangeText={setResetEmail}
                />

                <TouchableOpacity
                  style={[styles.resetButton, resetLoading && { opacity: 0.8 }]}
                  onPress={handleForgotPassword}
                  disabled={resetLoading}
                >
                  {resetLoading ? (
                    <ActivityIndicator color="#fff" />
                  ) : (
                    <Text style={styles.resetButtonText}>Send Reset Code</Text>
                  )}
                </TouchableOpacity>

                <TouchableOpacity onPress={closeForgotPasswordModal}>
                  <Text style={styles.modalCancelText}>Cancel</Text>
                </TouchableOpacity>
              </>
            ) : (
              <>
                <Text style={styles.modalTitle}>Check Your Email</Text>
                <Text style={styles.modalSubtitle}>
                  We've sent an 8-digit reset code to {resetEmail}. Please check your email for the code.
                </Text>

                <Text style={styles.modalNote}>
                  Use this code along with your email to reset your password in the app.
                </Text>

                <TouchableOpacity
                  style={styles.resetButton}
                  onPress={() => {
                    if (onNavigateToReset) {
                      onNavigateToReset(resetEmail);
                      closeForgotPasswordModal();
                    }
                  }}
                >
                  <Text style={styles.resetButtonText}>Enter Code</Text>
                </TouchableOpacity>

                <TouchableOpacity onPress={closeForgotPasswordModal}>
                  <Text style={styles.modalCancelText}>Later</Text>
                </TouchableOpacity>
              </>
            )}
          </View>
        </View>
      </Modal>
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
  // ─── FORGOT PASSWORD MODAL STYLES ───
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
  },
  modalContent: {
    backgroundColor: '#FFF',
    borderRadius: 20,
    padding: 30,
    width: '100%',
    maxWidth: 350,
    alignItems: 'center',
    elevation: 10,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 5 },
    shadowOpacity: 0.25,
    shadowRadius: 10,
  },
  modalTitle: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 24,
    color: '#000',
    marginBottom: 10,
    textAlign: 'center',
  },
  modalSubtitle: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 14,
    color: '#666',
    marginBottom: 20,
    textAlign: 'center',
    lineHeight: 20,
  },
  modalInput: {
    width: '100%',
    height: 50,
    borderWidth: 1,
    borderColor: '#000',
    borderRadius: 10,
    paddingHorizontal: 15,
    fontFamily: 'Montserrat-Regular',
    fontSize: 14,
    color: '#000',
    backgroundColor: '#FAFAFA',
    marginBottom: 20,
  },
  resetButton: {
    width: '100%',
    height: 50,
    backgroundColor: '#000',
    borderRadius: 10,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: 15,
  },
  resetButtonText: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 16,
    color: '#FFF',
  },
  modalCancelText: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 14,
    color: '#999',
  },
  modalNote: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 12,
    color: '#999',
    marginBottom: 20,
    textAlign: 'center',
    fontStyle: 'italic',
  },
});