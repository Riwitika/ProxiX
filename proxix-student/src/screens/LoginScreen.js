import React, { useState, useEffect } from 'react';
import { View, Text, TextInput, TouchableOpacity, StyleSheet, Alert, StatusBar, KeyboardAvoidingView, Platform, ActivityIndicator, Image } from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import { supabase } from '../supabaseClient';
import * as SecureStore from 'expo-secure-store';
import 'react-native-get-random-values';
import { v4 as uuidv4 } from 'uuid';

export default function LoginScreen({ navigation }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [showOtp, setShowOtp] = useState(false);
  const [otp, setOtp] = useState('');
  const [pendingUser, setPendingUser] = useState(null);

  useEffect(() => {
    const checkLogin = async () => {
      try {
        const session = await SecureStore.getItemAsync('student_session');
        if (session) {
          navigation.replace('Dashboard', { student: JSON.parse(session) });
        }
      } catch(e) {}
    };
    checkLogin();
  }, []);

  const getDeviceId = async () => {
    let deviceId = await SecureStore.getItemAsync('device_id');
    if (!deviceId) {
      deviceId = uuidv4();
      await SecureStore.setItemAsync('device_id', deviceId);
    }
    return deviceId;
  };

  const handleLogin = async () => {
    if (!username || !password) {
      Alert.alert('Error', 'Please enter username and password');
      return;
    }

    setLoading(true);
    const { data, error } = await supabase
      .from('users')
      .select('*')
      .eq('username', username)
      .eq('password', password)
      .single();

    if (error || !data) {
      Alert.alert('Error', 'Invalid credentials');
      setLoading(false);
      return;
    }

    if (data.role !== 'student') {
      Alert.alert('Error', 'This app is for students only.');
      setLoading(false);
      return;
    }

    const currentDeviceId = await getDeviceId();

    if (!data.device_id) {
      const { error: updateError } = await supabase.from('users').update({ device_id: currentDeviceId }).eq('id', data.id);
      if (updateError) {
         Alert.alert('Database Error', 'Failed to bind device. Check Supabase RLS policies.');
         setLoading(false);
         return;
      }
      await SecureStore.setItemAsync('student_session', JSON.stringify(data));
      navigation.replace('Dashboard', { student: data });
    } else if (data.device_id !== currentDeviceId) {
      setPendingUser(data);
      setShowOtp(true);
      Alert.alert('Device Verification', 'This account is linked to another device. Check your email for OTP.');
    } else {
      await SecureStore.setItemAsync('student_session', JSON.stringify(data));
      navigation.replace('Dashboard', { student: data });
    }

    setLoading(false);
  };

  const handleOtp = async () => {
    if (otp === '123456') { 
      const currentDeviceId = await getDeviceId();
      await supabase.from('users').update({ device_id: currentDeviceId }).eq('id', pendingUser.id);
      await SecureStore.setItemAsync('student_session', JSON.stringify(pendingUser));
      navigation.replace('Dashboard', { student: pendingUser });
    } else {
      Alert.alert('Error', 'Invalid OTP. Hint for demo: 123456');
    }
  };

  return (
    <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : "height"} style={{flex:1}}>
        <LinearGradient colors={['#020617', '#1e3a8a', '#020617']} style={styles.container}>
        <StatusBar barStyle="light-content" />
        
        {/* Glow Effects */}
        <View style={[styles.glow, { top: -50, left: -50, backgroundColor: '#2563eb' }]} />
        <View style={[styles.glow, { bottom: -100, right: -50, backgroundColor: '#0ea5e9' }]} />

        <View style={styles.glassCard}>
            <View style={styles.header}>
            <Image source={require('../../assets/logo.png')} style={{ width: 280, height: 100, resizeMode: 'contain', alignSelf: 'center', marginBottom: 10 }} />
            <Text style={styles.subtitle}>Student Portal</Text>
            </View>

            {!showOtp ? (
            <View style={styles.form}>
                <TextInput
                style={styles.input}
                placeholder="Username"
                placeholderTextColor="#64748b"
                value={username}
                onChangeText={setUsername}
                autoCapitalize="none"
                />
                <TextInput
                style={styles.input}
                placeholder="Password"
                placeholderTextColor="#64748b"
                value={password}
                onChangeText={setPassword}
                secureTextEntry
                />
                <TouchableOpacity onPress={handleLogin} disabled={loading} style={styles.buttonShadow}>
                <LinearGradient colors={['#3b82f6', '#0284c7']} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.button}>
                    {loading ? <ActivityIndicator color="#fff" /> : <Text style={styles.buttonText}>Authenticate</Text>}
                </LinearGradient>
                </TouchableOpacity>
            </View>
            ) : (
            <View style={styles.form}>
                <View style={styles.warningBox}>
                <Text style={styles.warningText}>Unrecognized Device</Text>
                <Text style={styles.warningSub}>Enter the 6-digit OTP sent to your registered contact to bind this device.</Text>
                </View>
                <TextInput
                style={styles.input}
                placeholder="000000"
                placeholderTextColor="#64748b"
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                textAlign="center"
                />
                <TouchableOpacity onPress={handleOtp} style={styles.buttonShadow}>
                <LinearGradient colors={['#3b82f6', '#2563eb']} start={{x:0, y:0}} end={{x:1, y:1}} style={styles.button}>
                    <Text style={styles.buttonText}>Verify & Bind</Text>
                </LinearGradient>
                </TouchableOpacity>
            </View>
            )}
        </View>
        </LinearGradient>
    </KeyboardAvoidingView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20 },
  glow: { position: 'absolute', width: 300, height: 300, borderRadius: 150, opacity: 0.15, filter: 'blur(50px)' },
  glassCard: { 
    backgroundColor: 'rgba(255, 255, 255, 0.05)', 
    padding: 35, 
    borderRadius: 30, 
    width: '100%', 
    maxWidth: 400, 
    borderWidth: 1, 
    borderColor: 'rgba(255, 255, 255, 0.1)',
    shadowColor: '#000', shadowOffset: { width: 0, height: 20 }, shadowOpacity: 0.4, shadowRadius: 30, elevation: 10
  },
  header: { alignItems: 'center', marginBottom: 40 },
  logoBadge: { width: 65, height: 65, borderRadius: 20, justifyContent: 'center', alignItems: 'center', marginBottom: 15, shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 5 }, shadowOpacity: 0.5, shadowRadius: 15 },
  logoText: { color: '#fff', fontSize: 28, fontWeight: '900' },
  title: { fontSize: 32, fontWeight: '800', color: '#f8fafc', letterSpacing: -0.5 },
  subtitle: { fontSize: 15, color: '#94a3b8', marginTop: 5, fontWeight: '500' },
  form: { width: '100%' },
  input: { 
    width: '100%', backgroundColor: 'rgba(15, 23, 42, 0.6)', borderWidth: 1, borderColor: '#334155',
    color: '#fff', borderRadius: 16, padding: 18, marginBottom: 16, fontSize: 16,
  },
  buttonShadow: { shadowColor: '#3b82f6', shadowOffset: { width: 0, height: 8 }, shadowOpacity: 0.3, shadowRadius: 15, marginTop: 10 },
  button: { width: '100%', padding: 18, borderRadius: 16, alignItems: 'center' },
  buttonText: { color: '#fff', fontWeight: 'bold', fontSize: 17, letterSpacing: 0.5 },
  warningBox: { backgroundColor: 'rgba(239, 68, 68, 0.1)', borderWidth: 1, borderColor: 'rgba(239, 68, 68, 0.3)', padding: 15, borderRadius: 12, marginBottom: 20 },
  warningText: { color: '#f87171', fontWeight: 'bold', fontSize: 16, textAlign: 'center', marginBottom: 5 },
  warningSub: { color: '#fca5a5', fontSize: 13, textAlign: 'center', lineHeight: 18 }
});
