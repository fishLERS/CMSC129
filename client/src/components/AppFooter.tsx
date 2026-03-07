import { Fish } from "lucide-react";

const currentYear = new Date().getFullYear();

export default function AppFooter() {
  return (
    <footer className="relative z-10 mt-auto">
      <div className="h-16 relative overflow-hidden">
        <svg
          className="absolute bottom-0 left-0 w-[200%] h-full text-primary/40 animate-[wave_18s_ease-in-out_infinite]"
          viewBox="0 0 2880 120"
          preserveAspectRatio="none"
        >
          <path fill="currentColor" d="M0,50 C240,90 480,20 720,60 C960,100 1200,30 1440,50 C1680,90 1920,20 2160,60 C2400,100 2640,30 2880,50 L2880,120 L0,120 Z" />
        </svg>
        <svg
          className="absolute bottom-0 left-0 w-[200%] h-14 text-primary/60 animate-[wave_12s_ease-in-out_infinite_reverse]"
          viewBox="0 0 2880 120"
          preserveAspectRatio="none"
        >
          <path fill="currentColor" d="M0,80 C360,40 720,90 1080,60 C1440,80 1800,40 2160,90 C2520,60 2700,70 2880,80 L2880,120 L0,120 Z" />
        </svg>
      </div>
      <div className="bg-primary/90 backdrop-blur text-primary-content py-3 px-4">
        <div className="max-w-6xl mx-auto flex flex-wrap items-center justify-center gap-x-6 gap-y-2 text-xs">
          <div className="flex items-center gap-2">
            <Fish className="w-4 h-4" />
            <span className="font-semibold">FishLERS</span>
          </div>
          <span className="text-primary-content/30 hidden sm:inline">|</span>
          <span className="text-primary-content/70">UPV CFOS IA-MSH</span>
          <span className="text-primary-content/30 hidden sm:inline">|</span>
          <span className="text-primary-content/50">Ac {currentYear} Laboratory Equipment Reservation System</span>
        </div>
      </div>
    </footer>
  );
}
