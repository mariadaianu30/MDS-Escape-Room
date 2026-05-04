"use client";

interface TimerProps {
  timeLeft: number;
}

export default function Timer({ timeLeft }: TimerProps) {
  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  };

  const isLow = timeLeft < 300;

  return (
    <div className={`fixed top-4 right-4 bg-[#1f150b]/90 border-2 ${isLow ? 'border-red-600 animate-pulse' : 'border-[#3c2a1a]'} px-6 py-2 rounded font-cinzel text-xl md:text-2xl ${isLow ? 'text-red-500' : 'text-[#d4af37]'} backdrop-blur-sm z-[60] shadow-[0_0_20px_rgba(0,0,0,0.8)] flex flex-col items-center transition-colors`}>
      <span className={`text-[10px] md:text-xs ${isLow ? 'text-red-400' : 'text-[#8c7a6b]'} uppercase tracking-[0.2em] mb-1 font-bold`}>Time Remaining</span>
      <span className="font-bold tracking-wider">{formatTime(timeLeft)}</span>
    </div>
  );
}
