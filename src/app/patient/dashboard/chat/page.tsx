"use client";

import { useEffect, useState, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Plus, MessageCircle, AlertTriangle } from "lucide-react";

// ── Types ──────────────────────────────────────────────────────────────── //
interface Message {
  id: string;
  sender: "user" | "assistant";
  text: string;
  time: string;
  emergency?: boolean;
  symptoms?: string[];
  possible_diseases?: { name: string; confidence: number }[];
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
const STORAGE_KEY  = "patient_chat_sessions";
const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "http://127.0.0.1:8000";
const DOMAIN       = "medical"; // change to "nursing" for the staff portal

// ── Helpers ────────────────────────────────────────────────────────────── //
function nowISO() { return new Date().toISOString(); }

function formatAssistantText(data: {
  answer?: string;
  symptoms?: string[];
  possible_diseases?: { name: string; confidence: number }[];
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
      .map((d) => `${d.name} (${Math.round(d.confidence * 100)}%)`)
      .join(", ");
    parts.push(`Possible conditions: ${diseases}`);
  }

  if (data.recommendations?.length) {
    parts.push(`\nRecommendations:\n${data.recommendations.map((r) => `• ${r}`).join("\n")}`);
  }

  if (data.follow_up_questions?.length) {
    parts.push(`\nFollow-up questions:\n${data.follow_up_questions.map((q) => `• ${q}`).join("\n")}`);
  }

  return parts.join("\n").trim() || "I could not generate a response. Please try again.";
}

// ── Main component ─────────────────────────────────────────────────────── //
export default function PatientChatPage() {
  const [chats, setChats]               = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [input, setInput]               = useState("");
  const [loading, setLoading]           = useState(false);
  const endRef = useRef<HTMLDivElement | null>(null);

  // Persist a stable user_id in localStorage so the backend can track history
  const [userId] = useState<string>(() => {
    if (typeof window === "undefined") return uuidv4();
    const stored = localStorage.getItem("chat_user_id");
    if (stored) return stored;
    const id = uuidv4();
    localStorage.setItem("chat_user_id", id);
    return id;
  });

  // ── Load chats from localStorage ──────────────────────────────────────
  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try {
        const parsed = JSON.parse(raw);
        setChats(parsed || []);
        if (parsed?.length) setActiveChatId(parsed[0].id);
      } catch (e) {
        console.error(e);
      }
    }
  }, []);

  // ── Persist chats to localStorage ─────────────────────────────────────
  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  }, [chats]);

  // ── Scroll to bottom on new messages ──────────────────────────────────
  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChatId, chats]);

  const activeChat = chats.find((c) => c.id === activeChatId) || null;

  // ── Create new chat ────────────────────────────────────────────────────
  const createChat = () => {
    const c: Chat = {
      id: uuidv4(),
      title: `New chat ${chats.length + 1}`,
      messages: [],
      createdAt: nowISO(),
    };
    setChats((prev) => [c, ...prev]);
    setActiveChatId(c.id);
  };

  // ── Delete / rename ────────────────────────────────────────────────────
  const removeChat = (id: string) => {
    const filtered = chats.filter((c) => c.id !== id);
    setChats(filtered);
    if (activeChatId === id) setActiveChatId(filtered[0]?.id || null);
  };

  const renameChat = (id: string) => {
    const newTitle = prompt("New chat title");
    if (!newTitle) return;
    setChats((prev) => prev.map((c) => (c.id === id ? { ...c, title: newTitle } : c)));
  };

  // ── Send message ───────────────────────────────────────────────────────
  const send = async () => {
    if (!input.trim() || loading) return;

    // Ensure there's an active chat
    let chat = activeChat;
    if (!chat) {
      const newChat: Chat = {
        id: uuidv4(),
        title: `New chat ${chats.length + 1}`,
        messages: [],
        createdAt: nowISO(),
      };
      setChats((prev) => [newChat, ...prev]);
      setActiveChatId(newChat.id);
      chat = newChat;
    }

    // Add user message immediately
    const userMsg: Message = {
      id: uuidv4(),
      sender: "user",
      text: input.trim(),
      time: nowISO(),
    };
    setChats((prev) =>
      prev.map((c) =>
        c.id === chat!.id ? { ...c, messages: [...c.messages, userMsg] } : c
      )
    );
    const sentText = input.trim();
    setInput("");

    // Add loading placeholder
    const placeholderId = uuidv4();
    const placeholder: Message = {
      id: placeholderId,
      sender: "assistant",
      text: "Thinking...",
      time: nowISO(),
    };
    setChats((prev) =>
      prev.map((c) =>
        c.id === chat!.id ? { ...c, messages: [...c.messages, placeholder] } : c
      )
    );

    setLoading(true);

    try {
      // ── Real API call to FastAPI backend ──────────────────────────── //
      const response = await fetch(`${API_BASE_URL}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          user_id:    userId,
          session_id: chat!.id,   // use the chat id as the session id
          message:    sentText,
          domain:     DOMAIN,
        }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();

      // Auto-rename chat from the first user message
      const isFirstMessage = chat!.messages.length === 0;
      const newTitle = isFirstMessage
        ? sentText.slice(0, 40) + (sentText.length > 40 ? "…" : "")
        : undefined;

      // Replace placeholder with real response
      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== chat!.id) return c;
          return {
            ...c,
            title: newTitle || c.title,
            messages: c.messages.map((m) =>
              m.id === placeholderId
                ? {
                    ...m,
                    text: formatAssistantText(data),
                    emergency:          data.emergency         || false,
                    symptoms:           data.symptoms          || [],
                    possible_diseases:  data.possible_diseases || [],
                    recommendations:    data.recommendations   || [],
                    follow_up_questions: data.follow_up_questions || [],
                  }
                : m
            ),
          };
        })
      );
    } catch (err) {
      console.error("API call failed:", err);
      // Replace placeholder with error message
      setChats((prev) =>
        prev.map((c) => {
          if (c.id !== chat!.id) return c;
          return {
            ...c,
            messages: c.messages.map((m) =>
              m.id === placeholderId
                ? {
                    ...m,
                    text: "Sorry, I could not reach the server. Please check your connection and try again.",
                  }
                : m
            ),
          };
        })
      );
    } finally {
      setLoading(false);
    }
  };

  // ── Render ─────────────────────────────────────────────────────────────
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
                <div className="font-medium truncate max-w-[160px]">{c.title}</div>
                <div className="text-xs text-gray-400">{c.messages.length} messages</div>
              </div>
              <div className="flex items-center gap-2">
                <button
                  className="text-xs text-gray-400"
                  onClick={(e) => { e.stopPropagation(); renameChat(c.id); }}
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
            <div className="text-gray-500">Select or create a chat to begin.</div>
          )}

          {activeChat && (
            <div className="space-y-4">
              {activeChat.messages.map((m) => (
                <div
                  key={m.id}
                  className={`max-w-[80%] ${
                    m.sender === "user" ? "ml-auto text-right" : "mr-auto text-left"
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
                  </div>
                  <div className="text-xs text-gray-400 mt-1">
                    {new Date(m.time).toLocaleString()}
                  </div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
          )}
        </div>

        {/* ── Input bar ──────────────────────────────────────────────────── */}
        <div className="pt-2 border-t">
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
            <Button
              onClick={send}
              disabled={loading}
              className="bg-violet-600 text-white"
            >
              {loading ? "Sending..." : "Send"}
            </Button>
          </div>
          <div className="text-xs text-gray-400 mt-2">
            Connected to the Rural Health Assistant backend.
          </div>
        </div>
      </main>
    </div>
  );
}