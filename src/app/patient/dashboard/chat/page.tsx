"use client";

import { useEffect, useState, useRef } from "react";
import { v4 as uuidv4 } from "uuid";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Plus, MessageCircle } from "lucide-react";

interface Message { id: string; sender: "user" | "assistant"; text: string; time: string }
interface Chat { id: string; title: string; messages: Message[]; createdAt: string }

const STORAGE_KEY = "patient_chat_sessions";

function nowISO() { return new Date().toISOString(); }

export default function PatientChatPage() {
  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
  const [input, setInput] = useState("");
  const endRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      try { const parsed = JSON.parse(raw); setChats(parsed || []); if (parsed?.length) setActiveChatId(parsed[0].id); } catch (e) { console.error(e); }
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(chats));
  }, [chats]);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [activeChatId, chats]);

  const createChat = () => {
    const c: Chat = { id: uuidv4(), title: `New chat ${chats.length + 1}`, messages: [], createdAt: nowISO() };
    setChats(prev => [c, ...prev]);
    setActiveChatId(c.id);
  };

  const activeChat = chats.find(c => c.id === activeChatId) || null;

  const send = async () => {
    if (!input.trim()) return;

    // Ensure there's an active chat; create one synchronously if needed
    let chat = activeChat;
    if (!chat) {
      const newChat: Chat = { id: uuidv4(), title: `New chat ${chats.length + 1}`, messages: [], createdAt: nowISO() };
      setChats(prev => [newChat, ...prev]);
      setActiveChatId(newChat.id);
      chat = newChat;
    }

    // Add user message immediately
    const userMsg: Message = { id: uuidv4(), sender: "user", text: input.trim(), time: nowISO() };
    setChats(prev => prev.map(c => c.id === chat!.id ? { ...c, messages: [...c.messages, userMsg] } : c));
    setInput("");

    // Insert a placeholder assistant message that will be replaced by the real reply
    const placeholder: Message = { id: uuidv4(), sender: "assistant", text: "Generating response...", time: nowISO() };
    setChats(prev => prev.map(c => c.id === chat!.id ? { ...c, messages: [...c.messages, placeholder] } : c));

    // Simulate backend reply after delay — replace with API call later
    setTimeout(() => {
      const replyText = "Default reply: This is a placeholder response and will be replaced by the backend output.";
      setChats(prev => prev.map(c => {
        if (c.id !== chat!.id) return c;
        return {
          ...c,
          messages: c.messages.map(m => m.id === placeholder.id ? { ...m, text: replyText } : m),
        };
      }));
    }, 800);
  };

  const removeChat = (id: string) => {
    const filtered = chats.filter(c => c.id !== id);
    setChats(filtered);
    if (activeChatId === id) setActiveChatId(filtered[0]?.id || null);
  };

  const renameChat = (id: string) => {
    const newTitle = prompt("New chat title");
    if (!newTitle) return;
    setChats(prev => prev.map(c => c.id === id ? { ...c, title: newTitle } : c));
  };

  return (
    <div className="flex gap-6">
      <aside className="w-72 bg-white border rounded-lg p-4 h-[80vh] overflow-auto">
        <div className="flex items-center justify-between mb-4">
          <h3 className="font-semibold flex items-center gap-2"><MessageCircle className="h-4 w-4"/> Chats</h3>
          <Button size="sm" onClick={createChat}><Plus className="h-4 w-4 mr-1"/>New</Button>
        </div>

        <div className="space-y-2">
          {chats.length === 0 && <div className="text-sm text-gray-500">No chats yet — start a new conversation.</div>}
          {chats.map((c) => (
            <div key={c.id} className={`p-2 rounded-md cursor-pointer flex items-center justify-between ${c.id === activeChatId ? 'bg-emerald-50 border border-emerald-100' : 'hover:bg-gray-50'}`} onClick={() => setActiveChatId(c.id)}>
              <div>
                <div className="font-medium truncate max-w-[160px]">{c.title}</div>
                <div className="text-xs text-gray-400">{c.messages.length} messages</div>
              </div>
              <div className="flex items-center gap-2">
                <button className="text-xs text-gray-400" onClick={(e) => { e.stopPropagation(); renameChat(c.id); }}>Rename</button>
                <button className="text-xs text-red-500" onClick={(e) => { e.stopPropagation(); if(confirm('Delete this chat?')) removeChat(c.id); }}>Delete</button>
              </div>
            </div>
          ))}
        </div>
      </aside>

      <main className="flex-1 bg-white border rounded-lg p-4 h-[80vh] flex flex-col">
        <div className="flex-1 overflow-auto mb-4">
          {!activeChat && <div className="text-gray-500">Select or create a chat to begin.</div>}

          {activeChat && (
            <div className="space-y-4">
              {activeChat.messages.map((m) => (
                <div key={m.id} className={`max-w-[80%] ${m.sender === 'user' ? 'ml-auto text-right' : 'mr-auto text-left'}`}>
                  <div className={`inline-block px-4 py-2 rounded ${m.sender === 'user' ? 'bg-emerald-600 text-white' : 'bg-gray-100 text-gray-800'}`}>
                    {m.text}
                  </div>
                  <div className="text-xs text-gray-400 mt-1">{new Date(m.time).toLocaleString()}</div>
                </div>
              ))}
              <div ref={endRef} />
            </div>
          )}
        </div>

        <div className="pt-2 border-t">
          <div className="flex gap-2">
            <Input placeholder="Type your message..." value={input} onChange={(e) => setInput(e.target.value)} onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); send(); } }} />
            <Button onClick={send} className="bg-violet-600 text-white">Send</Button>
          </div>
          <div className="text-xs text-gray-400 mt-2">Responses shown are simulated. Connect a model to generate real replies.</div>
        </div>
      </main>
    </div>
  );
}
