import { useEffect, useRef, useState } from "react";
import { Volume2, VolumeX, Zap } from "lucide-react";

interface VoiceFeedbackProps {
  isListening?: boolean;
  isMuted?: boolean;
  audioLevel?: number;
}

/**
 * Visual audio level indicator component
 * Shows real-time microphone input levels during voice recording
 */
export function AudioLevelIndicator({ audioLevel = 0 }: { audioLevel: number }) {
  const bars = 10;
  const activeBar = Math.ceil((audioLevel / 100) * bars);

  return (
    <div className="flex items-center gap-1">
      {Array.from({ length: bars }).map((_, i) => (
        <div
          key={i}
          className={`w-1 rounded-full transition-all duration-75 ${
            i < activeBar
              ? "bg-gradient-to-t from-cyan-500 to-cyan-400 h-6"
              : "bg-slate-700 h-2"
          }`}
        />
      ))}
    </div>
  );
}

/**
 * Animated listening indicator
 */
export function ListeningIndicator() {
  return (
    <div className="flex items-center gap-2">
      <div className="relative w-3 h-3">
        <div className="absolute inset-0 bg-red-500 rounded-full animate-pulse" />
        <div className="absolute inset-0 bg-red-500 rounded-full animate-ping" />
      </div>
      <span className="text-xs font-semibold text-red-400">Listening...</span>
    </div>
  );
}

/**
 * Voice waveform visualization
 */
interface VoiceWaveformProps {
  isActive?: boolean;
  frequency?: number;
}

export function VoiceWaveform({ isActive = false, frequency = 0 }: VoiceWaveformProps) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const animationRef = useRef<number | undefined>(undefined);
  const [wave, setWave] = useState<number[]>(Array(50).fill(0.5));

  useEffect(() => {
    if (!canvasRef.current || !isActive) return;

    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    const drawWaveform = (): void => {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.strokeStyle = "#06b6d4";
      ctx.lineWidth = 2;
      ctx.beginPath();

      const points = wave.length;
      const width = canvas.width;
      const height = canvas.height;
      const centerY = height / 2;

      for (let i = 0; i < points; i++) {
        const x = (i / points) * width;
        const y = centerY + Math.sin((i / points) * Math.PI * 4 + frequency) * (wave[i] * centerY * 0.8);

        if (i === 0) {
          ctx.moveTo(x, y);
        } else {
          ctx.lineTo(x, y);
        }
      }

      ctx.stroke();
      animationRef.current = requestAnimationFrame(drawWaveform) as unknown as number;
    };

    // Update wave data
    const interval = setInterval(() => {
      setWave((prev) => {
        const newWave = [...prev];
        newWave.shift();
        newWave.push(Math.random() * 0.5 + 0.3);
        return newWave;
      });
    }, 50);

    drawWaveform();

    return () => {
      clearInterval(interval);
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
      }
    };
  }, [isActive, frequency, wave]);

  return (
    <canvas
      ref={canvasRef}
      width={300}
      height={60}
      className={`w-full rounded ${isActive ? "opacity-100" : "opacity-50"}`}
    />
  );
}

/**
 * Microphone status indicator
 */
interface MicrophoneStatusProps {
  status: "idle" | "listening" | "processing" | "error";
  message?: string;
}

export function MicrophoneStatus({ status, message }: MicrophoneStatusProps) {
  const statusConfig = {
    idle: {
      icon: Volume2,
      color: "text-slate-400",
      bgColor: "bg-slate-500/20",
      label: "Ready",
    },
    listening: {
      icon: Volume2,
      color: "text-red-400",
      bgColor: "bg-red-500/20",
      label: "Listening",
    },
    processing: {
      icon: Zap,
      color: "text-cyan-400",
      bgColor: "bg-cyan-500/20",
      label: "Processing",
    },
    error: {
      icon: VolumeX,
      color: "text-red-400",
      bgColor: "bg-red-500/20",
      label: "Error",
    },
  };

  const config = statusConfig[status];
  const Icon = config.icon;

  return (
    <div className={`flex items-center gap-2 px-3 py-2 rounded ${config.bgColor}`}>
      <Icon className={`w-4 h-4 ${config.color}`} />
      <span className={`text-sm font-medium ${config.color}`}>
        {message || config.label}
      </span>
    </div>
  );
}

/**
 * Voice transcription progress indicator
 */
interface TranscriptionProgressProps {
  progress: number;
  isActive?: boolean;
}

export function TranscriptionProgress({ progress, isActive }: TranscriptionProgressProps) {
  return (
    <div className="space-y-2">
      <div className="flex justify-between items-center">
        <span className="text-xs text-slate-400">Transcription</span>
        <span className="text-xs text-cyan-400">{Math.round(progress)}%</span>
      </div>
      <div className="w-full h-1 bg-slate-700 rounded-full overflow-hidden">
        <div
          className={`h-full bg-gradient-to-r from-cyan-500 to-cyan-400 rounded-full transition-all duration-300 ${
            isActive ? "animate-pulse" : ""
          }`}
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}

/**
 * Voice input feedback component
 * Combines multiple visual indicators for voice interaction
 */
export function VoiceInputFeedback({
  isListening = false,
  isMuted = false,
  audioLevel = 0,
}: VoiceFeedbackProps) {
  return (
    <div className="space-y-4 bg-slate-800/30 border border-cyan-500/20 rounded-lg p-4">
      {/* Status */}
      <MicrophoneStatus
        status={isListening ? "listening" : "idle"}
        message={isMuted ? "Muted" : isListening ? "Listening..." : "Ready"}
      />

      {/* Audio Level */}
      {isListening && (
        <div className="space-y-2">
          <span className="text-xs text-slate-400">Audio Level</span>
          <AudioLevelIndicator audioLevel={audioLevel} />
        </div>
      )}

      {/* Waveform */}
      {isListening && (
        <div className="space-y-2">
          <span className="text-xs text-slate-400">Voice Waveform</span>
          <VoiceWaveform isActive={isListening} frequency={audioLevel / 100} />
        </div>
      )}

      {/* Transcription Progress */}
      {isListening && (
        <TranscriptionProgress progress={audioLevel} isActive={true} />
      )}
    </div>
  );
}
