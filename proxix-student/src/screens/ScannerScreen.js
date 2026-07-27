import React, { useState, useEffect } from 'react';
import { View, Text, StyleSheet, Button, Dimensions, Alert } from 'react-native';
import { CameraView, useCameraPermissions } from 'expo-camera';
import * as LocalAuthentication from 'expo-local-authentication';
import { supabase } from '../supabaseClient';

export default function ScannerScreen({ route, navigation }) {
  const { student, session } = route.params;
  const [permission, requestPermission] = useCameraPermissions();
  const [scanned, setScanned] = useState(false);

  if (!permission) {
    return <View />; // Loading
  }

  if (!permission.granted) {
    return (
      <View style={styles.container}>
        <Text style={{ textAlign: 'center', marginBottom: 20 }}>We need your permission to show the camera</Text>
        <Button onPress={requestPermission} title="Grant Permission" />
      </View>
    );
  }

  const handleBarCodeScanned = async ({ type, data }) => {
    if (scanned) return;
    setScanned(true);

    // The teacher QR contains `sessionToken|timestamp`
    const token = data.split('|')[0];
    
    if (token !== session.qr_token) {
      Alert.alert('Invalid QR Code', 'This QR code is not valid for the active session.');
      setTimeout(() => setScanned(false), 3000);
      return;
    }

    // QR Valid - Prompt Biometrics
    const hasHardware = await LocalAuthentication.hasHardwareAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    if (hasHardware && isEnrolled) {
      const auth = await LocalAuthentication.authenticateAsync({
        promptMessage: 'Authenticate to confirm attendance',
        cancelLabel: 'Cancel',
        disableDeviceFallback: false,
      });

      if (auth.success) {
        await recordAttendance(true);
      } else {
        Alert.alert('Verification Failed', 'Biometric match failed. Try again.');
        setScanned(false);
      }
    } else {
      // For demo purposes on simulators without Biometrics
      Alert.alert('Biometrics Unavailable', 'Device biometric bypass for demo.');
      await recordAttendance(false); 
    }
  };

  const recordAttendance = async (biometricMatched) => {
    // 1. Check if already recorded
    const { data: existing } = await supabase.from('attendance')
      .select('id').eq('student_id', student.id).eq('session_id', session.id);
      
    if (existing && existing.length > 0) {
      Alert.alert('Scanned', 'You have already recorded attendance for this session.');
      navigation.replace('Dashboard', { student });
      return;
    }

    const { error } = await supabase.from('attendance').insert([
      {
        student_id: student.id,
        session_id: session.id,
        method: 'QR',
        face_verified: false,
        fingerprint_verified: biometricMatched,
        timestamp: new Date()
      }
    ]);

    if (error) {
      Alert.alert('Error', 'Failed to record attendance: ' + error.message);
      setScanned(false);
    } else {
      Alert.alert('Success!', 'Attendance recorded successfully.');
      navigation.replace('Dashboard', { student });
    }
  };

  return (
    <View style={styles.container}>
      <CameraView
        style={StyleSheet.absoluteFillObject}
        onBarcodeScanned={scanned ? undefined : handleBarCodeScanned}
        barcodeScannerSettings={{
          barcodeTypes: ['qr'],
        }}
      />
      <View style={styles.overlay}>
        <View style={styles.scanBox} />
        <Text style={styles.scanText}>Position the dynamic QR code inside the box</Text>
      </View>
      <View style={styles.footer}>
         <Text style={styles.kioskWarning}>System Pinned to Bennett University during scan.</Text>
      </View>
    </View>
  );
}

const { width } = Dimensions.get('window');
const boxSize = width * 0.7;

const styles = StyleSheet.create({
  container: { flex: 1 },
  overlay: {
    ...StyleSheet.absoluteFillObject,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0,0,0,0.4)',
  },
  scanBox: {
    width: boxSize,
    height: boxSize,
    borderWidth: 2,
    borderColor: '#10b981',
    backgroundColor: 'transparent',
    borderRadius: 20
  },
  scanText: {
    color: 'white',
    marginTop: 20,
    fontSize: 16,
    fontWeight: '600'
  },
  footer: {
    position: 'absolute',
    bottom: 0,
    width: '100%',
    padding: 20,
    alignItems: 'center'
  }
});
