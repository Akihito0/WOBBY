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

export default function Register({ onNavigateToLogin, onRegisterSuccess }: { 
  onNavigateToLogin: () => void; 
  onRegisterSuccess: () => void;
}) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [isAwaitingConfirmation, setIsAwaitingConfirmation] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState('');

  const handleCheckConfirmation = async () => {
    setLoading(true);
    try {
      // Try to sign in to check if email is confirmed
      const { data, error } = await supabase.auth.signInWithPassword({
        email: registeredEmail,
        password: password,
      });

      if (error) {
        // Email not confirmed yet or wrong password
        if (error.message.includes('Email not confirmed')) {
          Alert.alert('Pending', 'Email not confirmed yet. Check your inbox!');
        } else {
          Alert.alert('Error', error.message);
        }
      } else {
        // Email is confirmed! Session is now active
        console.log('✅ Email confirmed! Session created:', data.user?.email);
        Alert.alert('✅ Confirmed!', 'Email verified! Starting onboarding...');
        onRegisterSuccess();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleResendConfirmation = async () => {
    setLoading(true);
    try {
      const { error } = await supabase.auth.resend({
        type: 'signup',
        email: registeredEmail,
      });

      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Confirmation email sent! Check your inbox.');
      }
    } catch (error: any) {
      Alert.alert('Error', error.message);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email || !password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all fields');
      return;
    }
    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          emailRedirectTo: Linking.createURL('/'),
        },
      });
      if (error) {
        // Check for a specific trigger-related error
        if (error.message.includes('Database error saving new user')) {
          Alert.alert(
            'Registration Error',
            'An error occurred while creating your profile. Please contact support.'
          );
        } else {
          Alert.alert('Sign Up Error', error.message);
        }
      } else {
        // Signup successful, now waiting for email confirmation
        console.log('📧 Signup successful, awaiting email confirmation...');
        setRegisteredEmail(email);
        setIsAwaitingConfirmation(true);
        Alert.alert('Success', 'Check your email to confirm your account!');
      }
    } catch (catchError: any) {
      Alert.alert('Unexpected Error', catchError.message);
    }
    setLoading(false);
  };

  // Helper function to extract session from URL manually
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

  // ✅ Only one version of each — inside the component, with WebBrowser
  const handleGoogleSignUp = async () => {
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
          console.log('User dismissed Google sign-up');
          setLoading(false);
        } else if (result.type === 'success') {
          console.log('✅ OAuth browser closed, parsing returned redirect URL...');
          
          if (result.url) {
            try {
              const sessionSet = await extractAndSetSession(result.url);
              
              if (sessionSet) {
                console.log('✅ Session set successfully! Auth listener will route you.');
              } else {
                console.warn('⚠️ No session in parsed redirect URL');
                Alert.alert('Error', 'Sign-up failed. Please try again.');
              }
            } catch (err: any) {
              console.error('❌ Error setting session from URL:', err);
              Alert.alert('Error', err.message || 'An error occurred processing your sign-up.');
            }
          } else {
            console.warn('⚠️ No redirect URL returned from browser');
            Alert.alert('Error', 'Sign-up failed. Please try again.');
          }
          setLoading(false);
        }
      }
    } catch (err) {
      console.error('❌ Google sign-up error:', err);
      Alert.alert('Error', 'An error occurred during Google sign-up. Please try again.');
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
          {isAwaitingConfirmation ? (
            // Confirmation Awaiting Screen
            <>
              <View style={styles.heroSection} />
              <View style={styles.whiteSheet}>
                <Image
                  source={require('../assets/dumbell.png')}
                  style={styles.smallIcon}
                  resizeMode="contain"
                />
                <Text style={styles.title}>Check Your Email</Text>
                <Text style={styles.subtitle}>Confirm your quest begins.</Text>

                {/* Added consistency with the main forms */}
                <View style={styles.titleDivider} />

                <View style={styles.confirmationContent}>
                  <Text style={styles.confirmationSubtitle}>
                    We sent a confirmation link to{'\n'}
                    <Text style={styles.confirmationEmailHighlight}>{registeredEmail}</Text>
                  </Text>

                  <Text style={styles.confirmationMessage}>
                    Click the link in your inbox to verify your email and start your journey.
                  </Text>

                  <TouchableOpacity
                    style={[styles.signInButton, loading && { opacity: 0.8 }]}
                    activeOpacity={0.8}
                    onPress={handleCheckConfirmation}
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
                      <Text style={styles.signInText}>Verified My Email</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleResendConfirmation}
                    disabled={loading}
                    style={styles.resendButton}
                  >
                    <Text style={styles.resendText}>Didn't get the email? <Text style={{fontWeight: '700'}}>Resend</Text></Text>
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={() => {
                      setIsAwaitingConfirmation(false);
                      setRegisteredEmail('');
                    }}
                    style={styles.backButton}
                  >
                    <Text style={styles.backText}>← Back to Sign Up</Text>
                  </TouchableOpacity>
                </View>
              </View>
            </>
          ) : (
            // Sign Up Form
            <>
              <View style={styles.heroSection} />

              <View style={styles.whiteSheet}>
            <Image
              source={require('../assets/dumbell.png')}
              style={styles.smallIcon}
              resizeMode="contain"
            />

            <Text style={styles.title}>Let's Get Started</Text>
            <Text style={styles.subtitle}>Begin your quest for fitness.</Text>

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
                    {showPassword ? (
                      <Image
                        source={require('../assets/show.png')}
                        style={{ width: 22, height: 22 }}
                        resizeMode="contain"
                      />
                    ) : (
                      <Image
                        source={require('../assets/hide.png')}
                        style={{ width: 22, height: 22 }}
                        resizeMode="contain"
                      />
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              <Text style={styles.label}>     Confirm Password</Text>
              <View style={styles.passwordContainer}>
                <TextInput
                  style={styles.passwordInput}
                  placeholder="Re-enter your password"
                  placeholderTextColor="#999"
                  secureTextEntry={!showConfirmPassword}
                  value={confirmPassword}
                  onChangeText={setConfirmPassword}
                />
                <TouchableOpacity
                  onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                  style={styles.eyeBtn}
                >
                  <View style={styles.eyeIcon}>
                    {showConfirmPassword ? (
                      <Image
                        source={require('../assets/show.png')}
                        style={{ width: 22, height: 22 }}
                        resizeMode="contain"
                      />
                    ) : (
                      <Image
                        source={require('../assets/hide.png')}
                        style={{ width: 22, height: 22 }}
                        resizeMode="contain"
                      />
                    )}
                  </View>
                </TouchableOpacity>
              </View>

              <TouchableOpacity
                style={[styles.signInButton, loading && { opacity: 0.8 }]}
                activeOpacity={0.8}
                onPress={handleSignUp}
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
                  <Text style={styles.signInText}>Sign Up</Text>
                )}
              </TouchableOpacity>
            </View>

            <View style={styles.dividerRow}>
              <View style={styles.line} />
              <Text style={styles.dividerText}>or continue with</Text>
              <View style={styles.line} />
            </View>

            <View style={styles.socialRow}>
              <TouchableOpacity style={[styles.socialBtn, { width: '100%' }]} onPress={handleGoogleSignUp}>
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
              onPress={onNavigateToLogin}
            >
              <Text style={styles.footerText}>
                Already have an account?{'  '}
                <Text style={styles.signUpLink}>Sign In</Text>
              </Text>
            </TouchableOpacity>

              </View>
            </>
          )}
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
  passwordInput: {
    flex: 1,
    paddingHorizontal: 15,
    fontFamily: 'Montserrat-Regular',
    fontSize: 14,
    color: '#000',
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
    marginTop: 24,
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
    paddingBottom: 50,
    paddingTop: 30,
    alignItems: 'center',
    width: '100%',
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
  // Confirmation Screen Styles
  confirmationContent: {
    width: '100%',
    alignItems: 'center',
    marginTop: 20,
  },
  confirmationSubtitle: {
    fontFamily: 'Montserrat-SemiBold',
    fontSize: 16,
    color: '#000',
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: 10,
  },
  confirmationEmailHighlight: {
    fontFamily: 'Montserrat-Black',
    color: '#7A9900',
    fontSize: 17,
  },
  confirmationMessage: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 30,
    paddingHorizontal: 10,
  },
  resendButton: {
    marginTop: 20,
    paddingVertical: 10,
  },
  resendText: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 14,
    color: '#000',
  },
  backButton: {
    marginTop: 10,
    paddingVertical: 10,
  },
  backText: {
    fontFamily: 'Montserrat-Medium',
    fontSize: 13,
    color: '#999',
  },
});