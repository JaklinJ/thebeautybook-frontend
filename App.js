import React, { useState, useEffect, useContext } from 'react';
import { NavigationContainer } from '@react-navigation/native';
import { createNativeStackNavigator } from '@react-navigation/native-stack';
import { createBottomTabNavigator } from '@react-navigation/bottom-tabs';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { View, StyleSheet, Platform } from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { AuthContext } from './context/AuthContext';
import { LanguageProvider, LanguageContext } from './context/LanguageContext';
import { ThemeProvider, useTheme } from './context/ThemeContext';
import { SubscriptionProvider } from './context/SubscriptionContext';
import AnimatedSplashScreen from './components/AnimatedSplashScreen';

import LoginScreen from './screens/LoginScreen';
import RegisterScreen from './screens/RegisterScreen';
import HomeScreen from './screens/HomeScreen';
import CalendarScreen from './screens/CalendarScreen';
import CustomerProfileScreen from './screens/CustomerProfileScreen';
import AddAppointmentScreen from './screens/AddAppointmentScreen';
import BodyMapScreen from './screens/BodyMapScreen';
// import PaywallScreen from './screens/PaywallScreen';
import PriceListScreen from './screens/PriceListScreen';
import RevenueDashboardScreen from './screens/RevenueDashboardScreen';

const Stack = createNativeStackNavigator();
const Tab = createBottomTabNavigator();

function MainTabs() {
  const { theme, isDark } = useTheme();
  const { t } = useContext(LanguageContext);

  return (
    <Tab.Navigator
      screenOptions={({ route }) => ({
        headerShown: false,
        tabBarStyle: {
          backgroundColor: isDark ? 'rgba(15,20,35,0.98)' : theme.surface,
          borderTopColor: theme.border,
          borderTopWidth: 1,
          height: Platform.OS === 'ios' ? 85 : 64,
          paddingBottom: Platform.OS === 'ios' ? 26 : 10,
          paddingTop: 8,
        },
        tabBarActiveTintColor: theme.primary,
        tabBarInactiveTintColor: theme.textTertiary,
        tabBarLabelStyle: { fontSize: 11, fontWeight: '700' },
        tabBarIcon: ({ focused, color }) => {
          if (route.name === 'HomeTab') {
            return <Ionicons name={focused ? 'people' : 'people-outline'} size={24} color={color} />;
          }
          if (route.name === 'CalendarTab') {
            return <Ionicons name={focused ? 'calendar' : 'calendar-outline'} size={24} color={color} />;
          }
        },
      })}
    >
      <Tab.Screen
        name="HomeTab"
        component={HomeScreen}
        options={{ tabBarLabel: t('clients') }}
      />
      <Tab.Screen
        name="CalendarTab"
        component={CalendarScreen}
        options={{ tabBarLabel: t('calendar') }}
      />
    </Tab.Navigator>
  );
}

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
                <Stack.Screen name="Main" component={MainTabs} />
                <Stack.Screen name="CustomerProfile" component={CustomerProfileScreen} />
                <Stack.Screen name="AddAppointment" component={AddAppointmentScreen} />
                <Stack.Screen name="BodyMap" component={BodyMapScreen} />
                {/* <Stack.Screen
                  name="Paywall"
                  component={PaywallScreen}
                  options={{ presentation: 'modal' }}
                /> */}
                <Stack.Screen name="PriceList" component={PriceListScreen} />
                <Stack.Screen name="RevenueDashboard" component={RevenueDashboardScreen} />
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
        <SubscriptionProvider>
          <AppNavigator />
        </SubscriptionProvider>
      </LanguageProvider>
    </ThemeProvider>
  );
}

const styles = StyleSheet.create({});
