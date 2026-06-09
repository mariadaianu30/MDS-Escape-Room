"use client";

import { useState, useRef, useEffect, type FormEvent } from "react";
import { usePathname } from "next/navigation";
import { X, Send, Eye } from "lucide-react";
import { useRoleAccess } from "@/components/RoleGate";
import { useInventory } from "@/lib/InventoryContext";

interface Message {
  role: "user" | "spirit";
  content: string;
  sender?: string;
}

interface ChatPayload {
  role: "user" | "spirit";
  content: string;
  sender?: string;
}

interface CooldownPayload {
  timestamp: number;
}

export default function AIHintDialog() {
  const { isOracle } = useRoleAccess(); // Poți păstra asta dacă vrei ca DOAR Oracle să poată SCRIE, dar toți trebuie să vadă chat-ul
  const { broadcastRoomEvent, onRoomEvent } = useInventory();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: "spirit", content: "I am the spirit of the library... what do you seek?" }
  ]);
  const [input, setInput] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [cooldownEndTimestamp, setCooldownEndTimestamp] = useState<number | null>(null);
  const [cooldownRemaining, setCooldownRemaining] = useState<number>(0);
  const [username, setUsername] = useState<string>("Explorer");
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  const playTTS = async (text: string) => {
    try {
      const res = await fetch("/api/tts", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });
      if (res.ok) {
        const blob = await res.blob();
        const url = URL.createObjectURL(blob);
        const audio = new Audio(url);
        audio.play().catch(e => console.error("Audio autoplay blocked", e));
      }
    } catch (e) {
      console.error("Failed to play TTS", e);
    }
  };

  useEffect(() => {
    const savedUsername = localStorage.getItem("escapeRoomUsername");
    if (savedUsername) {
      setUsername(savedUsername);
    }
  }, []);

  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: "smooth" });
    }
  }, [messages, isOpen]);

  // Ascultătorul de evenimente în timp real pentru cameră
  useEffect(() => {
    const chatUnsub = onRoomEvent("CHAT_MESSAGE", (payload: ChatPayload) => {
      // Evităm duplicarea mesajului pentru cel care l-a trimis inițial
      setMessages((prev) => {
        const isDuplicate = prev.some(
          (m) => m.content === payload.content && m.role === payload.role && m.sender === payload.sender
        );
        if (isDuplicate && payload.role === "user") return prev;
        return [...prev, payload];
      });

      // Dacă vine un mesaj nou de la un coechipier sau AI, deschidem automat chatul sau declanșăm un indicator (opțional)
      // Dacă se dorește încărcarea AI-ului vizual la toți:
      if (payload.role === "user" && payload.sender !== username) {
        setIsLoading(true);
      } else if (payload.role === "spirit") {
        setIsLoading(false);
      }
    });

    const cooldownUnsub = onRoomEvent("HINT_COOLDOWN_START", (payload: CooldownPayload) => {
      const nextEnd = payload.timestamp + 60000;
      setCooldownEndTimestamp((current) => (current && current > nextEnd ? current : nextEnd));
    });

    return () => {
      chatUnsub();
      cooldownUnsub();
    };
  }, [onRoomEvent, username]);

  useEffect(() => {
    if (!cooldownEndTimestamp) {
      setCooldownRemaining(0);
      return;
    }

    const tick = () => {
      const remainingMs = cooldownEndTimestamp - Date.now();
      if (remainingMs <= 0) {
        setCooldownEndTimestamp(null);
        setCooldownRemaining(0);
        return;
      }
      setCooldownRemaining(Math.ceil(remainingMs / 1000));
    };

    tick();
    const interval = window.setInterval(tick, 250);
    return () => window.clearInterval(interval);
  }, [cooldownEndTimestamp]);

  const isCoolingDown = cooldownEndTimestamp !== null && cooldownEndTimestamp > Date.now();

  // Verificare cale nivel
  if (!pathname || !pathname.startsWith('/level')) return null;

  // CORECTURĂ CRITICĂ: Am scos "if (!isOracle) return null;" de aici. 
  // Astfel, componenta se va randa pentru TOATĂ ECHIPA ca să vadă indiciile primite în timp real.

  const currentLevel = parseInt(pathname.match(/level(\d+)/)?.[1] || "1", 10);
  const currentPuzzleId = `level${currentLevel}_general`;
  // const oracleButtonPosition = currentLevel === 3
  //   ? "bottom-24 left-4 lg:bottom-8 lg:left-6"
  //   : "top-28 left-4 lg:top-28 lg:left-6";
  const oracleButtonPosition = "bottom-8 left-6 lg:bottom-10 lg:left-8";

  const getPlayerId = () => {
    const existing = localStorage.getItem("escapeRoomPlayerId");
    if (existing) return existing;

    const created = crypto.randomUUID();
    localStorage.setItem("escapeRoomPlayerId", created);
    return created;
  };

  const startCooldown = (timestamp = Date.now()) => {
    const nextEnd = timestamp + 60000;
    setCooldownEndTimestamp((current) => (current && current > nextEnd ? current : nextEnd));
    broadcastRoomEvent("HINT_COOLDOWN_START", { timestamp });
  };

  const toggleOpen = () => setIsOpen((prev) => !prev);

  const sendMessage = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!input.trim() || isLoading || isCoolingDown) return;

    const userMsg = input.trim();
    setInput("");
    
    // Adăugăm local mesajul imediat pentru feedback vizual instant
    setMessages((prev) => [...prev, { role: "user", content: userMsg, sender: username }]);
    
    // Declanșăm cooldown-ul pentru toți
    startCooldown();
    
    // Trimitem mesajul prin WebSockets la echipă
    broadcastRoomEvent("CHAT_MESSAGE", { role: "user", content: userMsg, sender: username });
    setIsLoading(true);

    // Citim contextul dinamic pentru nivelul curent dacă există
    const roomCode = localStorage.getItem("escapeRoomRoomCode");
    const dynKey = roomCode ? `escapeRoomState_level${currentLevel}_dynamic_${roomCode}` : `escapeRoomState_lvl${currentLevel}_dynamic_single`;
    // Nota: level2 folosește 'escapeRoomState_lvl2_dynamic_single'
    const altDynKey = roomCode ? `escapeRoomState_lvl${currentLevel}_dynamic_${roomCode}` : `escapeRoomState_lvl${currentLevel}_dynamic_single`;
    const dynDataStr = localStorage.getItem(dynKey) || localStorage.getItem(altDynKey);
    let dynamicContext = null;
    if (dynDataStr) {
      try { dynamicContext = JSON.parse(dynDataStr); } catch (e) {}
    }

    try {
      const res = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          level: currentLevel,
          puzzleId: currentPuzzleId,
          playerId: getPlayerId(),
          userQuestion: userMsg,
          dynamicContext
        }),
      });

      if (!res.ok) throw new Error("Failed to contact the spirit");

      const data = await res.json();
      const spiritMessage: Message = { role: "spirit", content: data.hint };
      
      setMessages((prev) => [...prev, spiritMessage]);
      broadcastRoomEvent("CHAT_MESSAGE", spiritMessage);
      
      // Play TTS only for the user who sent the message
      playTTS(data.hint);
    } catch (err) {
      setMessages((prev) => [...prev, { role: "spirit", content: "The spirits are silent... check your connection." }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Butonul plutitor rotund */}
      <button
        type="button"
        onClick={toggleOpen}
        className={`fixed ${oracleButtonPosition} p-3 bg-black/80 border-2 border-[#5c4026] text-[#c7baaa] hover:text-[#d4af37] hover:border-[#d4af37] transition-all rounded-full shadow-[0_0_15px_black] z-[60] flex items-center justify-center group`}
        title="Consult the Spirits"
        aria-label={isOpen ? "Close the Oracle chat" : "Open the Oracle chat"}
      >
        <Eye size={24} className="group-hover:animate-pulse" />
      </button>

      {/* Caseta de Chat (Modalul) */}
      {isOpen && (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/70 backdrop-blur-sm" onClick={() => setIsOpen(false)} />
          <div className="relative w-full max-w-md h-[60vh] flex flex-col bg-[#150e09] border-[3px] border-[#5c4026] rounded-xl shadow-[0_0_80px_rgba(212,175,55,0.15)] overflow-hidden font-cormorant bg-[url('https://www.transparenttextures.com/patterns/black-paper.png')]">
            
            <div className="flex items-center justify-between p-4 border-b border-[#5c4026] bg-[#0a0705]">
              <div className="flex items-center gap-2 text-[#d4af37]">
                <Eye size={20} className="animate-pulse" />
                <h3 className="font-cinzel font-bold tracking-widest uppercase">The Oracle</h3>
              </div>
              <button 
                onClick={() => setIsOpen(false)}
                className="text-[#8c7a6b] hover:text-red-500 transition-colors"
              >
                <X size={20} />
              </button>
            </div>

            {/* Zona de mesaje */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {messages.map((msg, idx) => (
                <div key={idx} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] p-3 rounded-lg border ${
                    msg.role === 'user'
                      ? 'bg-[#2a1d0f] border-[#5c4026] text-[#e5d8b3]'
                      : 'bg-black/60 border-[#3c2a1a] text-[#c7baaa] italic'
                  }`}>
                    {msg.sender && msg.role === 'user' ? <div className="text-[10px] text-[#b8a07f] uppercase tracking-[0.18em] mb-1">{msg.sender}</div> : null}
                    {msg.content}
                  </div>
                </div>
              ))}
              {isLoading && (
                <div className="flex justify-start">
                  <div className="max-w-[85%] p-3 rounded-lg border bg-black/60 border-[#3c2a1a] text-[#8c7a6b] italic flex items-center gap-2">
                    <span className="animate-bounce">.</span>
                    <span className="animate-bounce" style={{ animationDelay: '0.2s' }}>.</span>
                    <span className="animate-bounce" style={{ animationDelay: '0.4s' }}>.</span>
                  </div>
                </div>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Zona de input text */}
            <form onSubmit={sendMessage} className="p-4 border-t border-[#5c4026] bg-[#0a0705]">
              {isCoolingDown && (
                <div className="mb-3 text-sm text-[#bf9a59] italic">
                  The Oracle is resting... ({cooldownRemaining}s)
                </div>
              )}
              <div className="flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder={isOracle ? "Ask for guidance..." : "Only the Oracle can type..."}
                  // Oricine e în cooldown este blocat. Dacă nu e Oracle, e blocat permanent la scriere.
                  disabled={isLoading || isCoolingDown || !isOracle}
                  className="flex-1 bg-black border border-[#5c4026] rounded-lg px-4 py-2 text-[#e5d8b3] focus:outline-none focus:border-[#d4af37] font-cormorant transition-colors placeholder:text-[#5c4026] disabled:cursor-not-allowed disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={isLoading || !input.trim() || isCoolingDown || !isOracle}
                  className="bg-[#2a1d0f] border border-[#5c4026] text-[#d4af37] p-2 rounded-lg hover:border-[#d4af37] hover:bg-[#3c2a1a] transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Send size={20} />
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}