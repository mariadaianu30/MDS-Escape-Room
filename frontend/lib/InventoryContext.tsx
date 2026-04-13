"use client";

import React, { createContext, useContext, useState, useEffect } from "react";

export type InventoryItem = {
  id: string;
  name: string;
  description: string;
  iconSrc?: string; // We can use an image or an emoji fallback
  emojiFallback?: string;
};

interface InventoryContextType {
  items: InventoryItem[];
  addItem: (item: InventoryItem) => void;
  removeItem: (id: string) => void;
  hasItem: (id: string) => boolean;
  clearInventory: () => void;
  equippedItem: string | null;
  setEquippedItem: (id: string | null) => void;
}

const InventoryContext = createContext<InventoryContextType | undefined>(undefined);

export function InventoryProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<InventoryItem[]>([]);
  const [equippedItem, setEquippedItem] = useState<string | null>(null);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load from persistent storage on mount
  useEffect(() => {
    const saved = localStorage.getItem("escapeRoomInventory");
    if (saved) {
      try {
        setItems(JSON.parse(saved));
      } catch (e) {
        console.error("Failed to parse inventory", e);
      }
    }
    setIsLoaded(true);
  }, []);

  // Save to persistent storage when changed
  useEffect(() => {
    if (isLoaded) {
      localStorage.setItem("escapeRoomInventory", JSON.stringify(items));
    }
  }, [items, isLoaded]);

  const addItem = (item: InventoryItem) => {
    setItems((prev) => {
      if (prev.find((i) => i.id === item.id)) return prev;
      return [...prev, item];
    });
  };

  const removeItem = (id: string) => {
    if (equippedItem === id) setEquippedItem(null);
    setItems((prev) => prev.filter((i) => i.id !== id));
  };

  const hasItem = (id: string) => {
    return items.some((i) => i.id === id);
  };

  const clearInventory = () => {
    setItems([]);
    setEquippedItem(null);
    localStorage.removeItem("escapeRoomInventory");
  };

  return (
    <InventoryContext.Provider value={{ items, addItem, removeItem, hasItem, clearInventory, equippedItem, setEquippedItem }}>
      {children}
    </InventoryContext.Provider>
  );
}

export function useInventory() {
  const context = useContext(InventoryContext);
  if (context === undefined) {
    throw new Error("useInventory must be used within an InventoryProvider");
  }
  return context;
}
