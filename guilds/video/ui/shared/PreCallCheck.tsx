import React, { useState, useEffect, useRef } from 'react';
import { Button, Card } from '@openconnect/ui';
import { Camera, Mic, Wifi, AlertTriangle, CheckCircle2 } from 'lucide-react';

interface PreCallCheckProps {
  onJoin: (deviceIdMap: { video: string; audio: string }) => void;
  onCancel?: () => void;
}

export function PreCallCheck({ onJoin, onCancel }: PreCallCheckProps) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [stream, setStream] = useState<MediaStream | null>(null);
  const [videoDevices, setVideoDevices] = useState<MediaDeviceInfo[]>([]);
  const [audioDevices, setAudioDevices] = useState<MediaDeviceInfo[]>([]);
  
  const [selectedVideoConfig, setSelectedVideoConfig] = useState<string>('');
  const [selectedAudioConfig, setSelectedAudioConfig] = useState<string>('');
  
  const [micLevel, setMicLevel] = useState(0);
  const [bandwidthMbps, setBandwidthMbps] = useState<number | null>(null);
  const [isCheckingBandwidth, setIsCheckingBandwidth] = useState(false);
  
  const [permissionsError, setPermissionsError] = useState<string | null>(null);

  // Audio analyzer refs
  const audioContextRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const animationFrameRef = useRef<number>();

  useEffect(() => {
    // 1. Initial request for generic permissions (triggers the browser prompt)
    const initPermissions = async () => {
      try {
        const initialStream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
        
        // Stop initial generic stream immediately, we just needed it to trigger permissions
        // so that enumerateDevices() returns the labels (device names)
        initialStream.getTracks().forEach(track => track.stop());
        
        // Give the browser a moment to fully release resources before enumerating
        await new Promise(resolve => setTimeout(resolve, 100));
        
        queryDevices();
      } catch (err) {
        console.error("Error accessing media devices.", err);
        setPermissionsError("Please allow camera and microphone access in your browser settings to join the call.");
      }
    };

    initPermissions();
    checkBandwidth();
    
    return () => stopMedia();
  }, []);

  useEffect(() => {
    if (selectedVideoConfig || selectedAudioConfig) {
      startMedia();
    }
  }, [selectedVideoConfig, selectedAudioConfig]);

  const queryDevices = async () => {
    try {
      const devices = await navigator.mediaDevices.enumerateDevices();
      const videos = devices.filter(d => d.kind === 'videoinput');
      const audios = devices.filter(d => d.kind === 'audioinput');
      
      setVideoDevices(videos);
      setAudioDevices(audios);
      
      if (videos.length > 0 && !selectedVideoConfig) setSelectedVideoConfig(videos[0].deviceId);
      if (audios.length > 0 && !selectedAudioConfig) setSelectedAudioConfig(audios[0].deviceId);
    } catch (e) {
      console.error(e);
    }
  };

  const startMedia = async () => {
    try {
      stopMedia();
      // Add a small delay to ensure previous stream is fully released
      await new Promise(resolve => setTimeout(resolve, 100));
      
      const constraints = {
        video: selectedVideoConfig ? { deviceId: { exact: selectedVideoConfig } } : { width: { ideal: 1280 }, height: { ideal: 720 } },
        audio: selectedAudioConfig ? { deviceId: { exact: selectedAudioConfig } } : true,
      };
      
      const newStream = await navigator.mediaDevices.getUserMedia(constraints);
      setStream(newStream);
      
      if (videoRef.current) {
        videoRef.current.srcObject = newStream;
      }
      
      setupAudioVisualizer(newStream);
    } catch (err) {
      console.error("Failed to start media with selected devices:", err);
      setPermissionsError(`Could not access media devices: ${err instanceof Error ? err.message : 'Unknown error'}`);
    }
  };

  const stopMedia = () => {
    if (stream) {
      stream.getTracks().forEach(track => {
        track.stop();
      });
      setStream(null);
    }
    if (videoRef.current) {
      videoRef.current.srcObject = null;
    }
    
    if (animationFrameRef.current) {
      cancelAnimationFrame(animationFrameRef.current);
    }
    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      audioContextRef.current.close().catch(console.error);
    }
    audioContextRef.current = null;
  };

  const setupAudioVisualizer = (currentStream: MediaStream) => {
    // Web Audio API to measure volume level from the mic
    try {
      const audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
      audioContextRef.current = audioCtx;
      const analyser = audioCtx.createAnalyser();
      analyser.fftSize = 256;
      analyserRef.current = analyser;

      const source = audioCtx.createMediaStreamSource(currentStream);
      source.connect(analyser);

      const dataArray = new Uint8Array(analyser.frequencyBinCount);

      const updateLevel = () => {
        if (!analyserRef.current) return;
        analyserRef.current.getByteFrequencyData(dataArray);
        
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
          sum += dataArray[i];
        }
        const average = sum / dataArray.length;
        
        // Normalize to 0-100% roughly
        const level = Math.min(100, Math.round((average / 128) * 100));
        setMicLevel(level);
        
        animationFrameRef.current = requestAnimationFrame(updateLevel);
      };

      updateLevel();
    } catch (err) {
      console.warn("Audio Visualizer API not supported", err);
    }
  };

  const checkBandwidth = async () => {
    setIsCheckingBandwidth(true);
    setBandwidthMbps(null);
    
    try {
      // Small random string to bust cache
      const cacheBuster = `?cb=${Math.random().toString(36).substring(7)}`;
      const startTime = performance.now();
      
      const response = await fetch(`/api/video/bandwidth-test${cacheBuster}`);
      if (!response.ok) throw new Error('Network test failed');
      
      const blob = await response.blob();
      const endTime = performance.now();
      
      const durationSeconds = (endTime - startTime) / 1000;
      const bitsLoaded = blob.size * 8; // 1MB * 8 = 8 Megabits
      const speedBps = bitsLoaded / durationSeconds;
      const speedMbps = +(speedBps / (1024 * 1024)).toFixed(2);
      
      setBandwidthMbps(speedMbps);
    } catch (err) {
      console.error('Bandwidth check error', err);
      // Even if it fails entirely, we might set 0 to show an error
      setBandwidthMbps(0);
    } finally {
      setIsCheckingBandwidth(false);
    }
  };

  const handleJoinClick = () => {
    onJoin({
      video: selectedVideoConfig,
      audio: selectedAudioConfig
    });
  };

  const bandwidthIsPoor = bandwidthMbps !== null && bandwidthMbps < 1.0;
  const isReady = stream !== null && videoDevices.length > 0 && audioDevices.length > 0;

  return (
    <div className="flex flex-col items-center justify-center min-h-[50vh] w-full p-4">
      <Card className="w-full max-w-2xl bg-white shadow-xl rounded-2xl overflow-hidden p-6 gap-6 flex flex-col">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Ready to join?</h2>
          <p className="text-gray-500">Check your camera, microphone, and connection before starting the call.</p>
        </div>

        {permissionsError ? (
          <div className="bg-red-50 text-red-600 p-4 rounded-lg flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 flex-shrink-0 mt-0.5" />
            <p>{permissionsError}</p>
          </div>
        ) : (
          <div className="grid md:grid-cols-2 gap-8">
            {/* Left side: Video Preview */}
            <div className="flex flex-col gap-4">
              <div className="relative aspect-video bg-gray-900 rounded-lg overflow-hidden flex items-center justify-center">
                <video
                  ref={videoRef}
                  autoPlay
                  playsInline
                  muted
                  className="absolute inset-0 w-full h-full object-cover transform -scale-x-100"
                />
                {!stream && <Camera className="text-gray-500 w-12 h-12" />}
                
                {/* Visual Mic Level Overlay */}
                <div className="absolute bottom-4 left-4 right-4 bg-black/50 backdrop-blur rounded p-2 flex items-center gap-2">
                  <Mic className="w-4 h-4 text-white" />
                  <div className="flex-1 h-2 bg-gray-600 rounded-full overflow-hidden">
                    <div 
                      className="h-full bg-green-500 transition-all duration-75"
                      style={{ width: `${micLevel}%` }}
                    />
                  </div>
                </div>
              </div>
            </div>

            {/* Right side: Device Selection & Bandwidth */}
            <div className="flex flex-col gap-6">
              
              {/* Selectors */}
              <div className="space-y-4">
                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Camera</label>
                  <select 
                    className="w-full text-sm rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                    value={selectedVideoConfig}
                    onChange={(e) => setSelectedVideoConfig(e.target.value)}
                  >
                    {videoDevices.map(device => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Camera ${videoDevices.indexOf(device) + 1}`}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="space-y-1">
                  <label className="text-sm font-medium text-gray-700">Microphone</label>
                  <select 
                    className="w-full text-sm rounded-md border-gray-300 shadow-sm p-2 border focus:ring-blue-500 focus:border-blue-500 bg-white text-gray-900"
                    value={selectedAudioConfig}
                    onChange={(e) => setSelectedAudioConfig(e.target.value)}
                  >
                    {audioDevices.map(device => (
                      <option key={device.deviceId} value={device.deviceId}>
                        {device.label || `Microphone ${audioDevices.indexOf(device) + 1}`}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              {/* Bandwidth Result */}
              <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                <div className="flex items-center justify-between mb-2">
                  <div className="flex items-center gap-2 font-medium text-gray-800 text-sm">
                    <Wifi className="w-4 h-4" /> Connection 
                  </div>
                  <button 
                    onClick={checkBandwidth} 
                    disabled={isCheckingBandwidth}
                    className="text-xs text-blue-600 hover:text-blue-800 disabled:opacity-50"
                  >
                    {isCheckingBandwidth ? 'Testing...' : 'Retest'}
                  </button>
                </div>
                
                {isCheckingBandwidth ? (
                  <div className="flex items-center gap-2 text-sm text-gray-500">
                     <span className="w-3 h-3 border-2 border-blue-500 border-t-transparent rounded-full animate-spin"></span>
                     Checking network speed...
                  </div>
                ) : bandwidthMbps !== null ? (
                  <div className={`flex items-start gap-2 text-sm ${bandwidthIsPoor ? 'text-amber-600' : 'text-green-600'}`}>
                    {bandwidthIsPoor ? <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 mt-0.5 flex-shrink-0" />}
                    <div>
                      <span className="font-semibold block">{bandwidthMbps.toFixed(2)} Mbps</span>
                      <span className="text-gray-500 text-xs">
                        {bandwidthIsPoor ? 'Your connection is slow. Video quality may be reduced.' : 'Network looks good for video calls!'}
                      </span>
                    </div>
                  </div>
                ) : null}
              </div>

            </div>
          </div>
        )}

        <div className="flex justify-end gap-3 mt-4 pt-4 border-t border-gray-100">
          {onCancel && (
            <Button variant="secondary" onClick={onCancel}>
              Cancel
            </Button>
          )}
          <Button 
            onClick={handleJoinClick} 
            disabled={!isReady || !!permissionsError}
            className="min-w-[120px]"
          >
            Join Call
          </Button>
        </div>
      </Card>
    </div>
  );
}
