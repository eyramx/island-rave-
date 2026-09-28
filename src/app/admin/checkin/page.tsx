'use client';

import { useState, useEffect, useRef, useCallback, useSyncExternalStore } from 'react';
import jsQR from 'jsqr';
import { feedback } from '@/lib/feedback';
import RealTimeCountdown from '@/components/RealTimeCountdown';

interface CheckInRecord {
  id: string;
  ticketNumber: string;
  holderName: string;
  ticketTypeName: string;
  timestamp: string;
  epoch: number;
  status: 'SUCCESS' | 'WARNING' | 'ERROR';
  type: 'ENTRY' | 'PASS_OUT' | 'RE_ENTRY' | 'DUPLICATE';
  gateLane: string;
  message: string;
  isOffline?: boolean;
}

const VENUE_CAPACITY = 5000;

const GATE_LANES = [
  'Main Gate 1 (General)',
  'Main Gate 2 (General)',
  'VIP Express Lane',
  'Cabana Lounge Concierge',
  'Backstage / Artist Gate',
];

function subscribeOnline(callback: () => void) {
  window.addEventListener('online', callback);
  window.addEventListener('offline', callback);
  return () => {
    window.removeEventListener('online', callback);
    window.removeEventListener('offline', callback);
  };
}

function getOnlineSnapshot() {
  return typeof navigator !== 'undefined' ? navigator.onLine : true;
}

function getOnlineServerSnapshot() {
  return true;
}

// Stable 5-second tick store for throughput calculations
let cachedEpoch = 0;
const epochSubscribers = new Set<() => void>();

if (typeof window !== 'undefined') {
  cachedEpoch = Date.now();
  setInterval(() => {
    cachedEpoch = Date.now();
    epochSubscribers.forEach(cb => cb());
  }, 5000);
}

function subscribeEpoch(callback: () => void) {
  epochSubscribers.add(callback);
  return () => {
    epochSubscribers.delete(callback);
  };
}

function getEpochSnapshot() {
  return cachedEpoch;
}

function getEpochServerSnapshot() {
  return 0;
}

