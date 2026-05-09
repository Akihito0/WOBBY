import React, { useEffect, useState } from 'react';
import { View, ActivityIndicator, Alert } from 'react-native';
import PostRunModal from './PostRunScreen';
import { supabase } from '../supabase';

const PostRunFromNotification = ({ route, navigation }: any) => {
  const { matchId, notificationId } = route.params || {};
  const [visible, setVisible] = useState(true);
  const [runData, setRunData] = useState<any | null>(null);
  const [initialTitle, setInitialTitle] = useState('');
  const [initialDescription, setInitialDescription] = useState('');

  useEffect(() => {
    const load = async () => {
      try {
        const { data: sessionData } = await supabase.auth.getSession();
        const userId = sessionData?.session?.user?.id;

        const { data: resultRow, error } = await supabase
          .from('versus_run_results')
          .select('*')
          .eq('match_id', matchId)
          .maybeSingle();

        if (error || !resultRow) {
          Alert.alert('Error', 'Could not load race result.');
          navigation.goBack();
          return;
        }

        const isUser1 = resultRow.user_1_id === userId;
        const distance = isUser1 ? parseFloat(resultRow.user_1_distance || 0) : parseFloat(resultRow.user_2_distance || 0);
        const elapsed = isUser1 ? (resultRow.user_1_time || 0) : (resultRow.user_2_time || 0);

        const runPayload = {
          distance,
          elapsed,
          routeCoords: [],
          elevationMetrics: { gain: 0, loss: 0, min: 0, max: 0 },
          sessionStats: { avg: 0, max: 0 },
          sessionHRData: [],
          workoutType: 'versus_run',
        };

        // Determine whether the current user won or lost for default description
        const userWon = (isUser1 && resultRow.winner_id === resultRow.user_1_id) || (!isUser1 && resultRow.winner_id === resultRow.user_2_id);
        const defaultTitle = `${resultRow.target_distance}km Versus Run`;
        const defaultDesc = userWon ? `I won the ${resultRow.target_distance}km Versus Run!` : `I lost the ${resultRow.target_distance}km Versus Run.`;

        setRunData(runPayload);
        setInitialTitle(defaultTitle);
        setInitialDescription(defaultDesc);

        // Optionally mark notification as read
        if (notificationId) {
          await supabase.from('notifications').update({ is_read: true }).eq('id', notificationId);
        }
      } catch (err) {
        console.error('Error loading result for post modal:', err);
        Alert.alert('Error', 'An unexpected error occurred.');
        navigation.goBack();
      }
    };

    load();
  }, []);

  if (!runData) {
    return (
      <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center' }}>
        <ActivityIndicator />
      </View>
    );
  }

  return (
    <PostRunModal
      visible={visible}
      onDiscard={() => navigation.goBack()}
      onSaveSuccess={() => navigation.goBack()}
      onBackToPaused={() => navigation.goBack()}
      runData={runData}
      mapSnapshot={null}
      initialTitle={initialTitle}
      initialDescription={initialDescription}
    />
  );
};

export default PostRunFromNotification;
