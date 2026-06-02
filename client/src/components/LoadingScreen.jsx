import { Flame } from "lucide-react";
import { useEffect, useState } from "react";

export default function LoadingScreen({
  loading,
  text = "Initializing Server",
  children,
}) {
  const [progress, setProgress] = useState(0);
  const [showContent, setShowContent] = useState(false);

  useEffect(() => {
    let timers = [];

    if (loading) {
      setShowContent(false);
      setProgress(0);

      timers.push(setTimeout(() => setProgress(20), 100));
      timers.push(setTimeout(() => setProgress(60), 2000));
      timers.push(setTimeout(() => setProgress(90), 4000));
    } else {
      setProgress(100);

      timers.push(
        setTimeout(() => {
          setShowContent(true);
        }, 500)
      );
    }

    return () => timers.forEach(clearTimeout);
  }, [loading]);

  if (showContent) {
    return children;
  }

  return (
    <div className="fixed inset-0 bg-slate-950 flex items-center justify-center">
      <div className="w-full max-w-md px-6">
        <div className="flex flex-col items-center gap-5">
          {/* Logo */}
          <div className="flex items-center justify-center h-16 w-16 rounded-xl bg-indigo-500 text-white shadow-lg shadow-indigo-500/30">
            <Flame size={30} fill="white" />
          </div>

          {/* Text */}
          <div className="text-slate-300 text-sm font-medium">
            {text}
          </div>

          {/* Progress Bar */}
          <div className="w-full h-2 bg-slate-800 rounded-full overflow-hidden">
            <div
              className="h-full bg-indigo-500 transition-all duration-500 linear"
              style={{
                width: `${progress}%`,
              }}
            />
          </div>

          {/* Percentage */}
          <div className="text-xs text-slate-500">
            {Math.round(progress)}%
          </div>
        </div>
      </div>
    </div>
  );
}