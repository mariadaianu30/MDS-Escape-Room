"use client";

import { useEffect } from "react";
import { usePathname, useRouter } from "next/navigation";

export default function RouteGuard() {
  const router = useRouter();
  const pathname = usePathname();

  useEffect(() => {
    if (!pathname?.startsWith("/level")) return;

    const endTime = parseInt(localStorage.getItem("escapeRoomEndTime") || "0", 10);
    const expired = localStorage.getItem("escapeRoomTimeExpired") === "1" || (!!endTime && endTime <= Date.now());
    if (expired) {
      localStorage.setItem("escapeRoomTimeExpired", "1");
      router.replace("/lobby?gameover=time");
      return;
    }

    const levelMatch = pathname.match(/level(\d+)/);
    if (!levelMatch) return;

    const targetLevel = parseInt(levelMatch[1], 10);
    const completedLevel = parseInt(localStorage.getItem("escapeRoomCompletedLevel") || "0", 10);

    if (targetLevel > 1 && completedLevel < targetLevel - 1) {
      // Temporarily disabled for testing
      // router.replace("/lobby");
    }
  }, [pathname, router]);

  return null;
}
