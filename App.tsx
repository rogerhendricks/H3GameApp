import React, { useState, useEffect } from 'react';
import AppNavigator from './src/navigation/AppNavigator';
import SplashScreen from './src/screens/SplashScreen';
import { openDB } from './src/database';

function App() {
  const [isReady, setIsReady] = useState(false);

  useEffect(() => {
    openDB()
      .catch(console.error)
      .finally(() => setIsReady(true));
  }, []);

  if (!isReady) {
    return <SplashScreen />;
  }

  return <AppNavigator />;
}

export default App;