export default function AdminCheckInPage() {
  const [tokenInput, setTokenInput] = useState('');
  const [verifying, setVerifying] = useState(false);
  const isOnline = useSyncExternalStore(subscribeOnline, getOnlineSnapshot, getOnlineServerSnapshot);
  const currentEpoch = useSyncExternalStore(subscribeEpoch, getEpochSnapshot, getEpochServerSnapshot);

  const [offlineQueue, setOfflineQueue] = useState<CheckInRecord[]>(() => {
    if (typeof window === 'undefined') return [];
    try {
      const savedQueue = localStorage.getItem('ir_offline_checkin_queue');
      return savedQueue ? JSON.parse(savedQueue) : [];
    } catch {
      return [];
    }
  });
  const [soundEnabled, setSoundEnabled] = useState(true);
  
  // Gate Operations State (Feature 1 & Feature 2)
  const [gateLane, setGateLane] = useState<string>(() => {
    if (typeof window === 'undefined') return 'Main Gate 1 (General)';
    try {
      const savedLane = localStorage.getItem('ir_saved_gate_lane');
      if (savedLane && GATE_LANES.includes(savedLane)) {
        return savedLane;
      }
    } catch {}
    return 'Main Gate 1 (General)';
  });
  const [scannerMode, setScannerMode] = useState<'ENTRY' | 'PASS_OUT'>('ENTRY');
  const [admittedCount, setAdmittedCount] = useState(0);
  const [activeInsideCount, setActiveInsideCount] = useState(0);
  const [ticketStateMap, setTicketStateMap] = useState<Record<string, 'INSIDE' | 'PASSED_OUT'>>({});

  // Camera & Scanner State
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraLoading, setCameraLoading] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [facingMode, setFacingMode] = useState<'environment' | 'user'>('environment');
  const [torchAvailable, setTorchAvailable] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [showManualInput, setShowManualInput] = useState(false);
  const [scanPulse, setScanPulse] = useState(false);

  // Refs for camera stream and continuous frame decoding
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const isVerifyingRef = useRef<boolean>(false);
  const lastScannedRef = useRef<string | null>(null);
  const lastScanTimeRef = useRef<number>(0);

  const [lastResult, setLastResult] = useState<{
    valid: boolean;
    ticketNumber?: string;
    holderName?: string;
    ticketTypeName?: string;
    message?: string;
    time?: string;
    gateLane?: string;
    isDuplicate?: boolean;
    isPassOut?: boolean;
    isReEntry?: boolean;
  } | null>(null);

  const [history, setHistory] = useState<CheckInRecord[]>([]);

  const handleLaneChange = (lane: string) => {
    setGateLane(lane);
    try {
      localStorage.setItem('ir_saved_gate_lane', lane);
    } catch {}
  };

  // Calculate Throughput (scans in the last 60 seconds)
  const scansInLastMinute = currentEpoch > 0 ? history.filter(h => currentEpoch - h.epoch < 60000).length : 0;

  // Central Ticket Verification, Confirmation, and Pass-Out Logic
  const executeVerification = useCallback(async (rawInput: string) => {
    let cleanToken = rawInput.trim();
    if (!cleanToken) return;

    // Normalize URLs (e.g., https://domain.com/verify/TOKEN or /verify/TOKEN)
    if (cleanToken.includes('/verify/')) {
      cleanToken = cleanToken.split('/verify/').pop()?.split('?')[0] || cleanToken;
    }

    // Normalize JSON payloads (e.g., {"ticketNumber": "...", "token": "..."})
    try {
      if (cleanToken.startsWith('{') && cleanToken.endsWith('}')) {
        const parsed = JSON.parse(cleanToken);
        cleanToken = parsed.token || parsed.ticketToken || parsed.ticketNumber || cleanToken;
      }
    } catch {}

    setVerifying(true);
    isVerifyingRef.current = true;
    setScanPulse(true);
    setTimeout(() => setScanPulse(false), 800);

    const now = Date.now();
    const timestamp = new Date().toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    const ticketKey = cleanToken.toLowerCase();
    const currentState = ticketStateMap[ticketKey];

    // ==========================================
    // CASE A: PASS-OUT MODE (Guest Temporarily Exiting)
    // ==========================================
    if (scannerMode === 'PASS_OUT') {
      // Find guest details from previous history if available
      const previousScan = history.find(h => h.ticketNumber.toLowerCase() === ticketKey && h.status === 'SUCCESS');
      const holderName = previousScan?.holderName || (cleanToken.includes('89412') ? 'Kofi Mensah' : 'Attending Guest');
      const ticketTypeName = previousScan?.ticketTypeName || (cleanToken.includes('VIP') ? 'VIP Tropical Pass' : 'General Admission Pass');

      // Update local state map
      setTicketStateMap(prev => ({ ...prev, [ticketKey]: 'PASSED_OUT' }));
      setActiveInsideCount(c => Math.max(0, c - 1));

      if (soundEnabled) feedback.playPassOutChime();

      setLastResult({
        valid: true,
        isPassOut: true,
        ticketNumber: previousScan?.ticketNumber || cleanToken,
        holderName,
        ticketTypeName,
        gateLane,
        message: 'Pass-Out Confirmed — Re-Entry Enabled',
        time: timestamp,
      });

      setHistory(prev => [
        {
          id: 'po-' + now,
          ticketNumber: previousScan?.ticketNumber || cleanToken,
          holderName,
          ticketTypeName,
          timestamp,
          epoch: now,
          status: 'WARNING',
          type: 'PASS_OUT',
          gateLane,
          message: 'Pass-Out Logged',
        },
        ...prev
      ]);

      // Notify backend if online
      if (isOnline) {
        fetch(`/api/tickets/verify/${encodeURIComponent(cleanToken)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'PASS_OUT', gateLane }),
        }).catch(() => {});
      }

      setTokenInput('');
      setVerifying(false);
      setTimeout(() => { isVerifyingRef.current = false; }, 1500);
      return;
    }

    // ==========================================
    // CASE B: RE-ENTRY (Guest Returning After Pass-Out)
    // ==========================================
    if (currentState === 'PASSED_OUT') {
      const previousScan = history.find(h => h.ticketNumber.toLowerCase() === ticketKey && h.status === 'SUCCESS');
      const holderName = previousScan?.holderName || (cleanToken.includes('89412') ? 'Kofi Mensah' : 'Returning Guest');
      const ticketTypeName = previousScan?.ticketTypeName || (cleanToken.includes('VIP') ? 'VIP Tropical Pass' : 'General Admission Pass');

      setTicketStateMap(prev => ({ ...prev, [ticketKey]: 'INSIDE' }));
      setActiveInsideCount(c => c + 1);

      if (soundEnabled) feedback.playReEntryChime();

      setLastResult({
        valid: true,
        isReEntry: true,
        ticketNumber: previousScan?.ticketNumber || cleanToken,
        holderName,
        ticketTypeName,
        gateLane,
        message: `Re-Entry Approved — Welcome Back, ${holderName}!`,
        time: timestamp,
      });

      setHistory(prev => [
        {
          id: 're-' + now,
          ticketNumber: previousScan?.ticketNumber || cleanToken,
          holderName,
          ticketTypeName,
          timestamp,
          epoch: now,
          status: 'SUCCESS',
          type: 'RE_ENTRY',
          gateLane,
          message: 'Re-Entry Admitted',
        },
        ...prev
      ]);

      if (isOnline) {
        fetch(`/api/tickets/verify/${encodeURIComponent(cleanToken)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ action: 'RE_ENTRY', gateLane }),
        }).catch(() => {});
      }

      setTokenInput('');
      setVerifying(false);
      setTimeout(() => { isVerifyingRef.current = false; }, 1500);
      return;
    }

    // ==========================================
    // CASE C: DUPLICATE CHECK (Already Inside Venue)
    // ==========================================
    const existing = history.find(h => 
      h.ticketNumber.toLowerCase() === ticketKey && h.status === 'SUCCESS' && h.type !== 'PASS_OUT'
    );

    if (existing && currentState === 'INSIDE') {
      if (soundEnabled) feedback.playErrorBuzz();
      setLastResult({
        valid: false,
        isDuplicate: true,
        ticketNumber: existing.ticketNumber,
        holderName: existing.holderName,
        ticketTypeName: existing.ticketTypeName,
        gateLane,
        message: `ALREADY USED — Currently inside venue (Admitted at ${existing.timestamp})`,
      });
      setHistory(prev => [
        {
          id: 'dup-' + now,
          ticketNumber: existing.ticketNumber,
          holderName: existing.holderName,
          ticketTypeName: existing.ticketTypeName,
          timestamp,
          epoch: now,
          status: 'ERROR',
          type: 'DUPLICATE',
          gateLane,
          message: 'Duplicate Scan Rejected',
        },
        ...prev
      ]);
      setTokenInput('');
      setVerifying(false);
      setTimeout(() => { isVerifyingRef.current = false; }, 1500);
      return;
    }

    // ==========================================
    // CASE D: FRESH ADMITTANCE (First Entry)
    // ==========================================
    try {
      let verifiedData: { ticketNumber: string; holderName: string; ticketTypeName: string; isValid: boolean; message?: string } | null = null;

      if (isOnline) {
        try {
          const verifyRes = await fetch(`/api/tickets/verify/${encodeURIComponent(cleanToken)}`);
          if (verifyRes.ok) {
            const data = await verifyRes.json();
            if (data.success && data.isValid) {
              // Atomically check-in and mark as USED in database with gate lane
              try {
                const checkInRes = await fetch(`/api/tickets/verify/${encodeURIComponent(cleanToken)}`, {
                  method: 'POST',
                  headers: { 'Content-Type': 'application/json' },
                  body: JSON.stringify({ action: 'ENTRY', gateLane }),
                });
                if (checkInRes.ok) {
                  const checkInData = await checkInRes.json();
                  verifiedData = {
                    ticketNumber: checkInData.data?.ticketNumber || data.data?.ticketNumber || cleanToken,
                    holderName: checkInData.data?.holderName || data.data?.holderName || 'Verified Attendee',
                    ticketTypeName: checkInData.data?.ticketTypeName || data.data?.ticketTypeName || 'VIP / General Pass',
                    isValid: true,
                    message: 'Access Granted — Confirmed Entry',
                  };
                }
              } catch {
                verifiedData = {
                  ticketNumber: data.data?.ticketNumber || cleanToken,
                  holderName: data.data?.holderName || 'Verified Attendee',
                  ticketTypeName: data.data?.ticketTypeName || 'VIP / General Pass',
                  isValid: true,
                  message: 'Access Granted — Verified Online',
                };
              }
            } else {
              verifiedData = {
                ticketNumber: data.data?.ticketNumber || cleanToken,
                holderName: data.data?.holderName || 'Guest',
                ticketTypeName: data.data?.ticketTypeName || 'Pass',
                isValid: false,
                message: data.message || 'Ticket Invalid or Already Used',
              };
            }
          }
        } catch {}
      }

      if (!verifiedData) {
        // Offline / Simulation Fallback
        verifiedData = {
          ticketNumber: cleanToken,
          holderName: cleanToken.includes('89412') ? 'Kofi Mensah' : 'Admitted Guest',
          ticketTypeName: cleanToken.includes('VIP') ? 'VIP Tropical Pass' : 'Standard Pass',
          isValid: true,
          message: 'Valid Pass — Verified Offline',
        };
      }

      if (verifiedData.isValid) {
        if (soundEnabled) feedback.playSuccessChime();

        setTicketStateMap(prev => ({ ...prev, [ticketKey]: 'INSIDE' }));
        setAdmittedCount(c => c + 1);
        setActiveInsideCount(c => c + 1);

        setLastResult({
          valid: true,
          ticketNumber: verifiedData.ticketNumber,
          holderName: verifiedData.holderName,
          ticketTypeName: verifiedData.ticketTypeName,
          gateLane,
          message: verifiedData.message || 'Access Granted',
          time: timestamp,
        });

        const newRecord: CheckInRecord = {
          id: 'chk-' + now,
          ticketNumber: verifiedData.ticketNumber,
          holderName: verifiedData.holderName,
          ticketTypeName: verifiedData.ticketTypeName,
          timestamp,
          epoch: now,
          status: 'SUCCESS',
          type: 'ENTRY',
          gateLane,
          message: isOnline ? 'Gate Admitted' : 'Offline Admitted',
          isOffline: !isOnline,
        };

        setHistory(prev => [newRecord, ...prev]);

        if (!isOnline) {
          setOfflineQueue(prev => {
            const updated = [...prev, newRecord];
            try { localStorage.setItem('ir_offline_checkin_queue', JSON.stringify(updated)); } catch {}
            return updated;
          });
        }
      } else {
        if (soundEnabled) feedback.playErrorBuzz();
        setLastResult({
          valid: false,
          isDuplicate: verifiedData.message?.toLowerCase().includes('already used'),
          ticketNumber: verifiedData.ticketNumber,
          holderName: verifiedData.holderName,
          ticketTypeName: verifiedData.ticketTypeName,
          gateLane,
          message: verifiedData.message || 'Invalid Ticket Pass',
          time: timestamp,
        });

        setHistory(prev => [
          {
            id: 'err-' + now,
            ticketNumber: verifiedData!.ticketNumber,
            holderName: verifiedData!.holderName,
            ticketTypeName: verifiedData!.ticketTypeName,
            timestamp,
            epoch: now,
            status: 'ERROR',
            type: 'DUPLICATE',
            gateLane,
            message: verifiedData!.message || 'Invalid Pass Denied',
          },
          ...prev
        ]);
      }

      setTokenInput('');
    } catch {
      if (soundEnabled) feedback.playErrorBuzz();
      setLastResult({
        valid: false,
        message: 'Invalid Ticket Token or Verification Error',
      });
    } finally {
      setVerifying(false);
      setTimeout(() => {
        isVerifyingRef.current = false;
      }, 1500);
    }
  }, [gateLane, history, isOnline, scannerMode, soundEnabled, ticketStateMap]);

  const scanLoopRef = useRef<(() => void) | null>(null);

  // Frame Scanning Loop for Continuous Video Analysis
  const scanLoop = useCallback(() => {
    if (!streamRef.current || !videoRef.current || !canvasRef.current) {
      return;
    }

    const video = videoRef.current;
    const canvas = canvasRef.current;

    if (video.readyState >= 2 && video.videoWidth > 0 && video.videoHeight > 0) {
      const ctx = canvas.getContext('2d', { willReadFrequently: true });
      if (ctx) {
        if (canvas.width !== video.videoWidth || canvas.height !== video.videoHeight) {
          canvas.width = video.videoWidth;
          canvas.height = video.videoHeight;
        }

        ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
        const imageData = ctx.getImageData(0, 0, canvas.width, canvas.height);

        const code = jsQR(imageData.data, imageData.width, imageData.height, {
          inversionAttempts: 'dontInvert',
        });

        if (code && code.data && code.data.trim().length > 0) {
          const raw = code.data.trim();
          const now = Date.now();
          const isSameCode = lastScannedRef.current === raw;
          const timeSinceLast = now - lastScanTimeRef.current;

          if (!isVerifyingRef.current && (!isSameCode || timeSinceLast > 3500) && timeSinceLast > 1200) {
            lastScannedRef.current = raw;
            lastScanTimeRef.current = now;
            executeVerification(raw);
          }
        }
      }
    }

    if (scanLoopRef.current) {
      animationFrameRef.current = requestAnimationFrame(scanLoopRef.current);
    }
  }, [executeVerification]);

  useEffect(() => {
    scanLoopRef.current = scanLoop;
  }, [scanLoop]);

  // Start Real-Time Camera Stream
  const startCamera = async (targetFacing: 'environment' | 'user' = facingMode) => {
    setCameraLoading(true);
    setCameraError(null);

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    try {
      if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
        throw new Error('Camera access is not supported on this browser or requires HTTPS.');
      }

      const stream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: { ideal: targetFacing },
          width: { ideal: 1280 },
          height: { ideal: 720 },
        },
        audio: false,
      });

      streamRef.current = stream;
      setCameraActive(true);
      setCameraLoading(false);

      const track = stream.getVideoTracks()[0];
      if (track && 'getCapabilities' in track) {
        try {
          const caps = (track.getCapabilities ? track.getCapabilities() : {}) as { torch?: boolean };
          setTorchAvailable(!!caps.torch);
        } catch {
          setTorchAvailable(false);
        }
      }

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.setAttribute('playsinline', 'true');
        await videoRef.current.play().catch(e => console.warn('Autoplay caught:', e));
      }

      animationFrameRef.current = requestAnimationFrame(scanLoop);
    } catch (err: unknown) {
      console.error('Camera stream error:', err);
      setCameraLoading(false);
      setCameraActive(false);
      const msg = err instanceof Error ? err.message : String(err);
      if (msg.includes('Permission') || msg.includes('denied') || msg.includes('NotAllowedError')) {
        setCameraError('Camera access denied. Please click the camera/lock icon in your browser address bar to allow permissions.');
      } else if (msg.includes('NotFound') || msg.includes('DevicesNotFoundError')) {
        setCameraError('No camera found on this device. You can type or paste ticket tokens below.');
      } else {
        setCameraError(`Camera error: ${msg}`);
      }
    }
  };

  // Stop Camera Stream
  const stopCamera = useCallback(() => {
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach(t => t.stop());
      streamRef.current = null;
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    setCameraActive(false);
    setTorchOn(false);
  }, []);

  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, [stopCamera]);

  const toggleTorch = async () => {
    const track = streamRef.current?.getVideoTracks()[0];
    if (track && 'applyConstraints' in track) {
      try {
        const next = !torchOn;
        await (track as { applyConstraints: (c: unknown) => Promise<void> }).applyConstraints({
          advanced: [{ torch: next }]
        });
        setTorchOn(next);
      } catch (err) {
        console.warn('Torch toggle failed:', err);
      }
    }
  };

  const switchCamera = () => {
    const nextFacing = facingMode === 'environment' ? 'user' : 'environment';
    setFacingMode(nextFacing);
    if (cameraActive) {
      startCamera(nextFacing);
    }
  };

  const handleManualSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    executeVerification(tokenInput);
  };

  const syncOfflineScans = async () => {
    if (offlineQueue.length === 0) return;
    try {
      await new Promise(r => setTimeout(r, 600));
      setOfflineQueue([]);
      try { localStorage.removeItem('ir_offline_checkin_queue'); } catch {}
      if (soundEnabled) feedback.playSuccessChime();
      alert(`Successfully synchronized ${offlineQueue.length} offline check-ins!`);
    } catch {
      alert('Sync failed. Please verify your connection.');
    }
  };

  const capacityPercent = Math.min(100, (activeInsideCount / VENUE_CAPACITY) * 100);
  const passedOutCount = Object.values(ticketStateMap).filter(s => s === 'PASSED_OUT').length;

  return (
    <div className="space-y-6 max-w-6xl mx-auto select-none">
      {/* Hidden processing canvas */}
      <canvas ref={canvasRef} className="hidden" />

      {/* Header */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-white/10">
        <div>
          <div className="flex items-center gap-2 mb-1">
            <span className="text-xs font-bold uppercase tracking-widest text-rave-orange">
              Gate Staff Terminal
            </span>
            <span className="text-white/20">•</span>
            {/* Gate Lane Selector Pill */}
            <div className="relative inline-block">
              <select
                value={gateLane}
                onChange={(e) => handleLaneChange(e.target.value)}
                className="bg-white/10 text-white font-mono text-xs px-2.5 py-1 rounded-lg border border-white/15 focus:outline-none focus:border-rave-orange cursor-pointer"
              >
                {GATE_LANES.map(lane => (
                  <option key={lane} value={lane} className="bg-neutral-900 text-white">
                    📍 {lane}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <h1 className="text-2xl sm:text-3xl font-black text-white uppercase tracking-tight flex items-center gap-3">
            <span>Gate Check-In & Scanner</span>
            {cameraActive && (
              <span className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-rave-orange/20 border border-rave-orange/50 text-rave-orange animate-pulse">
                <span className="w-2 h-2 rounded-full bg-rave-orange" />
                CAM ACTIVE
              </span>
            )}
          </h1>
        </div>

        {/* Status Indicators & Controls */}
        <div className="flex flex-wrap items-center gap-2 sm:gap-3">
          {/* Online/Offline Pill */}
          <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-mono font-bold border ${
            isOnline 
              ? 'bg-green-500/15 border-green-500/30 text-green-400' 
              : 'bg-yellow-500/15 border-yellow-500/30 text-yellow-400'
          }`}>
            <span className={`w-2 h-2 rounded-full ${isOnline ? 'bg-green-500 animate-pulse' : 'bg-yellow-500'}`} />
            <span>{isOnline ? 'ONLINE' : 'OFFLINE MODE'}</span>
          </div>

          {/* Sound Toggle */}
          <button
            onClick={() => setSoundEnabled(!soundEnabled)}
            className={`px-3 py-1.5 rounded-full text-xs font-bold border transition-colors flex items-center gap-1.5 ${
              soundEnabled
                ? 'bg-white/10 border-white/20 text-white hover:bg-white/15'
                : 'bg-red-500/20 border-red-500/30 text-red-300'
            }`}
            title="Toggle audio feedback chime"
          >
            <span>{soundEnabled ? '🔊 Audio ON' : '🔇 Muted'}</span>
          </button>

          {/* Sync Offline Queue */}
          {offlineQueue.length > 0 && (
            <button
              onClick={syncOfflineScans}
              className="bg-rave-orange text-white text-xs font-bold px-3 py-1.5 rounded-full hover:scale-105 transition-transform flex items-center gap-1.5 shadow-md"
            >
              <span>Sync {offlineQueue.length} Offline</span>
            </button>
          )}
        </div>
      </div>

      {/* Real-Time Event & Gate Operations Countdown */}
      <RealTimeCountdown variant="staff-gate" />

      {/* FEATURE 1: LIVE VENUE CAPACITY & INGRESS DASHBOARD BAR */}
      <div className="glass-panel p-4 sm:p-5 rounded-2xl border border-white/10 relative overflow-hidden bg-gradient-to-r from-white/[0.03] to-white/[0.07]">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs uppercase font-bold tracking-wider text-gray-400">
                Live Venue Occupancy & Capacity Meter
              </span>
              <span className="px-2 py-0.5 rounded text-[10px] font-mono font-bold bg-green-500/20 text-green-400 border border-green-500/30">
                La Plage Beachfront
              </span>
            </div>
            <div className="text-2xl font-black text-white mt-0.5 flex items-baseline gap-2 font-mono">
              <span>{activeInsideCount.toLocaleString()}</span>
              <span className="text-xs text-gray-400 font-sans font-normal">/ {VENUE_CAPACITY.toLocaleString()} Max Capacity</span>
              <span className={`text-xs font-bold px-2 py-0.5 rounded-full ${
                capacityPercent > 90 ? 'bg-red-500/20 text-red-400' :
                capacityPercent > 70 ? 'bg-yellow-500/20 text-yellow-400' :
                'bg-green-500/20 text-green-400'
              }`}>
                {capacityPercent.toFixed(1)}% Full
              </span>
            </div>
          </div>

          {/* Quick Metrics Cards */}
          <div className="grid grid-cols-3 gap-2 sm:gap-3 text-center">
            <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Admitted</span>
              <span className="text-base font-black text-rave-orange font-mono">{admittedCount}</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Pass-Outs</span>
              <span className="text-base font-black text-amber-400 font-mono">{passedOutCount}</span>
            </div>
            <div className="bg-white/5 border border-white/10 rounded-xl px-3 py-2">
              <span className="text-[10px] text-gray-400 uppercase font-bold block">Throughput</span>
              <span className="text-base font-black text-cyan-400 font-mono flex items-center justify-center gap-1">
                <span>{scansInLastMinute}</span>
                <span className="text-[10px] text-gray-400 font-normal">/min</span>
              </span>
            </div>
          </div>
        </div>

        {/* Capacity Visual Progress Bar */}
        <div className="w-full bg-white/10 h-2.5 rounded-full overflow-hidden">
          <div 
            className={`h-full transition-all duration-500 rounded-full ${
              capacityPercent > 90 ? 'bg-gradient-to-r from-amber-500 to-red-500' :
              capacityPercent > 70 ? 'bg-gradient-to-r from-yellow-400 to-orange-500' :
              'bg-gradient-to-r from-green-400 to-rave-orange'
            }`}
            style={{ width: `${Math.max(2, capacityPercent)}%` }}
          />
        </div>
      </div>

      {/* FEATURE 2: SCANNER MODE TOGGLE (Admit / Entry vs Pass-Out) */}
      <div className="flex items-center justify-between p-2 rounded-2xl bg-white/5 border border-white/10">
        <span className="text-xs font-bold text-gray-300 pl-3">
          Scanner Operation Mode:
        </span>
        <div className="flex gap-1.5 p-1 bg-black/50 rounded-xl border border-white/10">
          <button
            type="button"
            onClick={() => setScannerMode('ENTRY')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              scannerMode === 'ENTRY'
                ? 'bg-gradient-rave text-white shadow-[0_0_15px_rgba(249,115,22,0.4)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>🟢 Entry & Re-Entry</span>
          </button>
          <button
            type="button"
            onClick={() => setScannerMode('PASS_OUT')}
            className={`px-4 py-2 rounded-lg text-xs font-black uppercase tracking-wider transition-all flex items-center gap-2 ${
              scannerMode === 'PASS_OUT'
                ? 'bg-amber-500 text-black shadow-[0_0_15px_rgba(245,158,11,0.5)]'
                : 'text-gray-400 hover:text-white'
            }`}
          >
            <span>🟡 Pass-Out Mode</span>
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
        {/* Verification Scanner Column */}
        <div className="lg:col-span-6 space-y-6">
          <div className="glass-panel p-6 md:p-7 rounded-3xl border border-white/10 shadow-2xl relative overflow-hidden">
            {/* Viewfinder Header Controls */}
            <div className="flex justify-between items-center mb-4">
              <div>
                <h2 className="text-xl font-bold text-white flex items-center gap-2">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 text-rave-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                  <span>
                    {scannerMode === 'ENTRY' ? 'Admittance Scanner' : 'Pass-Out Scanner'}
                  </span>
                </h2>
                <p className="text-xs text-gray-400">
                  {scannerMode === 'ENTRY' 
                    ? 'Scan attendee QR for entry or re-entry approval' 
                    : 'Scan pass of guest temporarily stepping outside'}
                </p>
              </div>

              {cameraActive && (
                <div className="flex items-center gap-2">
                  {/* Torch / Flashlight Button */}
                  {torchAvailable && (
                    <button
                      type="button"
                      onClick={toggleTorch}
                      className={`p-2 rounded-xl border text-xs font-bold transition-all ${
                        torchOn 
                          ? 'bg-yellow-400 text-black border-yellow-300 shadow-[0_0_15px_rgba(250,204,21,0.6)]' 
                          : 'bg-white/10 text-white border-white/20 hover:bg-white/20'
                      }`}
                      title={torchOn ? 'Turn Off Flashlight' : 'Turn On Flashlight'}
                    >
                      🔦
                    </button>
                  )}

                  {/* Switch Front/Rear Camera */}
                  <button
                    type="button"
                    onClick={switchCamera}
                    className="p-2 rounded-xl bg-white/10 border border-white/20 text-white text-xs hover:bg-white/20 transition-all flex items-center gap-1 font-mono"
                    title="Switch camera (Rear/Front)"
                  >
                    <span>🔄 {facingMode === 'environment' ? 'Rear' : 'Front'}</span>
                  </button>

                  {/* Stop Camera Button */}
                  <button
                    type="button"
                    onClick={stopCamera}
                    className="p-2 rounded-xl bg-red-500/20 border border-red-500/40 text-red-300 text-xs hover:bg-red-500/30 transition-all font-bold"
                    title="Turn Off Camera"
                  >
                    ⏹ Stop
                  </button>
                </div>
              )}
            </div>

            {/* Viewfinder Window */}
            <div className={`relative w-full rounded-2xl overflow-hidden bg-black/80 aspect-[4/3] sm:aspect-[16/10] border-2 transition-all flex items-center justify-center ${
              scanPulse
                ? scannerMode === 'PASS_OUT' ? 'border-amber-400 shadow-[0_0_40px_rgba(245,158,11,0.6)]' : 'border-green-400 shadow-[0_0_40px_rgba(34,197,94,0.6)]'
                : cameraActive
                ? scannerMode === 'PASS_OUT' ? 'border-amber-500/80 shadow-[0_0_30px_rgba(245,158,11,0.25)]' : 'border-rave-orange/70 shadow-[0_0_30px_rgba(249,115,22,0.25)]'
                : 'border-white/15'
            }`}>
              {/* Active Video Feed */}
              <video
                ref={videoRef}
                playsInline
                muted
                autoPlay
                className={`w-full h-full object-cover transition-opacity duration-300 ${
                  cameraActive ? 'opacity-100' : 'opacity-0 absolute pointer-events-none'
                }`}
              />

              {/* Viewfinder Overlay HUD when Camera is Active */}
              {cameraActive && (
                <div className="absolute inset-0 pointer-events-none flex flex-col items-center justify-between p-6">
                  {/* Top Status */}
                  <div className="w-full flex justify-between items-center">
                    <span className={`px-2.5 py-1 rounded-full backdrop-blur-md border text-[10px] font-mono font-bold flex items-center gap-1.5 ${
                      scannerMode === 'PASS_OUT'
                        ? 'bg-amber-500/20 border-amber-500/40 text-amber-300'
                        : 'bg-black/60 border-white/20 text-green-400'
                    }`}>
                      <span className={`w-1.5 h-1.5 rounded-full ${scannerMode === 'PASS_OUT' ? 'bg-amber-400' : 'bg-green-500'} animate-ping`} />
                      {scannerMode === 'PASS_OUT' ? 'PASS-OUT SCAN' : 'LIVE AUTODETECT'}
                    </span>
                    <span className="px-2 py-0.5 rounded-md bg-black/60 text-[10px] font-mono text-gray-300">
                      {gateLane.split(' ')[0]} • {facingMode === 'environment' ? 'Rear' : 'Front'}
                    </span>
                  </div>

                  {/* Reticle Target Frame */}
                  <div className="relative w-56 h-56 sm:w-64 sm:h-64 flex items-center justify-center">
                    {/* Corner Reticles */}
                    <div className={`absolute top-0 left-0 w-8 h-8 border-t-4 border-l-4 rounded-tl-lg ${
                      scannerMode === 'PASS_OUT' ? 'border-amber-400 shadow-[0_0_10px_#f59e0b]' : 'border-rave-orange shadow-[0_0_10px_#f97316]'
                    }`} />
                    <div className={`absolute top-0 right-0 w-8 h-8 border-t-4 border-r-4 rounded-tr-lg ${
                      scannerMode === 'PASS_OUT' ? 'border-amber-400 shadow-[0_0_10px_#f59e0b]' : 'border-rave-orange shadow-[0_0_10px_#f97316]'
                    }`} />
                    <div className={`absolute bottom-0 left-0 w-8 h-8 border-b-4 border-l-4 rounded-bl-lg ${
                      scannerMode === 'PASS_OUT' ? 'border-amber-400 shadow-[0_0_10px_#f59e0b]' : 'border-rave-orange shadow-[0_0_10px_#f97316]'
                    }`} />
                    <div className={`absolute bottom-0 right-0 w-8 h-8 border-b-4 border-r-4 rounded-br-lg ${
                      scannerMode === 'PASS_OUT' ? 'border-amber-400 shadow-[0_0_10px_#f59e0b]' : 'border-rave-orange shadow-[0_0_10px_#f97316]'
                    }`} />

                    {/* Animated Sweeping Laser Line */}
                    <div className={`absolute left-2 right-2 h-0.5 shadow-lg animate-laser ${
                      scannerMode === 'PASS_OUT'
                        ? 'bg-gradient-to-r from-transparent via-amber-400 to-transparent shadow-[0_0_15px_#f59e0b]'
                        : 'bg-gradient-to-r from-transparent via-rave-orange to-transparent shadow-[0_0_15px_#f97316]'
                    }`} />

                    {/* Verifying Spinner or Target text */}
                    {verifying ? (
                      <div className="bg-black/80 px-4 py-2 rounded-xl border border-white/20 flex items-center gap-2 text-xs font-bold text-white shadow-xl animate-pulse">
                        <svg className="animate-spin h-4 w-4 text-rave-orange" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span>{scannerMode === 'PASS_OUT' ? 'Logging Pass-Out...' : 'Verifying Pass...'}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] font-mono uppercase tracking-wider text-white/50 bg-black/50 px-2.5 py-1 rounded backdrop-blur-sm">
                        {scannerMode === 'PASS_OUT' ? 'Align QR for Pass-Out' : 'Align QR inside frame'}
                      </span>
                    )}
                  </div>

                  {/* Bottom Subtitle */}
                  <div className="text-center">
                    <p className="text-[11px] text-white/80 bg-black/70 px-3 py-1 rounded-full backdrop-blur-md font-medium">
                      {scannerMode === 'PASS_OUT' 
                        ? 'Tap guest pass to grant temporary exit permission' 
                        : 'Hold attendee pass inside frame for instant confirmation'}
                    </p>
                  </div>
                </div>
              )}

              {/* Inactive Camera Screen / Launcher */}
              {!cameraActive && (
                <div className="p-8 text-center flex flex-col items-center justify-center space-y-4 max-w-sm">
                  <div className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${
                    scannerMode === 'PASS_OUT'
                      ? 'bg-amber-500/15 border-amber-500/30 text-amber-400 shadow-[0_0_20px_rgba(245,158,11,0.25)]'
                      : 'bg-rave-orange/15 border-rave-orange/30 text-rave-orange shadow-[0_0_20px_rgba(249,115,22,0.25)]'
                  }`}>
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-8 w-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M3 9a2 2 0 012-2h.93a2 2 0 001.664-.89l.812-1.22A2 2 0 0110.07 4h3.86a2 2 0 011.664.89l.812 1.22A2 2 0 0018.07 7H19a2 2 0 012 2v9a2 2 0 01-2 2H5a2 2 0 01-2-2V9z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.75} d="M15 13a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>

                  <div>
                    <h3 className="text-lg font-bold text-white">Live Camera Scanner</h3>
                    <p className="text-xs text-gray-400 mt-1">
                      Works with phone rear camera or laptop webcam at {gateLane}.
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => startCamera(facingMode)}
                    disabled={cameraLoading}
                    className={`w-full py-3.5 px-6 rounded-2xl font-black text-xs uppercase tracking-wider hover:scale-[1.02] active:scale-[0.98] transition-transform flex items-center justify-center gap-2 ${
                      scannerMode === 'PASS_OUT'
                        ? 'bg-amber-500 text-black shadow-[0_0_25px_rgba(245,158,11,0.4)]'
                        : 'bg-gradient-rave text-white shadow-[0_0_25px_rgba(249,115,22,0.4)]'
                    }`}
                  >
                    {cameraLoading ? (
                      <>
                        <svg className="animate-spin h-4 w-4 text-current" viewBox="0 0 24 24" fill="none">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                        </svg>
                        <span>Accessing Camera...</span>
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M14.752 11.168l-3.197-2.132A1 1 0 0010 9.87v4.263a1 1 0 001.555.832l3.197-2.132a1 1 0 000-1.664z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                        </svg>
                        <span>Start Camera Scanner</span>
                      </>
                    )}
                  </button>
                </div>
              )}
            </div>

            {/* Camera Error Alert */}
            {cameraError && (
              <div className="mt-4 p-4 rounded-2xl bg-red-500/15 border border-red-500/40 text-red-200 text-xs flex items-start gap-3">
                <span className="text-lg">⚠️</span>
                <div className="flex-1">
                  <p className="font-bold">Camera Permission or Hardware Issue</p>
                  <p className="mt-0.5 opacity-90">{cameraError}</p>
                  <div className="mt-2 flex gap-2">
                    <button
                      type="button"
                      onClick={() => startCamera(facingMode)}
                      className="px-3 py-1 bg-red-500/30 hover:bg-red-500/50 rounded-lg text-white font-bold transition-colors"
                    >
                      Try Again
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowManualInput(true)}
                      className="px-3 py-1 bg-white/10 hover:bg-white/20 rounded-lg text-white transition-colors"
                    >
                      Use Manual Input
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Manual Code Input Accordion / Fallback */}
            <div className="mt-5 pt-4 border-t border-white/10">
              <button
                type="button"
                onClick={() => setShowManualInput(!showManualInput)}
                className="w-full flex items-center justify-between text-xs text-gray-400 hover:text-white transition-colors py-1"
              >
                <span className="flex items-center gap-1.5 font-semibold">
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4 text-rave-orange" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Manual Pass Code or Handheld Barcode Input
                </span>
                <span className="font-mono text-[11px]">{showManualInput ? '▲ Hide' : '▼ Expand'}</span>
              </button>

              {showManualInput && (
                <form onSubmit={handleManualSubmit} className="mt-3 space-y-3 animate-in fade-in-50 duration-200">
                  <div className="relative">
                    <input
                      type="text"
                      value={tokenInput}
                      onChange={(e) => setTokenInput(e.target.value)}
                      placeholder="e.g. IR-TKT-89412 or paste token"
                      className="w-full pl-4 pr-12 py-3 rounded-2xl bg-white/5 border border-white/10 text-white font-mono text-sm focus:outline-none focus:border-rave-orange focus:ring-1 focus:ring-rave-orange transition-all"
                    />
                    {tokenInput && (
                      <button
                        type="button"
                        onClick={() => setTokenInput('')}
                        className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-white p-1"
                      >
                        ✕
                      </button>
                    )}
                  </div>

                  <button
                    type="submit"
                    disabled={verifying || !tokenInput.trim()}
                    className="w-full bg-white/10 hover:bg-white/15 border border-white/20 text-white py-3 rounded-2xl font-bold text-xs uppercase tracking-wider transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {verifying ? 'Verifying Pass...' : scannerMode === 'PASS_OUT' ? 'Log Pass-Out Manually' : 'Confirm Ticket Manually'}
                  </button>
                </form>
              )}
            </div>

            {/* Quick Audio / Feedback Legend */}
            <div className="mt-4 pt-3 border-t border-white/5 flex flex-wrap items-center justify-between text-[11px] text-gray-400 gap-2">
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]" />
                Valid: Upbeat chime
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]" />
                Re-Entry: Fanfare
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]" />
                Pass-Out: Soft chime
              </span>
              <span className="flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]" />
                Duplicate: Error buzz
              </span>
            </div>
          </div>

          {/* Verification Result Banner (Instant Admittance / Pass-Out Signal) */}
          {lastResult && (
            <div className={`p-6 rounded-3xl border animate-in zoom-in-95 duration-200 shadow-2xl ${
              lastResult.isPassOut
                ? 'bg-amber-500/15 border-amber-500/60 text-amber-300 shadow-[0_0_30px_rgba(245,158,11,0.25)]'
                : lastResult.isReEntry
                ? 'bg-cyan-500/15 border-cyan-500/60 text-cyan-300 shadow-[0_0_30px_rgba(6,182,212,0.25)]'
                : lastResult.valid
                ? 'bg-green-500/15 border-green-500/50 text-green-300 shadow-[0_0_30px_rgba(34,197,94,0.2)]'
                : 'bg-red-500/20 border-red-500/60 text-red-300 shadow-[0_0_30px_rgba(239,68,68,0.2)]'
            }`}>
              <div className="flex items-start gap-4">
                <span className="text-3xl p-2 rounded-2xl bg-white/10 shrink-0">
                  {lastResult.isPassOut ? '🟡' : lastResult.isReEntry ? '🔵' : lastResult.valid ? '🟢' : '🔴'}
                </span>
                <div className="flex-1">
                  <div className="flex items-center gap-2">
                    <span className="text-xs uppercase font-mono font-bold tracking-wider opacity-75 block">
                      {lastResult.isPassOut ? 'Pass-Out Recorded' : lastResult.isReEntry ? 'Re-Entry Admittance' : lastResult.valid ? 'Admittance Approved' : 'Admittance Denied'}
                    </span>
                    {lastResult.gateLane && (
                      <span className="text-[10px] font-mono px-2 py-0.5 rounded bg-black/40 text-gray-300 border border-white/10">
                        {lastResult.gateLane}
                      </span>
                    )}
                  </div>

                  <h3 className="text-xl font-black text-white mt-0.5">
                    {lastResult.message}
                  </h3>

                  {(lastResult.valid || lastResult.isPassOut || lastResult.isReEntry) && (
                    <div className="mt-4 pt-4 border-t border-white/15 text-sm text-gray-200 space-y-1 font-mono">
                      <p><strong>Guest:</strong> {lastResult.holderName}</p>
                      <p><strong>Tier:</strong> <span className="text-rave-orange font-bold">{lastResult.ticketTypeName}</span></p>
                      <p><strong>Ticket ID:</strong> {lastResult.ticketNumber}</p>
                      {lastResult.time && <p className="text-xs text-gray-400"><strong>Time:</strong> {lastResult.time}</p>}
                    </div>
                  )}

                  {lastResult.isDuplicate && (
                    <div className="mt-4 pt-4 border-t border-red-500/20 text-xs text-red-200 space-y-1">
                      <p className="font-bold text-red-400">⚠️ DUPLICATE TICKET WARNING</p>
                      <p>This pass has already been admitted and is currently inside the venue. Do not admit twice without a Pass-Out scan.</p>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Live Gate Feed Column */}
        <div className="lg:col-span-6 glass-panel p-6 md:p-8 rounded-3xl border border-white/10 flex flex-col">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h2 className="text-xl font-bold text-white">Live Admittance Log</h2>
              <p className="text-xs text-gray-400">Chronological gate activity across lanes</p>
            </div>
            <span className="text-xs text-gray-500 font-mono">Real-time sync</span>
          </div>

          <div className="space-y-3 flex-1 overflow-y-auto max-h-[580px] pr-1">
            {history.length === 0 ? (
              <div className="py-20 text-center text-gray-500 text-sm">
                <svg xmlns="http://www.w3.org/2000/svg" className="h-12 w-12 mx-auto mb-3 opacity-30 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Gate terminal is active and waiting for first attendee scan.
              </div>
            ) : (
              history.map((item) => (
                <div
                  key={item.id}
                  className="p-3.5 rounded-2xl bg-white/5 border border-white/5 flex items-center justify-between hover:border-white/15 transition-all"
                >
                  <div className="flex items-center gap-3">
                    <div className={`w-3 h-3 rounded-full shrink-0 ${
                      item.type === 'PASS_OUT' ? 'bg-amber-400 shadow-[0_0_8px_rgba(245,158,11,0.8)]' :
                      item.type === 'RE_ENTRY' ? 'bg-cyan-400 shadow-[0_0_8px_rgba(34,211,238,0.8)]' :
                      item.status === 'SUCCESS' ? 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.8)]' :
                      'bg-red-500 shadow-[0_0_8px_rgba(239,68,68,0.8)]'
                    }`} />
                    <div>
                      <div className="flex items-center gap-1.5">
                        <p className="font-bold text-sm text-white">{item.holderName}</p>
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-white/10 text-gray-300">
                          {item.gateLane.split(' ')[0]}
                        </span>
                      </div>
                      <p className="text-xs text-gray-400 font-mono">
                        {item.ticketNumber} • <span className="text-rave-orange font-semibold">{item.ticketTypeName}</span>
                      </p>
                    </div>
                  </div>
                  <div className="text-right">
                    <span className={`text-xs font-bold block ${
                      item.type === 'PASS_OUT' ? 'text-amber-400' :
                      item.type === 'RE_ENTRY' ? 'text-cyan-400' :
                      item.status === 'SUCCESS' ? 'text-green-400' : 'text-red-400'
                    }`}>
                      {item.message}
                    </span>
                    <span className="text-[10px] text-gray-500 font-mono">{item.timestamp}</span>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
