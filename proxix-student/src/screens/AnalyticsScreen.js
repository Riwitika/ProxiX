import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, SafeAreaView, ScrollView, Image, StatusBar, TouchableOpacity, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../supabaseClient';
import { Ionicons } from '@expo/vector-icons';
import { useIsFocused } from '@react-navigation/native';

export default function AnalyticsScreen({ route, navigation }) {
  const { student } = route.params;
  const [attended, setAttended] = useState(0);
  const [totalSessions, setTotalSessions] = useState(0);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isFocused = useIsFocused();

  useEffect(() => {
    if (isFocused) {
      fetchAnalytics();
    }
  }, [isFocused]);

  const fetchAnalytics = async () => {
    setLoading(true);

    // 1. Get all locked sessions
    const { data: allSessions } = await supabase
      .from('sessions')
      .select('id')
      .eq('is_locked', true);

    let lockedSessionIds = [];
    if (allSessions && allSessions.length > 0) {
        lockedSessionIds = allSessions.map(s => s.id);
    }

    // 2. Get my attendance ONLY in locked sessions
    let myAttendance = [];
    if (lockedSessionIds.length > 0) {
        const { data } = await supabase
          .from('attendance')
          .select('id')
          .eq('student_id', student.id)
          .in('session_id', lockedSessionIds);
        myAttendance = data || [];
    }

    setAttended(myAttendance.length);
    setTotalSessions(lockedSessionIds.length);
    setLoading(false);
  };

  const percentage = totalSessions > 0 ? Math.round((attended / totalSessions) * 100) : 0;

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* LEFT NAVIGATION DOCK */}
      {isMenuOpen && (
      <View style={styles.leftNav}>
         <View style={styles.navTop}>
            <Image source={require('../../assets/logo.png')} style={{width: 30, height: 30, resizeMode: 'contain', tintColor: '#831843', marginBottom: 40}} />
            <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate('Dashboard', { student })}><Ionicons name="calendar" size={24} color="#94a3b8" /></TouchableOpacity>
            <TouchableOpacity style={styles.navBtnActive}><Ionicons name="stats-chart" size={24} color="#9d174d" /></TouchableOpacity>
         </View>
         <View style={styles.navBottom}>
            <TouchableOpacity style={styles.navBtn}><Ionicons name="settings-outline" size={24} color="#94a3b8" /></TouchableOpacity>
            <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate('Login')}><Ionicons name="log-out-outline" size={24} color="#f43f5e" /></TouchableOpacity>
         </View>
      </View>
      )}

      <View style={styles.mainContent}>
        {/* HEADER */}
        <View style={styles.header}>
            <TouchableOpacity onPress={() => setIsMenuOpen(!isMenuOpen)}>
                <Ionicons name="menu" size={28} color="#0f172a" style={{marginRight: 15}} />
            </TouchableOpacity>
            <Image source={require('../../assets/logo.png')} style={{width: 30, height: 30, resizeMode: 'contain', marginRight: 10, borderRadius: 8}} />
            <Text style={styles.headerTitle}>Analytics Center</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
          {loading ? (
            <ActivityIndicator size="large" color="#9d174d" style={{ marginTop: 50 }} />
          ) : (
            <View style={styles.timetableCard}>
               <Text style={styles.semHeader}>Session Tracking • {student.username}</Text>

              <View style={styles.circleContainer}>
                <View style={styles.circleOuter}>
                  <View style={[styles.circleInner, percentage < 75 ? { borderColor: '#f59e0b' } : { borderColor: '#9d174d' }]}>
                    <Text style={styles.percentageText}>{percentage}%</Text>
                  </View>
                </View>
              </View>

              <View style={styles.row}>
                <View style={styles.statBox}>
                  <Ionicons name="checkmark-circle" size={24} color="#9d174d" />
                  <Text style={styles.statVal}>{attended}</Text>
                  <Text style={styles.statLabel}>Attended</Text>
                </View>
                <View style={styles.divider} />
                <View style={styles.statBox}>
                  <Ionicons name="layers" size={24} color="#6366f1" />
                  <Text style={styles.statVal}>{totalSessions}</Text>
                  <Text style={styles.statLabel}>Total Classes</Text>
                </View>
              </View>

              {percentage < 75 && totalSessions > 0 && (
                <View style={styles.warningBox}>
                  <Ionicons name="warning" size={20} color="#b45309" />
                  <Text style={styles.warningText}>Your attendance is below 75%. You may face academic penalties.</Text>
                </View>
              )}

            </View>
          )}
        </ScrollView>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: '#fcfafa', flexDirection: 'row', paddingTop: Platform.OS === 'android' ? StatusBar.currentHeight : 0 },
  
  /* LEFT NAV DOCK */
  leftNav: { width: 65, backgroundColor: '#ffffff', borderRightWidth: 1, borderRightColor: '#f1f5f9', paddingTop: 50, paddingBottom: 30, alignItems: 'center', justifyContent: 'space-between', zIndex: 10 },
  navTop: { alignItems: 'center' },
  navBottom: { alignItems: 'center' },
  navBtn: { width: 44, height: 44, borderRadius: 22, justifyContent: 'center', alignItems: 'center', marginBottom: 20 },
  navBtnActive: { width: 44, height: 44, borderRadius: 22, backgroundColor: '#fdf2f8', justifyContent: 'center', alignItems: 'center', marginBottom: 20 },

  /* MAIN CONTENT AREA */
  mainContent: { flex: 1, backgroundColor: '#fdfbfb' },

  header: { flexDirection: 'row', alignItems: 'center', paddingHorizontal: 20, paddingTop: 15, paddingBottom: 15, backgroundColor: '#ffffff', borderBottomWidth: 1, borderBottomColor: '#f1f5f9' },
  headerTitle: { fontSize: 18, color: '#0f172a', fontWeight: '500' },

  scrollContent: { padding: 16, paddingBottom: 40 },

  timetableCard: { backgroundColor: '#ffffff', padding: 20, borderRadius: 12, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3, alignItems: 'center', marginTop: 10 },
  semHeader: { fontSize: 16, fontWeight: 'bold', color: '#000', marginBottom: 25, alignSelf: 'flex-start' },

  circleContainer: { alignItems: 'center', marginBottom: 30 },
  circleOuter: { width: 160, height: 160, borderRadius: 80, backgroundColor: '#f8fafc', justifyContent: 'center', alignItems: 'center', shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.05, shadowRadius: 10, elevation: 2 },
  circleInner: { width: 130, height: 130, borderRadius: 65, backgroundColor: '#ffffff', borderWidth: 8, borderColor: '#9d174d', justifyContent: 'center', alignItems: 'center' },
  percentageText: { fontSize: 32, fontWeight: '900', color: '#0f172a' },

  row: { flexDirection: 'row', alignItems: 'center', width: '100%', justifyContent: 'space-between', backgroundColor: '#fcfafa', borderRadius: 16, padding: 20, borderWidth: 1, borderColor: '#f1f5f9' },
  statBox: { flex: 1, alignItems: 'center' },
  divider: { width: 1, height: '80%', backgroundColor: '#e2e8f0' },
  statVal: { fontSize: 24, fontWeight: '800', color: '#0f172a', marginTop: 8 },
  statLabel: { fontSize: 13, color: '#64748b', fontWeight: '600', marginTop: 2 },

  warningBox: { flexDirection: 'row', backgroundColor: '#fef3c7', padding: 15, borderRadius: 12, marginTop: 30, alignItems: 'center', gap: 10 },
  warningText: { color: '#b45309', fontSize: 13, fontWeight: '600', flex: 1, lineHeight: 18 }
});
