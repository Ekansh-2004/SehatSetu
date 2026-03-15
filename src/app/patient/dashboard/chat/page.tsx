"use client";

import { useEffect, useState, useRef, useCallback } from "react";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Plus,
  MessageCircle,
  AlertTriangle,
  Link,
  Mic,
  MicOff,
} from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────── //
interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  createdAt: string;
  emergency?: boolean;
  symptoms?: string[];
  possible_diseases?: { name: string; confidence?: number }[];
  recommendations?: string[];
  follow_up_questions?: string[];
}

interface Chat {
  id: string;
  title: string;
  messages: Message[];
  createdAt: string;
}

// ── Config ─────────────────────────────────────────────────────────────── //
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const DOMAIN = "medical";

// ── Helpers ────────────────────────────────────────────────────────────── //
function nowISO() {
  return new Date().toISOString();
}

function formatAssistantText(data: {
  answer?: string;
  symptoms?: string[];
  possible_diseases?: { name: string; confidence?: number }[];
  recommendations?: string[];
  follow_up_questions?: string[];
  emergency?: boolean;
}): string {
  const parts: string[] = [];

  if (data.answer) parts.push(data.answer);

  if (data.symptoms?.length) {
    parts.push(`\nDetected symptoms: ${data.symptoms.join(", ")}`);
  }

  if (data.possible_diseases?.length) {
    const diseases = data.possible_diseases
      .map((d) => {
        const hasConf =
          typeof d.confidence === "number" &&
          Number.isFinite(d.confidence) &&
          d.confidence > 0;
        return hasConf
          ? `${d.name} (${Math.round(d.confidence! * 100)}%)`
          : d.name;
      })
      .join(", ");
    parts.push(`Possible conditions: ${diseases}`);
  }

  if (data.recommendations?.length) {
    parts.push(
      `\nRecommendations:\n${data.recommendations.map((r) => `• ${r}`).join("\n")}`,
    );
  }

  if (data.follow_up_questions?.length) {
    parts.push(
      `\nFollow-up questions:\n${data.follow_up_questions.map((q) => `• ${q}`).join("\n")}`,
    );
  }

  return (
    parts.join("\n").trim() ||
    "I could not generate a response. Please try again."
  );
}

// ── Fire-and-forget DB helper (never blocks UI) ─────────────────────── //
async function dbSaveMessage(
  sessionId: string,
  msg: {
    sender: string;
    text: string;
    emergency?: boolean;
    symptoms?: string[];
    possible_diseases?: { name: string; confidence: number }[];
    recommendations?: string[];
    follow_up_questions?: string[];
  },
) {
  try {
    const res = await fetch("/api/chat/messages", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ sessionId, ...msg }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("dbSaveMessage failed:", res.status, err);
    }
  } catch (e) {
    console.error("dbSaveMessage network error:", e);
  }
}

