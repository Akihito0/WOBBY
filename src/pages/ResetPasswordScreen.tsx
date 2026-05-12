import React, { useState, useRef, useEffect } from 'react';
import { 
  View, 
  Text, 
  TextInput, 
  TouchableOpacity, 
  Alert, 
  ActivityIndicator, 
  StyleSheet,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  Dimensions
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import AuthBackground from '../components/layout/AuthBackground';
import { supabase } from '../supabase';

const { height } = Dimensions.get('window');

export default function ResetPasswordScreen({ 
  onDone, 
  onCancel,
  prefillEmail 
}: { 
  onDone: () => void;
  onCancel?: () => void;
  prefillEmail?: string;
}) {
  const [email, setEmail] = useState(prefillEmail || '');
  const [code, setCode] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);
  const [step, setStep] = useState<'verify' | 'reset'>('verify'); // Track current step
  const [countdown, setCountdown] = useState(60); // 60 seconds countdown
  const codeInputs = useRef<(TextInput | null)[]>([]);

  useEffect(() => {
    let timer: NodeJS.Timeout;
    if (step === 'verify' && countdown > 0) {
      timer = setInterval(() => {
        setCountdown((prev) => prev - 1);
      }, 1000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [step, countdown]);

  const handleResendCode = async () => {
    if (countdown > 0) return;
    setLoading(true);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email);
      if (error) {
        Alert.alert('Error', error.message);
      } else {
        Alert.alert('Success', 'Verification code resent!');
        setCountdown(60);
        setCode('');
        codeInputs.current[0]?.focus();
      }
    } catch (error: any) {
      Alert.alert('Error', error.message || 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleCodeChange = (text: string, index: number) => {
    const newCode = code.split('');
    newCode[index] = text;
    const updatedCode = newCode.join('');
    setCode(updatedCode);

    // Auto-move to next input
    if (text && index < 7) {
      codeInputs.current[index + 1]?.focus();
    }
  };

  const handleCodeBackspace = (index: number) => {
    if (!code[index] && index > 0) {
      codeInputs.current[index - 1]?.focus();
    }
  };

  const handleVerifyCode = async () => {
    if (code.length !== 8) {
      Alert.alert('Error', 'Please enter all 8 digits');
      return;
    }

    setLoading(true);
    try {
      // Verify the OTP code
      const { error: verifyError } = await supabase.auth.verifyOtp({
        email: email,
        token: code,
        type: 'recovery',
      });

      if (verifyError) {
        Alert.alert('Error', verifyError.message || 'Invalid code');
        console.error('❌ OTP verification failed:', verifyError);
        setLoading(false);
        return;
      }

      console.log('✅ Code verified successfully!');
      setStep('reset'); // Move to password reset step
    } catch (error) {
      console.error('❌ Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const handleResetPassword = async () => {
    if (!password || !confirmPassword) {
      Alert.alert('Error', 'Please fill in all password fields');
      return;
    }

    if (password !== confirmPassword) {
      Alert.alert('Error', 'Passwords do not match');
      return;
    }

    if (password.length < 6) {
      Alert.alert('Error', 'Password must be at least 6 characters');
      return;
    }

    setLoading(true);
    try {
      // Update password
      const { error: updateError } = await supabase.auth.updateUser({ password });

      if (updateError) {
        Alert.alert('Error', updateError.message);
        console.error('❌ Password update failed:', updateError);
      } else {
        Alert.alert('Success', 'Password updated!');
        console.log('✅ Password reset successful');
        onDone();
      }
    } catch (error) {
      console.error('❌ Unexpected error:', error);
      Alert.alert('Error', 'An unexpected error occurred. Please try again.');
    } finally {
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
            <View style={styles.headerContainer}>
              <TouchableOpacity 
                onPress={onCancel}
                style={styles.backBtnAbsolute}
              >
                <Text style={styles.backBtnText}>{'< Back'}</Text>
              </TouchableOpacity>
              <Text 
                style={styles.title} 
                numberOfLines={1} 
                adjustsFontSizeToFit
              >
                {step === 'verify' ? 'Verify Code' : 'New Password'}
              </Text>
            </View>
            
            <Text style={styles.subtitle}>
              {step === 'verify' 
                ? 'Enter the 8-digit code sent to your email'
                : 'Create a new password for your account'}
            </Text>

            <View style={styles.titleDivider} />

            <View style={styles.form}>
              {step === 'verify' ? (
                // ─── CODE VERIFICATION STEP ───
                <>
                  <Text style={styles.label}>Verification Code</Text>
                  
                  <View style={styles.codeInputContainer}>
                    {[0, 1, 2, 3, 4, 5, 6, 7].map((index) => (
                      <TextInput
                        key={index}
                        ref={(ref) => { codeInputs.current[index] = ref; }}
                        style={styles.codeInput}
                        maxLength={1}
                        keyboardType="numeric"
                        value={code[index] || ''}
                        onChangeText={(text) => handleCodeChange(text, index)}
                        onKeyPress={({ nativeEvent }) => {
                          if (nativeEvent.key === 'Backspace') {
                            handleCodeBackspace(index);
                          }
                        }}
                        editable={!loading}
                      />
                    ))}
                  </View>

                  <TouchableOpacity
                    style={[styles.nextButton, loading && { opacity: 0.8 }]}
                    onPress={handleVerifyCode}
                    disabled={loading || code.length !== 8}
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
                      <Text style={styles.nextButtonText}>Verify & Next</Text>
                    )}
                  </TouchableOpacity>

                  <TouchableOpacity
                    onPress={handleResendCode}
                    disabled={countdown > 0 || loading}
                    style={styles.resendContainer}
                  >
                    <Text style={[styles.resendText, countdown > 0 && styles.resendTextDisabled]}>
                      {countdown > 0 ? `Resend Code (${countdown}s)` : 'Resend Verification Code'}
                    </Text>
                  </TouchableOpacity>
                </>
              ) : (
                // ─── PASSWORD RESET STEP ───
                <>
                  {/* Password Field */}
                  <Text style={styles.label}>     New Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Enter new password"
                      placeholderTextColor="#999"
                      secureTextEntry={!showPassword}
                      value={password}
                      onChangeText={setPassword}
                      editable={!loading}
                    />
                    <TouchableOpacity
                      onPress={() => setShowPassword(!showPassword)}
                      style={styles.eyeBtn}
                    >
                      <Text style={styles.eyeText}>{showPassword ? '👁️' : '👁️‍🗨️'}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Confirm Password Field */}
                  <Text style={styles.label}>     Confirm Password</Text>
                  <View style={styles.passwordContainer}>
                    <TextInput
                      style={styles.passwordInput}
                      placeholder="Confirm new password"
                      placeholderTextColor="#999"
                      secureTextEntry={!showConfirmPassword}
                      value={confirmPassword}
                      onChangeText={setConfirmPassword}
                      editable={!loading}
                    />
                    <TouchableOpacity
                      onPress={() => setShowConfirmPassword(!showConfirmPassword)}
                      style={styles.eyeBtn}
                    >
                      <Text style={styles.eyeText}>{showConfirmPassword ? '👁️' : '👁️‍🗨️'}</Text>
                    </TouchableOpacity>
                  </View>

                  {/* Reset Button */}
                  <TouchableOpacity
                    style={[styles.resetButton, loading && { opacity: 0.8 }]}
                    onPress={handleResetPassword}
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
                      <Text style={styles.resetButtonText}>Reset Password</Text>
                    )}
                  </TouchableOpacity>
                </>
              )}
            </View>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </AuthBackground>
  );
}

const styles = StyleSheet.create({
  heroSection: {
    height: height * 0.15,
  },
  whiteSheet: {
    flex: 1,
    backgroundColor: '#FFFFFF',
    borderTopLeftRadius: 45,
    borderTopRightRadius: 45,
    paddingHorizontal: 30,
    paddingTop: 28,
    alignItems: 'center',
    minHeight: height * 0.85,
  },
  headerContainer: {
    width: '100%',
    alignItems: 'center',
    justifyContent: 'center',
    position: 'relative',
    marginBottom: 10,
    marginTop: 10,
    height: 40,
  },
  backBtnAbsolute: {
    position: 'absolute',
    left: -10, // slight negative left to align with edge padding nicely
    paddingVertical: 10,
    paddingHorizontal: 10,
    zIndex: 10,
  },
  backBtnText: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 16,
    color: '#999', // A bit softer so it doesn't fight the title
  },
  title: {
    fontFamily: 'Montserrat-Black',
    fontSize: 28,
    color: '#000',
    textAlign: 'center',
    maxWidth: '75%', // Ensure it doesn't overlap the back button
  },
  subtitle: {
    fontFamily: 'Montserrat-Regular',
    fontSize: 14,
    color: '#666',
    marginTop: 8,
    textAlign: 'center',
    lineHeight: 20,
  },
  titleDivider: {
    width: 340,
    height: 3.5,
    backgroundColor: '#000000',
    marginTop: 18,
    marginBottom: 24,
  },
  form: {
    width: '100%',
  },
  label: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 15,
    color: '#000',
    marginTop: 14,
    marginBottom: 12,
    textAlign: 'center',
  },
  codeInputContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: 30,
    marginTop: 20,
    width: '100%',
  },
  codeInput: {
    width: '11%',
    height: 50,
    borderWidth: 2,
    borderColor: '#CCFF00',
    borderRadius: 10,
    textAlign: 'center',
    fontSize: 22,
    fontFamily: 'Montserrat-Bold',
    color: '#000',
    backgroundColor: '#FAFAFA',
    padding: 0, // Important to prevent number from getting clipped
  },
  nextButton: {
    width: '100%',
    height: 56,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#000000',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    marginBottom: 20,
  },
  nextButtonText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 18,
    color: '#000',
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
    marginBottom: 8,
  },
  passwordContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#000000',
    backgroundColor: '#FAFAFA',
    height: 50,
    paddingRight: 10,
    marginBottom: 8,
  },
  passwordInput: {
    flex: 1,
    paddingHorizontal: 15,
    fontFamily: 'Montserrat-Regular',
    fontSize: 14,
    color: '#000',
  },
  eyeBtn: {
    padding: 10,
    justifyContent: 'center',
    alignItems: 'center',
  },
  eyeText: {
    fontSize: 20,
  },
  resetButton: {
    width: '100%',
    height: 56,
    borderRadius: 15,
    borderWidth: 2,
    borderColor: '#000000',
    overflow: 'hidden',
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 5,
    marginTop: 20,
  },
  resetButtonText: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 24,
    color: '#000',
  },
  resendContainer: {
    alignItems: 'center',
    marginTop: 15,
    padding: 10,
  },
  resendText: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 14,
    color: '#000',
    textDecorationLine: 'underline',
  },
  resendTextDisabled: {
    color: '#888',
    textDecorationLine: 'none',
  },
});