"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { MuscleInfoModal } from "@/components/ui/muscle-info-modal";
import { SummaryEditor } from "@/components/SummaryEditor";
import { useSummaryEditor } from "@/hooks/useSummaryEditor";
import { useAppointment } from "@/context/AppointmentContext";
import { useWhisperStreaming } from "@/hooks/use-whisper-streaming";
import { generateMedicalReportPDF } from "@/lib/pdf-generator";
import { cn } from "@/lib/utils";
import { callAnalyticsService } from "@/lib/config/analytics-service";
import DoctorVideoTile, {
  DoctorVideoTileRef,
} from "@/components/video/DoctorVideoTile";
import { motion } from "framer-motion";
import {
  AlertCircle,
  ArrowLeft,
  Download,
  Edit3,
  Info,
  FileText,
  Loader2,
  MessageSquare,
  Mic,
  Save,
  Sparkles,
  Square,
  Stethoscope,
  User,
  Volume2,
  X,
} from "lucide-react";
import { useCallback, useEffect, useRef, useState } from "react";
import { useAppSelector } from "@/store/hooks";
import { toast } from "sonner";
import { useNavigationWarning, setNavigatingProgrammatically } from "@/hooks/useNavigationWarning";
import { NavigationWarningDialog, showNavigationWarning } from "@/components/ui/navigation-warning-dialog";

// Animation variants
const pageVariants = {
  initial: { opacity: 0, y: 20 },
  in: { opacity: 1, y: 0 },
  out: { opacity: 0, y: -20 },
};

const pageTransition = {
  type: "tween" as const,
  ease: "anticipate" as const,
  duration: 0.4,
};

const cardVariants = {
  hidden: { opacity: 0, y: 20, scale: 0.95 },
  visible: {
    opacity: 1,
    y: 0,
    scale: 1,
    transition: {
      duration: 0.3,
    },
  },
};

const buttonHoverVariants = {
  hover: {
    scale: 1.02,
    transition: {
      duration: 0.2,
    },
  },
  tap: {
    scale: 0.98,
    transition: {
      duration: 0.1,
    },
  },
};

interface ConsultationPageProps {
  params: Promise<{ id: string }>;
}

