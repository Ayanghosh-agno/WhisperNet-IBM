import React, { useState, useRef, useEffect } from 'react';
import { Send, ArrowLeft, Volume2, User, Shield } from 'lucide-react';
import { useEmergency } from '../context/EmergencyContext';
import { ChatMessage } from '../types/emergency';

interface ChatInterfaceProps {
  onNavigate: (route: string) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({ onNavigate }) => {
  const { state, addChatMessage } = useEmergency();
  const [inputMessage, setInputMessage] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [state.chatMessages]);

  useEffect(() => {
    // Simulate initial authority message
    if (state.chatMessages.length === 0) {
      setTimeout(() => {
        const initialMessage: ChatMessage = {
          id: '1',
          sender: 'authority',
          message: 'This is dispatch. We received your emergency alert and help is on the way. Can you confirm you are safe to communicate?',
          timestamp: new Date(),
        };
        addChatMessage(initialMessage);
      }, 1000);
    }
  }, [state.chatMessages.length, addChatMessage]);

  const handleSendMessage = () => {
    if (!inputMessage.trim()) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      sender: 'user',
      message: inputMessage,
      timestamp: new Date(),
      willBeSpoken: true,
    };

    addChatMessage(userMessage);
    setInputMessage('');
    setIsTyping(true);

    // Simulate authority response
    setTimeout(() => {
      const responses = [
        'Thank you for confirming. Units are 5 minutes away. Stay where you are and keep this line open.',
        'Can you describe the current situation? Are you in a safe location?',
        'We have your location. Officers are approaching the area. Do not approach the door until we give the all-clear.',
        'Emergency medical services have been notified. Can you tell me about any injuries?',
      ];
      
      const randomResponse = responses[Math.floor(Math.random() * responses.length)];
      
      const authorityMessage: ChatMessage = {
        id: (Date.now() + 1).toString(),
        sender: 'authority',
        message: randomResponse,
        timestamp: new Date(),
      };
      
      addChatMessage(authorityMessage);
      setIsTyping(false);
    }, 2000 + Math.random() * 2000);
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 flex flex-col pb-20">
      <div className="bg-white shadow-sm border-b p-4">
        <div className="max-w-2xl mx-auto flex items-center space-x-4">
          <button
            onClick={() => onNavigate('/summary')}
            className="p-2 hover:bg-slate-100 rounded-lg transition-colors"
            aria-label="Go back to AI summary"
          >
            <ArrowLeft className="w-5 h-5 text-slate-600" />
          </button>
          <div className="flex items-center space-x-3">
            <div className="bg-green-100 p-2 rounded-full">
              <Shield className="w-5 h-5 text-green-600" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-800">Emergency Dispatch</h1>
              <div className="flex items-center space-x-2 text-sm text-green-600">
                <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                <span>Connected</span>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4">
        <div className="max-w-2xl mx-auto space-y-4">
          {state.chatMessages.map((message) => (
            <div
              key={message.id}
              className={`flex ${message.sender === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div className={`max-w-xs sm:max-w-md ${message.sender === 'user' ? 'order-2' : 'order-1'}`}>
                <div
                  className={`p-4 rounded-2xl shadow-sm ${
                    message.sender === 'user'
                      ? 'bg-blue-600 text-white'
                      : 'bg-white text-slate-800 border'
                  }`}
                >
                  <div className="flex items-start space-x-2">
                    {message.sender === 'authority' && (
                      <Shield className="w-4 h-4 text-slate-500 mt-1 flex-shrink-0" />
                    )}
                    {message.sender === 'user' && (
                      <User className="w-4 h-4 text-blue-200 mt-1 flex-shrink-0" />
                    )}
                    <p className="text-sm leading-relaxed">{message.message}</p>
                  </div>
                </div>
                
                {message.willBeSpoken && (
                  <div className="mt-2 text-xs text-slate-500 flex items-center space-x-1">
                    <Volume2 className="w-3 h-3" />
                    <span>This message will be spoken out loud</span>
                  </div>
                )}
                
                <div className="mt-1 text-xs text-slate-400">
                  {message.timestamp.toLocaleTimeString()}
                </div>
              </div>
            </div>
          ))}

          {isTyping && (
            <div className="flex justify-start">
              <div className="bg-white border p-4 rounded-2xl shadow-sm max-w-xs">
                <div className="flex items-center space-x-2">
                  <Shield className="w-4 h-4 text-slate-500" />
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-slate-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            </div>
          )}
          
          <div ref={chatEndRef} />
        </div>
      </div>

      <div className="bg-white border-t p-4">
        <div className="max-w-2xl mx-auto">
          <div className="flex space-x-3">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Type your response to dispatch..."
              className="flex-1 p-3 border-2 border-slate-200 rounded-xl focus:border-blue-500 focus:outline-none"
            />
            <button
              onClick={handleSendMessage}
              disabled={!inputMessage.trim()}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 disabled:cursor-not-allowed text-white p-3 rounded-xl shadow-lg transform transition-all duration-200 hover:scale-105 active:scale-95 focus:outline-none focus:ring-4 focus:ring-blue-300"
              aria-label="Send message to dispatch"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <div className="mt-2 text-xs text-slate-500 text-center">
            Your responses will be converted to speech for emergency dispatch
          </div>
        </div>
      </div>
    </div>
  );
};