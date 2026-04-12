import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  Image,
  TouchableOpacity,
  StyleSheet,
  Dimensions,
  FlatList,
  Alert,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import * as ImagePicker from 'expo-image-picker';
import { supabase } from '../supabase';
import { decode } from 'base64-arraybuffer';
import * as FileSystem from 'expo-file-system';

const { width, height } = Dimensions.get('window');

const AVATARS = [
  { id: 'a0', source: require('../assets/a0.png') }, // placeholder — no selection
  { id: 'a1', source: require('../assets/1.png') },
  { id: 'a2', source: require('../assets/2.png') },
  { id: 'a3', source: require('../assets/3.png') },
  { id: 'a4', source: require('../assets/4.png') },
  { id: 'a5', source: require('../assets/5.png') },
];

const ITEM_SIZE = width * 0.42;
const ITEM_SPACING = (width - ITEM_SIZE) / 2;

export default function AvatarSelect({ onNavigateNext }: { onNavigateNext: () => void }) {
  const [activeIndex, setActiveIndex] = useState(0); 
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const flatListRef = useRef<FlatList>(null);

  const isOnUploadSlot = activeIndex === 0;

  const canContinue = activeIndex > 0 || (activeIndex === 0 && uploadedImage !== null);

  const handleScroll = (e: any) => {
    const offset = e.nativeEvent.contentOffset.x;
    const index = Math.round(offset / ITEM_SIZE);
    setActiveIndex(index);
  };

  const handleUpload = async () => {
    if (!isOnUploadSlot) return;

    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission needed', 'Please allow access to your gallery.');
      return;
    }

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      aspect: [1, 1],
      quality: 0.8,
    });

    if (!result.canceled && result.assets.length > 0) {
      setUploadedImage(result.assets[0].uri);
    }
  };

  const handleContinue = async () => {
    if (!canContinue) return;
    setLoading(true);

    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error("No user logged in");

      let avatarUrl = '';
      
      // Get Supabase project URL for constructing storage links
      const supabaseUrl = process.env.EXPO_PUBLIC_SUPABASE_URL;

      // Option 1: User selected a pre-made avatar
      if (activeIndex > 0) {
        const selectedAvatar = AVATARS[activeIndex];
        // Generate proper Supabase bucket URL for premade avatar
        // Format: https://[project-id].supabase.co/storage/v1/object/public/avatars/premade/[avatar-id].png
        avatarUrl = `${supabaseUrl}/storage/v1/object/public/avatars/premade/${selectedAvatar.id}.png`;
      }
      // Option 2: User uploaded a custom image
      else if (uploadedImage) {
        const base64 = await FileSystem.readAsStringAsync(uploadedImage, {
          encoding: 'base64',
        });
        
        const filePath = `${user.id}/${new Date().getTime()}.png`;
        const contentType = 'image/png';

        const { data, error: uploadError } = await supabase.storage
          .from('avatars')
          .upload(filePath, decode(base64), { contentType });

        if (uploadError) {
          throw uploadError;
        }
        
        const { data: { publicUrl } } = supabase.storage
          .from('avatars')
          .getPublicUrl(filePath);

        avatarUrl = publicUrl;
      }

      if (!avatarUrl) {
        throw new Error("No avatar selected or uploaded.");
      }

      // Update the user's profile
      const { error: updateError } = await supabase
        .from('profiles')
        .update({ avatar_url: avatarUrl })
        .eq('id', user.id);

      if (updateError) {
        throw updateError;
      }

      onNavigateNext();

    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to update avatar.');
    } finally {
      setLoading(false);
    }
  };

  const renderAvatar = ({ item, index }: { item: typeof AVATARS[0]; index: number }) => {
    const isCenter = index === activeIndex;
    return (
      <View style={[styles.avatarWrapper, { width: ITEM_SIZE }]}>
        <Image
          source={item.source}
          style={[
            styles.avatarImage,
            isCenter && styles.avatarCenter,
          ]}
          resizeMode="cover"
        />
      </View>
    );
  };

  return (
    <LinearGradient
      colors={['#FFFFFF', '#999999']}
      style={styles.container}
    >
      <View style={styles.arrowWrapper}>
        <Image
          source={require('../assets/arrow-down.png')}
          style={styles.arrowDown}
          resizeMode="contain"
        />
      </View>

      <FlatList
        ref={flatListRef}
        data={AVATARS}
        keyExtractor={(item) => item.id}
        renderItem={renderAvatar}
        horizontal
        showsHorizontalScrollIndicator={false}
        snapToInterval={ITEM_SIZE}
        decelerationRate="fast"
        contentContainerStyle={{ paddingHorizontal: ITEM_SPACING }}
        onMomentumScrollEnd={handleScroll}
        style={styles.carousel}
      />

      <View style={styles.textSection}>
        <Text style={styles.title}>Select your Avatar</Text>
        <Text style={styles.subtitle}>
          We have 5 custom premade avatars,{'\n'}or you can upload profile locally.
        </Text>
      </View>

      <TouchableOpacity
        style={[styles.uploadWrapper, !isOnUploadSlot && styles.uploadDisabled]}
        onPress={handleUpload}
        activeOpacity={!isOnUploadSlot ? 1 : 0.8}
        disabled={!isOnUploadSlot}
      >
        {uploadedImage && isOnUploadSlot ? (
          <Image
            source={{ uri: uploadedImage }}
            style={styles.uploadedPreview}
            resizeMode="cover"
          />
        ) : (
          <Image
            source={require('../assets/upload.png')}
            style={[styles.uploadImage, !isOnUploadSlot && { opacity: 0.1 }]}
            resizeMode="contain"
          />
        )}
      </TouchableOpacity>

      <Text style={[styles.uploadLabel, !isOnUploadSlot && { opacity: 0.2 }]}>
        or Upload from Local File
      </Text>
      <Text style={[styles.uploadFormat, !isOnUploadSlot && { opacity: 0.2 }]}>
        Format: jpg, png
      </Text>

      <TouchableOpacity
        style={[
          styles.continueButton,
          canContinue && styles.continueButtonActive,
        ]}
        activeOpacity={0.8}
        disabled={!canContinue || loading}
        onPress={handleContinue}
      >
        {canContinue && <View style={styles.neonBorder} />}
        <View style={styles.buttonContent}>
          {loading ? (
            <ActivityIndicator color="#CCFF00" />
          ) : (
            <>
              <Text style={[styles.buttonText, canContinue && styles.buttonTextActive]}>
                Continue
              </Text>
              <Image
                source={canContinue
                  ? require('../assets/arrow0.png')
                  : require('../assets/arrow.png')}
                style={styles.arrow}
                resizeMode="contain"
              />
            </>
          )}
        </View>
      </TouchableOpacity>
    </LinearGradient>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: 'center',
  },
  arrowWrapper: {
    marginTop: 100,
    marginBottom: 4,
    alignItems: 'center',
  },
  arrowDown: {
    width: 22,
    height: 22,
  },
  carousel: {
    flexGrow: 0,
    height: ITEM_SIZE * 1.2,
  },
  avatarWrapper: {
    justifyContent: 'center',
    alignItems: 'center',
    height: ITEM_SIZE * 1.1, 
  },
  avatarImage: {
    width: ITEM_SIZE * 0.72,
    height: ITEM_SIZE * 0.72,
    borderRadius: 24,
    opacity: 0.45,
    transform: [{ translateY: 20 }], 
  },
  avatarCenter: {
    opacity: 1,
    transform: [{ scale: 1.08 }, { translateY: 0 }], 
  },
  textSection: {
    alignItems: 'center',
    marginTop: 18,
    paddingHorizontal: 30,
  },
  title: {
    fontFamily: 'Montserrat-Black',
    fontSize: 28,
    color: '#000',
    textAlign: 'center',
    marginBottom: 8,
  },
  subtitle: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 16,
    color: '#898989',
    textAlign: 'center',
    lineHeight: 20,
  },
  uploadWrapper: {
    width: 120,
    height: 120,
    marginTop: 50,
    justifyContent: 'center',
    alignItems: 'center',
  },
  uploadDisabled: {
    opacity: 0.35,
  },
  uploadImage: {
    width: 120,
    height: 120,
  },
  uploadedPreview: {
    width: 120,
    height: 120,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: '#CCFF00',
  },
  uploadLabel: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 18,
    color: '#000',
    marginTop: 20,
  },
  uploadFormat: {
    fontFamily: 'Montserrat-ExtraBold',
    fontSize: 14,
    color: '#666',
    marginTop: 2,
  },
  continueButton: {
    position: 'absolute',
    bottom: 85,
    width: width * 0.85,
    height: 60,
    backgroundColor: '#D9D9D9',
    borderRadius: 20,
    justifyContent: 'center',
    alignItems: 'center',
  },
  continueButtonActive: {
    backgroundColor: '#000000',
    borderWidth: 2.5,
    borderColor: '#CCFF00',
    shadowColor: '#818181',
    shadowOffset: { width: 0, height: 0 },
    shadowOpacity: 0.9,
    shadowRadius: 10,
    elevation: 10,
  },
  neonBorder: {
    position: 'absolute',
    top: -3,
    bottom: -3,
    left: -3,
    right: -3,
    borderRadius: 23,
    borderWidth: 2,
    borderColor: 'rgba(204, 255, 0, 0.3)',
  },
  buttonContent: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
  },
  buttonText: {
    fontFamily: 'Montserrat-Bold',
    fontSize: 18,
    color: '#000',
  },
  buttonTextActive: {
    color: '#CCFF00',
    fontFamily: 'Montserrat-ExtraBold',
  },
  arrow: {
    width: 20,
    height: 20,
  },
});