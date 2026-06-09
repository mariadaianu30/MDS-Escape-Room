"use client";

import { useState, useEffect, useRef } from "react";
import { Send, MessageCircle, X } from "lucide-react";
import { useInventory } from "@/lib/InventoryContext";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
);

interface Message {
  id: string;
  username: string;
  message: string;
  created_at: string;
  role?: string;
}

export default function ChatWidget() {
  const { roomCode, currentRole } = useInventory();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([]);
  const [inputMessage, setInputMessage] = useState("");
  const [username, setUsername] = useState("Explorer");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const channelRef = useRef<any>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  // Fetch username
  useEffect(() => {
    const fetchUsername = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        const { data: player } = await supabase
          .from("player")
          .select("username")
          .eq("id", session.user.id)
          .maybeSingle();
        if (player?.username) {
          setUsername(player.username);
        }
      } else {
        const saved = localStorage.getItem("escapeRoomUsername");
        if (saved) setUsername(saved);
      }
    };
    fetchUsername();
  }, []);

  // Load initial messages
  useEffect(() => {
    if (!roomCode) return;

    const loadMessages = async () => {
      try {
        const { data, error } = await supabase
          .from("room_chat_messages")
          .select("*")
          .eq("room_code", roomCode)
          .order("created_at", { ascending: true })
          .limit(50);

        if (error) {
          console.warn("Database chat table room_chat_messages not found, using in-memory mode.");
          return;
        }

        if (data) {
          setMessages(
            data.map((msg: any) => ({
              id: msg.id,
              username: msg.username,
              message: msg.message,
              created_at: msg.created_at,
              role: msg.role,
            }))
          );
        }
      } catch (err) {
        console.warn("Error loading chat messages (in-memory mode active):", err);
      }
    };

    loadMessages();
  }, [roomCode, isOpen]);

  // Real-time listener
  useEffect(() => {
    if (!roomCode) return;

    // Configure channel with broadcast self: false
    const channel = supabase.channel(`room:${roomCode}:chat`, {
      config: {
        broadcast: { self: false }
      }
    });

    channel
      .on("broadcast", { event: "chat_message" }, ({ payload }) => {
        if (!payload) return;
        setMessages((prev) => {
          if (prev.some((m) => m.id === payload.id)) return prev;
          return [
            ...prev,
            {
              id: payload.id,
              username: payload.username,
              message: payload.message,
              created_at: payload.created_at,
              role: payload.role,
            },
          ];
        });
      })
      .subscribe();

    channelRef.current = channel;

    return () => {
      channel.unsubscribe();
      channelRef.current = null;
    };
  }, [roomCode]);

  const sendMessage = async () => {
    if (!inputMessage.trim() || !roomCode) return;

    const msgText = inputMessage.trim();
    setInputMessage(""); // Clear input immediately for responsiveness

    const tempId = "msg_" + Math.random().toString(36).substring(2, 9);
    const localMsg: Message = {
      id: tempId,
      username: username,
      message: msgText,
      created_at: new Date().toISOString(),
      role: currentRole || "scribe",
    };

    // 1. Add locally so sender sees it immediately
    setMessages((prev) => {
      if (prev.some((m) => m.id === localMsg.id)) return prev;
      return [...prev, localMsg];
    });

    // 2. Broadcast in real-time
    if (channelRef.current) {
      channelRef.current.send({
        type: "broadcast",
        event: "chat_message",
        payload: localMsg
      });
    }

    // 3. Silent database backup insertion in background
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const userId = session?.user?.id || "guest";

      await supabase
        .from("room_chat_messages")
        .insert([
          {
            room_code: roomCode,
            player_id: userId,
            username: username,
            message: msgText,
            created_at: localMsg.created_at,
            role: localMsg.role,
          },
        ]);
    } catch (dbError) {
      console.warn("Could not save chat message to DB (using in-memory fallback):", dbError);
    }
  };

  if (!roomCode) return null;

  return (
    <>
      {/* Floating Button - Positioned higher at bottom-24 */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="fixed bottom-24 right-6 z-40 w-14 h-14 rounded-full bg-gradient-to-r from-[#d4af37] to-[#b08d57] text-black shadow-[0_0_30px_rgba(212,175,55,0.4)] hover:scale-110 transition-transform flex items-center justify-center"
      >
        <MessageCircle size={24} className="font-bold" />
        {messages.length > 0 && (
          <span className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 rounded-full text-xs text-white flex items-center justify-center font-bold">
            {Math.min(messages.length, 9)}
          </span>
        )}
      </button>

      {/* Chat Panel - Shifted to bottom-40 */}
      {isOpen && (
        <div className="fixed bottom-40 right-6 z-50 w-96 max-h-96 bg-[#110b07] border-2 border-[#d4af37] rounded-xl shadow-[0_0_50px_rgba(212,175,55,0.3)] flex flex-col overflow-hidden">
          {/* Header */}
          <div className="bg-gradient-to-r from-[#d4af37] to-[#b08d57] text-black px-4 py-3 flex items-center justify-between">
            <h3 className="font-cinzel text-sm font-bold uppercase tracking-widest">
              Chamber Chat
            </h3>
            <button
              onClick={() => setIsOpen(false)}
              className="hover:bg-black/20 p-1 rounded transition-all"
            >
              <X size={18} />
            </button>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto bg-black/50 p-3 space-y-2">
            {messages.length === 0 ? (
              <p className="text-[#8c7a6b] text-xs text-center py-4 italic">
                No messages yet. Say something to your team!
              </p>
            ) : (
              messages.map((msg) => (
                <div
                  key={msg.id}
                  className="text-xs break-words bg-black/50 px-3 py-2 rounded border-l-2 border-[#d4af37]"
                >
                  <div className="text-[#d4af37] font-bold text-[10px] uppercase tracking-widest">
                    {msg.username}
                  </div>
                  <div className="text-[#e5d8b3] text-xs mt-1">{msg.message}</div>
                  <div className="text-[#5c4026] text-[9px] mt-1">
                    {new Date(msg.created_at).toLocaleTimeString([], {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </div>
                </div>
              ))
            )}
            <div ref={messagesEndRef} />
          </div>

          {/* Input */}
          <div className="border-t border-[#4a3219] p-3 flex gap-2 bg-black/70">
            <input
              type="text"
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyPress={(e) => {
                if (e.key === "Enter") sendMessage();
              }}
              placeholder="Type message..."
              className="flex-1 bg-black/50 border border-[#4a3219] text-[#e5d8b3] px-3 py-2 rounded text-xs focus:border-[#d4af37] outline-none"
              disabled={isLoading}
            />
            <button
              onClick={sendMessage}
              disabled={isLoading || !inputMessage.trim()}
              className="bg-[#d4af37] text-black px-3 py-2 rounded hover:bg-[#f9e596] transition-all disabled:opacity-50 font-bold"
            >
              <Send size={16} />
            </button>
          </div>
        </div>
      )}
    </>
  );
}
