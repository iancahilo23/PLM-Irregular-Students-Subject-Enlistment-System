import { useState } from 'react';
import SplashScreen from './SplashScreen';
import Login from './Login';
import Dashboard from './Dashboard';

export default function App() {
  const [currentPage, setCurrentPage] = useState<'splash' | 'login' | 'postLoginSplash' | 'dashboard'>('splash');
  const [userName, setUserName] = useState<string>('');

  const handleLogin = (name: string) => {
    setUserName(name);
    setCurrentPage('postLoginSplash');
  };

  if (currentPage === 'splash') {
    return <SplashScreen onFinish={() => setCurrentPage('login')} />;
  }

  if (currentPage === 'postLoginSplash') {
    return <SplashScreen onFinish={() => setCurrentPage('dashboard')} />;
  }

  if (currentPage === 'dashboard') {
    return <Dashboard userName={userName} />;
  }

  return <Login onLogin={handleLogin} />;
}