import React, { useRef, useState, useEffect } from 'react';
import { Camera, X, RefreshCw, CheckCircle2, AlertCircle, Sparkles } from 'lucide-react';

interface CameraModalProps {
  isOpen: boolean;
  onClose: () => void;
  onCapture: (base64Image: string) => void;
  title?: string;
  facingMode?: 'user' | 'environment';
}

export const CameraModal: React.FC<CameraModalProps> = ({
  isOpen,
  onClose,
  onCapture,
  title = 'Take Photo',
  facingMode = 'user'
}) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [currentFacingMode, setCurrentFacingMode] = useState<'user' | 'environment'>(facingMode);
  const [error, setError] = useState<string>('');
  const [capturedPhoto, setCapturedPhoto] = useState<string | null>(null);
  const [isCameraActive, setIsCameraActive] = useState<boolean>(false);

  // Start Camera Stream
  const startCamera = async (mode: 'user' | 'environment') => {
    try {
      setError('');
      setIsCameraActive(false);

      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }

      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        setError('Camera is not supported on this browser or connection. Please upload a file instead.');
        return;
      }

      const newStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: mode,
          width: { ideal: 1280 },
          height: { ideal: 720 }
        },
        audio: false
      });

      setStream(newStream);
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
        videoRef.current.play();
        setIsCameraActive(true);
      }
    } catch (err: any) {
      console.error('Camera access error:', err);
      if (err.name === 'NotAllowedError' || err.name === 'PermissionDeniedError') {
        setError('Camera permission was denied. Please allow camera access in your browser settings.');
      } else if (err.name === 'NotFoundError' || err.name === 'DevicesNotFoundError') {
        setError('No camera found on this device.');
      } else {
        setError('Could not access camera. Please allow camera permissions.');
      }
    }
  };

  useEffect(() => {
    if (isOpen) {
      setCapturedPhoto(null);
      startCamera(currentFacingMode);
    } else {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
        setStream(null);
      }
    }

    return () => {
      if (stream) {
        stream.getTracks().forEach(track => track.stop());
      }
    };
  }, [isOpen, currentFacingMode]);

  // Flip Camera (Front / Back)
  const toggleFacingMode = () => {
    const nextMode = currentFacingMode === 'user' ? 'environment' : 'user';
    setCurrentFacingMode(nextMode);
  };

  // Capture Snapshot
  const handleSnap = () => {
    if (!videoRef.current || !canvasRef.current) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;

    canvas.width = video.videoWidth || 640;
    canvas.height = video.videoHeight || 480;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Flip horizontally if front camera for mirror effect
    if (currentFacingMode === 'user') {
      ctx.translate(canvas.width, 0);
      ctx.scale(-1, 1);
    }

    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    const dataUrl = canvas.toDataURL('image/jpeg', 0.85);
    setCapturedPhoto(dataUrl);

    // Stop stream to save battery
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const handleRetake = () => {
    setCapturedPhoto(null);
    startCamera(currentFacingMode);
  };

  const handleConfirm = () => {
    if (capturedPhoto) {
      onCapture(capturedPhoto);
      onClose();
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-60 flex items-center justify-center bg-navy-950/90 backdrop-blur-md p-4 animate-fade-in">
      <div className="w-full max-w-sm bg-slate-900 rounded-3xl shadow-2xl overflow-hidden flex flex-col border border-sky-400/40">
        
        {/* Top Header */}
        <div className="p-4 bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 text-white flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Camera className="w-5 h-5 text-sky-200" />
            <h3 className="text-xs font-black uppercase tracking-wider">{title}</h3>
          </div>
          <button onClick={onClose} className="p-1 rounded-full text-sky-200 hover:text-white hover:bg-white/10">
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Viewfinder Area */}
        <div className="relative aspect-3/4 bg-black flex items-center justify-center overflow-hidden">
          {error ? (
            <div className="p-6 text-center text-white space-y-2">
              <AlertCircle className="w-10 h-10 text-rose-400 mx-auto" />
              <p className="text-xs font-bold text-rose-300">{error}</p>
              <button
                onClick={() => startCamera(currentFacingMode)}
                className="mt-2 px-4 py-2 bg-white/20 hover:bg-white/30 text-white text-xs font-bold rounded-xl transition"
              >
                Try Again
              </button>
            </div>
          ) : capturedPhoto ? (
            <img src={capturedPhoto} alt="Captured" className="w-full h-full object-cover" />
          ) : (
            <>
              <video
                ref={videoRef}
                autoPlay
                playsInline
                muted
                className={`w-full h-full object-cover ${currentFacingMode === 'user' ? 'scale-x-[-1]' : ''}`}
              />
              {/* Target Outline Box */}
              <div className="absolute inset-8 border-2 border-dashed border-sky-400/70 rounded-3xl pointer-events-none flex items-center justify-center">
                <span className="text-[10px] text-sky-300 font-bold bg-navy-950/70 px-3 py-1 rounded-full backdrop-blur-xs">
                  Center portrait here
                </span>
              </div>
            </>
          )}

          {/* Hidden Canvas */}
          <canvas ref={canvasRef} className="hidden" />
        </div>

        {/* Controls Footer */}
        <div className="p-4 bg-slate-950 flex items-center justify-between gap-3">
          {!capturedPhoto ? (
            <>
              <button
                type="button"
                onClick={toggleFacingMode}
                className="p-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-sky-300 transition"
                title="Switch Camera"
              >
                <RefreshCw className="w-5 h-5" />
              </button>

              {/* Shutter Button */}
              <button
                type="button"
                onClick={handleSnap}
                disabled={!isCameraActive}
                className="w-16 h-16 rounded-full border-4 border-white bg-gradient-to-r from-sky-400 to-blue-500 hover:from-sky-300 hover:to-blue-400 active:scale-95 shadow-lg shadow-sky-500/40 flex items-center justify-center transition disabled:opacity-50"
              >
                <div className="w-6 h-6 rounded-full bg-white" />
              </button>

              <button
                type="button"
                onClick={onClose}
                className="p-3.5 rounded-2xl bg-white/10 hover:bg-white/20 text-slate-300 text-xs font-bold transition"
              >
                Cancel
              </button>
            </>
          ) : (
            <div className="flex gap-2 w-full">
              <button
                type="button"
                onClick={handleRetake}
                className="flex-1 py-3 bg-white/15 hover:bg-white/25 text-white text-xs font-bold rounded-xl transition"
              >
                Retake
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                className="flex-1 py-3 bg-gradient-to-r from-sky-500 via-blue-600 to-indigo-600 text-white text-xs font-black rounded-xl shadow-md transition flex items-center justify-center gap-1.5"
              >
                <CheckCircle2 className="w-4 h-4" /> Use Photo
              </button>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
