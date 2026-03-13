import { useState, useRef, useCallback, useEffect } from 'react';

interface WhisperWord {
  word: string;
  start: number;
  end: number;
  confidence: number;
}

interface ChatMessage {
  id: string;
  speaker: string;
  text: string;
  timestamp: number;
  confidence?: number;
  isInterim?: boolean;
  words?: WhisperWord[];
}

interface UseWhisperStreamingOptions {
  appointmentId?: string;
  onSpeechStarted?: () => void;
  onUtteranceEnd?: (transcript: string) => void;
  onError?: (error: string) => void;
  chunkDurationMs?: number; // How often to send audio chunks to the server
}

interface UseWhisperStreamingReturn {
  isConnected: boolean;
  isRecording: boolean;
  messages: ChatMessage[];
  currentSpeaker: string | null;
  interimText: string;
  error: string | null;
  connectionStatus: 'disconnected' | 'connecting' | 'connected' | 'error';
  speechDetected: boolean;
  recordedAudio: Blob | null;
  startStreaming: () => Promise<void>;
  stopStreaming: () => void;
  clearMessages: () => void;
}

export const useWhisperStreaming = (
  options: UseWhisperStreamingOptions = {}
): UseWhisperStreamingReturn => {
  const {
    appointmentId,
    onSpeechStarted,
    onUtteranceEnd,
    onError,
    chunkDurationMs = 3000,
  } = options;

  const [isConnected, setIsConnected] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [interimText, setInterimText] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [connectionStatus, setConnectionStatus] = useState<'disconnected' | 'connecting' | 'connected' | 'error'>('disconnected');
  const [speechDetected, setSpeechDetected] = useState(false);
  const [recordedAudio, setRecordedAudio] = useState<Blob | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const allAudioChunksRef = useRef<Blob[]>([]);
  const sessionActiveRef = useRef<boolean>(false);

  const addMessage = useCallback((text: string, isInterim: boolean = false) => {
    if (!text.trim()) return;

    if (isInterim) {
      setInterimText(text);
      return;
    }

    setInterimText('');
    const timestamp = Date.now();
    
    setMessages(prev => {
      return [...prev, {
        id: `${timestamp}-${Math.random()}`,
        speaker: 'Participant',
        text,
        timestamp,
        isInterim: false
      }];
    });

  }, []);

  const sendAudioChunk = async (chunk: Blob) => {
    if (!sessionActiveRef.current) return;
    
    // Set speech status
    if (!speechDetected) {
        setSpeechDetected(true);
        onSpeechStarted?.();
    }

    try {
      const formData = new FormData();
      formData.append('file', chunk, 'audio.webm');
      if (appointmentId) {
        formData.append('appointmentId', appointmentId);
      }

      const response = await fetch('/api/transcribe', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Transcription failed: ${response.status}`);
      }

      const data = await response.json();
      if (data.transcript && data.transcript.trim() !== '') {
          addMessage(data.transcript, false);
          onUtteranceEnd?.(data.transcript);
      }

      // Briefly flag speech as ended after processing chunk
      setTimeout(() => setSpeechDetected(false), 1000);

    } catch (err) {
      console.error('❌ Failed to process audio chunk with Whisper:', err);
    }
  };

  const startStreaming = useCallback(async () => {
    try {
      setError(null);
      setConnectionStatus('connecting');
      allAudioChunksRef.current = [];
      sessionActiveRef.current = true;

      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          sampleRate: 16000,
          channelCount: 1,
          echoCancellation: true,
          noiseSuppression: true, 
        }
      });

      streamRef.current = stream;

      const mediaRecorder = new MediaRecorder(stream, {
        mimeType: 'audio/webm;codecs=opus'
      });

      mediaRecorderRef.current = mediaRecorder;

      mediaRecorder.ondataavailable = async (event) => {
        if (event.data.size > 0 && sessionActiveRef.current) {
          allAudioChunksRef.current.push(event.data);
          await sendAudioChunk(event.data);
        }
      };

      mediaRecorder.onstart = () => {
        console.log('🎙️ Whisper recording started');
        setIsRecording(true);
        setIsConnected(true);
        setConnectionStatus('connected');
      };

      mediaRecorder.onstop = () => {
        console.log('🛑 Whisper recording stopped');
        setIsRecording(false);
      };

      mediaRecorder.onerror = (err) => {
        console.error('❌ MediaRecorder error:', err);
        setError('Recording error occurred');
        onError?.('Recording error occurred');
      };

      mediaRecorder.start(chunkDurationMs);

    } catch (err) {
      console.error('❌ Failed to start recording:', err);
      const errorMessage = err instanceof Error ? err.message : 'Unknown error';
      setError(errorMessage);
      setConnectionStatus('error');
      onError?.(errorMessage);
      sessionActiveRef.current = false;
    }
  }, [chunkDurationMs, addMessage, onSpeechStarted, onUtteranceEnd, onError, speechDetected]);

  const stopStreaming = useCallback(() => {
    console.log('🛑 Stopping streaming...');
    sessionActiveRef.current = false;

    if (mediaRecorderRef.current && mediaRecorderRef.current.state !== 'inactive') {
      mediaRecorderRef.current.stop();

      setTimeout(() => {
        if (allAudioChunksRef.current.length > 0) {
          const audioBlob = new Blob(allAudioChunksRef.current, { type: 'audio/webm' });
          setRecordedAudio(audioBlob);
          console.log('📹 Final Audio recording saved:', audioBlob.size, 'bytes');
        }
      }, 500);
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsConnected(false);
    setIsRecording(false);
    setConnectionStatus('disconnected');
    setSpeechDetected(false);
    setInterimText('');
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
    setInterimText('');
    setError(null);
  }, []);

  useEffect(() => {
    return () => {
      stopStreaming();
    };
  }, [stopStreaming]);

  return {
    isConnected,
    isRecording,
    messages,
    currentSpeaker: null, 
    interimText,
    error,
    connectionStatus,
    speechDetected,
    recordedAudio,
    startStreaming,
    stopStreaming,
    clearMessages
  };
}; 