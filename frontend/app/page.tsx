"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Lock, User, Mail, KeyRound } from "lucide-react";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
);

export default function AuthPage() {
  const router = useRouter();

  // Login State
  const [loginEmail, setLoginEmail] = useState("");
  const [loginPassword, setLoginPassword] = useState("");
  const [loginError, setLoginError] = useState("");
  const [isLoggingIn, setIsLoggingIn] = useState(false);

  // Signup State
  const [signupEmail, setSignupEmail] = useState("");
  const [signupPassword, setSignupPassword] = useState("");
  const [signupUsername, setSignupUsername] = useState("");
  const [signupError, setSignupError] = useState("");
  const [signupSuccess, setSignupSuccess] = useState("");
  const [isSigningUp, setIsSigningUp] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoggingIn(true);
    setLoginError("");

    const { error } = await supabase.auth.signInWithPassword({
      email: loginEmail,
      password: loginPassword,
    });

    if (error) {
      setLoginError(error.message);
      setIsLoggingIn(false);
    } else {
      router.push("/lobby");
    }
  };

  const handleSignup = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSigningUp(true);
    setSignupError("");
    setSignupSuccess("");

    // 1. Register the user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email: signupEmail,
      password: signupPassword,
    });

    if (authError) {
      setSignupError(authError.message);
      setIsSigningUp(false);
      return;
    }

    // 2. If registration succeeds, create the profile in 'player' table
    if (authData.user) {
      const { error: profileError } = await supabase
        .from('player')
        .insert([
          { 
            id: authData.user.id, 
            username: signupUsername, 
            current_level: 1, 
            best_score: 0,
            remaining_time: 1800 // 30 minutes in seconds
          }
        ]);

      if (profileError) {
        setSignupError("Error saving profile: " + profileError.message);
        setIsSigningUp(false);
        return;
      }

      if (authData.session) {
        // If email confirmation is disabled, session is returned immediately
        router.push("/lobby");
      } else {
        // If email confirmation is enabled, session will be null
        setSignupSuccess("Registration successful! Please check your email to confirm your account before logging in.");
        setIsSigningUp(false);
        setSignupEmail("");
        setSignupPassword("");
        setSignupUsername("");
      }
    }
  };

  return (
    <main className="min-h-screen relative overflow-hidden bg-[#0a0705] font-cormorant flex flex-col items-center justify-center select-none">
      {/* Background from Level 1 */}
      <div
        className="absolute inset-0 z-0 opacity-40 mix-blend-screen bg-cover bg-center"
        style={{ backgroundImage: 'url(/images/library.png)' }}
      />
      {/* Dark overlay for better readability */}
      <div className="absolute inset-0 z-[1] bg-black/60 pointer-events-none" />

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-4xl px-4 flex flex-col items-center gap-6 mt-12">
        
        {/* Title Area */}
        <div className="flex flex-col items-center">
          <div className="flex items-center gap-2 mb-1 opacity-60">
            <div className="h-px w-10 md:w-20 bg-gradient-to-r from-transparent to-[#d4af37]" />
            <span className="font-cinzel text-[9px] md:text-[10px] tracking-[0.5em] text-[#d4af37] uppercase">Est. Veritas</span>
            <div className="h-px w-10 md:w-20 bg-gradient-to-l from-transparent to-[#d4af37]" />
          </div>
          <h1 className="font-cinzel text-4xl md:text-5xl text-[#e5d8b3] text-center drop-shadow-[0_0_20px_rgba(212,175,55,0.4)] tracking-widest font-bold uppercase mb-1">
            Escape Room
          </h1>
          <p className="text-[#a89f91] font-cinzel tracking-widest text-xs md:text-sm uppercase">Identify Yourself to Enter</p>
        </div>

        {/* 2-Column Auth Layout */}
        <div className="flex flex-col md:flex-row gap-6 w-full">
          
          {/* ----- LOG IN COLUMN ----- */}
          <div className="flex-1 bg-[#150e09]/80 backdrop-blur-md border border-[#5c4026] rounded-xl p-6 md:p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative group overflow-hidden">
            <div className="absolute inset-0 bg-gradient-to-b from-[#d4af37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            
            <h2 className="font-cinzel text-2xl text-[#d4af37] mb-6 text-center tracking-widest drop-shadow-[0_0_10px_rgba(212,175,55,0.4)] border-b border-[#5c4026]/50 pb-3">
              Return
            </h2>
            
            <form onSubmit={handleLogin} className="flex flex-col gap-4 relative z-10">
              {loginError && (
                <div className="bg-red-950/50 border border-red-800 text-red-300 px-3 py-2 rounded text-xs text-center font-cormorant animate-in fade-in">
                  {loginError}
                </div>
              )}
              
              <div className="flex flex-col gap-1.5">
                <label className="text-[#a89f91] font-cinzel text-[10px] tracking-widest uppercase ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5c4026] w-4 h-4" />
                  <input 
                    type="email" 
                    required
                    value={loginEmail}
                    onChange={(e) => setLoginEmail(e.target.value)}
                    className="w-full bg-black/60 border border-[#5c4026] text-[#e5d8b3] pl-10 pr-4 py-2 rounded outline-none focus:border-[#d4af37] transition-colors font-cormorant text-base shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]"
                    placeholder="email@address.com"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[#a89f91] font-cinzel text-[10px] tracking-widest uppercase ml-1">Password</label>
                <div className="relative">
                  <KeyRound className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5c4026] w-4 h-4" />
                  <input 
                    type="password" 
                    required
                    value={loginPassword}
                    onChange={(e) => setLoginPassword(e.target.value)}
                    className="w-full bg-black/60 border border-[#5c4026] text-[#e5d8b3] pl-10 pr-4 py-2 rounded outline-none focus:border-[#d4af37] transition-colors font-cormorant text-base shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isLoggingIn}
                className="mt-4 bg-[radial-gradient(ellipse_at_center,_#5c4026_0%,_#1a1107_100%)] border border-[#d4af37]/50 hover:border-[#d4af37] text-[#d4af37] hover:text-[#e5d8b3] hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all px-6 py-2.5 rounded font-cinzel tracking-[0.2em] uppercase text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isLoggingIn ? "Authenticating..." : "Log In"}
              </button>
            </form>
          </div>

          {/* ----- SIGN UP COLUMN ----- */}
          <div className="flex-1 bg-[#150e09]/80 backdrop-blur-md border border-[#5c4026] rounded-xl p-6 md:p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative group overflow-hidden">
             <div className="absolute inset-0 bg-gradient-to-b from-[#d4af37]/5 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none" />
            
            <h2 className="font-cinzel text-2xl text-[#d4af37] mb-6 text-center tracking-widest drop-shadow-[0_0_10px_rgba(212,175,55,0.4)] border-b border-[#5c4026]/50 pb-3">
              Begin Journey
            </h2>
            
            <form onSubmit={handleSignup} className="flex flex-col gap-4 relative z-10">
              {signupError && (
                <div className="bg-red-950/50 border border-red-800 text-red-300 px-3 py-2 rounded text-xs text-center font-cormorant animate-in fade-in">
                  {signupError}
                </div>
              )}
              {signupSuccess && (
                <div className="bg-green-950/50 border border-green-800 text-green-300 px-3 py-2 rounded text-xs text-center font-cormorant animate-in fade-in">
                  {signupSuccess}
                </div>
              )}

              <div className="flex flex-col gap-1.5">
                <label className="text-[#a89f91] font-cinzel text-[10px] tracking-widest uppercase ml-1">Username</label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5c4026] w-4 h-4" />
                  <input 
                    type="text" 
                    required
                    value={signupUsername}
                    onChange={(e) => setSignupUsername(e.target.value)}
                    className="w-full bg-black/60 border border-[#5c4026] text-[#e5d8b3] pl-10 pr-4 py-2 rounded outline-none focus:border-[#d4af37] transition-colors font-cormorant text-base shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]"
                    placeholder="Name"
                  />
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label className="text-[#a89f91] font-cinzel text-[10px] tracking-widest uppercase ml-1">Email Address</label>
                <div className="relative">
                  <Mail className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5c4026] w-4 h-4" />
                  <input 
                    type="email" 
                    required
                    value={signupEmail}
                    onChange={(e) => setSignupEmail(e.target.value)}
                    className="w-full bg-black/60 border border-[#5c4026] text-[#e5d8b3] pl-10 pr-4 py-2 rounded outline-none focus:border-[#d4af37] transition-colors font-cormorant text-base shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]"
                    placeholder="email@address.com"
                  />
                </div>
              </div>
              <div className="flex flex-col gap-1.5">
                <label className="text-[#a89f91] font-cinzel text-[10px] tracking-widest uppercase ml-1">Password</label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 -translate-y-1/2 text-[#5c4026] w-4 h-4" />
                  <input 
                    type="password" 
                    required
                    minLength={6}
                    value={signupPassword}
                    onChange={(e) => setSignupPassword(e.target.value)}
                    className="w-full bg-black/60 border border-[#5c4026] text-[#e5d8b3] pl-10 pr-4 py-2 rounded outline-none focus:border-[#d4af37] transition-colors font-cormorant text-base shadow-[inset_0_0_10px_rgba(0,0,0,0.8)]"
                    placeholder="••••••••"
                  />
                </div>
              </div>

              <button 
                type="submit" 
                disabled={isSigningUp}
                className="mt-4 bg-[radial-gradient(ellipse_at_center,_#5c4026_0%,_#1a1107_100%)] border border-[#d4af37]/50 hover:border-[#d4af37] text-[#d4af37] hover:text-[#e5d8b3] hover:shadow-[0_0_20px_rgba(212,175,55,0.3)] transition-all px-6 py-2.5 rounded font-cinzel tracking-[0.2em] uppercase text-base disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {isSigningUp ? "Forging Record..." : "Sign Up"}
              </button>
            </form>
          </div>

        </div>
      </div>
    </main>
  );
}