async function dbCreateSession(title: string): Promise<string | null> {
  try {
    const res = await fetch("/api/chat/conversations", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    const data = await res.json();
    if (!res.ok || !data.success) {
      console.error("dbCreateSession failed:", res.status, data);
      return null;
    }
    return data.session.id;
  } catch (e) {
    console.error("dbCreateSession network error:", e);
    return null;
  }
}

async function dbRenameSession(id: string, title: string) {
  try {
    const res = await fetch(`/api/chat/conversations/${id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ title }),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("dbRenameSession failed:", res.status, err);
    }
  } catch (e) {
    console.error("dbRenameSession network error:", e);
  }
}

async function dbDeleteSession(id: string) {
  try {
    const res = await fetch(`/api/chat/conversations/${id}`, {
      method: "DELETE",
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      console.error("dbDeleteSession failed:", res.status, err);
    }
  } catch (e) {
    console.error("dbDeleteSession network error:", e);
  }
}

// ── Main component ─────────────────────────────────────────────────────── //
export default function PatientChatPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [initialLoading, setInitialLoading] = useState(true);
  const endRef = useRef<HTMLDivElement | null>(null);
  const [isRecording, setIsRecording] = useState(false);
  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<BlobPart[]>([]);
  const mediaStreamRef = useRef<MediaStream | null>(null);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const [isAudioPlaying, setIsAudioPlaying] = useState(false);

  // Persist a stable user_id in localStorage so the FastAPI backend can track history
  const [userId] = useState<string>(() => {
    if (typeof window === "undefined") return uuidv4();
    const stored = localStorage.getItem("chat_user_id");
    if (stored) return stored;
    const id = uuidv4();
    localStorage.setItem("chat_user_id", id);
    return id;
  });

  // ── Load chats from database on mount ─────────────────────────────────
  const loadChats = useCallback(async () => {
    try {
      const res = await fetch("/api/chat/conversations");
      const data = await res.json();
      if (data.success && data.sessions) {
        const mapped: Chat[] = data.sessions.map((s: any) => ({
          id: s.id,
          title: s.title,
          createdAt: s.createdAt,
          messages: s.messages.map((m: any) => ({
            id: m.id,
            sender: m.sender,
            text: m.text,
            createdAt: m.createdAt,
            emergency: m.emergency,
            symptoms: m.symptoms,
            possible_diseases: m.possible_diseases,
            recommendations: m.recommendations,
            follow_up_questions: m.follow_up_questions,
          })),
        }));
        setChats(mapped);
        if (mapped.length) setActiveChatId(mapped[0].id);
      }
    } catch (e) {
      console.error("Failed to load chats:", e);
    } finally {
      setInitialLoading(false);
    }
  }, []);

  useEffect(() => {
    loadChats();
  }, [loadChats]);

  // ── Scroll to bottom on new messages ──────────────────────────────────
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChatId, chats]);

  const activeChat = chats.find((c) => c.id === activeChatId) || null;

  // ── Create new chat ────────────────────────────────────────────────────
  const createChat = async () => {
    const tempId = uuidv4();
    const title = `New chat ${chats.length + 1}`;
    const c: Chat = { id: tempId, title, messages: [], createdAt: nowISO() };
    setChats((prev) => [c, ...prev]);
    setActiveChatId(tempId);

    const dbId = await dbCreateSession(title);
    if (dbId) {
      setChats((prev) =>
        prev.map((ch) => (ch.id === tempId ? { ...ch, id: dbId } : ch)),
      );
      setActiveChatId(dbId);
    }
  };

  // ── Delete ─────────────────────────────────────────────────────────────
  const removeChat = (id: string) => {
    const filtered = chats.filter((c) => c.id !== id);
    setChats(filtered);
    if (activeChatId === id) setActiveChatId(filtered[0]?.id || null);
    dbDeleteSession(id);
  };

  // ── Rename ─────────────────────────────────────────────────────────────
  const renameChat = (id: string) => {
    const newTitle = prompt("New chat title");
    if (!newTitle) return;
    setChats((prev) =>
      prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c)),
    );
    dbRenameSession(id, newTitle);
  };

  // ── Send message ───────────────────────────────────────────────────────
  const send = async () => {
    if (!input.trim() || loading) return;

    const sentText = input.trim();
    setInput("");

    let chatId = activeChatId;
    if (!chatId) {
      const tempId = uuidv4();
      const title = `New chat ${chats.length + 1}`;
      const c: Chat = { id: tempId, title, messages: [], createdAt: nowISO() };
      setChats((prev) => [c, ...prev]);
      setActiveChatId(tempId);
      chatId = tempId;

      const dbId = await dbCreateSession(title);
      if (dbId) {
        chatId = dbId;
        setChats((prev) =>
          prev.map((ch) => (ch.id === tempId ? { ...ch, id: dbId } : ch)),
        );
        setActiveChatId(dbId);
      }
    }

    const userMsg: Message = {
      id: uuidv4(),
      sender: "user",
      text: sentText,
      createdAt: nowISO(),
    };
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId ? { ...c, messages: [...c.messages, userMsg] } : c,
      ),
    );

    dbSaveMessage(chatId, { sender: "user", text: sentText });

    const placeholderId = "placeholder-" + uuidv4();
    const placeholder: Message = {
      id: placeholderId,
      sender: "assistant",
      text: "Thinking...",
      createdAt: nowISO(),
    };
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId ? { ...c, messages: [...c.messages, placeholder] } : c,
      ),
    );

    setLoading(true);

    try {
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id: userId,
          session_id: chatId,
          message: sentText,
          domain: DOMAIN,
        }),
      });

      if (!response.ok) {
        throw new Error(
          `Server error: ${response.status} ${response.statusText}`,
        );
      }

      const data = await response.json();
      const assistantText = formatAssistantText(data);

      setChats((prev) => {
        const chat = prev.find((c) => c.id === chatId);
        const isFirstMessage =
          chat && chat.messages.filter((m) => m.sender === "user").length <= 1;
        if (isFirstMessage) {
          const newTitle =
            sentText.slice(0, 40) + (sentText.length > 40 ? "…" : "");
          dbRenameSession(chatId!, newTitle);
          return prev.map((c) =>
            c.id === chatId ? { ...c, title: newTitle } : c,
          );
        }
        return prev;
      });

      dbSaveMessage(chatId, {
        sender: "assistant",
        text: assistantText,
        emergency: data.emergency || false,
        symptoms: data.symptoms || [],
        possible_diseases: data.possible_diseases || [],
        recommendations: data.recommendations || [],
        follow_up_questions: data.follow_up_questions || [],
      });

      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== chatId) return c;
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === placeholderId
                ? {
                    ...m,
                    id: uuidv4(),
                    text: assistantText,
                    emergency: data.emergency || false,
                    symptoms: data.symptoms || [],
                    possible_diseases: data.possible_diseases || [],
                    recommendations: data.recommendations || [],
                    follow_up_questions: data.follow_up_questions || [],
                  }
                : m,
            ),
          };
        }),
      );
    } catch (err) {
      console.error("API call failed:", err);
      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== chatId) return c;
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === placeholderId
                ? {
                    ...m,
                    text: "Sorry, I could not reach the server. Please check your connection and try again.",
                  }
                : m,
            ),
          };
        }),
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Voice recording ────────────────────────────────────────────────────
  const startRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const mr = new MediaRecorder(stream);
      audioChunksRef.current = [];
      mr.ondataavailable = (ev: BlobEvent) => {
        if (ev.data && ev.data.size) audioChunksRef.current.push(ev.data);
      };
      mediaStreamRef.current = stream;
      mediaRecorderRef.current = mr;
      mr.start();
      setIsRecording(true);
    } catch (err) {
      console.error("Failed to start recording", err);
      alert("Unable to access microphone.");
    }
  };

  const stopRecording = async () => {
    const mr = mediaRecorderRef.current;
    if (!mr) return;
    setIsRecording(false);
    await new Promise<void>((resolve) => {
      const onStop = () => {
        try {
          mediaStreamRef.current?.getTracks().forEach((t) => t.stop());
        } catch (e) {}
        const blob = new Blob(audioChunksRef.current, { type: "audio/webm" });
        audioChunksRef.current = [];
        mediaRecorderRef.current = null;
        mediaStreamRef.current = null;
        sendVoiceQuery(blob).finally(() => resolve());
      };
      mr.addEventListener("stop", onStop, { once: true });
      try {
        mr.stop();
      } catch (e) {
        resolve();
      }
    });
  };

  const sendVoiceQuery = async (audioBlob: Blob) => {
    let chatId = activeChat?.id;
    if (!chatId) {
      const title = `New chat ${chats.length + 1}`;
      const tempId = uuidv4();
      setChats((prev) => [
        { id: tempId, title, messages: [], createdAt: nowISO() },
        ...prev,
      ]);
      setActiveChatId(tempId);
      const dbId = await dbCreateSession(title);
      if (dbId) {
        chatId = dbId;
        setChats((prev) =>
          prev.map((c) => (c.id === tempId ? { ...c, id: dbId } : c)),
        );
        setActiveChatId(dbId);
      } else {
        chatId = tempId;
      }
    }

    const placeholderId = "placeholder-voice-" + uuidv4();
    const placeholder: Message = {
      id: placeholderId,
      sender: "assistant",
      text: "Processing voice...",
      createdAt: nowISO(),
    };
    setChats((prev) =>
      prev.map((c) =>
        c.id === chatId ? { ...c, messages: [...c.messages, placeholder] } : c,
      ),
    );

    try {
      const formData = new FormData();
      formData.append("file", audioBlob, "recording.webm");
      const res = await fetch(`${API_BASE_URL}/voice-query`, {
        method: "POST",
        body: formData,
      });
      if (!res.ok) throw new Error(`Voice query failed: ${res.status}`);
      const data = await res.json();

      const payload =
        data && data.success && data.message ? data.message : data;

      // Play audio response if provided
      if (payload && payload.audio_base64) {
        try {
          const audioBinary = atob(payload.audio_base64);
          const arrayBuffer = new Uint8Array(audioBinary.length);
          for (let i = 0; i < audioBinary.length; i++)
            arrayBuffer[i] = audioBinary.charCodeAt(i);
          const audioBlobResp = new Blob([arrayBuffer], {
            type: payload.audio_content_type || "audio/mpeg",
          });
          const audioUrl = URL.createObjectURL(audioBlobResp);

          // Stop any existing audio first
          if (audioRef.current) {
            try {
              audioRef.current.pause();
              URL.revokeObjectURL(audioRef.current.src);
            } catch (e) {}
            audioRef.current = null;
          }

          const audioEl = new Audio(audioUrl);
          audioRef.current = audioEl;

          // Set playing = true IMMEDIATELY (before play resolves) so the
          // Stop Audio banner appears as soon as audio is kicked off.
          setIsAudioPlaying(true);

          audioEl.onended = () => {
            setIsAudioPlaying(false);
            try {
              URL.revokeObjectURL(audioUrl);
            } catch (e) {}
            audioRef.current = null;
          };

          audioEl.onerror = () => {
            console.error("Audio element error");
            setIsAudioPlaying(false);
            audioRef.current = null;
          };

          // play() — don't await; just catch rejection
          audioEl.play().catch((e) => {
            console.error("audio play failed:", e);
            setIsAudioPlaying(false);
            audioRef.current = null;
          });
        } catch (e) {
          console.error("failed to decode/play audio_base64", e);
          setIsAudioPlaying(false);
        }
      }

      const assistantText =
        (payload &&
          (payload.text_response || payload.text || payload.answer)) ||
        formatAssistantText(payload) ||
        "(no response)";

      dbSaveMessage(chatId!, {
        sender: "assistant",
        text: assistantText,
        emergency: data.emergency || false,
        symptoms: data.symptoms || [],
        possible_diseases: data.possible_diseases || [],
        recommendations: data.recommendations || [],
        follow_up_questions: data.follow_up_questions || [],
      });

      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== chatId) return c;
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === placeholderId
                ? {
                    ...m,
                    id: uuidv4(),
                    text: assistantText,
                    emergency: data.emergency || false,
                    symptoms: data.symptoms || [],
                    possible_diseases: data.possible_diseases || [],
                    recommendations: data.recommendations || [],
                    follow_up_questions: data.follow_up_questions || [],
                  }
                : m,
            ),
          };
        }),
      );
    } catch (err) {
      console.error("sendVoiceQuery error", err);
      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== chatId) return c;
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === placeholderId
                ? { ...m, text: "Voice query failed." }
                : m,
            ),
          };
        }),
      );
    }
  };

  const stopAudio = () => {
    if (audioRef.current) {
      try {
        audioRef.current.pause();
        audioRef.current.currentTime = 0;
        URL.revokeObjectURL(audioRef.current.src);
      } catch (e) {}
      audioRef.current = null;
    }
    setIsAudioPlaying(false);
  };

  // Cleanup audio on unmount
  useEffect(() => {
    return () => {
      if (audioRef.current) {
        try {
          audioRef.current.pause();
          URL.revokeObjectURL(audioRef.current.src);
        } catch (e) {}
        audioRef.current = null;
      }
    };
  }, []);

  const downloadReport = async (sessionId?: string) => {
    const sid = sessionId || activeChat?.id;
    if (!sid) {
      alert("No active session to generate report for.");
      return;
    }
    try {
      const url = `${API_BASE_URL}/report?user_id=${encodeURIComponent(userId)}&session_id=${encodeURIComponent(sid)}`;
      const response = await fetch(url);
      if (!response.ok)
        throw new Error(`Report request failed: ${response.status}`);
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = `report_${userId}_${sid}.pdf`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
    } catch (err) {
      console.error("Report generation failed:", err);
      alert("Failed to generate report. Check console for details.");
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
  if (initialLoading) {
    return (
      <div className="flex items-center justify-center h-[80vh]">
        <div className="text-gray-500">Loading chats...</div>
      </div>
    );
  }

  return (
    <div className="flex gap-6">
      {/* ── Sidebar ────────────────────────────────────────────────────── */}
      <aside className="w-72 bg-white border rounded-lg p-4 h-[80vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2">
            <MessageCircle className="h-4 w-4" /> Chats
          </h3>
          <Button size="sm" onClick={createChat}>
            <Plus className="h-4 w-4 mr-1" /> New
          </Button>
        </div>

        <div className="space-y-2">
          {chats.length === 0 && (
            <div className="text-sm text-gray-500">
              No chats yet — start a new conversation.
            </div>
          )}
          {chats.map((c) => (
            <div
              key={c.id}
              className={`p-2 rounded-md cursor-pointer flex items-center justify-between ${
                c.id === activeChatId
                  ? "bg-emerald-50 border border-emerald-100"
                  : "hover:bg-gray-50"
              }`}
              onClick={() => setActiveChatId(c.id)}
            >
              <div>
                <div className="font-medium truncate max-w-[160px]">
                  {c.title}
                </div>
                <div className="text-xs text-gray-400">
                  {c.messages.length} messages
                </div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="text-xs text-gray-400"
                  onClick={(e) => {
                    e.stopPropagation();
                    renameChat(c.id);
                  }}
                >
                  Rename
                </button>
                <button
                  className="text-xs text-red-500"
                  onClick={(e) => {
                    e.stopPropagation();
                    if (confirm("Delete this chat?")) removeChat(c.id);
                  }}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      {/* ── Chat window ────────────────────────────────────────────────── */}
      <main className="flex-1 bg-white border rounded-lg p-4 h-[80vh] flex flex-col">
        <div className="flex-1 overflow-auto mb-4">
          {!activeChat && (
            <div className="text-gray-500">
              Select or create a chat to begin.
            </div>
          )}

          {activeChat && (
            <div className="space-y-4">
              {activeChat.messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[80%] ${
                    m.sender === "user"
                      ? "ml-auto text-right"
                      : "mr-auto text-left"
                  }`}
                >
                  {/* Emergency banner */}
                  {m.emergency && m.sender === "assistant" && (
                    <div className="flex items-center gap-1 text-red-600 text-xs font-semibold mb-1">
                      <AlertTriangle className="h-3 w-3" />
                      Emergency — seek immediate care
                    </div>
                  )}

                  <div
                    className={`inline-block px-4 py-2 rounded whitespace-pre-wrap text-left ${
                      m.sender === "user"
                        ? "bg-emerald-600 text-white"
                        : m.emergency
                          ? "bg-red-50 border border-red-200 text-gray-800"
                          : "bg-gray-100 text-gray-800"
                    }`}
                  >
                    {m.text}
                    {m.sender === "assistant" &&
                      m.text !== "Thinking..." &&
                      m.text !== "Processing voice..." &&
                      m.text !==
                        "Sorry, I could not reach the server. Please check your connection and try again." && (
                        <div className="mt-3 flex flex-wrap gap-2">
                          {!m.emergency ? (
                            <Link href="/patient/dashboard/forms/new">
                              <Button
                                className="bg-emerald-600 hover:bg-emerald-700 text-white"
                                size="sm"
                              >
                                Virtual Meeting
                              </Button>
                            </Link>
                          ) : (
                            <Link href="/patient/dashboard/physical-meeting">
                              <Button
                                className="bg-violet-600 hover:bg-violet-700 text-white"
                                size="sm"
                              >
                                Physical Meeting
                              </Button>
                            </Link>
                          )}

                          <Button
                            size="sm"
                            className="bg-gray-200 text-gray-800 hover:bg-gray-300"
                            onClick={() => downloadReport(activeChat?.id)}
                          >
                            Generate Report
                          </Button>
                        </div>
                      )}
                  </div>

                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(m.createdAt).toLocaleString()}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
          )}
        </div>

        {/* ── Input bar ──────────────────────────────────────────────────── */}
        <div className="pt-2 border-t">
          {/* ── Stop Audio banner — renders outside message loop so it
               always reacts to isAudioPlaying state changes ── */}
          {isAudioPlaying && (
            <div className="mb-2 flex items-center gap-2 rounded-md bg-red-50 border border-red-200 px-3 py-2">
              <span className="animate-pulse text-red-500 text-sm">🔊</span>
              <span className="text-sm text-red-600 font-medium flex-1">
                Playing voice response...
              </span>
              <Button
                size="sm"
                className="bg-red-500 hover:bg-red-600 text-white"
                onClick={stopAudio}
              >
                Stop Audio
              </Button>
            </div>
          )}

          <div className="flex gap-2">
            <Input
              placeholder="Describe your symptoms or ask a question..."
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  send();
                }
              }}
              disabled={loading}
            />

            {/* ── Voice input button ── */}
            <Button
              type="button"
              onClick={isRecording ? stopRecording : startRecording}
              disabled={loading}
              className={
                isRecording
                  ? "bg-red-500 hover:bg-red-600 text-white animate-pulse"
                  : "bg-gray-200 hover:bg-gray-300 text-gray-700"
              }
              title={isRecording ? "Stop recording" : "Start voice input"}
            >
              {isRecording ? (
                <MicOff className="h-4 w-4" />
              ) : (
                <Mic className="h-4 w-4" />
              )}
            </Button>

            <Button
              onClick={send}
              disabled={loading}
              className="bg-violet-600 text-white"
            >
              {loading ? "Sending..." : "Send"}
            </Button>
          </div>

          <div className="text-xs text-gray-400 mt-2">
            {isRecording
              ? "🔴 Recording... click the mic button again to stop and send."
              : "Connected to the Rural Health Assistant backend."}
          </div>
        </div>
      </main>
    </div>
  );
}
