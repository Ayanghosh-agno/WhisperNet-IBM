import React, { useState } from 'react';
import { useEffect } from 'react';
import { EmergencyProvider } from './context/EmergencyContext';
import { EmergencyTrigger } from './components/EmergencyTrigger';
import { EmergencyForm } from './components/EmergencyForm';
import { AISummary } from './components/AISummary';
import { ChatInterface } from './components/ChatInterface';
import { EmergencyFooter } from './components/EmergencyFooter';
import { LiveChatView } from './components/LiveChatView';

function App() {
  const [currentRoute, setCurrentRoute] = useState<string>('/');
  const [sessionId, setSessionId] = useState<string | null>(null);

  // Check for session ID in URL parameters
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const sessionParam = urlParams.get('session');
    
    if (sessionParam) {
      setSessionId(sessionParam);
      setCurrentRoute('/live-chat');
    }
  }, []);

  const navigate = (route: string) => {
    setCurrentRoute(route);
  };

  const renderCurrentPage = () => {
    switch (currentRoute) {
      case '/':
        return <EmergencyTrigger onNavigate={navigate} />;
      case '/form':
        return <EmergencyForm onNavigate={navigate} />;
      case '/summary':
        return <AISummary onNavigate={navigate} />;
      case '/chat':
        return <ChatInterface onNavigate={navigate} />;
      case '/live-chat':
        return sessionId ? <LiveChatView sessionId={sessionId} /> : <EmergencyTrigger onNavigate={navigate} />;
      default:
        return <EmergencyTrigger onNavigate={navigate} />;
    }
  };

  return (
    <EmergencyProvider>
      <div className="min-h-screen">
        {renderCurrentPage()}
        {currentRoute !== '/' && currentRoute !== '/live-chat' && <EmergencyFooter />}
      </div>
    </EmergencyProvider>
  );
}

export default App;