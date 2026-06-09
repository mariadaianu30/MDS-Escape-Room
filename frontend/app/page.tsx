"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@supabase/supabase-js";
import { Lock, User, Mail, KeyRound } from "lucide-react";

// Initialize Supabase client
const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_KEY!
);

const GAME_DURATION = 30 * 60;

const resetLocalGameSession = () => {
  Object.keys(localStorage)
    .filter((key) => key.startsWith("escapeRoomLevel"))
    .forEach((key) => localStorage.removeItem(key));

  localStorage.setItem("escapeRoomCompletedLevel", "0");
  localStorage.setItem("escapeRoomEndTime", String(Date.now() + GAME_DURATION * 1000));
  localStorage.removeItem("escapeRoomTimeExpired");
  localStorage.removeItem("escapeRoomInventory");
  localStorage.removeItem("escapeRoomVictoryStats");
  localStorage.removeItem("escapeRoomRoomCode");
};

export default function AuthPage() {
  const router = useRouter();

  // Check if user is already logged in
  useEffect(() => {
    const checkSession = async () => {
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        router.push("/lobby");
      }
    };
    checkSession();

    // Listen for auth state changes (e.g. after OAuth redirect)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      if (session?.user) {
        router.push("/lobby");
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, [router]);
  
  // Tab State
  const [activeTab, setActiveTab] = useState<"signin" | "signup">("signin");

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
      localStorage.removeItem("escapeRoomGuestMode");
      localStorage.removeItem("escapeRoomVictoryStats");
      localStorage.removeItem("escapeRoomInventory");
      localStorage.removeItem("escapeRoomRoomCode");
      localStorage.removeItem("escapeRoomTimeExpired");
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
        resetLocalGameSession();
        localStorage.removeItem("escapeRoomGuestMode");
        router.push("/lobby");
      } else {
        // If email confirmation is enabled, session will be null
        setSignupSuccess("Registration successful! Please check your email to confirm your account before logging in.");
        setIsSigningUp(false);
        setSignupEmail("");
        setSignupPassword("");
        setSignupUsername("");
        // Optionally switch back to signin tab
        setTimeout(() => setActiveTab("signin"), 3000);
      }
    }
  };



  const handleGuestStart = () => {
    localStorage.setItem("escapeRoomGuestMode", "1");
    resetLocalGameSession();
    localStorage.setItem("escapeRoomUsername", "Guest Explorer");
    void supabase.auth.signOut();
    window.location.assign("/lobby?guest=1");
  };

  return (
    <main className="h-[100dvh] relative overflow-hidden bg-[#050302] font-cormorant flex flex-col items-center justify-center select-none p-4">
      {/* Background from Level 1 */}
      <div
        className="absolute inset-0 z-0 opacity-[0.15] mix-blend-screen bg-cover bg-center"
        style={{ backgroundImage: 'url(/images/library.png)' }}
      />
      
      {/* Ambient Glow Effects */}
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full bg-[radial-gradient(ellipse_at_center,_#5c4026_0%,_transparent_60%)] opacity-30 pointer-events-none z-[1] blur-3xl" />
      <div className="absolute inset-0 z-[2] bg-black/60 pointer-events-none" />

      {/* Main Content Container */}
      <div className="relative z-10 w-full max-w-md px-6 flex flex-col items-center">
        
        {/* Title Area */}
        <div className="flex flex-col items-center mb-4">
          <div className="flex items-center gap-2 mb-2 opacity-70">
            <div className="h-px w-10 bg-gradient-to-r from-transparent to-[#d4af37]" />
            <span className="font-cinzel text-[10px] tracking-[0.5em] text-[#d4af37] uppercase">Est. Veritas</span>
            <div className="h-px w-10 bg-gradient-to-l from-transparent to-[#d4af37]" />
          </div>
          <h1 className="font-cinzel text-4xl text-[#e5d8b3] text-center drop-shadow-[0_0_15px_rgba(212,175,55,0.4)] tracking-widest font-bold uppercase mb-2">
            Escape Room
          </h1>
          <p className="text-[#a89f91] font-cinzel tracking-[0.2em] text-xs uppercase">Unlock the Mysteries</p>
        </div>

        {/* Single Auth Box */}
        <div className="w-full bg-[#110b07]/80 backdrop-blur-xl border border-[#4a3219] rounded-2xl p-6 sm:p-8 shadow-[0_0_50px_rgba(0,0,0,0.8)] relative overflow-hidden transition-all duration-500 min-h-[420px] flex flex-col justify-center">
          
          <div className="absolute inset-0 bg-gradient-to-b from-[#d4af37]/5 to-transparent opacity-50 pointer-events-none" />
          
          <div className="relative z-10">
            {/* SIGN IN FORM */}
            <div className={`transition-all duration-500 ease-in-out ${activeTab === "signin" ? "opacity-100 translate-x-0" : "opacity-0 translate-x-8 absolute inset-0 pointer-events-none"}`}>
              <h2 className="font-cinzel text-xl text-[#d4af37] mb-6 text-center tracking-widest border-b border-[#4a3219] pb-4 drop-shadow-[0_0_10px_rgba(212,175,55,0.3)]">
                Identify Yourself
              </h2>
              
              <form onSubmit={handleLogin} className="flex flex-col gap-3">
                {loginError && (
                  <div className="bg-red-950/40 border border-red-900/50 text-red-400 px-3 py-2.5 rounded-lg text-sm text-center animate-in fade-in">
                    {loginError}
                  </div>
                )}
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[#a89f91] font-cinzel text-[10px] tracking-widest uppercase ml-1">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5c4026] group-focus-within:text-[#d4af37] transition-colors w-4 h-4" />
                    <input 
                      type="email" 
                      required
                      value={loginEmail}
                      onChange={(e) => setLoginEmail(e.target.value)}
                      className="w-full bg-black/50 border border-[#4a3219] text-[#e5d8b3] pl-10 pr-4 py-3 rounded-xl outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all font-cormorant text-lg shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] placeholder:text-[#5c4026]"
                      placeholder="email@address.com"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <div className="flex items-center justify-between ml-1">
                    <label className="text-[#a89f91] font-cinzel text-[10px] tracking-widest uppercase">Password</label>
                    <button type="button" className="text-[#5c4026] hover:text-[#d4af37] font-cinzel text-[10px] tracking-widest uppercase transition-colors">Forgot?</button>
                  </div>
                  <div className="relative group">
                    <KeyRound className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5c4026] group-focus-within:text-[#d4af37] transition-colors w-4 h-4" />
                    <input 
                      type="password" 
                      required
                      value={loginPassword}
                      onChange={(e) => setLoginPassword(e.target.value)}
                      className="w-full bg-black/50 border border-[#4a3219] text-[#e5d8b3] pl-10 pr-4 py-3 rounded-xl outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all font-cormorant text-lg shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] placeholder:text-[#5c4026]"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isLoggingIn}
                  className="mt-2 w-full bg-[radial-gradient(ellipse_at_center,_#5c4026_0%,_#1a1107_100%)] border border-[#d4af37]/40 hover:border-[#d4af37] text-[#d4af37] hover:text-[#e5d8b3] hover:shadow-[0_0_20px_rgba(212,175,55,0.2)] transition-all px-6 py-3 rounded-xl font-cinzel tracking-[0.2em] uppercase text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isLoggingIn ? "Authenticating..." : "Log In"}
                </button>
              </form>
              
              <div className="mt-6 pt-4 border-t border-[#4a3219]/50 text-center">
                <p className="text-[#a89f91] font-cormorant text-base">
                  Don't have an account?{" "}
                  <button 
                    type="button" 
                    onClick={() => setActiveTab("signup")}
                    className="text-[#d4af37] hover:text-[#f9e596] font-cinzel tracking-widest text-xs uppercase ml-1 transition-colors drop-shadow-[0_0_5px_rgba(212,175,55,0.4)]"
                  >
                    Sign Up
                  </button>
                </p>
              </div>
            </div>

            {/* SIGN UP FORM */}
            <div className={`transition-all duration-500 ease-in-out ${activeTab === "signup" ? "opacity-100 translate-x-0" : "opacity-0 -translate-x-8 absolute inset-0 pointer-events-none"}`}>
              <h2 className="font-cinzel text-xl text-[#d4af37] mb-6 text-center tracking-widest border-b border-[#4a3219] pb-4 drop-shadow-[0_0_10px_rgba(212,175,55,0.3)]">
                Begin Journey
              </h2>
              
              <form onSubmit={handleSignup} className="flex flex-col gap-3">
                {signupError && (
                  <div className="bg-red-950/40 border border-red-900/50 text-red-400 px-3 py-2.5 rounded-lg text-sm text-center animate-in fade-in">
                    {signupError}
                  </div>
                )}
                {signupSuccess && (
                  <div className="bg-green-950/40 border border-green-900/50 text-green-400 px-3 py-2.5 rounded-lg text-sm text-center animate-in fade-in">
                    {signupSuccess}
                  </div>
                )}
                
                <div className="flex flex-col gap-1.5">
                  <label className="text-[#a89f91] font-cinzel text-[10px] tracking-widest uppercase ml-1">Username</label>
                  <div className="relative group">
                    <User className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5c4026] group-focus-within:text-[#d4af37] transition-colors w-4 h-4" />
                    <input 
                      type="text" 
                      required
                      value={signupUsername}
                      onChange={(e) => setSignupUsername(e.target.value)}
                      className="w-full bg-black/50 border border-[#4a3219] text-[#e5d8b3] pl-10 pr-4 py-3 rounded-xl outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all font-cormorant text-lg shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] placeholder:text-[#5c4026]"
                      placeholder="Your Name"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[#a89f91] font-cinzel text-[10px] tracking-widest uppercase ml-1">Email Address</label>
                  <div className="relative group">
                    <Mail className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5c4026] group-focus-within:text-[#d4af37] transition-colors w-4 h-4" />
                    <input 
                      type="email" 
                      required
                      value={signupEmail}
                      onChange={(e) => setSignupEmail(e.target.value)}
                      className="w-full bg-black/50 border border-[#4a3219] text-[#e5d8b3] pl-10 pr-4 py-3 rounded-xl outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all font-cormorant text-lg shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] placeholder:text-[#5c4026]"
                      placeholder="email@address.com"
                    />
                  </div>
                </div>

                <div className="flex flex-col gap-1.5">
                  <label className="text-[#a89f91] font-cinzel text-[10px] tracking-widest uppercase ml-1">Password</label>
                  <div className="relative group">
                    <Lock className="absolute left-3.5 top-1/2 -translate-y-1/2 text-[#5c4026] group-focus-within:text-[#d4af37] transition-colors w-4 h-4" />
                    <input 
                      type="password" 
                      required
                      minLength={6}
                      value={signupPassword}
                      onChange={(e) => setSignupPassword(e.target.value)}
                      className="w-full bg-black/50 border border-[#4a3219] text-[#e5d8b3] pl-10 pr-4 py-3 rounded-xl outline-none focus:border-[#d4af37] focus:ring-1 focus:ring-[#d4af37] transition-all font-cormorant text-lg shadow-[inset_0_0_10px_rgba(0,0,0,0.5)] placeholder:text-[#5c4026]"
                      placeholder="••••••••"
                    />
                  </div>
                </div>

                <button 
                  type="submit" 
                  disabled={isSigningUp}
                  className="mt-2 w-full bg-[radial-gradient(ellipse_at_center,_#5c4026_0%,_#1a1107_100%)] border border-[#d4af37]/40 hover:border-[#d4af37] text-[#d4af37] hover:text-[#e5d8b3] hover:shadow-[0_0_20px_rgba(212,175,55,0.2)] transition-all px-6 py-3 rounded-xl font-cinzel tracking-[0.2em] uppercase text-sm disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  {isSigningUp ? "Forging Record..." : "Sign Up"}
                </button>
              </form>
              
              <div className="mt-6 pt-4 border-t border-[#4a3219]/50 text-center">
                <p className="text-[#a89f91] font-cormorant text-base">
                  Already initiated?{" "}
                  <button 
                    type="button" 
                    onClick={() => setActiveTab("signin")}
                    className="text-[#d4af37] hover:text-[#f9e596] font-cinzel tracking-widest text-xs uppercase ml-1 transition-colors drop-shadow-[0_0_5px_rgba(212,175,55,0.4)]"
                  >
                    Sign In
                  </button>
                </p>
              </div>
            </div>
            
          </div>
        </div>

        <div className="mt-4 w-full max-w-sm">
          <button
            type="button"
            onClick={handleGuestStart}
            className="w-full border border-[#d4af37]/50 bg-[#d4af37]/10 px-4 py-3.5 font-cinzel text-xs uppercase tracking-widest text-[#d4af37] shadow-lg transition-all hover:border-[#d4af37] hover:bg-[#d4af37] hover:text-black"
          >
            Start as Guest
          </button>
        </div>

      </div>
    </main>
  );
}