export default function EnhancedConsultationPage({
  params,
}: ConsultationPageProps) {
  const [resolvedAppointmentId, setResolvedAppointmentId] = useState<string | null>(null);
  
  useEffect(() => {
    params.then((resolvedParams) => {
      setResolvedAppointmentId(resolvedParams.id);
    });
  }, [params]);
  
  const { appointment, setAppointment } = useAppointment();
  const doctor = useAppSelector((state) => state.doctor.doctor.data);
  
  const [isValidating, setIsValidating] = useState(true);
  const [summary, setSummary] = useState<string>("");
  const [editableSummary, setEditableSummary] = useState<string>("");
  const [isEditingSummary, setIsEditingSummary] = useState(false);
  const [summaryGenerated, setSummaryGenerated] = useState(false);
  
  // Summary editor hook
  const {
    isSaving: isSavingSummary,
    parseSummaryIntoFields,
    reconstructSummaryFromFields,
    handleSave: handleSummaryApiSave,
  } = useSummaryEditor({
    appointmentId: appointment?.id,
    onSaveSuccess: (newSummary) => {
      setSummary(newSummary);
      setEditableSummary(newSummary);
      setIsEditingSummary(false);
      setSummaryGenerated(true);
      
      
      setPdfGenerationMessage("✅ Summary saved successfully!");
      setTimeout(() => {
        setPdfGenerationMessage("");
      }, 3000);
    },
    onSaveError: (errorMessage) => {
      setPdfGenerationMessage(`❌ ${errorMessage}`);
      setTimeout(() => {
        setPdfGenerationMessage("");
      }, 5000);
    },
  });
  const [suggestedQuestions, setSuggestedQuestions] = useState<
    QuestionCategory[]
  >([]);
  const [isGeneratingQuestions, setIsGeneratingQuestions] = useState(false);
  const [currentAudioTime, setCurrentAudioTime] = useState<number>(0);
  const [audioDuration, setAudioDuration] = useState<number>(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoTileRef = useRef<DoctorVideoTileRef | null>(null);
  const [consultationStartTime, setConsultationStartTime] = useState<
    number | null
  >(null);
  const [currentPlayingMessageId, setCurrentPlayingMessageId] = useState<
    string | null
  >(null);
  const messagesContainerRef = useRef<HTMLDivElement | null>(null);
  const [autoScrollEnabled, setAutoScrollEnabled] = useState(true);
  const [isUserScrolling, setIsUserScrolling] = useState(false);
  const [lastScrollTime, setLastScrollTime] = useState<number>(0);
  const [isNearBottom, setIsNearBottom] = useState(true);
  const [showScrollToBottom, setShowScrollToBottom] = useState(false);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Add new state for PDF handling
  const [uploadedPdfUuid, setUploadedPdfUuid] = useState<string | null>(null);
  const [isGeneratingPdf, setIsGeneratingPdf] = useState(false);
  const [isUploadingPdf, setIsUploadingPdf] = useState(false);
  const [isDownloadingPdf, setIsDownloadingPdf] = useState(false);
  const [pdfGenerationMessage, setPdfGenerationMessage] = useState<string>("");

  const [awsEntities, setAwsEntities] = useState<{ Text: string }[]>([]);
  const [muscleTerms, setMuscleTerms] = useState<string[]>([]);
  const [qdrantResults, setQdrantResults] = useState<
    { muscle_name?: string; score?: number }[]
  >([]);
  const [muscleInfoModalOpen, setMuscleInfoModalOpen] = useState(false);
  const [selectedMuscleName, setSelectedMuscleName] = useState<string | null>(
    null
  );
  const [selectedMuscleData, setSelectedMuscleData] = useState<{
    muscle_name?: string;
    description?: string;
    s3_url?: string;
    imageData?: string;
    presignedUrl?: string;
    score?: number;
    [key: string]: unknown;
  } | null>(null);

  const [isCancellationInProgress, setIsCancellationInProgress] =
    useState<boolean>(false);
  // Prevent unintended restarts after ending
  const hasAutoStartedRef = useRef<boolean>(false);
  
  // State for confirmation dialog
  const [showStopConfirmDialog, setShowStopConfirmDialog] = useState(false);
  const [summaryGenerationInProgress, setSummaryGenerationInProgress] = useState(false);

  const [recordingState, setRecordingState] = useState<
    "stopped" | "recording" | "paused"
  >("stopped");

  const {
    isRecording,
    connectionStatus,
    messages,
    currentSpeaker,
    interimText,
    speechDetected,
    error: streamingError,
    recordedAudio,
    startStreaming,
    stopStreaming,
    clearMessages,
  } = useWhisperStreaming({
    appointmentId: resolvedAppointmentId || undefined,
    onSpeechStarted: () => {
      console.log("🎤 Speech detection started");
    },
    onUtteranceEnd: (transcript) => {
      console.log("🔚 Utterance ended:", transcript);
    },
    onError: (error) => {
      console.error("❌ Streaming error:", error);
    },
    chunkDurationMs: 4000,
  });

  const generateQuestions = useCallback(
    async (
      finalMessages?: Array<{
        id: string;
        speaker: string;
        text: string;
        timestamp: number;
        isInterim?: boolean;
        confidence?: number;
      }>
    ) => {
      if (isGeneratingQuestions) return;

      // Avoid generating during/after ending
      if (isCancellationInProgress || appointment?.status === "completed")
        return;

      // Use provided finalMessages (should always be provided now)
      if (!finalMessages || finalMessages.length === 0) return;

      setIsGeneratingQuestions(true);
      try {
        const conversationText = finalMessages
          .map((msg) => `${msg.speaker}: ${msg.text}`)
          .join("\n");

        const response = await fetch("/api/generate-questions", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ 
            transcript: conversationText,
            appointmentId: resolvedAppointmentId 
          }),
        });

        if (response.ok) {
          const data = await response.json();
          setSuggestedQuestions(data.questions || []);
        }
      } catch (error) {
        console.error("Error generating questions:", error);
      } finally {
        setIsGeneratingQuestions(false);
      }
    },
    [isGeneratingQuestions, appointment?.status, isCancellationInProgress]
  ); // Keep only isGeneratingQuestions as dependency

  const initializeAudio = useCallback(() => {
    if (!recordedAudio || audioRef.current) return;

    console.log("🎵 Initializing audio...", recordedAudio.size, "bytes");

    // Create audio element with proper MIME type
    const audioUrl = URL.createObjectURL(recordedAudio);
    const audio = new Audio();
    audioRef.current = audio;

    // Set preload to metadata to help with WebM seeking
    audio.preload = "metadata";

    // Set up event listeners
    audio.onloadedmetadata = () => {
      const duration = audio.duration;
      console.log("🎵 Audio metadata loaded, duration:", duration);

      if (duration && isFinite(duration) && duration > 0) {
        setAudioDuration(duration);
        console.log("🎵 Valid duration set:", duration);
      } else {
        console.log("🎵 Invalid duration, trying to estimate...");
        // For WebM files, duration might not be available immediately
        // Calculate estimated duration based on conversation time
        if (consultationStartTime && messages.length > 0) {
          const lastMessage = messages[messages.length - 1];
          const conversationDuration =
            (lastMessage.timestamp - consultationStartTime) / 1000;
          setAudioDuration(conversationDuration + 10); // Add 10 seconds buffer
          console.log(
            "🎵 Estimated duration from conversation:",
            conversationDuration + 10
          );
        } else {
          // Fallback to file size estimation
          const estimatedDuration = recordedAudio.size / (16000 * 2);
          setAudioDuration(estimatedDuration);
          console.log(
            "🎵 Estimated duration from file size:",
            estimatedDuration
          );
        }
      }
    };

    audio.oncanplaythrough = () => {
      console.log("🎵 Audio can play through - seeking should work now");
      // This is when seeking becomes reliable for WebM files
    };

    audio.onloadeddata = () => {
      console.log("🎵 Audio data loaded, readyState:", audio.readyState);
    };

    audio.ontimeupdate = () => {
      const currentTime = audio.currentTime || 0;
      setCurrentAudioTime(currentTime);
      // Message highlighting is now handled by the useEffect above
    };

    audio.onended = () => {
      setCurrentAudioTime(0);
      setCurrentPlayingMessageId(null);
      console.log("🎵 Audio playback ended");
    };

    audio.onerror = (e) => {
      console.error("🎵 Audio error:", e);
    };

    audio.ondurationchange = () => {
      const duration = audio.duration;
      console.log("🎵 Duration changed:", duration);
      if (duration && isFinite(duration) && duration > 0) {
        setAudioDuration(duration);
      }
    };

    // Set source and load
    audio.src = audioUrl;
    audio.load();

    // For WebM files, we need to ensure the audio is properly initialized
    // before seeking works reliably
    const ensureInitialized = () => {
      if (audio.readyState >= 2) {
        // HAVE_CURRENT_DATA
        console.log("🎵 Audio ready for seeking");
      } else {
        console.log("🎵 Audio not ready yet, waiting...");
        setTimeout(ensureInitialized, 100);
      }
    };

    // Start checking readiness
    setTimeout(ensureInitialized, 100);

    // Cleanup function
    return () => {
      URL.revokeObjectURL(audioUrl);
    };
  }, [recordedAudio, consultationStartTime, messages]);

  // Track final messages count to avoid unnecessary question generation
  const finalMessagesRef = useRef<number>(0);
  const questionGenerationTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Auto-scroll to new messages
  const scrollToBottom = useCallback((smooth = true) => {
    if (!messagesContainerRef.current) {
      console.log('❌ scrollToBottom: No container ref');
      return;
    }
    
    const container = messagesContainerRef.current;
    
    console.log('🔄 scrollToBottom called', {
      scrollHeight: container.scrollHeight,
      clientHeight: container.clientHeight,
      currentScrollTop: container.scrollTop,
      smooth,
      hasChildren: container.children.length
    });
    
    // Force scroll to the very bottom
    const targetScrollTop = Math.max(0, container.scrollHeight - container.clientHeight);
    
    console.log('🔄 Scrolling to target:', targetScrollTop);
    
    if (smooth) {
      container.scrollTo({
        top: targetScrollTop,
        behavior: 'smooth'
      });
    } else {
      container.scrollTop = targetScrollTop;
    }
    
    // Verify scroll happened
    setTimeout(() => {
      console.log('🔄 Scroll verification', {
        actualScrollTop: container.scrollTop,
        targetScrollTop,
        difference: Math.abs(container.scrollTop - targetScrollTop),
        success: Math.abs(container.scrollTop - targetScrollTop) < 10
      });
    }, smooth ? 300 : 50);
    
    // Also scroll the body if the container is not fully visible
    const containerRect = container.getBoundingClientRect();
    const viewportHeight = window.innerHeight;
    
    if (containerRect.bottom > viewportHeight) {
      const bodyScrollTarget = document.documentElement.scrollTop + (containerRect.bottom - viewportHeight) + 20;
      
      console.log('🔄 Also scrolling body to:', bodyScrollTarget);
      
      if (smooth) {
        window.scrollTo({
          top: bodyScrollTarget,
          behavior: 'smooth'
        });
      } else {
        window.scrollTo(0, bodyScrollTarget);
      }
    }
  }, []);

  // Check if user is near bottom of messages
  const checkIfNearBottom = useCallback(() => {
    if (!messagesContainerRef.current) return false;
    
    const container = messagesContainerRef.current;
    const threshold = 50; // pixels from bottom
    const scrollTop = container.scrollTop;
    const scrollHeight = container.scrollHeight;
    const clientHeight = container.clientHeight;
    
    // Calculate how far from bottom we are
    const distanceFromBottom = scrollHeight - (scrollTop + clientHeight);
    const isNear = distanceFromBottom <= threshold;
    
    console.log('📍 checkIfNearBottom', {
      scrollTop,
      scrollHeight,
      clientHeight,
      distanceFromBottom,
      threshold,
      isNear,
      wasNear: isNearBottom
    });
    
    setIsNearBottom(isNear);
    return isNear;
  }, [isNearBottom]);

  // Handle scroll events with debouncing
  const handleScroll = useCallback(() => {
    const now = Date.now();
    setLastScrollTime(now);
    
    // Clear existing timeout
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    
    // Check if near bottom immediately
    const nearBottom = checkIfNearBottom();
    
    console.log('📜 User scrolled', {
      nearBottom,
      scrollTop: messagesContainerRef.current?.scrollTop,
      scrollHeight: messagesContainerRef.current?.scrollHeight,
      clientHeight: messagesContainerRef.current?.clientHeight
    });
    
    // Only disable auto-scroll if user scrolled away from bottom
    if (!nearBottom) {
      console.log('📜 User scrolled away from bottom - disabling auto-scroll');
      setIsUserScrolling(true);
      setAutoScrollEnabled(false);
    } else {
      console.log('📜 User is at bottom - keeping auto-scroll enabled');
      // If user is at bottom, we can keep auto-scroll enabled
      setIsUserScrolling(false);
      setAutoScrollEnabled(true);
    }
    
    // Reset scrolling state after user stops scrolling
    scrollTimeoutRef.current = setTimeout(() => {
      console.log('📜 Scroll timeout - resetting user scrolling state');
      setIsUserScrolling(false);
      
      // Re-check if near bottom and re-enable auto-scroll if so
      const stillNearBottom = checkIfNearBottom();
      if (stillNearBottom) {
        console.log('📜 User is near bottom, re-enabling auto-scroll');
        setAutoScrollEnabled(true);
      }
    }, 1000); // Reduced to 1 second for faster re-enabling
  }, [checkIfNearBottom]);

  // Track previous message count to detect new messages
  const prevMessageCountRef = useRef(0);
  
  // Auto-scroll ONLY when new messages are added (message count increases)
  useEffect(() => {
    const currentMessageCount = messages.length;
    const previousMessageCount = prevMessageCountRef.current;
    
    // Only scroll if message count actually increased (new message added)
    if (currentMessageCount > previousMessageCount && currentMessageCount > 0) {
      console.log('🚀 NEW MESSAGE ADDED - Auto-scrolling', {
        previousCount: previousMessageCount,
        currentCount: currentMessageCount,
        isUserScrolling,
        containerExists: !!messagesContainerRef.current
      });
      
      // Always scroll when new messages are generated, regardless of user scroll state
      console.log('🚀 EXECUTING AUTO-SCROLL for new message');
      
      // Use requestAnimationFrame to ensure DOM is updated
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          scrollToBottom(true);
          
          // Update scroll state after scrolling
          setTimeout(() => {
            const nearBottom = checkIfNearBottom();
            setShowScrollToBottom(!nearBottom && messages.length > 0);
            setIsUserScrolling(false); // Reset user scrolling state when new message arrives
            setAutoScrollEnabled(true); // Re-enable auto-scroll
            console.log('🚀 POST-SCROLL STATE', { nearBottom });
          }, 200);
        });
      });
    } else if (currentMessageCount > 0) {
      console.log('🔄 MESSAGE CONTENT CHANGED (no new messages)', {
        count: currentMessageCount,
        previousCount: previousMessageCount
      });
      
      // Just update scroll-to-bottom button visibility for content changes
      requestAnimationFrame(() => {
        const nearBottom = checkIfNearBottom();
        setShowScrollToBottom(!nearBottom && messages.length > 0);
      });
    }
    
    // Update the previous count
    prevMessageCountRef.current = currentMessageCount;
  }, [messages.length, scrollToBottom, checkIfNearBottom]);

  // Handle content changes (interim -> final transitions) - only scroll if actively generating AND near bottom
  useEffect(() => {
    if (messages.length === 0) return;
    
    const currentMessageCount = messages.length;
    const previousMessageCount = prevMessageCountRef.current;
    
    // Only handle content changes if message count hasn't increased (no new messages)
    if (currentMessageCount === previousMessageCount && currentMessageCount > 0) {
      console.log('🔄 CONTENT CHANGE EFFECT (same count)', {
        messagesCount: messages.length,
        isUserScrolling,
        lastMessageText: messages[messages.length - 1]?.text?.substring(0, 50),
        isRecording,
        connectionStatus,
        isNearBottom
      });
      
      // Only auto-scroll for content changes if:
      // 1. We're actively recording/connected (messages being generated)
      // 2. User is not manually scrolling
      // 3. User is already near the bottom (don't force scroll if they scrolled up)
      if (!isUserScrolling && isRecording && connectionStatus === 'connected' && isNearBottom) {
        requestAnimationFrame(() => {
          console.log('🔄 CONTENT CHANGE - Executing scroll (actively recording & near bottom)');
          scrollToBottom(true);
        });
      } else {
        console.log('🔄 CONTENT CHANGE - Skipping scroll', {
          reason: !isRecording ? 'not recording' : 
                  connectionStatus !== 'connected' ? 'not connected' :
                  isUserScrolling ? 'user scrolling' :
                  !isNearBottom ? 'not near bottom' : 'unknown'
        });
      }
    }
  }, [messages, isUserScrolling, scrollToBottom, isRecording, connectionStatus, isNearBottom]);

  // Initial scroll to bottom when messages first appear
  useEffect(() => {
    if (messages.length > 0 && messagesContainerRef.current) {
      // Small delay to ensure DOM is rendered
      setTimeout(() => {
        scrollToBottom(false); // Use instant scroll for initial load
        const nearBottom = checkIfNearBottom();
        setIsNearBottom(nearBottom);
        setAutoScrollEnabled(true);
      }, 100);
    }
  }, [messages.length > 0 ? 'has-messages' : 'no-messages']); // Only trigger when transitioning from 0 to >0 messages

  // Auto-generate questions when final messages change (debounced)
  useEffect(() => {
    const finalMessages = messages.filter((msg) => !msg.isInterim);
    const finalMessagesCount = finalMessages.length;

    console.log(
      "📝 Messages updated - Total:",
      messages.length,
      "Final:",
      finalMessagesCount,
      "Previous Final:",
      finalMessagesRef.current
    );

    // Generate suggestions early and often: after 1st message and then every 2 new final messages
    const hasNewFinals = finalMessagesCount > finalMessagesRef.current;
    const shouldGenerate =
      hasNewFinals &&
      (finalMessagesCount === 1 || finalMessagesCount % 2 === 0);

    if (shouldGenerate) {
      if (questionGenerationTimeoutRef.current) {
        clearTimeout(questionGenerationTimeoutRef.current);
      }

      questionGenerationTimeoutRef.current = setTimeout(() => {
        console.log(
          "🤖 Generating questions for",
          finalMessagesCount,
          "final messages"
        );
        generateQuestions(finalMessages);
        finalMessagesRef.current = finalMessagesCount;
      }, 1200);
    }

    return () => {
      if (questionGenerationTimeoutRef.current) {
        clearTimeout(questionGenerationTimeoutRef.current);
      }
    };
  }, [messages, generateQuestions]); // Only depend on messages, generateQuestions is now stable

  // Handle message highlighting based on current audio time
  useEffect(() => {
    if (!consultationStartTime || !messages.length || !audioRef.current) return;

    const updatePlayingMessage = () => {
      const currentTime = audioRef.current?.currentTime || 0;
      // Add 6 second buffer to match the seek behavior
      const currentRelativeTime = currentTime + 6.0;

      // Sort messages by timestamp
      const sortedMessages = [...messages].sort(
        (a, b) => a.timestamp - b.timestamp
      );

      // Find the active message based on current time
      let activeMessage = null;

      // First, try to find a message that exactly matches or is very close to current time
      for (let i = 0; i < sortedMessages.length; i++) {
        const message = sortedMessages[i];
        const messageTime = (message.timestamp - consultationStartTime) / 1000;
        const nextMessage = sortedMessages[i + 1];
        const nextMessageTime = nextMessage
          ? (nextMessage.timestamp - consultationStartTime) / 1000
          : messageTime + 5; // Default 5 second window for last message

        // Check if current time falls within this message's time window
        // Use a smaller buffer for more precise matching
        if (
          messageTime <= currentRelativeTime &&
          currentRelativeTime < nextMessageTime
        ) {
          activeMessage = message;
          break;
        }
      }

      // If no exact match, find the closest preceding message
      if (!activeMessage && sortedMessages.length > 0) {
        for (let i = sortedMessages.length - 1; i >= 0; i--) {
          const message = sortedMessages[i];
          const messageTime =
            (message.timestamp - consultationStartTime) / 1000;
          if (messageTime <= currentRelativeTime) {
            activeMessage = message;
            break;
          }
        }
      }

      if (activeMessage && activeMessage.id !== currentPlayingMessageId) {
        console.log(
          `🎯 Highlighting message: ${activeMessage.speaker} at ${(
            (activeMessage.timestamp - consultationStartTime) /
            1000
          ).toFixed(2)}s (audio: ${currentTime.toFixed(
            2
          )}s, adjusted: ${currentRelativeTime.toFixed(2)}s)`
        );
        setCurrentPlayingMessageId(activeMessage.id);

        // Auto-scroll to message only if enabled and user isn't manually scrolling
        if (autoScrollEnabled && !isUserScrolling) {
          const messageElement = document.getElementById(
            `message-${activeMessage.id}`
          );
          if (messageElement && messagesContainerRef.current) {
            // Check if message is visible in viewport
            const container = messagesContainerRef.current;
            const messageRect = messageElement.getBoundingClientRect();
            const containerRect = container.getBoundingClientRect();
            
            const isMessageVisible = 
              messageRect.top >= containerRect.top && 
              messageRect.bottom <= containerRect.bottom;
            
            if (!isMessageVisible) {
            messageElement.scrollIntoView({
              behavior: "smooth",
              block: "center",
              inline: "nearest",
            });
            }
          }
        }
      }
    };

    // Set up interval to check current playing message
    const interval = setInterval(updatePlayingMessage, 500);
    return () => clearInterval(interval);
  }, [
    consultationStartTime,
    messages,
    currentPlayingMessageId,
    autoScrollEnabled,
    isUserScrolling,
  ]);

  // Initialize audio when recording becomes available
  useEffect(() => {
    if (recordedAudio) {
      console.log("🎵 Audio available, initializing...");
      // Initialize audio immediately when available
      setTimeout(() => {
        initializeAudio();
      }, 100);
    }
  }, [recordedAudio, initializeAudio]);

  // Clean up audio and scroll timeouts when component unmounts
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        audioRef.current.pause();
        audioRef.current = null;
      }
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, []);

  const hasActiveSession = useCallback(() => {
    if (appointment?.status === "completed" || uploadedPdfUuid !== null) {
      return false;
    }
    
    return recordingState === "recording" || 
           recordingState === "paused" || 
           messages.length > 0;
  }, [recordingState, messages.length, appointment?.status, summaryGenerated, uploadedPdfUuid]);

  useNavigationWarning({
    shouldWarn: hasActiveSession,
    message: 'You have an active consultation session. Are you sure you want to leave? You may lose session data.',
    enabled: true,
    onConfirm: showNavigationWarning
  });

  const handleBackNavigation = async (targetUrl: string) => {
    if (!hasActiveSession()) {
      window.location.href = targetUrl;
      return;
    }

    try {
      const shouldLeave = await showNavigationWarning(
        'You have an active consultation session. Are you sure you want to leave? You may lose session data.'
      );
      
      if (shouldLeave) {
        setNavigatingProgrammatically(true);
        window.location.href = targetUrl;
      }
    } catch (error) {
      console.error('Error in back navigation:', error);
      setNavigatingProgrammatically(true);
      window.location.href = targetUrl;
    }
  };

  useEffect(() => {
    const validateAppointment = async () => {
      setIsValidating(true);
      // No API call fallback; just check if appointment exists in context
      setIsValidating(false);
    };
    validateAppointment();
  }, [params, appointment]);


  // Fetch awsEntities and muscleTerms from API when messages change
  useEffect(() => {
    if (!messages.length) return;
    const transcriptText = messages.map((m) => m.text).join(" ");
    fetch("/api/highlight-muscles", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: transcriptText }),
    })
      .then((res) => res.json())
      .then((data) => {
        setAwsEntities(data.awsEntities || []);
        setMuscleTerms(data.muscleTerms || []);
        setQdrantResults(data.goodMatches || []); // Use goodMatches instead of qdrantResults
      });
  }, [messages]);

  // Highlight text using awsEntities and muscleTerms
  const highlightText = (
    text: string,
    awsEntities: { Text: string }[] = [],
    muscleTerms: string[] = []
  ) => {
    console.log("🔍 highlightText called with:", {
      text: text.substring(0, 50) + "...",
      awsEntities: awsEntities.length,
      muscleTerms,
    });

    const awsTerms = awsEntities.map((e: { Text: string }) =>
      e.Text.toLowerCase()
    );
    const allTerms = [
      ...new Set([...awsTerms, ...muscleTerms.map((m) => m.toLowerCase())]),
    ];

    console.log("🔍 All terms to highlight:", allTerms);

    if (allTerms.length === 0) return text;
    const pattern = allTerms
      .map((term) => term.replace(/\s+/g, "\\s+"))
      .join("|");
    const regex = new RegExp(`\\b(${pattern})\\b`, "gi");
    // Replace with <span> for highlighting
    const parts = text.split(regex);

    console.log("🔍 Text parts after splitting:", parts);

    return parts?.map((part, i) => {
      if (!part) return null;
      const lowerPart = part.toLowerCase();
      console.log(`🔍 Processing part ${i}: "${part}" (lower: "${lowerPart}")`);

      if (allTerms.includes(lowerPart)) {
        // If this is a muscle term, make it clickable
        const isMuscle = muscleTerms
          .map((m) => m.toLowerCase())
          .includes(lowerPart);
        console.log(`🔍 Term "${part}" is muscle: ${isMuscle}`);

        if (isMuscle) {
          console.log(`🔍 Creating clickable span for muscle: "${part}"`);
          return (
            <span
              key={i}
              className="bg-yellow-200 font-bold cursor-pointer underline decoration-dotted hover:bg-yellow-300 transition-colors"
              title="Click for muscle info"
              onClick={(e) => {
                e.stopPropagation();
                console.log("🖱️ Clicked on muscle term:", part);
                handleMuscleClick(part);
              }}
            >
              {part}
            </span>
          );
        } else {
          // Non-muscle term, just highlight
          console.log(`🔍 Creating non-clickable highlight for: "${part}"`);
          return (
            <span key={i} className="bg-yellow-200 font-bold">
              {part}
            </span>
          );
        }
      }
      return part;
    });
  };

  const startConsultation = useCallback(async () => {
    if (recordingState === "paused") {
      console.log("▶️ Resuming consultation...");
      setRecordingState("recording");
      await startStreaming();
    } else {
      console.log(
        "▶️ Starting new consultation with enhanced Deepgram streaming..."
      );
      // Start video call first only for video mode
      if (appointment?.mode === "video" && videoTileRef.current) {
        try {
          await videoTileRef.current.startCall();
        } catch (e) {
          console.error("❌ Failed to start video call:", e);
        }
      }
      // Only set start time for completely new consultations
      if (!consultationStartTime) {
        const startTime = Date.now();
        setConsultationStartTime(startTime);
        if (resolvedAppointmentId) {
          callAnalyticsService('/api/analytics/track-session', {
            method: 'POST',
            body: JSON.stringify({
              appointmentId: resolvedAppointmentId,
              action: 'start',
              timestamp: startTime
            })
          }).catch(error => {
            console.error('Failed to track session start:', error);
          });
        }
      }
      setRecordingState("recording");
      await startStreaming();
    }
  }, [
    appointment?.mode,
    videoTileRef,
    consultationStartTime,
    recordingState,
    startStreaming,
  ]);

  // Auto-start transcription (and video if needed) once per session
  useEffect(() => {
    const autoStart = async () => {
      try {
        if (
          hasAutoStartedRef.current ||
          isCancellationInProgress ||
          appointment?.status === "completed"
        ) {
          return;
        }
        // Only auto-start for video mode; physical should be manual
        if (
          appointment?.mode === "video" &&
          !isRecording &&
          recordingState === "stopped"
        ) {
          hasAutoStartedRef.current = true;
          await startConsultation();
        }
      } catch (err) {
        console.error("Auto-start failed:", err);
      }
    };
    autoStart();
  }, [
    startConsultation,
    isRecording,
    recordingState,
    isCancellationInProgress,
    appointment?.status,
    appointment?.mode,
  ]);

  // Pause/stop made redundant; single End handles full termination
  const pauseRecording = () => {
    console.log("⏸️ Pausing recording (physical)...");
    setRecordingState("paused");
    try {
      stopStreaming();
    } catch (e) {
      console.warn("pause stopStreaming error:", e);
    }
  };

  const stopRecording = () => {
    console.log("⏹️ Stopping recording (physical)...");
    setRecordingState("stopped");
    try {
      stopStreaming();
    } catch (e) {
      console.warn("stop stopStreaming error:", e);
    }
  };

  const handleGenerateSummaryAndPdf = () => {
    if (isRecording) {
      setShowStopConfirmDialog(true);
    } else {
      proceedWithSummaryGeneration();
    }
  };

  const proceedWithSummaryGeneration = async () => {
    setShowStopConfirmDialog(false);
    setSummaryGenerationInProgress(true);
    
    if (isRecording) {
      console.log("⏹️ Stopping recording for summary generation...");
      setRecordingState("stopped");
      try {
        stopStreaming();
      } catch (e) {
        console.warn("stop stopStreaming error:", e);
      }
    }

    if (messages.length > 0 && !summaryGenerated) {
      try {
        setPdfGenerationMessage("Generating medical summary for review...");
        
        const resSummary = await generateSummary();
        console.log("🔍 Summary generated:", resSummary);
        
        setSummary(resSummary);
        setEditableSummary(resSummary);
        setSummaryGenerated(true);
        
        
        setPdfGenerationMessage("Summary generated! Please review and edit if needed.");
        setSummaryGenerationInProgress(false);
      } catch (error) {
        console.error("❌ Error generating summary:", error);
        setPdfGenerationMessage("Error generating summary. Please try again.");
        setSummaryGenerationInProgress(false);
      }
    }
  };

  const endConsultation = async () => {
    // Block any auto-starts and stop streaming right away
    hasAutoStartedRef.current = true;
    setIsCancellationInProgress(true);
    console.log("⏹️ Ending consultation...");
    setRecordingState("stopped");
    if (resolvedAppointmentId) {
      const endTime = Date.now();
      callAnalyticsService('/api/analytics/track-session', {
        method: 'POST',
        body: JSON.stringify({
          appointmentId: resolvedAppointmentId,
          action: 'end',
          timestamp: endTime
        })
      }).catch(error => {
        console.error('Failed to track session end:', error);
      });


    }
    
    try {
      stopStreaming();
    } catch (e) {
      console.warn("stopStreaming error:", e);
    }

    if (videoTileRef.current) {
      try {
        console.log("📞 Ending video call automatically...");
        videoTileRef.current.endCall();
      } catch (e) {
        console.warn("endCall error:", e);
      }
    }

    // Generate final summary first (without PDF generation)
    if (messages.length > 0 && !summaryGenerated) {
      try {
        setPdfGenerationMessage(
          "Generating medical summary for review..."
        );

        const resSummary = await generateSummary();
        console.log("🔍 Summary generated:", resSummary);
        
        setSummary(resSummary);
        setEditableSummary(resSummary);
        setSummaryGenerated(true);
        

        setPdfGenerationMessage("Summary generated! Please review and edit if needed.");
        
        // Stop here - don't generate PDF yet, wait for user to review/edit
        setIsCancellationInProgress(false);
        return;
      } catch (error) {
        console.error("❌ Error generating summary:", error);
        setPdfGenerationMessage("Error generating summary. Please try again.");
        setIsCancellationInProgress(false);
        return;
      }
    }

    // If summary is already generated, proceed with PDF generation
    if (summaryGenerated) {
      try {
        setIsGeneratingPdf(true);
        setPdfGenerationMessage("Creating PDF report...");
        // Generate PDF using the edited summary
        const pdf = await generateMedicalReportPDF(
          {
            patientName: appointment?.patientName || "",
            date: appointment?.date || "",
            time: appointment?.time || "",
            duration: appointment?.duration || "N/A",
            sessionId: resolvedAppointmentId || 'unknown',
            summary: editableSummary || "",
            messages: messages.map((msg) => ({
              speaker: msg.speaker,
              text: msg.text,
              timestamp: msg.timestamp,
            })),
            doctor: doctor ? {
              name: doctor.name,
              specialty: doctor.specialty,
              email: doctor.email,
              phone: doctor.phone,
              license: `LIC-${doctor.id.slice(0, 8).toUpperCase()}`,
              experience: doctor.experience,
            } : undefined,
          },
          false
        );

        setPdfGenerationMessage("Uploading report to secure storage...");
        setIsGeneratingPdf(false);
        setIsUploadingPdf(true);

        // Convert PDF to blob
        const pdfBlob = pdf.output("blob");
        const fileName = `medical-report-${appointment?.patientName?.replace(/\s+/g, "-").toLowerCase()}-${Date.now()}.pdf`;

        // Step 1: Get presigned upload URL
        const uploadUrlResponse = await fetch(
          "/api/files/generate-upload-url",
          {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
            },
            body: JSON.stringify({
              fileName: fileName,
              fileSize: pdfBlob.size,
              mimeType: "application/pdf",
              category: "medical_report",
              description: `Medical consultation report for ${appointment?.patientName} on ${appointment?.date}`,
              expiresIn: 3600,
            }),
          }
        );

        const uploadData = await uploadUrlResponse.json();

        if (!uploadData.success) {
          throw new Error(uploadData.error || "Failed to get upload URL");
        }

        console.log("✅ Upload URL generated:", uploadData);

        // Step 2: Upload PDF directly to S3
        const uploadToS3Response = await fetch(uploadData.upload.presignedUrl, {
          method: "PUT",
          headers: {
            "Content-Type": "application/pdf",
          },
          body: pdfBlob,
        });

        if (!uploadToS3Response.ok) {
          throw new Error(
            `S3 upload failed: ${uploadToS3Response.status} ${uploadToS3Response.statusText}`
          );
        }

        console.log("✅ PDF uploaded to S3 successfully");

        // Store the uploaded file UUID for later download
        setUploadedPdfUuid(uploadData.file.uuid);
        setPdfGenerationMessage("Report generated and uploaded successfully!");

        toast.success("🎉 Consultation Completed Successfully!", {
          description: "Your consultation summary has been generated and saved. Click the download button to get your PDF report.",
          duration: 6000,
          dismissible: true,
          closeButton: true,
          style: {
            background: "linear-gradient(135deg, #10b981 0%, #059669 100%)",
            color: "white",
            border: "1px solid #059669",
            borderRadius: "12px",
            boxShadow: "0 10px 25px -5px rgba(16, 185, 129, 0.25), 0 10px 10px -5px rgba(16, 185, 129, 0.04)",
          },
          className: "font-medium mb-20",
        });
        if (resolvedAppointmentId) {
          callAnalyticsService('/api/analytics/track-pdf', {
            method: 'POST',
            body: JSON.stringify({
              appointmentId: resolvedAppointmentId,
              action: 'generated'
            })
          }).catch(error => {
            console.error('Failed to track PDF generation:', error);
          });
        }
        // Update appointment with consultation summary file UUID and mark as completed
        const statusUpdated = await updateAppointmentStatus(
          "completed",
          uploadData.file.uuid
        );
        if (statusUpdated) {
          setPdfGenerationMessage(
            "Report generated and consultation completed!"
          );
        }

        // Clear the message after 3 seconds
        setTimeout(() => {
          setPdfGenerationMessage("");
        }, 3000);
      } catch (error) {
        console.error("❌ Error generating/uploading PDF:", error);
        setPdfGenerationMessage("Error generating report. Please try again.");

        // Clear the error message after 5 seconds
        setTimeout(() => {
          setPdfGenerationMessage("");
        }, 5000);
      } finally {
        setIsGeneratingPdf(false);
        setIsUploadingPdf(false);
        setIsCancellationInProgress(false);
      }
    }
  };

  const downloadAudio = () => {
    if (!recordedAudio) return;

    const url = URL.createObjectURL(recordedAudio);
    const a = document.createElement("a");
    a.href = url;
    a.download = `consultation-audio-${appointment?.patientName}-${
      new Date().toISOString().split("T")[0]
    }.webm`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const playAudio = useCallback(() => {
    if (!recordedAudio) {
      console.log("🎵 No recorded audio to play");
      return;
    }

    if (!audioRef.current) {
      console.log("🎵 Initializing audio for playback");
      initializeAudio();
      // Wait a bit for initialization then try again
      setTimeout(() => playAudio(), 200);
      return;
    }

    const audio = audioRef.current;
    if (audio.readyState < 2) {
      console.log("🎵 Audio not ready for playback, waiting...");
      audio.addEventListener(
        "loadeddata",
        () => {
          audio.play().catch((e) => console.error("🎵 Play error:", e));
        },
        { once: true }
      );
      return;
    }

    console.log("🎵 Playing audio");
    audio.play().catch((e) => console.error("🎵 Play error:", e));

    // The ontimeupdate handler will automatically set the correct playing message
  }, [recordedAudio, initializeAudio]);

  const seekToTime = useCallback(
    (time: number) => {
      console.log(`🔍 seekToTime called with: ${time}`);

      if (!audioRef.current) {
        console.log("🔍 No audio ref, initializing...");
        initializeAudio();
        // Wait for initialization and try again
        setTimeout(() => seekToTime(time), 200);
        return;
      }

      const audio = audioRef.current;

      // Wait for audio to be ready - for WebM files, we need more data loaded
      if (audio.readyState < 3) {
        // HAVE_FUTURE_DATA - better for WebM seeking
        console.log(
          `🔍 Audio not ready for seeking (readyState: ${audio.readyState}), waiting...`
        );

        const waitForReady = () => {
          if (audio.readyState >= 3) {
            seekToTime(time);
          } else {
            // Try different events based on readyState
            if (audio.readyState < 2) {
              audio.addEventListener("loadeddata", waitForReady, {
                once: true,
              });
            } else {
              audio.addEventListener("canplay", waitForReady, { once: true });
            }
          }
        };

        waitForReady();
        return;
      }

      let seekTime = time;

      // If time looks like a timestamp (large number), convert to relative time
      if (time > 1000000000000 && consultationStartTime) {
        // This is a timestamp, convert to relative seconds
        seekTime = Math.max(0, (time - consultationStartTime) / 1000);
        console.log(
          `🔍 Converting timestamp ${new Date(
            time
          ).toLocaleTimeString()} to relative time: ${seekTime.toFixed(2)}s`
        );
      } else {
        // This is already relative time in seconds
        console.log(`🔍 Using relative time directly: ${seekTime.toFixed(2)}s`);
      }

      // Add a 6 second buffer to provide context before the message
      const bufferedTime = Math.max(0, seekTime - 6.0); // Go back 6 seconds for context

      // Ensure we don't seek beyond audio duration
      const maxTime = audio.duration || 0;
      const adjustedTime = Math.min(bufferedTime, maxTime);

      console.log(
        `🔍 Seeking to: ${seekTime.toFixed(2)}s → ${adjustedTime.toFixed(
          2
        )}s (buffered -6.0s, max: ${maxTime.toFixed(2)}s)`
      );

      try {
        // For WebM files, seeking can be unreliable on first attempt
        // Try a more robust approach
        const performSeek = () => {
          audio.currentTime = adjustedTime;
          setCurrentAudioTime(adjustedTime);
        };

        // If this is the first time seeking or audio hasn't been played yet
        if (audio.currentTime === 0 && audio.paused) {
          console.log("🔍 First seek - starting playback first");
          // Start playing first, then seek after a short delay
          audio
            .play()
            .then(() => {
              setTimeout(() => {
                performSeek();
              }, 100);
            })
            .catch((e) => {
              console.error("🔍 Play error:", e);
              // Try seeking anyway
              performSeek();
            });
        } else {
          // Normal seek operation
          performSeek();

          // Auto-play if not already playing
          if (audio.paused) {
            audio.play().catch((e) => console.error("🔍 Play error:", e));
          }
        }
      } catch (error) {
        console.error("🔍 Seek error:", error);
        // Fallback: try playing first, then seeking
        if (audio.paused) {
          audio
            .play()
            .then(() => {
              setTimeout(() => {
                try {
                  audio.currentTime = adjustedTime;
                  setCurrentAudioTime(adjustedTime);
                } catch (fallbackError) {
                  console.error("🔍 Fallback seek error:", fallbackError);
                }
              }, 200);
            })
            .catch(console.error);
        }
      }
    },
    [consultationStartTime, initializeAudio]
  );

  const pauseAudio = () => {
    if (audioRef.current) {
      audioRef.current.pause();
      // Clear the playing message when paused
      setCurrentPlayingMessageId(null);
    }
  };

  const generateSummary = async () => {
    if (!messages.length) return;

    try {
      const conversationText = messages
        .map((msg) => `${msg.speaker}: ${msg.text}`)
        .join("\n");

      const response = await fetch("/api/summarize", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          transcript: conversationText,
          appointmentId: resolvedAppointmentId,
        }),
      });

      if (response.ok) {
        const data = await response.json();
        setSummary(data.summary);
        setEditableSummary(data.summary);
        setSummaryGenerated(true);
        return data.summary;
      }
    } catch (error) {
      console.error("Error generating summary:", error);
    }
  };

  const handleSummaryEdit = () => {
    setIsEditingSummary(true);
  };

  const handleSummaryCancel = () => {
    setIsEditingSummary(false);
  };

  const proceedWithPdfGeneration = async () => {
    // This function will be called when user clicks "Generate PDF" after editing
    await endConsultation();
  };

  const downloadTranscript = () => {
    const transcript = messages
      .map((msg) => {
        const timestamp = new Date(msg.timestamp).toLocaleTimeString();
        return `[${timestamp}] ${msg.speaker}: ${msg.text}`;
      })
      .join("\n\n");

    const blob = new Blob([transcript], { type: "text/plain" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `consultation-transcript-${appointment?.patientName}-${
      new Date().toISOString().split("T")[0]
    }.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const updateAppointmentStatus = async (
    status: string,
    consultationSummaryFileUuid?: string
  ) => {
    if (!appointment?.id) {
      console.error("No appointment ID available for status update");
      return false;
    }

    try {
      const updateData: {
        id: string;
        status: string;
        consultationSummaryFileUuid?: string;
      } = {
        id: appointment.id,
        status: status,
      };

      // Add consultation summary file UUID if provided
      if (consultationSummaryFileUuid) {
        updateData.consultationSummaryFileUuid = consultationSummaryFileUuid;
      }

      const response = await fetch("/api/appointments", {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(updateData),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to update appointment status");
      }

      // Update the appointment context
      if (appointment) {
        setAppointment({
          ...appointment,
          status: status as "completed" | "scheduled" | "in-progress",
        });
      }

      console.log("✅ Appointment status updated successfully");
      return true;
    } catch (error) {
      console.error("❌ Error updating appointment status:", error);
      return false;
    }
  };

  const downloadMedicalReport = async () => {
    if (!uploadedPdfUuid) {
      console.error("No PDF UUID available for download");
      return;
    }

    try {
      setIsDownloadingPdf(true);

      // Get presigned download URL
      const response = await fetch("/api/files/get-presigned-url", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          uuid: uploadedPdfUuid,
          expiresIn: 3600,
        }),
      });

      const data = await response.json();

      if (!data.success) {
        throw new Error(data.error || "Failed to get download URL");
      }

      // Download the file using the presigned URL
      const downloadResponse = await fetch(data.presignedUrl);
      if (!downloadResponse.ok) {
        throw new Error("Failed to download file");
      }

      const blob = await downloadResponse.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download =
        data.fileName || `medical-report-${appointment?.patientName}.pdf`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);

      console.log("✅ Medical report downloaded successfully");
    } catch (error) {
      console.error("❌ Error downloading medical report:", error);
      alert("Failed to download medical report. Please try again.");
    } finally {
      setIsDownloadingPdf(false);
    }
  };

  // Helper function to check if consultation is completed
  const isConsultationCompleted = () => appointment?.status === "completed";

  // Handler for muscle click
  const handleMuscleClick = (muscleName: string) => {
    console.log("🖱️ Muscle clicked:", muscleName);
    console.log("🟢 QdrantResults:", qdrantResults);

    const normalize = (str: string) =>
      str
        .toLowerCase()
        .replace(/muscle(s)?/g, "")
        .trim();

    const muscleData = qdrantResults.find(
      (result: { muscle_name?: string; score?: number }) => {
        const qName = normalize(result.muscle_name || "");
        const mName = normalize(muscleName || "");
        return (
          qName === mName || qName.includes(mName) || mName.includes(qName)
        );
      }
    );

    console.log("🟢 Found muscle data:", muscleData);

    setSelectedMuscleName(muscleName);
    setSelectedMuscleData(
      muscleData
        ? (muscleData as {
            muscle_name?: string;
            description?: string;
            s3_url?: string;
            imageData?: string;
            presignedUrl?: string;
            score?: number;
            [key: string]: unknown;
          })
        : null
    );
    setMuscleInfoModalOpen(true);
  };

  // Debug modal state changes
  useEffect(() => {
    console.log(
      "🔍 Modal state changed - open:",
      muscleInfoModalOpen,
      "selectedMuscleName:",
      selectedMuscleName
    );
  }, [muscleInfoModalOpen, selectedMuscleName]);

  if (isValidating) {
    return (
      <motion.div
        className="flex items-center justify-center min-h-screen"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 0.3 }}
      >
        <Loader2 className="h-8 w-8 animate-spin" />
      </motion.div>
    );
  }
  console.log("appointment", appointment);

  if (!appointment) {
    return (
      <motion.div
        className="flex items-center justify-center min-h-screen"
        initial={{ opacity: 0, scale: 0.9 }}
        animate={{ opacity: 1, scale: 1 }}
        transition={{ duration: 0.4 }}
      >
        <motion.div
          variants={cardVariants}
          initial="hidden"
          animate="visible"
          className="text-center"
        >
          <motion.div
            initial={{ scale: 0 }}
            animate={{ scale: 1 }}
            transition={{ duration: 0.5, delay: 0.2 }}
          >
            <AlertCircle className="h-12 w-12 text-red-500 mx-auto mb-4" />
          </motion.div>
          <h2 className="text-xl font-semibold mb-2">Appointment Not Found</h2>
          <p className="text-gray-600 mb-4">
            The requested appointment could not be found.
          </p>
            <motion.div
              variants={buttonHoverVariants}
              whileHover="hover"
              whileTap="tap"
            >
            <Button onClick={() => handleBackNavigation('/doctor/dashboard/appointments/consultation')}>
              Back to Appointments
            </Button>
            </motion.div>
        </motion.div>
      </motion.div>
    );
  }

  return (
    <motion.div
      className="p-2 max-w-full overflow-x-hidden"
      variants={pageVariants}
      initial="initial"
      animate="in"
      exit="out"
      transition={pageTransition}
    >
      {/* Mobile-Responsive Header */}
      <div className="space-y-3 md:space-y-4">
        {/* Desktop Header Layout */}
        <div className="hidden lg:flex lg:items-center lg:justify-between">
          <div className="flex items-center space-x-4">
              <motion.div
                variants={buttonHoverVariants}
                whileHover="hover"
                whileTap="tap"
              >
              <Button 
                variant="ghost" 
                size="sm"
                onClick={() => handleBackNavigation('/doctor/dashboard/appointments/consultation')}
              >
                  <ArrowLeft className="h-4 w-4 mr-2" />
                  Back
                </Button>
              </motion.div>
            <div>
              <h1 className="text-2xl xl:text-3xl font-bold">
                Consultation with {appointment.patientName}
              </h1>
              <p className="text-gray-600">
                {appointment.date} at {appointment.time}
              </p>
            </div>
          </div>

            <div className="flex items-center space-x-3 xl:space-x-4">
            {/* Live Session Statistics */}
            <div className="flex items-center space-x-2 xl:space-x-3">
              {/* Connection Status */}
              <div className="flex items-center space-x-1.5">
                <div
                  className={cn(
                    "w-2 h-2 rounded-full flex-shrink-0",
                    connectionStatus === "connected"
                      ? "bg-green-500"
                      : connectionStatus === "connecting"
                        ? "bg-yellow-500"
                        : connectionStatus === "error"
                          ? "bg-red-500"
                          : "bg-gray-400"
                  )}
                />
                <span className="text-xs font-medium">
                  {connectionStatus.charAt(0).toUpperCase() +
                    connectionStatus.slice(1)}
                </span>
                {speechDetected && (
                  <span className="text-blue-600 flex items-center text-xs">
                    <Volume2 className="h-3 w-3" />
                  </span>
                )}
            </div>

            {/* Status Badges */}
              <div className="flex items-center space-x-1">
              <Badge
                variant={
                  appointment.status === "completed" ? "default" : "secondary"
                }
                className={cn(
                    "text-xs px-2 py-0.5",
                  appointment.status === "completed" &&
                    "bg-green-500 text-white"
                )}
              >
                {appointment.status === "completed" ? (
                  <div className="flex items-center space-x-1">
                      <div className="w-1.5 h-1.5 bg-white rounded-full" />
                    <span>Completed</span>
                  </div>
                ) : (
                  appointment.status
                )}
              </Badge>
              {connectionStatus === "connected" &&
                appointment.status !== "completed" && (
                  <Badge
                    variant="default"
                      className="bg-green-500 text-xs px-2 py-0.5"
                  >
                    <div className="flex items-center space-x-1">
                        <div className="w-1.5 h-1.5 bg-white rounded-full animate-pulse" />
                      <span>Live</span>
                    </div>
                  </Badge>
                )}
              </div>

              {/* Info button to open Live Session Statistics */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Session info"
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Session Details</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 sm:space-y-4">
                    <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full",
                              connectionStatus === "connected"
                                ? "bg-green-500"
                                : connectionStatus === "connecting"
                                  ? "bg-yellow-500"
                                  : connectionStatus === "error"
                                    ? "bg-red-500"
                                    : "bg-gray-400"
                            )}
                          />
                          <span className="text-xs sm:text-sm font-bold">
                            {connectionStatus.charAt(0).toUpperCase() +
                              connectionStatus.slice(1)}
                          </span>
                        </div>
                        {speechDetected && (
                          <span className="text-blue-600 flex items-center text-xs">
                            <Volume2 className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">
                              Speech Active
                            </span>
                            <span className="sm:hidden">Active</span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600">
                        <b>Features:</b> Diarization • Interim Results • VAD •
                        Endpointing
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <motion.div
                        className="text-center p-2 sm:p-3 bg-blue-50 rounded-lg"
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">
                          {messages.length}
                        </div>
                        <div className="text-xs text-blue-600">Messages</div>
                      </motion.div>
                      <motion.div
                        className="text-center p-2 sm:p-3 bg-green-50 rounded-lg"
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">
                          {[...new Set(messages.map((m) => m.speaker))].length}
                        </div>
                        <div className="text-xs text-green-600">Speakers</div>
                      </motion.div>
                    </div>

                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="flex justify-between">
                        <span>Avg Confidence:</span>
                        <span className="font-medium">
                          {messages.length > 0
                            ? Math.round(
                                (messages.reduce(
                                  (acc, msg) => acc + (msg.confidence || 0),
                                  0
                                ) /
                                  messages.length) *
                                  100
                              )
                            : 0}
                          %
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Connection:</span>
                        <span
                          className={`font-medium capitalize ${connectionStatus === "connected" ? "text-green-600" : connectionStatus === "error" ? "text-red-600" : "text-gray-600"}`}
                        >
                          {connectionStatus}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Model:</span>
                        <span className="font-medium">
                          Whisper Model
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 sm:pt-3 border-t">
                      <div className="flex items-center justify-between text-xs">
                        <span>Speech Detection:</span>
                        <span
                          className={`font-medium ${speechDetected ? "text-green-600" : "text-gray-400"}`}
                        >
                          {speechDetected ? "Active" : "Standby"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span>Interim Results:</span>
                        <span
                          className={`font-medium ${interimText ? "text-blue-600" : "text-gray-400"}`}
                        >
                          {interimText ? "Processing" : "Ready"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span>Current Speaker:</span>
                        <span
                          className={`font-medium ${currentSpeaker ? "text-purple-600" : "text-gray-400"}`}
                        >
                          {currentSpeaker || "None"}
                        </span>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>
        </div>

        {/* Mobile & Tablet Header Layout */}
        <div className="lg:hidden space-y-3">
          {/* Navigation and Back Button */}
          <div className="flex items-center justify-between">
              <motion.div
                variants={buttonHoverVariants}
                whileHover="hover"
                whileTap="tap"
              >
              <Button 
                variant="ghost" 
                size="sm" 
                className="h-9"
                onClick={() => handleBackNavigation('/doctor/dashboard/appointments/consultation')}
              >
                  <ArrowLeft className="h-4 w-4 mr-1" />
                  <span className="hidden md:inline">Back</span>
                </Button>
              </motion.div>

            <div className="flex items-center space-x-2">

            {/* Status Badges - Mobile */}
            <div className="flex items-center space-x-1 md:space-x-2">
              <Badge
                variant={
                  appointment.status === "completed" ? "default" : "secondary"
                }
                className={cn(
                  "text-xs px-2 py-1",
                  appointment.status === "completed" &&
                    "bg-green-500 text-white"
                )}
              >
                {appointment.status === "completed" ? (
                  <div className="flex items-center space-x-1">
                    <div className="w-2 h-2 bg-white rounded-full" />
                    <span>Completed</span>
                  </div>
                ) : (
                  appointment.status
                )}
              </Badge>
              {connectionStatus === "connected" &&
                appointment.status !== "completed" && (
                  <Badge
                    variant="default"
                    className="bg-green-500 text-xs px-2 py-1"
                  >
                    <div className="flex items-center space-x-1">
                      <div className="w-2 h-2 bg-white rounded-full animate-pulse" />
                      <span>Live</span>
                    </div>
                  </Badge>
                )}
              </div>
            </div>
          </div>

          {/* Title Section - Mobile */}
          <div className="space-y-1">
            <h1 className="text-lg md:text-xl font-bold">
              Consultation with {appointment.patientName}
            </h1>
            <p className="text-gray-600 text-sm">
              {appointment.date} at {appointment.time}
            </p>
          </div>

          {/* Info Section - Mobile */}
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-2">
              {/* Info button (mobile) */}
              <Dialog>
                <DialogTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8"
                    aria-label="Session info"
                  >
                    <Info className="h-4 w-4" />
                  </Button>
                </DialogTrigger>
                <DialogContent className="sm:max-w-md">
                  <DialogHeader>
                    <DialogTitle>Session Details</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-3 sm:space-y-4">
                    <div className="bg-gray-50 rounded-lg p-2 sm:p-3">
                      <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center space-x-2">
                          <div
                            className={cn(
                              "w-2 h-2 rounded-full",
                              connectionStatus === "connected"
                                ? "bg-green-500"
                                : connectionStatus === "connecting"
                                  ? "bg-yellow-500"
                                  : connectionStatus === "error"
                                    ? "bg-red-500"
                                    : "bg-gray-400"
                            )}
                          />
                          <span className="text-xs sm:text-sm font-bold">
                            {connectionStatus.charAt(0).toUpperCase() +
                              connectionStatus.slice(1)}
                          </span>
                        </div>
                        {speechDetected && (
                          <span className="text-blue-600 flex items-center text-xs">
                            <Volume2 className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">
                              Speech Active
                            </span>
                            <span className="sm:hidden">Active</span>
                          </span>
                        )}
                      </div>
                      <div className="text-xs text-gray-600">
                        <b>Features:</b> Diarization • Interim Results • VAD •
                        Endpointing
                      </div>
                    </div>

                    <div className="grid grid-cols-2 gap-2">
                      <motion.div
                        className="text-center p-2 sm:p-3 bg-blue-50 rounded-lg"
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="text-lg sm:text-xl lg:text-2xl font-bold text-blue-600">
                          {messages.length}
                        </div>
                        <div className="text-xs text-blue-600">Messages</div>
                      </motion.div>
                      <motion.div
                        className="text-center p-2 sm:p-3 bg-green-50 rounded-lg"
                        whileHover={{ scale: 1.02 }}
                        transition={{ duration: 0.2 }}
                      >
                        <div className="text-lg sm:text-xl lg:text-2xl font-bold text-green-600">
                          {[...new Set(messages.map((m) => m.speaker))].length}
                        </div>
                        <div className="text-xs text-green-600">Speakers</div>
                      </motion.div>
                    </div>

                    <div className="space-y-2 text-xs sm:text-sm">
                      <div className="flex justify-between">
                        <span>Avg Confidence:</span>
                        <span className="font-medium">
                          {messages.length > 0
                            ? Math.round(
                                (messages.reduce(
                                  (acc, msg) => acc + (msg.confidence || 0),
                                  0
                                ) /
                                  messages.length) *
                                  100
                              )
                            : 0}
                          %
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Connection:</span>
                        <span
                          className={`font-medium capitalize ${connectionStatus === "connected" ? "text-green-600" : connectionStatus === "error" ? "text-red-600" : "text-gray-600"}`}
                        >
                          {connectionStatus}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Model:</span>
                        <span className="font-medium">
                          Whisper Model
                        </span>
                      </div>
                    </div>

                    <div className="pt-2 sm:pt-3 border-t">
                      <div className="flex items-center justify-between text-xs">
                        <span>Speech Detection:</span>
                        <span
                          className={`font-medium ${speechDetected ? "text-green-600" : "text-gray-400"}`}
                        >
                          {speechDetected ? "Active" : "Standby"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span>Interim Results:</span>
                        <span
                          className={`font-medium ${interimText ? "text-blue-600" : "text-gray-400"}`}
                        >
                          {interimText ? "Processing" : "Ready"}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-xs">
                        <span>Current Speaker:</span>
                        <span
                          className={`font-medium ${currentSpeaker ? "text-purple-600" : "text-gray-400"}`}
                        >
                          {currentSpeaker || "None"}
                        </span>
                      </div>
                    </div>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          </div>

          {/* Title Section - Mobile */}
          <div className="space-y-1">
            <h1 className="text-lg md:text-xl xl:text-2xl font-bold leading-tight">
              Consultation with {appointment.patientName}
            </h1>
            <p className="text-gray-600 text-sm">
              {appointment.date} at {appointment.time}
            </p>
          </div>

          {/* Stats Row - Mobile */}
          <div className="flex items-center justify-between gap-2 md:gap-4 p-2 md:p-3 bg-gray-50 rounded-lg">
            {/* Connection Status */}
            <div className="flex items-center space-x-2 min-w-0 flex-1">
              <div
                className={cn(
                  "w-2 h-2 rounded-full flex-shrink-0",
                  connectionStatus === "connected"
                    ? "bg-green-500"
                    : connectionStatus === "connecting"
                      ? "bg-yellow-500"
                      : connectionStatus === "error"
                        ? "bg-red-500"
                        : "bg-gray-400"
                )}
              />
              <span className="text-xs md:text-sm font-medium truncate">
                {connectionStatus.charAt(0).toUpperCase() +
                  connectionStatus.slice(1)}
              </span>
              {speechDetected && (
                <span className="text-blue-600 flex items-center text-xs flex-shrink-0">
                  <Volume2 className="h-3 w-3 mr-1" />
                  <span className="hidden md:inline">Speech</span>
                </span>
              )}
            </div>

              {/* Auto-scroll indicator - Mobile */}
              {messages.length > 0 && (
                <div className="flex items-center space-x-1">
                  <div
                    className={cn(
                      "w-2 h-2 rounded-full",
                      autoScrollEnabled && isNearBottom
                        ? "bg-green-500"
                        : "bg-gray-400"
                    )}
                  />
                  <span className="text-xs text-gray-500 hidden sm:inline">
                    {autoScrollEnabled && isNearBottom ? "Auto" : "Manual"}
                  </span>
                </div>
              )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-4 lg:gap-6 items-start">
        {/* Left column: Video on top, then Live Conversation */}
        <div className="flex flex-col gap-4 lg:gap-6 min-w-0 lg:col-span-8">
          {appointment.mode === "video" && (
            <DoctorVideoTile
              ref={videoTileRef}
              appointmentId={appointment.id}
              patientName={appointment.patientName}
              doctorName={doctor?.name || ""}
              isConsultationCompleted={
                isConsultationCompleted() || isCancellationInProgress
              }
              embedded
              onStartRecording={startConsultation}
              onEndConsultation={endConsultation}
              onClearMessages={clearMessages}
              onDownloadTranscript={downloadTranscript}
              isRecording={isRecording}
              recordingState={recordingState}
              transcriptConnectionStatus={connectionStatus}
              isGeneratingPdf={isGeneratingPdf}
              isUploadingPdf={isUploadingPdf}
              consultationStartTime={consultationStartTime}
              messagesLength={messages.length}
            />
          )}
          {/* Controls for in-person (physical) consultations */}
          <Card
            className={cn("h-fit", appointment.mode === "video" && "hidden")}
          >
            <CardHeader className="pb-3 md:pb-4">
              <CardTitle className="flex items-center space-x-2 text-sm md:text-base lg:text-lg">
                <Mic className="h-4 w-4 md:h-5 md:w-5" />
                <span>Real-time Transcription</span>
                {speechDetected && (
                  <div className="w-2 h-2 md:w-3 md:h-3 bg-red-500 rounded-full animate-pulse" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="pb-3 md:pb-4">
              <div className={cn(recordedAudio && "flex flex-col gap-4")}>
                {/* Main Controls - Mobile Responsive */}
                <div className="flex flex-row justify-between gap-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {/* Start/Pause Toggle Button */}
                    <motion.div
                      variants={buttonHoverVariants}
                      whileHover="hover"
                      whileTap="tap"
                    >
                      <Button
                        onClick={startConsultation}
                        disabled={
                          connectionStatus === "connecting" ||
                          isConsultationCompleted() ||
                          isGeneratingPdf ||
                          isUploadingPdf ||
                          uploadedPdfUuid !== null ||
                          summaryGenerationInProgress ||
                          summaryGenerated ||
                          isRecording
                        }
                        variant="default"
                        size="sm"
                        className="min-w-[80px] h-9 text-xs md:text-sm"
                      >
                        {connectionStatus === "connecting" ? (
                          <Loader2 className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2 animate-spin" />
                        ) : (
                          <Mic className="h-3 w-3 md:h-4 md:w-4 mr-1 md:mr-2" />
                        )}
                        {connectionStatus === "connecting"
                          ? "Connecting..."
                            : "Start"}
                      </Button>
                    </motion.div>
                    {/* Pause / Stop visible only for physical mode */}
                    {appointment.mode !== "video" && (
                      <>
                        <motion.div
                          variants={buttonHoverVariants}
                          whileHover="hover"
                          whileTap="tap"
                        >
                          <Button
                            onClick={pauseRecording}
                            disabled={
                              !isRecording ||
                              isConsultationCompleted() ||
                              isGeneratingPdf ||
                              isUploadingPdf ||
                              uploadedPdfUuid !== null ||
                              summaryGenerationInProgress ||
                              summaryGenerated
                            }
                            variant="outline"
                            size="sm"
                            className="h-9 text-xs sm:text-sm"
                          >
                            Pause
                          </Button>
                        </motion.div>

                        {/* Generate Summary & PDF Button */}
                    <motion.div
                      variants={buttonHoverVariants}
                      whileHover="hover"
                      whileTap="tap"
                    >
                      <Button
                            onClick={handleGenerateSummaryAndPdf}
                        disabled={
                          !consultationStartTime ||
                              messages.length === 0 ||
                          isConsultationCompleted() ||
                          isGeneratingPdf ||
                              isUploadingPdf ||
                              summaryGenerationInProgress ||
                              summaryGenerated ||
                              uploadedPdfUuid !== null
                        }
                            variant="secondary"
                        size="sm"
                        className="h-9 text-xs sm:text-sm"
                      >
                            {summaryGenerationInProgress ? (
                              <>
                                <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2 animate-spin" />
                                Generating...
                              </>
                            ) : (
                              <>
                        <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-1 sm:mr-2" />
                                <span className="hidden md:inline">Generate Summary & PDF</span>
                                <span className="md:hidden">Generate</span>
                              </>
                            )}
                      </Button>
                    </motion.div>
                      </>
                    )}

                  </div>

                  {/* Secondary Actions - Mobile */}
                  <div className="flex flex-wrap items-center gap-2">
                    <motion.div
                      variants={buttonHoverVariants}
                      whileHover="hover"
                      whileTap="tap"
                    >
                      <Button
                        onClick={clearMessages}
                        variant="outline"
                        size="sm"
                        disabled={
                          messages.length === 0 ||
                          isConsultationCompleted() ||
                          isGeneratingPdf ||
                          isUploadingPdf
                        }
                        className="h-8 text-xs"
                      >
                        Clear
                      </Button>
                    </motion.div>
                    <motion.div
                      variants={buttonHoverVariants}
                      whileHover="hover"
                      whileTap="tap"
                    >
                      <Button
                        onClick={downloadTranscript}
                        variant="outline"
                        size="sm"
                        disabled={
                          messages.length === 0 ||
                          isConsultationCompleted() ||
                          isGeneratingPdf ||
                          isUploadingPdf
                        }
                        className="h-8 text-xs"
                      >
                        <Download className="h-3 w-3 mr-1 sm:mr-2" />
                        <span className="hidden sm:inline">
                          Download Transcript
                        </span>
                        <span className="sm:hidden">Download</span>
                      </Button>
                    </motion.div>
                  </div>
                </div>

                {/* Error Display */}
                {streamingError && (
                  <div className="bg-red-50 border border-red-200 rounded-lg p-2 sm:p-3">
                    <div className="flex items-center space-x-2">
                      <AlertCircle className="h-4 w-4 text-red-500 flex-shrink-0" />
                      <span className="text-red-700 text-xs sm:text-sm">
                        {streamingError}
                      </span>
                    </div>
                  </div>
                )}

                {/* Interim Results Display */}
                {interimText && (
                  <div className="bg-blue-50 border border-blue-200 rounded-lg p-2 sm:p-3">
                    <div className="flex items-start space-x-2">
                      <Volume2 className="h-4 w-4 text-blue-500 animate-pulse flex-shrink-0 mt-0.5" />
                      <span className="text-blue-700 text-xs sm:text-sm italic break-words">
                        Interim: &quot;{interimText}&quot;
                      </span>
                    </div>
                  </div>
                )}

                {/* Audio Control Bar - Mobile Optimized */}
                {recordedAudio && (
                  <div className="p-2 sm:p-3 bg-gray-50 rounded-lg border">
                    <div className="space-y-2 sm:space-y-3">
                      {/* Audio Header */}
                      <div className="flex items-center justify-between">
                        <div className="flex items-center space-x-2">
                          <Volume2 className="h-3 w-3 sm:h-4 sm:w-4 text-blue-600" />
                          <span className="text-xs sm:text-sm font-medium">
                            Audio Playback
                          </span>
                        </div>
                        <div className="text-xs text-gray-500">
                          {isNaN(currentAudioTime)
                            ? "0:00"
                            : `${Math.floor(currentAudioTime / 60)}:${String(
                                Math.floor(currentAudioTime % 60)
                              ).padStart(2, "0")}`}{" "}
                          /{" "}
                          {isNaN(audioDuration) || !isFinite(audioDuration)
                            ? "0:00"
                            : `${Math.floor(audioDuration / 60)}:${String(
                                Math.floor(audioDuration % 60)
                              ).padStart(2, "0")}`}
                        </div>
                      </div>

                      {/* Audio Progress Bar */}
                      <div
                        className="w-full bg-gray-200 rounded-full h-2 cursor-pointer"
                        onClick={(e) => {
                          if (audioRef.current && audioDuration > 0) {
                            const rect =
                              e.currentTarget.getBoundingClientRect();
                            const clickX = e.clientX - rect.left;
                            const percentage = clickX / rect.width;
                            const newTime = percentage * audioDuration;
                            seekToTime(newTime);
                          }
                        }}
                      >
                        <div
                          className="bg-blue-600 h-2 rounded-full transition-all duration-300"
                          style={{
                            width: `${
                              audioDuration > 0
                                ? (currentAudioTime / audioDuration) * 100
                                : 0
                            }%`,
                          }}
                        />
                      </div>

                      {/* Audio Controls - Mobile */}
                      <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
                        <div className="flex items-center gap-2">
                          <motion.div
                            variants={buttonHoverVariants}
                            whileHover="hover"
                            whileTap="tap"
                          >
                            <Button
                              onClick={playAudio}
                              variant="outline"
                              size="sm"
                              disabled={
                                isGeneratingPdf || 
                                isUploadingPdf || 
                                summaryGenerationInProgress ||
                                summaryGenerated
                              }
                              className="h-8 text-xs"
                            >
                              <Volume2 className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">Play</span>
                            </Button>
                          </motion.div>
                          <motion.div
                            variants={buttonHoverVariants}
                            whileHover="hover"
                            whileTap="tap"
                          >
                            <Button
                              onClick={pauseAudio}
                              variant="outline"
                              size="sm"
                              disabled={
                                isGeneratingPdf || 
                                isUploadingPdf || 
                                summaryGenerationInProgress ||
                                summaryGenerated
                              }
                              className="h-8 text-xs"
                            >
                              <Square className="h-3 w-3 mr-1" />
                              <span className="hidden sm:inline">Pause</span>
                            </Button>
                          </motion.div>
                        </div>
                        <motion.div
                          variants={buttonHoverVariants}
                          whileHover="hover"
                          whileTap="tap"
                        >
                          <Button
                            onClick={downloadAudio}
                            variant="outline"
                            size="sm"
                            disabled={isGeneratingPdf || isUploadingPdf}
                            className="h-8 text-xs w-full sm:w-auto"
                          >
                            <Download className="h-3 w-3 mr-1" />
                            <span className="hidden sm:inline">
                              Download Audio
                            </span>
                            <span className="sm:hidden">Audio</span>
                          </Button>
                        </motion.div>
                      </div>

                      <p className="text-xs text-gray-500 text-center">
                        Click any message below to jump to that moment
                      </p>
                    </div>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          {/* Enhanced Messages Display - Mobile Optimized (hidden on lg; moved to right column on desktop) */}
          <Card className="h-fit">
            <CardHeader className="pb-3 sm:pb-4">
              <CardTitle className="flex items-center space-x-2 text-sm sm:text-base lg:text-lg">
                <Mic className="h-4 w-4 sm:h-5 sm:w-5" />
                <span>Live Conversation</span>
                {speechDetected && (
                  <div className="w-2 h-2 sm:w-3 sm:h-3 bg-red-500 rounded-full animate-pulse" />
                )}
              </CardTitle>
            </CardHeader>
            <CardContent className="px-3 sm:px-6">
              <div className="relative">
                {/* Scroll to Bottom Button */}
                {showScrollToBottom && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: 20 }}
                    className="absolute bottom-4 right-4 z-10"
                  >
                     <Button
                       onClick={() => {
                         console.log('🔄 Scroll to bottom button clicked');
                         scrollToBottom(true);
                         setShowScrollToBottom(false);
                         setAutoScrollEnabled(true);
                         setIsUserScrolling(false);
                         // Force a recheck after scrolling
                         setTimeout(() => {
                           const nearBottom = checkIfNearBottom();
                           setIsNearBottom(nearBottom);
                         }, 200);
                       }}
                       size="sm"
                       className="h-8 w-8 rounded-full shadow-lg bg-blue-600 hover:bg-blue-700 text-white"
                       aria-label="Scroll to bottom"
                     >
                       <ArrowLeft className="h-4 w-4 rotate-90" />
                     </Button>
                  </motion.div>
                )}
                
                {/* Group consecutive messages by speaker */}
                {(() => {
                  type Message = (typeof messages)[number];
                  type Group = { speaker: string; messages: Message[] };
                  const groupedMessages: Group[] = [];
                  let lastSpeaker: string | null = null;
                  let currentGroup: Group | null = null;
                  messages.forEach((msg: Message) => {
                    if (msg.speaker !== lastSpeaker) {
                      if (currentGroup) groupedMessages.push(currentGroup);
                      currentGroup = { speaker: msg.speaker, messages: [msg] };
                      lastSpeaker = msg.speaker;
                    } else if (currentGroup) {
                      currentGroup.messages.push(msg);
                    }
                  });
                  if (currentGroup) groupedMessages.push(currentGroup);
                  return (
                    <div
                      ref={messagesContainerRef}
                      className="space-y-3 sm:space-y-4 max-h-[40vh] sm:max-h-[50vh] lg:max-h-[60vh] overflow-y-auto scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-gray-100"
                      onScroll={handleScroll}
                      onMouseEnter={() => {
                        // Don't disable auto-scroll on mouse enter, let scroll events handle it
                      }}
                      onMouseLeave={() => {
                        // Check if near bottom when mouse leaves
                        setTimeout(() => {
                          const nearBottom = checkIfNearBottom();
                          if (nearBottom && !isUserScrolling) {
                        setAutoScrollEnabled(true);
                          }
                        }, 100);
                      }}
                    >
                      {groupedMessages.map((group: Group) => {
                        const relativeTime = consultationStartTime
                          ? (group.messages[0].timestamp -
                              consultationStartTime) /
                            1000
                          : 0;
                        const isCurrentlyPlaying = group.messages.some(
                          (msg: Message) => currentPlayingMessageId === msg.id
                        );
                        return (
                          <div
                            key={group.messages[0].id}
                            id={`message-${group.messages[0].id}`}
                            className={cn(
                              "group relative mb-3 transition-all duration-300 cursor-pointer"
                            )}
                            onClick={() => {
                              const firstMsg = group.messages[0];
                              console.log(
                                `🎵 Message clicked - Speaker: ${
                                  firstMsg.speaker
                                }, Text: "${firstMsg.text.substring(
                                  0,
                                  30
                                )}...", relativeTime: ${relativeTime}s, timestamp: ${
                                  firstMsg.timestamp
                                }, consultationStart: ${consultationStartTime}`
                              );
                              if (recordedAudio) {
                                setCurrentPlayingMessageId(
                                  group.messages[0].id
                                );
                                seekToTime(relativeTime);
                              } else {
                                console.log("🎵 No recorded audio available");
                              }
                            }}
                          >
                            <div
                              className={cn(
                                "flex items-start gap-2 sm:gap-3",
                                group.speaker === "Patient" &&
                                  "flex-row-reverse"
                              )}
                            >
                              {/* Avatar - Mobile Optimized */}
                              <motion.div
                                className={cn(
                                  "flex-shrink-0 w-6 h-6 sm:w-8 sm:h-8 rounded-full flex items-center justify-center shadow-sm",
                                  group.speaker === "Doctor"
                                    ? "bg-gradient-to-br from-blue-500 to-blue-600"
                                    : group.speaker === "Patient"
                                      ? "bg-gradient-to-br from-green-500 to-green-600"
                                      : "bg-gradient-to-br from-gray-400 to-gray-500"
                                )}
                                initial={{ scale: 0 }}
                                animate={{ scale: 1 }}
                                transition={{ delay: 0.1 }}
                              >
                                {group.speaker === "Doctor" ? (
                                  <Stethoscope className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                                ) : group.speaker === "Patient" ? (
                                  <User className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                                ) : (
                                  <User className="h-3 w-3 sm:h-4 sm:w-4 text-white" />
                                )}
                              </motion.div>

                              {/* Message Content - Mobile Optimized */}
                              <div className="flex-1 min-w-0">
                                {/* Header */}
                                <div
                                  className={cn(
                                    "flex items-center gap-2 mb-1",
                                    group.speaker === "Patient" &&
                                      "flex-row-reverse"
                                  )}
                                >
                                  <span
                                    className={cn(
                                      "font-semibold text-xs sm:text-sm",
                                      group.speaker === "Doctor"
                                        ? "text-blue-700"
                                        : group.speaker === "Patient"
                                          ? "text-green-700"
                                          : "text-gray-700"
                                    )}
                                  >
                                    {group.speaker}
                                  </span>
                                </div>

                                {/* Message Bubble - Mobile Optimized */}
                                <div
                                  className={cn(
                                    "relative rounded-2xl px-2 py-1 sm:px-3 sm:py-2 shadow-sm cursor-pointer transition-all duration-300 break-words",
                                    group.speaker === "Doctor"
                                      ? isCurrentlyPlaying
                                        ? "bg-blue-200 border-2 border-blue-500 shadow-lg"
                                        : "bg-blue-50 hover:bg-blue-100 border border-blue-200"
                                      : group.speaker === "Patient"
                                        ? isCurrentlyPlaying
                                          ? "bg-green-200 border-2 border-green-500 shadow-lg"
                                          : "bg-green-50 hover:bg-green-100 border border-green-200"
                                        : isCurrentlyPlaying
                                          ? "bg-orange-200 border-2 border-orange-500 shadow-lg"
                                          : "bg-gray-50 hover:bg-gray-100 border border-gray-200",
                                    !isCurrentlyPlaying &&
                                      "group-hover:shadow-md"
                                  )}
                                >
                                  {/* All messages from this speaker in this group */}
                                  {group.messages.map((message: Message) => {
                                    return (
                                      <p
                                        key={message.id}
                                        className="text-gray-800 leading-relaxed text-xs sm:text-sm mb-1 last:mb-0 break-words"
                                      >
                                        {highlightText(
                                          message.text,
                                          awsEntities,
                                          muscleTerms
                                        )}
                                      </p>
                                    );
                                  })}
                                  {/* Timestamp and Audio Seek */}
                                  <div
                                    className={cn(
                                      "flex items-center gap-1 mt-1 sm:mt-2 text-xs text-gray-500",
                                      group.speaker === "Patient" &&
                                        "flex-row-reverse"
                                    )}
                                  >
                                    <span className="text-xs">
                                      {consultationStartTime
                                        ? `${Math.floor(
                                            relativeTime / 60
                                          )}:${String(
                                            Math.floor(relativeTime % 60)
                                          ).padStart(2, "0")}`
                                        : new Date(
                                            group.messages[0].timestamp
                                          ).toLocaleTimeString([], {
                                            hour: "2-digit",
                                            minute: "2-digit",
                                          })}
                                    </span>
                                    {recordedAudio && (
                                      <span className="flex items-center gap-1 text-blue-600 hover:text-blue-700 transition-colors">
                                        <Volume2 className="h-3 w-3" />
                                        <span className="hidden sm:inline text-xs">
                                          Click to seek
                                        </span>
                                      </span>
                                    )}
                                  </div>
                                </div>
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}

                {messages.length === 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ duration: 0.5 }}
                    className="text-center text-gray-500 py-6 sm:py-8 lg:py-12"
                  >
                    <MessageSquare className="h-8 w-8 sm:h-12 sm:w-12 lg:h-16 lg:w-16 mx-auto mb-2 sm:mb-4 opacity-30" />
                    <h3 className="text-sm sm:text-base lg:text-lg font-medium mb-1 sm:mb-2">
                      Ready for Real-time Transcription
                    </h3>
                    <p className="text-xs sm:text-sm lg:text-base px-4">
                      Click &quot;Start Recording&quot; to begin live
                      transcription with:
                    </p>
                    <ul className="mt-2 text-xs sm:text-sm space-y-1 px-4">
                      <li>• Advanced speaker detection</li>
                      <li>• Real-time interim results</li>
                      <li>• Voice activity detection</li>
                      <li>• Smart endpointing</li>
                      <li>• Medical vocabulary optimization</li>
                    </ul>
                  </motion.div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Enhanced Sidebar - Right column */}
        <div className="flex flex-col gap-4 lg:gap-6 min-w-0 lg:col-span-4">
          {/* Right rail: Suggestions only while live; Summary when ending or completed */}
          {!isCancellationInProgress && !isConsultationCompleted() && !summaryGenerated ? (
            <Card className="h-fit">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center text-sm sm:text-base lg:text-lg">
                  <div className="flex items-center space-x-2">
                    <Sparkles className="h-4 w-4 sm:h-5 sm:w-5" />
                    <span>Real-time AI Suggestions</span>
                  </div>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                {suggestedQuestions.length > 0 ? (
                  <div className="space-y-3 sm:space-y-4">
                    {suggestedQuestions.map((category, index: number) => (
                      <motion.div
                        key={category.id}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.1 }}
                        className="border rounded-lg p-2 sm:p-3"
                      >
                        <h4 className="font-medium text-xs sm:text-sm mb-2">
                          {category.category}
                        </h4>
                        <div className="space-y-1">
                          {category.questions
                            .slice(0, 3)
                            .map((question: string, qIndex: number) => (
                              <motion.div
                                key={qIndex}
                                whileHover={{ scale: 1.01 }}
                                className="text-xs text-gray-600 p-2 bg-gray-50 rounded cursor-pointer hover:bg-gray-100 transition-colors break-words"
                                onClick={() => {
                                  navigator.clipboard.writeText(question);
                                }}
                              >
                                {question}
                              </motion.div>
                            ))}
                        </div>
                      </motion.div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center text-gray-500 py-4 sm:py-6">
                    <motion.div
                      initial={{ opacity: 0, scale: 0.8 }}
                      animate={{ opacity: 1, scale: 1 }}
                      transition={{ duration: 0.5 }}
                    >
                      <Sparkles className="h-4 w-4 sm:h-6 sm:w-6 lg:h-8 lg:w-8 mx-auto mb-2 opacity-30" />
                      <p className="text-xs sm:text-sm px-4">
                        {isGeneratingQuestions ? (
                          <span className="flex items-center justify-center space-x-2">
                            <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 animate-spin" />
                            <span>Generating AI suggestions...</span>
                          </span>
                        ) : messages.length === 0 ? (
                          "AI suggestions will appear as the conversation develops"
                        ) : (
                          "Analyzing conversation for relevant suggestions..."
                        )}
                      </p>
                    </motion.div>
                  </div>
                )}
              </CardContent>
            </Card>
          ) : (
            <Card className="h-fit">
              <CardHeader className="pb-3 sm:pb-4">
                <CardTitle className="flex items-center space-x-2 text-sm sm:text-base lg:text-lg">
                  <FileText className="h-4 w-4 sm:h-5 sm:w-5" />
                  <span>AI Medical Summary</span>
                </CardTitle>
              </CardHeader>
              <CardContent className="px-3 sm:px-6">
                <div className="space-y-3 sm:space-y-4">
                  {/* Show a loading state immediately after ending, before summary is ready */}
                  {isCancellationInProgress && !summary && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                        <span className="text-blue-700 text-sm font-medium">
                          Generating summary...
                        </span>
                      </div>
                    </div>
                  )}
                  {(isGeneratingPdf || isUploadingPdf) && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <Loader2 className="h-4 w-4 text-blue-600 animate-spin" />
                        <span className="text-blue-700 text-sm font-medium">
                          {pdfGenerationMessage || "Processing..."}
                        </span>
                      </div>
                    </div>
                  )}

                  {pdfGenerationMessage &&
                    !isGeneratingPdf &&
                    !isUploadingPdf &&
                    pdfGenerationMessage.includes("Error") && (
                      <div className="bg-red-50 border border-red-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <AlertCircle className="h-4 w-4 text-red-600" />
                          <span className="text-red-700 text-sm">
                            {pdfGenerationMessage}
                          </span>
                        </div>
                      </div>
                    )}

                  {pdfGenerationMessage &&
                    !isGeneratingPdf &&
                    !isUploadingPdf &&
                    !pdfGenerationMessage.includes("Error") && (
                      <div className="bg-green-50 border border-green-200 rounded-lg p-3">
                        <div className="flex items-center space-x-2">
                          <div className="w-2 h-2 bg-green-600 rounded-full" />
                          <span className="text-green-700 text-sm">
                            {pdfGenerationMessage}
                          </span>
                        </div>
                      </div>
                    )}

                  {isConsultationCompleted() && (
                    <div className="bg-blue-50 border border-blue-200 rounded-lg p-3">
                      <div className="flex items-center space-x-2">
                        <div className="w-2 h-2 bg-blue-600 rounded-full" />
                        <span className="text-blue-700 text-sm font-medium">
                          Consultation completed.
                        </span>
                      </div>
                    </div>
                  )}

                  {/* Summary Edit/View Section */}
                  {summaryGenerated && (
                    <SummaryEditor
                      summary={editableSummary}
                      isEditing={isEditingSummary}
                      isSaving={isSavingSummary}
                      isCompleted={isConsultationCompleted()}
                      onEdit={handleSummaryEdit}
                      onSave={handleSummaryApiSave}
                      onCancel={handleSummaryCancel}
                      parseSummaryIntoFields={parseSummaryIntoFields}
                      reconstructSummaryFromFields={reconstructSummaryFromFields}
                    />
                  )}

                  {/* Action Buttons */}
                  <div className="space-y-2">
                    {/* Generate PDF Button - Only show after summary is generated and not completed */}
                    {summaryGenerated && !isConsultationCompleted() && !isEditingSummary && (
                      <motion.div
                        variants={buttonHoverVariants}
                        whileHover="hover"
                        whileTap="tap"
                      >
                        <Button
                          onClick={proceedWithPdfGeneration}
                          disabled={isGeneratingPdf || isUploadingPdf}
                          className="w-full h-9 text-xs sm:text-sm"
                        >
                          {isGeneratingPdf || isUploadingPdf ? (
                            <>
                              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin" />
                              Generating PDF...
                            </>
                          ) : (
                            <>
                              <FileText className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                              End Consultation and Generate Report
                            </>
                          )}
                        </Button>
                      </motion.div>
                    )}

                    {/* Download Button - Only show after consultation is completed */}
                    {isConsultationCompleted() && (
                      <motion.div
                        variants={buttonHoverVariants}
                        whileHover="hover"
                        whileTap="tap"
                      >
                        <Button
                          onClick={downloadMedicalReport}
                          disabled={!uploadedPdfUuid || isDownloadingPdf}
                          className="w-full h-9 text-xs sm:text-sm"
                        >
                          {isDownloadingPdf ? (
                            <>
                              <Loader2 className="h-3 w-3 sm:h-4 sm:w-4 mr-2 animate-spin" />
                              Downloading...
                            </>
                          ) : (
                            <>
                              <Download className="h-3 w-3 sm:h-4 sm:w-4 mr-2" />
                              Download Medical Report
                            </>
                          )}
                        </Button>
                      </motion.div>
                    )}
                  </div>
                </div>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      {/* Muscle Info Modal */}
      <MuscleInfoModal
        open={muscleInfoModalOpen}
        onOpenChange={setMuscleInfoModalOpen}
        muscleName={selectedMuscleName}
        muscleData={selectedMuscleData}
      />

      {/* Stop Recording Confirmation Dialog */}
      <Dialog open={showStopConfirmDialog} onOpenChange={setShowStopConfirmDialog}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle>End Recording & Generate Summary</DialogTitle>
            <DialogDescription>
              This will stop the recording and generate the medical summary. You won't be able to record further audio after this point.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="flex flex-col-reverse sm:flex-row sm:justify-end gap-2">
            <Button
              variant="outline"
              onClick={() => setShowStopConfirmDialog(false)}
              className="w-full sm:w-auto"
            >
              Cancel
            </Button>
            <Button
              onClick={proceedWithSummaryGeneration}
              disabled={summaryGenerationInProgress}
              className="w-full sm:w-auto"
            >
              {summaryGenerationInProgress ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <FileText className="h-4 w-4 mr-2" />
                  Continue
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Navigation Warning Dialog */}
      <NavigationWarningDialog />
    </motion.div>
  );
}
