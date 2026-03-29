import React, { useState, useEffect, useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, StyleSheet } from 'react-native';
import { AuthContext } from './context/AuthContext';
import { LanguageProvider, LanguageContext } from './context/LanguageContext';
import { ThemeProvider } from './context/ThemeContext';
import AnimatedSplashScreen from './components/AnimatedSplashScreen';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import CustomerProfileScreen from './screens/CustomerProfileScreen';
import AddAppointmentScreen from './screens/AddAppointmentScreen';
import BodyMapScreen from './screens/BodyMapScreen';

const Stack = createNativeStackNavigator();

function AppNavigator() {
  const [isLoading, setIsLoading] = useState(true);
  const [showSplash, setShowSplash] = useState(true);
  const [userToken, setUserToken] = useState(null);
  const [salon, setSalon] = useState(null);
  const { isLoadingLanguage } = useContext(LanguageContext);

  useEffect(() => {
    checkToken();
  }, []);

  const checkToken = async () => {
    try {
      const [token, salonData] = await Promise.all([
        AsyncStorage.getItem('token'),
        AsyncStorage.getItem('salon'),
        new Promise(resolve => setTimeout(resolve, 2000)),
      ]);

      if (token && salonData) {
        const parsed = JSON.parse(salonData);
        setUserToken(token);
        setSalon(parsed);
      }
    } catch (error) {
      console.error('Error checking token:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const authContext = {
    signIn: async (token, salonData) => {
      try {
        await AsyncStorage.setItem('token', token);
        await AsyncStorage.setItem('salon', JSON.stringify(salonData));
        setUserToken(token);
        setSalon(salonData);
      } catch (error) {
        console.error('Error signing in:', error);
      }
    },
    signOut: async () => {
      try {
        await AsyncStorage.removeItem('token');
        await AsyncStorage.removeItem('salon');
        setUserToken(null);
        setSalon(null);
      } catch (error) {
        console.error('Error signing out:', error);
      }
    },
    updateSalon: async (updatedData) => {
      try {
        const updatedSalon = { ...salon, ...updatedData };
        await AsyncStorage.setItem('salon', JSON.stringify(updatedSalon));
        setSalon(updatedSalon);
      } catch (error) {
        console.error('Error updating salon:', error);
      }
    },
    salon
  };

  const appReady = !isLoading && !isLoadingLanguage;

  return (
    <AuthContext.Provider value={authContext}>
      {showSplash && (
        <AnimatedSplashScreen
          isAppReady={appReady}
          onAnimationComplete={() => setShowSplash(false)}
        />
      )}
      {appReady && (
        <NavigationContainer>
          <Stack.Navigator screenOptions={{ headerShown: false }}>
            {userToken == null ? (
              <>
                <Stack.Screen name="Login" component={LoginScreen} />
                <Stack.Screen name="Register" component={RegisterScreen} />
              </>
            ) : (
              <>
                <Stack.Screen name="Home" component={HomeScreen} />
                <Stack.Screen name="CustomerProfile" component={CustomerProfileScreen} />
                <Stack.Screen name="AddAppointment" component={AddAppointmentScreen} />
                <Stack.Screen name="BodyMap" component={BodyMapScreen} />
              </>
            )}
          </Stack.Navigator>
        </NavigationContainer>
      )}
    </AuthContext.Provider>
  );
}

export default function App() {
  return (
    <ThemeProvider>
      <LanguageProvider>
        <AppNavigator />
      </LanguageProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({});
