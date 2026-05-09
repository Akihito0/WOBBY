import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Image, Alert, ActivityIndicator } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../supabase';

export default function LiveVersusRoutine({ route, navigation }: any) {
  const { matchId, isPlayer1 } = route.params;

  const [matchData, setMatchData] = useState<any>(null);
  const [opponentProfile, setOpponentProfile] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchMatchData();

    // Listen for database changes (e.g., when opponent finishes a set)
    const subscription = supabase
      .channel(`match_${matchId}`)
      .on(
        'postgres_changes',
        { event: 'UPDATE', schema: 'public', table: 'versus_battles', filter: `id=eq.${matchId}` },
        (payload) => {
          console.log('Match updated!', payload.new);
          setMatchData(payload.new);
        }
      )
      .subscribe();

    return () => {
      supabase.removeChannel(subscription);
    };
  }, []);

  const fetchMatchData = async () => {
    try {
      // 1. Get the match rules and current scores
      const { data: match, error } = await supabase
        .from('versus_battles')
        .select('*')
        .eq('id', matchId)
        .single();

      if (error) throw error;
      setMatchData(match);

      // 2. Figure out who the opponent is and fetch their profile
      const opponentId = isPlayer1 ? match.player2_id : match.player1_id;
      
      if (opponentId) {
        const { data: profile } = await supabase
          .from('profiles')
          .select('username, avatar_url')
          .eq('id', opponentId)
          .single();
          
        setOpponentProfile(profile);
      }
    } catch (error: any) {
      Alert.alert('Error', 'Could not load match data.');
      navigation.goBack();
    } finally {
      setLoading(false);
    }
  };

  const handleStartSet = () => {
    // We will build ActiveVersusScreen in Step 4!
    Alert.alert("Coming Next!", "This will open the live AI camera.");
    navigation.navigate('ActiveVersusScreen', {
      matchId,
      isPlayer1,
      exerciseName: matchData.exercise_name,
      targetReps: matchData.target_reps,
      targetSets: matchData.target_sets,
      currentSet: mySets + 1
    });
  };

  if (loading || !matchData) {
    return (
      <View style={[styles.container, { justifyContent: 'center' }]}>
        <ActivityIndicator size="large" color="#CCFF00" />
        <Text style={{ color: '#fff', marginTop: 10, fontFamily: 'Montserrat-Bold' }}>Loading Arena...</Text>
      </View>
    );
  }

  // Determine scores based on who is Player 1 vs Player 2
  const mySets = isPlayer1 ? matchData.player1_sets : matchData.player2_sets;
  const oppSets = isPlayer1 ? matchData.player2_sets : matchData.player1_sets;

  return (
    <View style={styles.container}>
      {/* HEADER */}
      <LinearGradient
        colors={['#432B16', '#000000']}
        start={{ x: 1, y: 0.1 }}
        end={{ x: 0.2, y: 0.9 }}
        style={styles.header}
      >
        <Text style={styles.headerTitle}>VERSUS BATTLE</Text>
      </LinearGradient>

      {/* RULES BANNER */}
      <View style={styles.rulesBanner}>
        <Text style={styles.rulesLabel}>MISSION</Text>
        <Text style={styles.rulesValue}>
          {matchData.target_sets} SETS OF {matchData.target_reps} {matchData.exercise_name.toUpperCase()}
        </Text>
      </View>

      {/* VS ARENA */}
      <View style={styles.arenaContainer}>
        
        {/* OPPONENT CARD */}
        <LinearGradient colors={['#3F1C1C', '#000000']} style={styles.playerCard}>
          <Image 
            source={opponentProfile?.avatar_url ? { uri: opponentProfile.avatar_url } : require('../assets/user.png')} 
            style={styles.avatar} 
          />
          <Text style={styles.playerName}>{opponentProfile?.username || 'Opponent'}</Text>
          <View style={styles.scoreBoxOpponent}>
            <Text style={styles.scoreLabel}>SETS DONE</Text>
            <Text style={styles.scoreNumberOpponent}>{oppSets} / {matchData.target_sets}</Text>
          </View>
        </LinearGradient>

        {/* VS BADGE */}
        <View style={styles.vsBadge}>
          <Text style={styles.vsText}>VS</Text>
        </View>

        {/* YOUR CARD */}
        <LinearGradient colors={['#193845', '#000000']} style={styles.playerCard}>
          <Image source={require('../assets/profile.png')} style={[styles.avatar, { tintColor: '#fff' }]} />
          <Text style={styles.playerName}>YOU</Text>
          <View style={styles.scoreBoxYou}>
            <Text style={styles.scoreLabel}>SETS DONE</Text>
            <Text style={styles.scoreNumberYou}>{mySets} / {matchData.target_sets}</Text>
          </View>
        </LinearGradient>

      </View>

      {/* START BUTTON */}
      <TouchableOpacity style={styles.startBtnWrapper} activeOpacity={0.8} onPress={handleStartSet}>
        <LinearGradient
          colors={['#CCFF00', '#7A9900']}
          start={{ x: 0, y: 0.5 }}
          end={{ x: 1, y: 0.5 }}
          style={styles.startBtn}
        >
          <Text style={styles.startBtnText}>START SET {mySets + 1}</Text>
        </LinearGradient>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#121310', alignItems: 'center' },
  header: {
    width: '100%',
    paddingTop: 60,
    paddingBottom: 20,
    alignItems: 'center',
    borderBottomWidth: 1,
    borderColor: '#333'
  },
  headerTitle: { color: '#d1d1d1', fontSize: 28, fontFamily: 'Montserrat-Black' },
  rulesBanner: {
    marginTop: 20,
    backgroundColor: '#1A1A1A',
    paddingVertical: 15,
    paddingHorizontal: 30,
    borderRadius: 15,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333'
  },
  rulesLabel: { color: '#888', fontSize: 12, fontFamily: 'Montserrat-Bold', marginBottom: 5 },
  rulesValue: { color: '#CCFF00', fontSize: 18, fontFamily: 'Montserrat-Black', textAlign: 'center' },
  
  arenaContainer: {
    flex: 1,
    width: '100%',
    paddingHorizontal: 20,
    justifyContent: 'center',
    gap: 20,
  },
  playerCard: {
    borderRadius: 20,
    padding: 20,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: '#333',
    elevation: 10,
  },
  avatar: { width: 80, height: 80, borderRadius: 15, marginBottom: 10, backgroundColor: '#222' },
  playerName: { color: '#FFF', fontSize: 20, fontFamily: 'Montserrat-ExtraBold', marginBottom: 15 },
  scoreBoxOpponent: { backgroundColor: 'rgba(255, 68, 68, 0.1)', padding: 10, borderRadius: 10, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: 'rgba(255, 68, 68, 0.3)' },
  scoreBoxYou: { backgroundColor: 'rgba(204, 255, 0, 0.1)', padding: 10, borderRadius: 10, alignItems: 'center', width: '100%', borderWidth: 1, borderColor: 'rgba(204, 255, 0, 0.3)' },
  scoreLabel: { color: '#888', fontSize: 10, fontFamily: 'Montserrat-Bold', marginBottom: 5 },
  scoreNumberOpponent: { color: '#FF4444', fontSize: 28, fontFamily: 'Montserrat-Black' },
  scoreNumberYou: { color: '#CCFF00', fontSize: 28, fontFamily: 'Montserrat-Black' },
  
  vsBadge: {
    position: 'absolute',
    top: '50%',
    left: '50%',
    transform: [{ translateX: -25 }, { translateY: -25 }],
    width: 50,
    height: 50,
    backgroundColor: '#000',
    borderRadius: 25,
    justifyContent: 'center',
    alignItems: 'center',
    zIndex: 10,
    borderWidth: 3,
    borderColor: '#555',
  },
  vsText: { color: '#FFF', fontSize: 18, fontFamily: 'Montserrat-Black', fontStyle: 'italic' },
  
  startBtnWrapper: { width: '90%', marginBottom: 40, borderRadius: 15, overflow: 'hidden' },
  startBtn: { paddingVertical: 18, alignItems: 'center', justifyContent: 'center' },
  startBtnText: { color: '#000', fontSize: 18, fontFamily: 'Montserrat-Black' }
});