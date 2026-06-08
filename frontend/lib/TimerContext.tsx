"use client";

import React, { createContext, useContext, useState, useEffect, useRef } from "react";
import { useRouter, usePathname } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { useInventory } from "@/lib/InventoryContext";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
);

const GAME_DURATION = 30 * 60; // 30 minutes

interface TimerContextType {
  timeLeft: number;
  isGameOver: boolean;
}

const TimerContext = createContext<TimerContextType | undefined>(undefined);

export function TimerProvider({ children }: { children: React.ReactNode }) {
  const [timeLeft, setTimeLeft] = useState(GAME_DURATION);
  const [isGameOver, setIsGameOver] = useState(false);
  const [isActive, setIsActive] = useState(false);
  const [isStarted, setIsStarted] = useState(true);
  const [isHost, setIsHost] = useState(false);
  const router = useRouter();
  const pathname = usePathname();
  const timeLeftRef = useRef(timeLeft);
  const { roomCode, broadcastRoomEvent, onRoomEvent } = useInventory();

  const hasSyncedRef = useRef(false);

  useEffect(() => {
    timeLeftRef.current = timeLeft;
  }, [timeLeft]);

  useEffect(() => {
    if (roomCode) {
      const hostState = localStorage.getItem(`escapeRoomIsHost_${roomCode}`) === "true";
      setIsHost(hostState);
      hasSyncedRef.current = hostState;
    } else {
      setIsHost(false);
      hasSyncedRef.current = false;
    }
  }, [roomCode]);

  // Activate timer ONLY when inside a level (not lobby or root)
  useEffect(() => {
    if (pathname && pathname.startsWith("/level")) {
      setIsActive(true);
    } else {
      setIsActive(false);
    }
  }, [pathname]);

  const syncGameProgress = async (remaining: number) => {
    try {
      const { data: authData } = await supabase.auth.getUser();
      if (!authData.user) return;
      
      const levelMatch = pathname.match(/level(\d+)/);
      const currentLevel = levelMatch ? parseInt(levelMatch[1], 10) : 1;

      // 1. If in a multiplayer room, sync time to the rooms table
      if (roomCode) {
        await supabase
          .from("rooms")
          .update({ remaining_time: remaining })
          .eq("code", roomCode);
      }

      // 2. Also keep syncing to player profile for fallback / level tracking
      await supabase
        .from("player")
        .update({ remaining_time: remaining, current_level: currentLevel })
        .eq("id", authData.user.id);
    } catch (e) {
      // Fail silently if table doesn't exist
    }
  };

  // On mount or active state change, fetch from DB or request sync
  useEffect(() => {
    async function initTimer() {
      if (roomCode) {
        if (isHost) {
          // Check remaining seconds first
          const storedTimeLeft = localStorage.getItem("escapeRoomTimeLeft");
          if (storedTimeLeft) {
            const calculatedRemaining = parseInt(storedTimeLeft, 10);
            if (calculatedRemaining > 0) {
              setTimeLeft(calculatedRemaining);
              localStorage.setItem("escapeRoomEndTime", String(Date.now() + calculatedRemaining * 1000));
              return;
            }
          }

          // Check local storage first to see if we have an active timer we are resuming
          const storedEndTime = localStorage.getItem("escapeRoomEndTime");
          if (storedEndTime) {
            const calculatedRemaining = Math.max(0, Math.floor((parseInt(storedEndTime, 10) - Date.now()) / 1000));
            if (calculatedRemaining > 0) {
              setTimeLeft(calculatedRemaining);
              return;
            }
          }

          // Host: try to load from rooms table (optional fallback)
          try {
            const { data: roomData, error: roomError } = await supabase
              .from("rooms")
              .select("remaining_time, is_started")
              .eq("code", roomCode)
              .maybeSingle();

            if (!roomError && roomData) {
              if (roomData.is_started !== undefined && roomData.is_started !== null) {
                setIsStarted(roomData.is_started);
              }
              if (roomData.remaining_time !== null && roomData.remaining_time !== undefined) {
                setTimeLeft(roomData.remaining_time);
                localStorage.setItem("escapeRoomTimeLeft", String(roomData.remaining_time));
                localStorage.setItem("escapeRoomEndTime", String(Date.now() + roomData.remaining_time * 1000));
                return;
              }
            }
          } catch (e) {
            // Table doesn't exist, ignore
          }
        } else {
          // Guest: request sync from host
          broadcastRoomEvent("REQUEST_TIMER_SYNC", {});
          setIsStarted(false); // starts paused until host updates it
          
          // Use stored time as placeholder if exists, otherwise default
          const storedTimeLeft = localStorage.getItem("escapeRoomTimeLeft");
          if (storedTimeLeft) {
            const calculatedRemaining = parseInt(storedTimeLeft, 10);
            if (calculatedRemaining > 0) {
              setTimeLeft(calculatedRemaining);
              return;
            }
          }
          const storedEndTime = localStorage.getItem("escapeRoomEndTime");
          if (storedEndTime) {
            const calculatedRemaining = Math.max(0, Math.floor((parseInt(storedEndTime, 10) - Date.now()) / 1000));
            if (calculatedRemaining > 0) {
              setTimeLeft(calculatedRemaining);
              return;
            }
          }
          setTimeLeft(GAME_DURATION);
          return; // Return early for Guests to prevent overwriting with local player profile
        }
      }

      // Single player mode (or Host fallback): Fallback to player account timer
      try {
        const { data: authData } = await supabase.auth.getUser();
        if (!authData.user) {
          const storedTimeLeft = localStorage.getItem("escapeRoomTimeLeft");
          if (storedTimeLeft) {
            const calculatedRemaining = parseInt(storedTimeLeft, 10);
            if (calculatedRemaining > 0) {
              setTimeLeft(calculatedRemaining);
              localStorage.setItem("escapeRoomEndTime", String(Date.now() + calculatedRemaining * 1000));
              return;
            }
          }
          const storedEndTime = localStorage.getItem("escapeRoomEndTime");
          if (storedEndTime) {
            const calculatedRemaining = Math.max(0, Math.floor((parseInt(storedEndTime, 10) - Date.now()) / 1000));
            if (calculatedRemaining > 0) {
              setTimeLeft(calculatedRemaining);
              return;
            }
          }
          setTimeLeft(GAME_DURATION);
          return;
        }

        const { data, error } = await supabase
          .from("player")
          .select("remaining_time")
          .eq("id", authData.user.id)
          .maybeSingle();

        if (!error && data && data.remaining_time !== null) {
          setTimeLeft(data.remaining_time);
          localStorage.setItem("escapeRoomTimeLeft", String(data.remaining_time));
          localStorage.setItem("escapeRoomEndTime", String(Date.now() + data.remaining_time * 1000));
          if (data.remaining_time <= 0) {
            localStorage.setItem("escapeRoomTimeExpired", "1");
            if (pathname.startsWith("/level")) router.push("/lobby?gameover=time");
          }
        } else {
          setTimeLeft(GAME_DURATION);
          localStorage.setItem("escapeRoomTimeLeft", String(GAME_DURATION));
          localStorage.setItem("escapeRoomEndTime", String(Date.now() + GAME_DURATION * 1000));
          localStorage.removeItem("escapeRoomTimeExpired");
        }
      } catch (e) {
        // Fallback for offline/local modes
        setTimeLeft(GAME_DURATION);
        localStorage.setItem("escapeRoomEndTime", String(Date.now() + GAME_DURATION * 1000));
      }
    }
    
    if (isActive && !isGameOver) {
      initTimer();
    }
  }, [isActive, isGameOver, roomCode, isHost, pathname, router]);

  // Request sync loop for Guests until synced
  useEffect(() => {
    if (!roomCode || isHost || !isActive || isGameOver) return;

    const interval = setInterval(() => {
      if (!hasSyncedRef.current) {
        console.log("[Timer Sync] Guest requesting timer sync from host...");
        broadcastRoomEvent("REQUEST_TIMER_SYNC", {});
      }
    }, 2000);

    return () => clearInterval(interval);
  }, [roomCode, isHost, isActive, isGameOver, broadcastRoomEvent]);

  // Listen for real-time timer sync broadcast
  useEffect(() => {
    if (!roomCode || !isActive || isGameOver) return;

    // Guests listen for TIMER_SYNC broadcasts from the host
    const unsubscribeSync = onRoomEvent("TIMER_SYNC", (payload: any) => {
      if (!isHost && payload && payload.timeLeft !== undefined) {
        setIsStarted(payload.isStarted !== false);
        setTimeLeft(payload.timeLeft);
        localStorage.setItem("escapeRoomTimeLeft", String(payload.timeLeft));
        localStorage.setItem("escapeRoomEndTime", String(Date.now() + payload.timeLeft * 1000));
        hasSyncedRef.current = true;
      }
    });

    // Host responds to Guest REQUEST_TIMER_SYNC requests
    const unsubscribeReq = onRoomEvent("REQUEST_TIMER_SYNC", () => {
      if (isHost) {
        broadcastRoomEvent("TIMER_SYNC", { 
          timeLeft: timeLeftRef.current,
          isStarted: isStarted
        });
      }
    });

    return () => {
      unsubscribeSync();
      unsubscribeReq();
    };
  }, [roomCode, isActive, isGameOver, isHost, isStarted, onRoomEvent, broadcastRoomEvent]);

  // The countdown loop - uses absolute timestamp to prevent drift
  useEffect(() => {
    if (!isActive || isGameOver || !isStarted) return;

    const interval = setInterval(() => {
      const storedEndTime = localStorage.getItem("escapeRoomEndTime");
      if (storedEndTime) {
        const endTime = parseInt(storedEndTime, 10);
        const remaining = Math.max(0, Math.ceil((endTime - Date.now()) / 1000));
        
        setTimeLeft(remaining);
        localStorage.setItem("escapeRoomTimeLeft", String(remaining));
        
        if (remaining <= 0) {
          clearInterval(interval);
          handleTimeUp();
        }
      } else {
        setTimeLeft((prev) => {
          const nextVal = prev <= 1 ? 0 : prev - 1;
          localStorage.setItem("escapeRoomTimeLeft", String(nextVal));
          if (nextVal <= 0) {
            clearInterval(interval);
            handleTimeUp();
          }
          return nextVal;
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [isActive, isGameOver, isStarted]);

  // Host broadcasts heartbeat sync
  useEffect(() => {
    if (!isActive || isGameOver || !isStarted) return;

    const syncInterval = setInterval(() => {
       if (isHost) {
          broadcastRoomEvent("TIMER_SYNC", { 
            timeLeft: timeLeftRef.current,
            isStarted: isStarted
          });
       }
       syncGameProgress(timeLeftRef.current);
    }, 5000); // sync every 5 seconds for smooth synchronization

    return () => clearInterval(syncInterval);
  }, [isActive, isGameOver, isStarted, isHost, roomCode]);

  const handleTimeUp = async () => {
    setIsGameOver(true);
    
    localStorage.setItem("escapeRoomTimeExpired", "1");
    localStorage.setItem("escapeRoomEndTime", String(Date.now()));
    await syncGameProgress(0);
    
    // Redirect to lobby with a query parameter for game over
    router.push("/lobby?gameover=time");
    
    // Give some time to redirect then reset
    setTimeout(() => {
      setIsGameOver(false);
      setTimeLeft(0);
    }, 2000);
  };

  return (
    <TimerContext.Provider value={{ timeLeft, isGameOver }}>
      {children}
    </TimerContext.Provider>
  );
}

export function useTimer() {
  const context = useContext(TimerContext);
  if (context === undefined) {
    throw new Error("useTimer must be used within a TimerProvider");
  }
  return context;
}
