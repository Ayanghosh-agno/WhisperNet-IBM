import React, { useState } from 'react';
import { EmergencyProvider } from './context/EmergencyContext';
import { EmergencyTrigger } from './components/EmergencyTrigger';
import { EmergencyForm } from './components/EmergencyForm';
import { AISummary } from './components/AISummary';
import { ChatInterface } from './components/ChatInterface';
import { EmergencyFooter } from './components/EmergencyFooter';

function App() {
  const [currentRoute, setCurrentRoute] = useState<string>('/');

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
      default:
        return <EmergencyTrigger onNavigate={navigate} />;
    }
  };

  return (
    <EmergencyProvider>
      <div className="min-h-screen">
        {renderCurrentPage()}
        {currentRoute !== '/' && <EmergencyFooter />}
      </div>
    </EmergencyProvider>
  );
}

export default App;