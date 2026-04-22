import React, { createContext, useContext, useState, useEffect } from 'react';
import { Platform } from 'react-native';
import Purchases, { LOG_LEVEL } from 'react-native-purchases';

export const FREE_TIER_CLIENT_LIMIT = 10;
const ENTITLEMENT_ID = 'pro';

// Replace these with your RevenueCat API keys from https://app.revenuecat.com
const RC_IOS_KEY = 'appl_REPLACE_WITH_YOUR_IOS_KEY';
const RC_ANDROID_KEY = 'goog_REPLACE_WITH_YOUR_ANDROID_KEY';
const IS_CONFIGURED = !RC_IOS_KEY.includes('REPLACE');

export const SubscriptionContext = createContext();

export function SubscriptionProvider({ children }) {
  const [isPro, setIsPro] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [offerings, setOfferings] = useState(null);

  useEffect(() => {
    if (IS_CONFIGURED) {
      setupRevenueCat();
    } else {
      setIsLoading(false);
    }
  }, []);

  const setupRevenueCat = async () => {
    try {
      if (__DEV__) Purchases.setLogLevel(LOG_LEVEL.DEBUG);
      Purchases.configure({
        apiKey: Platform.OS === 'ios' ? RC_IOS_KEY : RC_ANDROID_KEY,
      });
      const [customerInfo, fetchedOfferings] = await Promise.all([
        Purchases.getCustomerInfo(),
        Purchases.getOfferings(),
      ]);
      setIsPro(!!customerInfo.entitlements.active[ENTITLEMENT_ID]);
      setOfferings(fetchedOfferings);
    } catch (error) {
      console.error('RevenueCat error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const purchasePackage = async (pkg) => {
    if (!IS_CONFIGURED) return { success: false, notConfigured: true };
    try {
      const { customerInfo } = await Purchases.purchasePackage(pkg);
      const active = !!customerInfo.entitlements.active[ENTITLEMENT_ID];
      setIsPro(active);
      return { success: active };
    } catch (error) {
      if (error.userCancelled) return { success: false, cancelled: true };
      throw error;
    }
  };

  const restorePurchases = async () => {
    if (!IS_CONFIGURED) return false;
    try {
      const customerInfo = await Purchases.restorePurchases();
      const active = !!customerInfo.entitlements.active[ENTITLEMENT_ID];
      setIsPro(active);
      return active;
    } catch (error) {
      throw error;
    }
  };

  return (
    <SubscriptionContext.Provider value={{ isPro, isLoading, offerings, purchasePackage, restorePurchases }}>
      {children}
    </SubscriptionContext.Provider>
  );
}

export const useSubscription = () => useContext(SubscriptionContext);
