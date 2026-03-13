"use client";

import React, { useState, useRef, useEffect } from 'react';
import { Send, Mic, MicOff, Video, VideoOff, Phone, Settings, Monitor, Users, MessageSquare, Brain, PhoneOff, Maximize2, MoreHorizontal, ChevronDown, ChevronUp, Sparkles, Clock, User } from 'lucide-react';

// Types
interface Message {
  id: string;
  speaker: 'patient' | 'doctor';
  text: string;
  timestamp: Date;
  isTyping?: boolean;
}

interface AIQuestion {
  id: string;
  question: string;
  category: 'symptoms' | 'history' | 'diagnosis' | 'treatment' | 'follow-up';
  confidence: number;
}

interface VideoTileProps {
  name: string;
  role: 'patient' | 'doctor';
  isActive: boolean;
  isMuted: boolean;
  isVideoOff: boolean;
  onToggleMute: () => void;
  onToggleVideo: () => void;
  isMainView?: boolean;
}

// Enhanced Video Tile Component
const VideoTile: React.FC<VideoTileProps> = ({
  name,
  role,
  isActive,
  isMuted,
  isVideoOff,
  onToggleMute,
  onToggleVideo,
  isMainView = false
}) => {
  return (
    <div className={`relative rounded-xl overflow-hidden shadow-2xl transition-all duration-500 ${
      isActive ? 'ring-4 ring-blue-400 shadow-blue-200' : 'shadow-gray-300'
    } ${isMainView ? 'h-full' : 'h-48'}`}>
      {/* Video content */}
      <div className={`w-full h-full relative ${
        isVideoOff 
          ? `bg-gradient-to-br ${role === 'doctor' ? 'from-indigo-600 via-purple-600 to-blue-700' : 'from-emerald-500 via-teal-600 to-cyan-700'}` 
          : 'bg-gradient-to-br from-gray-800 via-gray-700 to-gray-900'
      }`}>
        
        {/* Background pattern */}
        <div className="absolute inset-0 opacity-10">
          <div className="absolute inset-0 bg-grid-pattern"></div>
        </div>

        {isVideoOff ? (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className={`w-24 h-24 rounded-full ${
                role === 'doctor' ? 'bg-white/20' : 'bg-white/20'
              } backdrop-blur-sm flex items-center justify-center text-white text-3xl font-bold mb-4 border-4 border-white/30`}>
                {name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </div>
              <p className="text-white font-medium text-lg">{name}</p>
              <p className="text-white/80 text-sm mt-1">Camera is off</p>
            </div>
          </div>
        ) : (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="text-center">
              <div className="text-white/60 text-sm mb-2">📹 Video Preview</div>
              <div className={`w-20 h-20 rounded-full ${
                role === 'doctor' ? 'bg-indigo-500' : 'bg-emerald-500'
              } flex items-center justify-center text-white text-2xl font-bold mx-auto border-4 border-white/30`}>
                {name.split(' ').map(n => n[0]).join('').toUpperCase()}
              </div>
              <p className="text-white font-medium mt-2">{name}</p>
            </div>
          </div>
        )}

        {/* Speaking animation */}
        {isActive && (
          <div className="absolute inset-0 pointer-events-none">
            <div className="absolute inset-2 border-4 border-green-400 rounded-xl animate-pulse"></div>
            <div className="absolute top-4 right-4">
              <div className="flex space-x-1">
                <div className="w-2 h-6 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '0ms' }}></div>
                <div className="w-2 h-4 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '150ms' }}></div>
                <div className="w-2 h-8 bg-green-400 rounded-full animate-bounce" style={{ animationDelay: '300ms' }}></div>
              </div>
            </div>
          </div>
        )}

        {/* Controls overlay */}
        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              <div className="text-white font-semibold">{name}</div>
              {role === 'doctor' && (
                <span className="bg-blue-500 text-white text-xs px-2 py-1 rounded-full font-medium">
                  Doctor
                </span>
              )}
            </div>
            <div className="flex space-x-2">
              <button
                onClick={onToggleMute}
                className={`p-2 rounded-full transition-all duration-200 ${
                  isMuted 
                    ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/40' 
                    : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'
                } text-white`}
              >
                {isMuted ? <MicOff size={16} /> : <Mic size={16} />}
              </button>
              <button
                onClick={onToggleVideo}
                className={`p-2 rounded-full transition-all duration-200 ${
                  isVideoOff 
                    ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/40' 
                    : 'bg-white/20 hover:bg-white/30 backdrop-blur-sm'
                } text-white`}
              >
                {isVideoOff ? <VideoOff size={16} /> : <Video size={16} />}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// AI Question Card Component
const AIQuestionCard: React.FC<{ question: AIQuestion; onUseQuestion: (question: string) => void }> = ({
  question,
  onUseQuestion
}) => {
  const categoryStyles = {
    symptoms: 'from-red-500 to-pink-500 text-white',
    history: 'from-blue-500 to-indigo-500 text-white',
    diagnosis: 'from-purple-500 to-violet-500 text-white',
    treatment: 'from-green-500 to-emerald-500 text-white',
    'follow-up': 'from-yellow-500 to-orange-500 text-white'
  };

  const categoryIcons = {
    symptoms: '🩺',
    history: '📋',
    diagnosis: '🔍',
    treatment: '💊',
    'follow-up': '📅'
  };

  return (
    <div 
      className={`bg-gradient-to-r ${categoryStyles[question.category]} p-4 rounded-xl cursor-pointer transition-all duration-300 hover:scale-105 hover:shadow-2xl transform group`}
      onClick={() => onUseQuestion(question.question)}
    >
      <div className="flex items-start justify-between mb-2">
        <span className="text-2xl">{categoryIcons[question.category]}</span>
        <div className="flex items-center space-x-1">
          <Sparkles size={14} className="opacity-70" />
          <span className="text-xs opacity-80">{Math.round(question.confidence * 100)}%</span>
        </div>
      </div>
      <p className="font-medium text-sm leading-relaxed mb-2">{question.question}</p>
      <div className="flex items-center justify-between">
        <span className="text-xs uppercase tracking-wide opacity-80 font-semibold">
          {question.category.replace('-', ' ')}
        </span>
        <button className="text-xs bg-white/20 hover:bg-white/30 px-2 py-1 rounded-full transition-colors group-hover:bg-white/40">
          Use →
        </button>
      </div>
    </div>
  );
};

// Message Component
const MessageBubble: React.FC<{ message: Message }> = ({ message }) => {
  const isDoctor = message.speaker === 'doctor';
  
  return (
    <div className={`flex ${isDoctor ? 'justify-end' : 'justify-start'} mb-4`}>
      <div className={`max-w-sm px-4 py-3 rounded-2xl shadow-lg ${
        isDoctor 
          ? 'bg-gradient-to-r from-blue-500 to-indigo-600 text-white' 
          : 'bg-white text-gray-800 border border-gray-100'
      }`}>
        <div className="flex items-center space-x-2 mb-1">
          <User size={12} className={isDoctor ? 'text-blue-100' : 'text-gray-400'} />
          <span className={`text-xs font-medium ${isDoctor ? 'text-blue-100' : 'text-gray-500'}`}>
            {isDoctor ? 'Doctor' : 'Patient'}
          </span>
        </div>
        <p className="text-sm leading-relaxed">{message.text}</p>
        <div className="flex items-center justify-end mt-2 space-x-1">
          <Clock size={10} className={isDoctor ? 'text-blue-200' : 'text-gray-400'} />
          <p className={`text-xs ${isDoctor ? 'text-blue-200' : 'text-gray-400'}`}>
            {message.timestamp.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
          </p>
        </div>
      </div>
    </div>
  );
};

// Main Component
const PatientConsultationPage: React.FC = () => {
  // State management
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '1',
      speaker: 'doctor',
      text: 'Good morning! How are you feeling today? I see from your notes that you mentioned some back pain.',
      timestamp: new Date(Date.now() - 300000)
    },
    {
      id: '2',
      speaker: 'patient',
      text: 'Hello doctor, yes I\'ve been having lower back pain for the past few days. It\'s getting worse when I sit for long periods.',
      timestamp: new Date(Date.now() - 240000)
    },
    {
      id: '3',
      speaker: 'doctor',
      text: 'I understand. Can you tell me more about when this pain started and what might have triggered it?',
      timestamp: new Date(Date.now() - 180000)
    }
  ]);

  const [newMessage, setNewMessage] = useState('');
  const [isPatientMuted, setIsPatientMuted] = useState(false);
  const [isDoctorMuted, setIsDoctorMuted] = useState(false);
  const [isPatientVideoOff, setIsPatientVideoOff] = useState(false);
  const [isDoctorVideoOff, setIsDoctorVideoOff] = useState(false);
  const [activeSpeaker, setActiveSpeaker] = useState<'patient' | 'doctor' | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const [showAIPanel, setShowAIPanel] = useState(true);
  const [showChatPanel, setShowChatPanel] = useState(true);

  // Enhanced AI questions with confidence scores
  const [aiQuestions] = useState<AIQuestion[]>([
    {
      id: '1',
      question: 'Can you describe the intensity of your pain on a scale of 1-10?',
      category: 'symptoms',
      confidence: 0.92
    },
    {
      id: '2',
      question: 'Have you experienced this type of pain before in the past?',
      category: 'history',
      confidence: 0.88
    },
    {
      id: '3',
      question: 'What activities or positions make the pain worse or better?',
      category: 'symptoms',
      confidence: 0.85
    },
    {
      id: '4',
      question: 'Are you currently taking any pain medications or treatments?',
      category: 'treatment',
      confidence: 0.91
    },
    {
      id: '5',
      question: 'When did you first notice these symptoms starting?',
      category: 'history',
      confidence: 0.87
    }
  ]);

  // Refs
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const chatContainerRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom
  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Simulate real-time conversation
  useEffect(() => {
    const interval = setInterval(() => {
      const speakers: ('patient' | 'doctor' | null)[] = ['patient', 'doctor', null, null];
      setActiveSpeaker(speakers[Math.floor(Math.random() * speakers.length)]);
    }, 4000);

    return () => clearInterval(interval);
  }, []);

  // Handlers
  const handleSendMessage = () => {
    if (newMessage.trim()) {
      const message: Message = {
        id: Date.now().toString(),
        speaker: 'doctor',
        text: newMessage,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, message]);
      setNewMessage('');
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  const handleUseQuestion = (question: string) => {
    setNewMessage(question);
  };

  const handleEndCall = () => {
    console.log('Ending consultation...');
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
      {/* Top Navigation Bar */}
      <div className="bg-black/30 backdrop-blur-lg border-b border-white/10 px-6 py-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <div className="flex items-center space-x-3">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-indigo-600 rounded-full flex items-center justify-center">
                <Users size={20} className="text-white" />
              </div>
              <div>
                <h1 className="text-lg font-semibold">Patient Consultation</h1>
                <p className="text-sm text-gray-300">Doctor & Patient</p>
              </div>
            </div>
          </div>

          <div className="flex items-center space-x-4">
            {/* Call Duration */}
            <div className="flex items-center space-x-2 bg-green-500/20 px-3 py-2 rounded-full">
              <div className="w-2 h-2 bg-green-400 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium text-green-300">23:45</span>
            </div>

            {/* Recording Button */}
            <button
              onClick={() => setIsRecording(!isRecording)}
              className={`px-4 py-2 rounded-full flex items-center space-x-2 transition-all duration-300 ${
                isRecording 
                  ? 'bg-red-500 hover:bg-red-600 shadow-lg shadow-red-500/40' 
                  : 'bg-white/10 hover:bg-white/20 backdrop-blur-sm'
              }`}
            >
              <div className={`w-2 h-2 rounded-full ${isRecording ? 'bg-white animate-pulse' : 'bg-red-500'}`}></div>
              <span className="text-sm font-medium">{isRecording ? 'Recording' : 'Record'}</span>
            </button>

            {/* Settings */}
            <button className="p-3 rounded-full bg-white/10 hover:bg-white/20 backdrop-blur-sm transition-all duration-200">
              <Settings size={18} />
            </button>

            {/* End Call */}
            <button
              onClick={handleEndCall}
              className="px-6 py-3 bg-red-500 hover:bg-red-600 rounded-full transition-all duration-200 flex items-center space-x-2 shadow-lg shadow-red-500/40"
            >
              <PhoneOff size={18} />
              <span className="font-medium">End Call</span>
            </button>
          </div>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex h-[calc(100vh-88px)]">
        {/* Video Area - Left Side */}
        <div className="flex-1 p-6">
          <div className="h-full grid grid-rows-3 gap-4">
            {/* Main Doctor Video */}
            <div className="row-span-2">
              <VideoTile
                name="Doctor"
                role="doctor"
                isActive={activeSpeaker === 'doctor'}
                isMuted={isDoctorMuted}
                isVideoOff={isDoctorVideoOff}
                onToggleMute={() => setIsDoctorMuted(!isDoctorMuted)}
                onToggleVideo={() => setIsDoctorVideoOff(!isDoctorVideoOff)}
                isMainView={true}
              />
            </div>

            {/* Patient Video */}
            <div className="row-span-1">
              <VideoTile
                name="John Smith"
                role="patient"
                isActive={activeSpeaker === 'patient'}
                isMuted={isPatientMuted}
                isVideoOff={isPatientVideoOff}
                onToggleMute={() => setIsPatientMuted(!isPatientMuted)}
                onToggleVideo={() => setIsPatientVideoOff(!isPatientVideoOff)}
              />
            </div>
          </div>
        </div>

        {/* Right Sidebar */}
        <div className="w-80 bg-black/20 backdrop-blur-lg border-l border-white/10 flex flex-col">
          {/* Panel Toggle Buttons */}
          <div className="flex border-b border-white/10">
            <button
              onClick={() => setShowChatPanel(!showChatPanel)}
              className={`flex-1 p-4 flex items-center justify-center space-x-2 transition-colors ${
                showChatPanel ? 'bg-blue-500/20 text-blue-300' : 'text-gray-400 hover:text-white'
              }`}
            >
              <MessageSquare size={18} />
              <span className="font-medium">Chat</span>
            </button>
            <button
              onClick={() => setShowAIPanel(!showAIPanel)}
              className={`flex-1 p-4 flex items-center justify-center space-x-2 transition-colors ${
                showAIPanel ? 'bg-purple-500/20 text-purple-300' : 'text-gray-400 hover:text-white'
              }`}
            >
              <Brain size={18} />
              <span className="font-medium">AI</span>
            </button>
          </div>

          {/* Chat Panel */}
          {showChatPanel && (
            <div className="flex-1 flex flex-col border-b border-white/10">
              <div className="p-4 border-b border-white/10">
                <h3 className="font-semibold flex items-center space-x-2">
                  <MessageSquare size={16} />
                  <span>Conversation</span>
                </h3>
              </div>
              
              {/* Messages */}
              <div 
                ref={chatContainerRef}
                className="flex-1 overflow-y-auto p-4 space-y-3"
              >
                {messages.map((message) => (
                  <MessageBubble key={message.id} message={message} />
                ))}
                <div ref={messagesEndRef} />
              </div>

              {/* Message Input */}
              <div className="p-4 border-t border-white/10">
                <div className="flex space-x-2">
                  <input
                    type="text"
                    value={newMessage}
                    onChange={(e) => setNewMessage(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Type your message..."
                    className="flex-1 px-4 py-2 bg-white/10 border border-white/20 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent placeholder-gray-400 text-white backdrop-blur-sm"
                  />
                  <button
                    onClick={handleSendMessage}
                    className="px-4 py-2 bg-blue-500 hover:bg-blue-600 rounded-xl transition-colors shadow-lg shadow-blue-500/40"
                  >
                    <Send size={16} />
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* AI Questions Panel */}
          {showAIPanel && (
            <div className="flex-1 flex flex-col">
              <div className="p-4 border-b border-white/10">
                <h3 className="font-semibold flex items-center space-x-2">
                  <Brain size={16} />
                  <span>AI Suggestions</span>
                  <Sparkles size={14} className="text-purple-400" />
                </h3>
                <p className="text-sm text-gray-400 mt-1">Smart questions based on conversation</p>
              </div>
              
              <div className="flex-1 overflow-y-auto p-4 space-y-3">
                {aiQuestions.map((question) => (
                  <AIQuestionCard
                    key={question.id}
                    question={question}
                    onUseQuestion={handleUseQuestion}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Custom CSS for grid pattern */}
      <style jsx>{`
        .bg-grid-pattern {
          background-image: 
            linear-gradient(rgba(255,255,255,0.1) 1px, transparent 1px),
            linear-gradient(90deg, rgba(255,255,255,0.1) 1px, transparent 1px);
          background-size: 20px 20px;
        }
      `}</style>
    </div>
  );
};

export default PatientConsultationPage;