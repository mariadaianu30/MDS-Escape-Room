"use client";

import { useEffect, useState } from "react";
import { Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { createClient } from "@supabase/supabase-js";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
);

function AuthCallbackContent() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const [errorMessage, setErrorMessage] = useState("");

  useEffect(() => {
    const finishGoogleLogin = async () => {
      const next = searchParams.get("next") || "/lobby";
      const code = searchParams.get("code");
      const error = searchParams.get("error_description") || searchParams.get("error");

      if (error) {
        setErrorMessage(error);
        return;
      }

      try {
        let session = null;
        if (code) {
          const { data, error: exchangeError } = await supabase.auth.exchangeCodeForSession(code);
          if (exchangeError) throw exchangeError;
          session = data.session;
        }

        if (!session) {
          const { data: sessionData, error: sessionError } = await supabase.auth.getSession();
          if (sessionError) throw sessionError;
          session = sessionData.session;
        }

        if (!session) throw new Error("Google login did not create a session.");

        localStorage.removeItem("escapeRoomGuestMode");
        localStorage.removeItem("escapeRoomVictoryStats");
        localStorage.removeItem("escapeRoomInventory");
        localStorage.removeItem("escapeRoomRoomCode");

        router.replace(next.startsWith("/") ? next : "/lobby");
      } catch (err: any) {
        setErrorMessage(err.message || "Google login failed. Please try again.");
      }
    };

    void finishGoogleLogin();
  }, [router, searchParams]);

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#050302] px-6 text-center font-cormorant text-[#e5d8b3]">
      <div className="max-w-md rounded-xl border border-[#4a3219] bg-[#110b07]/90 p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
        <h1 className="mb-4 font-cinzel text-2xl uppercase tracking-[0.2em] text-[#d4af37]">
          Connecting Google
        </h1>
        {errorMessage ? (
          <>
            <p className="mb-6 text-red-300">{errorMessage}</p>
            <button
              type="button"
              onClick={() => router.replace("/")}
              className="rounded-lg border border-[#d4af37]/50 px-5 py-3 font-cinzel text-xs uppercase tracking-widest text-[#d4af37] transition-colors hover:bg-[#d4af37] hover:text-black"
            >
              Back to Login
            </button>
          </>
        ) : (
          <p className="text-lg text-[#a89f91]">Finishing your sign in...</p>
        )}
      </div>
    </main>
  );
}

export default function AuthCallbackPage() {
  return (
    <Suspense fallback={
      <main className="flex min-h-screen items-center justify-center bg-[#050302] px-6 text-center font-cormorant text-[#e5d8b3]">
        <div className="max-w-md rounded-xl border border-[#4a3219] bg-[#110b07]/90 p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)]">
          <h1 className="mb-4 font-cinzel text-2xl uppercase tracking-[0.2em] text-[#d4af37]">
            Connecting Google
          </h1>
          <p className="text-lg text-[#a89f91]">Finishing your sign in...</p>
        </div>
      </main>
    }>
      <AuthCallbackContent />
    </Suspense>
  );
}
