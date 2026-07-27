import React, { useState, useEffect } from 'react';
import { View, Text, TouchableOpacity, StyleSheet, ActivityIndicator, StatusBar, SafeAreaView, ScrollView, Image, Platform } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../supabaseClient';
import { useIsFocused } from '@react-navigation/native';
import { Ionicons } from '@expo/vector-icons';

export default function DashboardScreen({ route, navigation }) {
  const { student } = route.params;
  const [schedule, setSchedule] = useState([]);
  const [activeSession, setActiveSession] = useState(null);
  const [loading, setLoading] = useState(true);
  const [isMenuOpen, setIsMenuOpen] = useState(false);
  const isFocused = useIsFocused();

  // Load static schedule once
  useEffect(() => {
    fetchSchedule();
  }, []);

  // Poll for active session repeatedly ONLY when focused
  useEffect(() => {
    let interval;
    if (isFocused) {
      checkActiveSession();
      interval = setInterval(checkActiveSession, 3000);
    }
    return () => clearInterval(interval);
  }, [isFocused]);

  const fetchSchedule = async () => {
    const { data } = await supabase.from('schedule').select('*').order('start_time');
    if (data) {
       setSchedule(data);
    }
  }

  const checkActiveSession = async () => {
    // Just fetch the latest session that isn't locked.
    // By removing the strict timezone check, it will find exactly what the teacher just created!
    const { data: sessionData, error } = await supabase
      .from('sessions')
      .select('*')
      .eq('is_locked', false)
      .order('start_time', { ascending: false })
      .limit(1);

    if (error) console.log('Session fetch error:', error);

    if (sessionData && sessionData.length > 0) {
        // Fetch class details
        const { data: classData } = await supabase
            .from('classes')
            .select('subject, subject_code')
            .eq('id', sessionData[0].class_id)
            .single();

        setActiveSession({ ...sessionData[0], classes: classData || {} });
    } else {
      setActiveSession(null);
    }
    setLoading(false);
  };

  return (
    <SafeAreaView style={styles.container}>
      <StatusBar barStyle="dark-content" />
      
      {/* LEFT NAVIGATION DOCK */}
      {isMenuOpen && (
      <View style={styles.leftNav}>
         <View style={styles.navTop}>
            <Image source={require('../../assets/logo.png')} style={{width: 30, height: 30, resizeMode: 'contain', tintColor: '#831843', marginBottom: 40}} />
            <TouchableOpacity style={styles.navBtnActive}><Ionicons name="calendar" size={24} color="#9d174d" /></TouchableOpacity>
            <TouchableOpacity style={styles.navBtn} onPress={() => navigation.navigate('Analytics', { student })}><Ionicons name="stats-chart" size={24} color="#94a3b8" /></TouchableOpacity>
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
            <Text style={styles.headerTitle}>Bennett Portal</Text>
        </View>

        <ScrollView contentContainerStyle={styles.scrollContent}>
            
            {/* PROFILE CARD */}
            <View style={styles.profileCard}>
               <View style={styles.profileAvatar}>
                  <Text style={styles.avatarText}>{student.username?.charAt(0)?.toUpperCase()}</Text>
               </View>
               <View style={styles.profileInfo}>
                  <Text style={styles.profileName}>{student.username}</Text>
                  <Text style={styles.profileUniv}>Bennett University</Text>
                  <Text style={styles.profileSem}>Semester - 4 | 2025-2026</Text>
               </View>
            </View>

            <Text style={styles.timetableTitle}>Timetable</Text>

            {/* TIMETABLE CARD */}
            <View style={styles.timetableCard}>
               <Text style={styles.semHeader}>Semester - 4 | 2025-2026</Text>
               <View style={styles.actionRow}>
                  <View style={styles.dropdown}><Text style={styles.dropdownText}>2025-2026, Semester - 4 ▼</Text></View>
                  <TouchableOpacity onPress={checkActiveSession} style={styles.refreshBtn}>
                     <Ionicons name="refresh" size={16} color="#0f172a" />
                     <Text style={styles.refreshText}>Refresh</Text>
                  </TouchableOpacity>
               </View>
               <View style={styles.weeklyBtn}><Text style={styles.weeklyText}>Weekly schedule</Text></View>

               <View style={styles.dateSelector}>
                  <Ionicons name="chevron-back" size={20} color="#0f172a" />
                  <Text style={styles.dateText}>15-Apr-2026</Text>
                  <Ionicons name="chevron-forward" size={20} color="#0f172a" />
               </View>

               {/* CLASSES LIST */}
               {loading && schedule.length === 0 ? (
                    <ActivityIndicator size="large" color="#9d174d" style={{marginVertical: 40}} />
               ) : schedule.length > 0 ? (
                 <View style={styles.scheduleList}>
                   {schedule.map((item, index) => {
                      let isLive = false;
                      if (activeSession && String(activeSession.class_id) === String(item.id)) {
                         isLive = true;
                      }

                      return (
                        <View key={item.id || index} style={styles.classItemRow}>
                           <View style={styles.classTextContainer}>
                              <Text style={styles.classSubject}>{item.subject} ( {item.subject_code} ) ( {item.venue} )</Text>
                              <Text style={styles.classTime}>{item.start_time} - {item.end_time} (60 min) Teacher</Text>
                              <Text style={styles.classVenue}>{item.venue}</Text>
                              <Text style={styles.classType}>{isLive && activeSession.qr_token.startsWith("MANUAL") ? "Manual Override" : "Lecture"}</Text>
                           </View>

                           {isLive && activeSession && !activeSession.qr_token.startsWith("MANUAL") && (
                               <TouchableOpacity onPress={() => navigation.navigate('Scanner', { student, session: activeSession })} style={styles.scanBtn}>
                                   <Ionicons name="qr-code-outline" size={18} color="#fff" />
                                   <Text style={styles.scanBtnText}>Scan QR</Text>
                               </TouchableOpacity>
                           )}
                        </View>
                      );
                   })}
                 </View>
               ) : (
                   <Text style={{textAlign: 'center', padding: 20, color: '#94a3b8'}}>No classes found.</Text>
               )}
            </View>
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

  profileCard: { backgroundColor: '#ffffff', padding: 15, borderRadius: 12, flexDirection: 'row', alignItems: 'center', shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 2 }, shadowOpacity: 0.05, shadowRadius: 5, elevation: 2, marginBottom: 25 },
  profileAvatar: { width: 46, height: 46, borderRadius: 23, backgroundColor: '#64748b', justifyContent: 'center', alignItems: 'center', marginRight: 15 },
  avatarText: { color: '#ffffff', fontSize: 20, fontWeight: 'bold' },
  profileName: { fontSize: 15, color: '#000000', fontWeight: '400' },
  profileUniv: { fontSize: 13, color: '#000000', fontWeight: '400', marginTop: 1 },
  profileSem: { fontSize: 12, color: '#475569', marginTop: 1 },

  timetableTitle: { fontSize: 16, fontWeight: '500', color: '#000', marginBottom: 15, marginLeft: 2 },

  timetableCard: { backgroundColor: '#ffffff', padding: 20, borderRadius: 12, shadowColor: '#94a3b8', shadowOffset: { width: 0, height: 4 }, shadowOpacity: 0.08, shadowRadius: 10, elevation: 3 },
  semHeader: { fontSize: 15, color: '#000', marginBottom: 15 },
  actionRow: { flexDirection: 'row', gap: 10, marginBottom: 15 },
  dropdown: { backgroundColor: '#f8fafc', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', flex: 1 },
  dropdownText: { fontSize: 13, color: '#0f172a', fontWeight: '500' },
  refreshBtn: { backgroundColor: '#f8fafc', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', flexDirection: 'row', alignItems: 'center', gap: 5 },
  refreshText: { fontSize: 13, color: '#0f172a', fontWeight: '500' },
  weeklyBtn: { backgroundColor: '#f8fafc', paddingHorizontal: 15, paddingVertical: 8, borderRadius: 8, borderWidth: 1, borderColor: '#e2e8f0', alignSelf: 'flex-start', marginBottom: 20 },
  weeklyText: { fontSize: 13, color: '#0f172a', fontWeight: '500' },

  dateSelector: { flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 20, paddingVertical: 15, borderTopWidth: 1, borderBottomWidth: 1, borderColor: '#f1f5f9', width: '70%', alignSelf: 'center', marginBottom: 20, borderRadius: 20 },
  dateText: { fontSize: 15, color: '#0f172a', textDecorationLine: 'underline', fontWeight: '500' },

  scheduleList: { marginTop: 10 },
  classItemRow: { borderBottomWidth: 1, borderBottomColor: '#f1f5f9', paddingBottom: 15, marginBottom: 15, flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center' },
  classTextContainer: { flex: 1 },
  classSubject: { fontSize: 14, fontWeight: 'bold', color: '#0f172a', marginBottom: 3 },
  classTime: { fontSize: 13, color: '#334155', marginBottom: 2 },
  classVenue: { fontSize: 13, color: '#334155', marginBottom: 2 },
  classType: { fontSize: 13, color: '#475569', marginTop: 2 },

  scanBtn: { backgroundColor: '#9d174d', paddingHorizontal: 15, paddingVertical: 10, borderRadius: 10, flexDirection: 'row', alignItems: 'center', gap: 5, marginLeft: 15 },
  scanBtnText: { color: '#ffffff', fontSize: 13, fontWeight: 'bold' }
});
