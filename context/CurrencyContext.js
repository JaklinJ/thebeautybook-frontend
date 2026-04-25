import React, { createContext, useContext, useMemo } from 'react';
import { AuthContext } from './AuthContext';

export const CurrencyContext = createContext({ currency: 'EUR', formatPrice: (n) => `${n} EUR` });

export function CurrencyProvider({ children }) {
  const { salon } = useContext(AuthContext);
  const currency = salon?.currency || 'EUR';

  const formatPrice = useMemo(
    () => (amount) => `${amount} ${currency}`,
    [currency]
  );

  return (
    <CurrencyContext.Provider value={{ currency, formatPrice }}>
      {children}
    </CurrencyContext.Provider>
  );
}

export function useCurrency() {
  return useContext(CurrencyContext);
}
