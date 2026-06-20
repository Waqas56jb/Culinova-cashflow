import { createContext, useContext, useState } from 'react';
import api from '../api/client.js';

const AppContext = createContext(null);
export const useApp = () => useContext(AppContext);

// Single-currency system: everything is SAR.
const CURRENCY = 'SAR';
const RATES = { SAR: 1 };

export function AppProvider({ children }) {
  const [user, setUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem('culinova_user') || 'null');
    } catch {
      return null;
    }
  });

  const login = async (email, password) => {
    const { data } = await api.post('/auth/login', { email, password });
    localStorage.setItem('culinova_token', data.token);
    localStorage.setItem('culinova_user', JSON.stringify(data.user));
    setUser(data.user);
    return data.user;
  };

  const logout = () => {
    localStorage.removeItem('culinova_token');
    localStorage.removeItem('culinova_user');
    setUser(null);
    location.href = '/login';
  };

  return (
    <AppContext.Provider
      value={{ user, setUser, login, logout, rates: RATES, displayCurrency: CURRENCY }}
    >
      {children}
    </AppContext.Provider>
  );
}
