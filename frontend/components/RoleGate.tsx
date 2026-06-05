"use client";

import { useInventory, type PlayerRole } from "@/lib/InventoryContext";

const ROLE_LABELS: Record<PlayerRole, string> = {
  scribe: "Scribe",
  artisan: "Artisan",
  oracle: "Oracle",
};

type RoleGateProps = {
  allow: PlayerRole;
  children: React.ReactNode;
  fallback?: React.ReactNode;
};

export function RoleGate({ allow, children, fallback = null }: RoleGateProps) {
  const { currentRole, roomCode } = useInventory();
  return !roomCode || currentRole === allow ? <>{children}</> : <>{fallback}</>;
}

export function useRoleAccess() {
  const { currentRole, roomCode } = useInventory();
  const isSinglePlayer = !roomCode;

  return {
    currentRole,
    isSinglePlayer,
    isScribe: isSinglePlayer || currentRole === "scribe",
    isArtisan: isSinglePlayer || currentRole === "artisan",
    isOracle: isSinglePlayer || currentRole === "oracle",
    roleLabel: isSinglePlayer ? "Solo Explorer" : ROLE_LABELS[currentRole],
    labelFor: (role: PlayerRole) => ROLE_LABELS[role],
  };
}

export function RoleBlockedNotice({ role, label }: { role: PlayerRole; label?: string }) {
  return (
    <div className="rounded border border-[#5c4026]/60 bg-black/45 px-4 py-3 text-center font-cinzel text-[10px] uppercase tracking-[0.2em] text-[#8c7a6b]">
      {label ?? `Reserved for the ${ROLE_LABELS[role]}.`}
    </div>
  );
}
