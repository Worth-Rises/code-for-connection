import React, { useState, useEffect, useRef, useCallback } from "react";
import { Routes, Route } from "react-router-dom";
import { Card, CardContent, CardHeader, Button, Modal, LoadingSpinner } from "@openconnect/ui";
import { Device, Call } from "@twilio/voice-sdk";
import {
  formatDuration,
  statusIcon,
  formatDate,
  statusLabel,
  API_BASE
} from "../shared";
import { useAuthHeader, useFetch } from "../hooks";
import { ApprovedContact, FamilyMemberInfo} from "../types";

const MAX_CALL_DURATION_SECONDS = 70; // 30 minutes

interface VoiceCallRecord {
  id: string;
  status: string;
  startedAt: string;
  connectedAt?: string;
  endedAt?: string;
  durationSeconds?: number;
  endedBy?: string;
  familyMember?: {
    firstName: string;
    lastName: string;
    phone: string;
  };
}

// ==========================================
// Helpers
// ==========================================

function formatPhone(phone: string): string {
  const digits = phone.replace(/\D/g, "");
  if (digits.length === 10) {
    return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
  }
  if (digits.length === 11 && digits[0] === "1") {
    return `+1 (${digits.slice(1, 4)}) ${digits.slice(4, 7)}-${digits.slice(7)}`;
  }
  return phone;
}

// ==========================================
// Active Call Screen (Full-screen overlay)
// ==========================================

interface ActiveCallProps {
  contact: ApprovedContact;
  device: Device | null;
  onCallEnded: () => void;
}

function ActiveCallScreen({ contact, device, onCallEnded }: ActiveCallProps) {
  const [callState, setCallState] = useState<
    "connecting" | "ringing" | "connected" | "ended" | "error"
  >("connecting");
  const [callId, setCallId] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const [errorMsg, setErrorMsg] = useState("");
  const [isMuted, setIsMuted] = useState(false);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const startTimeRef = useRef<number>(Date.now());
  const twilioCallRef = useRef<Call | null>(null);
  const callIdRef = useRef<string | null>(null);
  const pollIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const warningAudioRef = useRef<HTMLAudioElement | null>(null);
  const warningPlayedRef = useRef(false);

  const { authHeader } = useAuthHeader();

  const headers = { 
    "Content-Type": "application/json",
    ...authHeader,
  } 

  // Keep callIdRef in sync with callId state
  useEffect(() => {
    callIdRef.current = callId;
  }, [callId]);

  // Prepare 1-minute warning audio (provide this asset in public/sounds)
  useEffect(() => {
    warningAudioRef.current = new Audio("/sounds/one-minute-warning.mp3");
  }, []);

  // Listen for the incoming conference call from Twilio and auto-accept
  useEffect(() => {
    if (!device) return;

    const handleIncoming = (incomingCall: Call) => {
      console.log(
        "[voice-ui] Incoming conference call received, auto-accepting",
      );
      incomingCall.accept();
      twilioCallRef.current = incomingCall;

      incomingCall.on("disconnect", () => {
        console.log(
          "[voice-ui] Twilio call disconnected (remote hangup or conference ended)",
        );
        // Release the mic/speakers
        if (device) {
          try {
            device.disconnectAll();
          } catch (e) {
            /* ignore */
          }
        }
        // Notify the server so DB status is updated (fallback for when no PUBLIC_URL callback)
        const cid = callIdRef.current;
        if (cid) {
          fetch(`${API_BASE}/users/end-call/${cid}?endedBy=receiver`, {
            method: "POST",
            headers,
          }).catch(() => {
            /* best effort */
          });
        }
        // Stop polling if still active
        if (pollIntervalRef.current) {
          clearInterval(pollIntervalRef.current);
          pollIntervalRef.current = null;
        }
        setCallState("ended");
      });

      incomingCall.on("error", (err: Error) => {
        console.error("[voice-ui] Twilio call error:", err);
        setCallState("error");
        setErrorMsg(err.message || "Call connection error");
      });
    };

    device.on("incoming", handleIncoming);
    return () => {
      device.removeListener("incoming", handleIncoming);
      // Ensure mic is released when this screen unmounts
      try {
        device.disconnectAll();
      } catch (e) {
        /* ignore */
      }
    };
  }, [device]);

  // Keep device in a ref so the startCall effect doesn't re-run when it changes
  const deviceRef = useRef(device);
  deviceRef.current = device;

  // Initiate call
  useEffect(() => {
    const abortController = new AbortController();

    async function startCall() {
      try {
        setCallState("connecting");

        // Wait up to 5 seconds for the device to be ready
        let d = deviceRef.current;
        for (let i = 0; i < 10 && !d; i++) {
          await new Promise((r) => setTimeout(r, 500));
          if (abortController.signal.aborted) return;
          d = deviceRef.current;
        }
        if (!d) {
          setCallState("error");
          setErrorMsg("Voice device not ready. Please refresh and try again.");
          return;
        }

        console.log("[voice-ui] Initiating call for contact", contact.id);

        // Tell the backend to create the conference and add both participants
        console.log(contact.id);
        const resp = await fetch(`${API_BASE}/users/initiate-call`, {
          method: "POST",
          headers,
          body: JSON.stringify({ contactId: contact.id}),
          signal: abortController.signal,
        });
        const data = (await resp.json()) as {
          success: boolean;
          data?: { id: string; conferenceName: string };
          error?: { message: string };
        };

        if (abortController.signal.aborted) return;

        if (!resp.ok || !data.success) {
          // 409 = server dedup caught a duplicate request, first call is already in progress
          if (resp.status === 409) {
            console.log(
              "[voice-ui] Duplicate call blocked by server (409), ignoring",
            );
            return;
          }
          setCallState("error");
          setErrorMsg(data.error?.message || "Failed to connect call");
          return;
        }

        const newCallId = data.data!.id;
        setCallId(newCallId);
        // Tablet is in conference, phone is ringing — show Ringing
        setCallState("ringing");

        // Poll for phone answer
        const pollInterval = setInterval(async () => {
          if (abortController.signal.aborted) {
            clearInterval(pollInterval);
            pollIntervalRef.current = null;
            return;
          }
          try {
            const statusResp = await fetch(
              `${API_BASE}/users/call-status/${newCallId}`,
              {
                headers,
                signal: abortController.signal,
              },
            );
            const statusData = (await statusResp.json()) as {
              success: boolean;
              data?: { phoneAnswered: boolean };
            };
            if (statusData.success && statusData.data?.phoneAnswered) {
              clearInterval(pollInterval);
              pollIntervalRef.current = null;
              setCallState("connected");
              startTimeRef.current = Date.now();
            }
          } catch {
            // Ignore poll errors (e.g. abort)
          }
        }, 1000);
        pollIntervalRef.current = pollInterval;

        // Store the interval so cleanup can clear it
        abortController.signal.addEventListener("abort", () => {
          clearInterval(pollInterval);
          pollIntervalRef.current = null;
        });
      } catch (err) {
        // Ignore abort errors
        if (err instanceof DOMException && err.name === "AbortError") return;
        setCallState("error");
        setErrorMsg("Network error — could not reach the server");
      }
    }

    startCall();
    return () => {
      abortController.abort();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [contact.id]);

  const handleEndCall = useCallback(async () => {
    if (timerRef.current) clearInterval(timerRef.current);

    // Disconnect the browser Twilio call
    if (twilioCallRef.current) {
      try {
        twilioCallRef.current.disconnect();
      } catch (e) {
        /* ignore */
      }
      twilioCallRef.current = null;
    }

    // Also try device.disconnectAll() as a fallback
    if (device) {
      try {
        device.disconnectAll();
      } catch (e) {
        /* ignore */
      }
    }

    // Tell the backend to end both legs of the conference
    if (callId) {
      try {
        await fetch(`${API_BASE}/users/end-call/${callId}`, {
          method: "POST",
          headers,
        });
      } catch {
        // Best effort
      }
    }

    setCallState("ended");

    setTimeout(onCallEnded, 1500);
  }, [callId, onCallEnded]);

  // Timer + auto-end at max duration
  useEffect(() => {
    if (callState === "connected") {
      timerRef.current = setInterval(() => {
        const e = Math.floor((Date.now() - startTimeRef.current) / 1000);
        setElapsed(e);

        if (e >= MAX_CALL_DURATION_SECONDS) {
          if (timerRef.current) clearInterval(timerRef.current);
          handleEndCall();
        }
      }, 1000);
    }
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
    };
  }, [callState, handleEndCall]);

  // 1-minute remaining audio warning
  useEffect(() => {
    if (callState !== "connected") return;

    const remaining = MAX_CALL_DURATION_SECONDS - elapsed;

    if (!warningPlayedRef.current && remaining === 60) {
      warningPlayedRef.current = true;
      warningAudioRef.current?.play().catch(() => {
        // Ignore autoplay or missing-file errors
      });
    }
  }, [elapsed, callState]);

  const handleToggleMute = useCallback(() => {
    if (twilioCallRef.current) {
      const newMuted = !isMuted;
      twilioCallRef.current.mute(newMuted);
      setIsMuted(newMuted);
    }
  }, [isMuted]);

  const contactName = `${contact.familyMember.firstName} ${contact.familyMember.lastName}`;

  return (
    <div
      className="fixed inset-0 z-50 flex flex-col items-center justify-center"
      style={{
        background:
          "linear-gradient(135deg, #1e3a5f 0%, #0f1f3a 50%, #0a1628 100%)",
      }}
    >
      {/* Animated background rings */}
      <div className="absolute inset-0 flex items-center justify-center pointer-events-none overflow-hidden">
        {callState === "connected" && (
          <>
            <div
              className="absolute w-64 h-64 rounded-full border border-blue-400 opacity-20 animate-ping"
              style={{ animationDuration: "3s" }}
            />
            <div
              className="absolute w-80 h-80 rounded-full border border-blue-300 opacity-10 animate-ping"
              style={{ animationDuration: "4s" }}
            />
          </>
        )}
        {(callState === "connecting" || callState === "ringing") && (
          <div
            className="absolute w-48 h-48 rounded-full border-2 border-yellow-400 opacity-30 animate-ping"
            style={{ animationDuration: "1.5s" }}
          />
        )}
      </div>

      {/* Content */}
      <div className="relative z-10 flex flex-col items-center text-white px-6">
        {/* Avatar */}
        <div className="w-28 h-28 rounded-full bg-gradient-to-br from-blue-400 to-blue-600 flex items-center justify-center text-5xl font-bold shadow-2xl mb-6 border-4 border-white/20">
          {contact.familyMember.firstName[0]}
          {contact.familyMember.lastName[0]}
        </div>

        {/* Name & Relationship */}
        <h2 className="text-3xl font-bold mb-2">{contactName}</h2>
        <p className="text-blue-200 text-2xl font-medium mb-8">{contact.relationship}</p>

        {/* Status */}
        {callState === "connecting" && (
          <div className="flex flex-col items-center mb-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
              <span className="text-yellow-300 text-xl font-medium">Getting your call ready…</span>
            </div>
            <LoadingSpinner size="sm" />
          </div>
        )}

        {callState === "ringing" && (
          <div className="flex flex-col items-center mb-10">
            <div className="flex items-center gap-2 mb-2">
              <div className="w-3 h-3 bg-yellow-400 rounded-full animate-pulse" />
              <span className="text-yellow-300 text-xl font-medium">
                Ringing…
              </span>
            </div>
          </div>
        )}

        {callState === 'connected' && (() => {
          const remaining = MAX_CALL_DURATION_SECONDS - elapsed;
          const progress = Math.max(0, Math.min(1, remaining / MAX_CALL_DURATION_SECONDS));
          const barColor = remaining <= 60 ? 'bg-amber-400' : 'bg-blue-400';
          const barBg = remaining <= 60 ? 'bg-amber-900/30' : 'bg-white/10';

          return (
            <div className="flex flex-col items-center mb-10 w-full max-w-sm">
              <div className="flex items-center gap-2 mb-3">
                <div className="w-3 h-3 bg-green-400 rounded-full animate-pulse" />
                <span className="text-green-300 text-lg">Connected</span>
              </div>
              <span className="text-5xl font-mono font-light tracking-wider text-white tabular-nums mb-4">
                {formatDuration(remaining > 0 ? remaining : 0)}
              </span>
              <p className="text-blue-200/60 text-sm mb-3">time remaining</p>

              {/* Warm progress bar */}
              <div className={`w-full h-2 rounded-full ${barBg} overflow-hidden`}>
                <div
                  className={`h-full rounded-full ${barColor} transition-all duration-1000 ease-linear`}
                  style={{ width: `${progress * 100}%` }}
                />
              </div>

              {remaining <= 60 && remaining > 0 && (
                <p className="text-amber-300 text-base font-medium mt-3">
                  Less than a minute left
                </p>
              )}
              {remaining <= 0 && (
                <p className="text-amber-300 text-base font-medium mt-3">
                  Time is up
                </p>
              )}
            </div>
          );
        })()}

        {callState === "ended" && (
          <div className="flex flex-col items-center mb-10">
            <span className="text-gray-300 text-xl mb-2">Call Ended</span>
            <span className="text-2xl font-mono text-gray-400">
              {formatDuration(elapsed)}
            </span>
          </div>
        )}

        {callState === "error" && (
          <div className="flex flex-col items-center mb-10 max-w-sm">
            <div className="bg-red-500/20 border border-red-400/30 rounded-xl px-6 py-4 text-center">
              <span className="text-red-300 text-lg block mb-1">Couldn't connect</span>
              <p className="text-red-200/70 text-sm">{errorMsg}</p>
            </div>
          </div>
        )}

        {/* Controls — iPhone-style circular buttons with labels */}
        <div className="flex items-center gap-12">
          {callState === 'connected' && (
            <button
              onClick={handleToggleMute}
              className="flex flex-col items-center gap-2 group"
            >
              <div className={`w-20 h-20 rounded-full flex items-center justify-center transition-all duration-200 active:scale-95 overflow-hidden ${isMuted
                ? 'bg-white/90 border border-white/90'
                : 'bg-white/15 border border-white/30 hover:bg-white/25'
                }`}
              >
                {isMuted ? (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="#1e3a5f" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <line x1="1" y1="1" x2="23" y2="23" />
                    <path d="M9 9v3a3 3 0 0 0 5.12 2.12M15 9.34V4a3 3 0 0 0-5.94-.6" />
                    <path d="M17 16.95A7 7 0 0 1 5 12v-2m14 0v2c0 .76-.13 1.49-.35 2.17" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                ) : (
                  <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z" />
                    <path d="M19 10v2a7 7 0 0 1-14 0v-2" />
                    <line x1="12" y1="19" x2="12" y2="23" />
                    <line x1="8" y1="23" x2="16" y2="23" />
                  </svg>
                )}
              </div>
              <span className={`text-lg font-bold ${isMuted ? 'text-white' : 'text-white/80'}`}>
                {isMuted ? 'Unmute' : 'Mute'}
              </span>
            </button>
          )}

          {(callState === "connecting" ||
            callState === "ringing" ||
            callState === "connected") && (
            <button
              onClick={handleEndCall}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-20 h-20 rounded-full bg-red-600 hover:bg-red-700 flex items-center justify-center shadow-lg shadow-red-900/50 transition-all duration-200 active:scale-95 overflow-hidden">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="white">
                  <path d="M12 9c-1.6 0-3.15.25-4.6.72v3.1c0 .39-.23.74-.56.9-.98.49-1.87 1.12-2.66 1.85-.18.18-.43.28-.7.28-.28 0-.53-.11-.71-.29L.29 13.08a.956.956 0 0 1-.29-.7c0-.28.11-.53.29-.71C3.34 8.78 7.46 7 12 7s8.66 1.78 11.71 4.67c.18.18.29.43.29.71 0 .28-.11.53-.29.71l-2.48 2.48c-.18.18-.43.29-.71.29-.27 0-.52-.11-.7-.28a11.27 11.27 0 0 0-2.67-1.85.996.996 0 0 1-.56-.9v-3.1C15.15 9.25 13.6 9 12 9z" />
                </svg>
              </div>
              <span className="text-lg font-bold text-white/80">End</span>
            </button>
          )}

          {(callState === "ended" || callState === "error") && (
            <button
              onClick={onCallEnded}
              className="flex flex-col items-center gap-2 group"
            >
              <div className="w-20 h-20 rounded-full bg-white/15 border border-white/30 hover:bg-white/25 flex items-center justify-center transition-all duration-200 active:scale-95">
                <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="19" y1="12" x2="5" y2="12" />
                  <polyline points="12 19 5 12 12 5" />
                </svg>
              </div>
              <span className="text-lg font-bold text-white/80">Back</span>
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

// ==========================================
// Contact Card
// ==========================================

interface ContactCardProps {
  contact: ApprovedContact;
  onCall: (contact: ApprovedContact) => void;
  disabled?: boolean;
}

function ContactCard({ contact, onCall, disabled }: ContactCardProps) {
  const { familyMember, relationship, isAttorney } = contact;
  const initials = `${familyMember.firstName[0]}${familyMember.lastName[0]}`;

  return (
    <div className="flex items-center justify-between bg-white rounded-xl border border-gray-200 px-5 py-4 shadow-sm hover:shadow-md transition-shadow">
      <div className="flex items-center gap-4">
        <div className="w-14 h-14 rounded-full bg-gradient-to-br from-blue-500 to-indigo-600 flex items-center justify-center text-white text-lg font-bold shadow-inner">
          {initials}
        </div>
        <div>
          <h3 className="text-lg font-semibold text-gray-900">
            {familyMember.firstName} {familyMember.lastName}
          </h3>
          <p className="text-sm text-gray-500">
            {relationship}
            {isAttorney && (
              <span className="ml-2 px-2 py-0.5 bg-purple-100 text-purple-700 rounded-full text-xs font-medium">
                Attorney
              </span>
            )}
          </p>
          <p className="text-sm text-gray-400 mt-0.5">
            {formatPhone(familyMember.phone)}
          </p>
        </div>
      </div>
      <button
        onClick={() => onCall(contact)}
        disabled={disabled}
        className="w-14 h-14 rounded-full bg-green-500 hover:bg-green-600 active:bg-green-700 flex items-center justify-center text-white text-2xl shadow-lg shadow-green-200 transition-all duration-150 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed"
        title={`Call ${familyMember.firstName}`}
      >
        📞
      </button>
    </div>
  );
}

// ==========================================
// Call History Item
// ==========================================

interface CallHistoryItemProps {
  call: VoiceCallRecord;
}

function CallHistoryItem({ call }: CallHistoryItemProps) {
  const name = call.familyMember
    ? `${call.familyMember.firstName} ${call.familyMember.lastName}`
    : "Unknown";

  return (
    <div className="flex items-center justify-between py-3 px-4 border-b border-gray-100 last:border-0">
      <div className="flex items-center gap-3">
        <span className="text-xl">{statusIcon(call.status)}</span>
        <div>
          <p className="text-sm font-medium text-gray-900">{name}</p>
          <p className="text-xs text-gray-400">{formatDate(call.startedAt)}</p>
        </div>
      </div>
      <div className="text-right">
        <p className="text-sm text-gray-600">
          {call.durationSeconds != null
            ? formatDuration(call.durationSeconds)
            : "—"}
        </p>
        <p className="text-xs text-gray-400">{statusLabel(call.status)}</p>
      </div>
    </div>
  );
}

// ==========================================
// Main Voice Home Screen
// ==========================================

function VoiceHome() {

  const {
      data: contactsData,
      isLoading: loadingContacts,
      error: contactsError,
    } = useFetch<ApprovedContact[]>(`${API_BASE}/users/contacts`);

    const {
      data: hotlinesData,
      isLoading: loadingHotlines,
      error: hotlinesError,
    } = useFetch<FamilyMemberInfo[]>(`${API_BASE}/users/hotlines`);

    const {
      data: callHistoryData,
      isLoading: loadingHistory,
      error: callHistoryError,
      refetch: refetchCallHistory,
    } = useFetch<VoiceCallRecord[]>(
      `${API_BASE}/call-logs?pageSize=10`,
    );

  const [activeCall, setActiveCall] = useState<ApprovedContact | null>(null);
  const [error, setError] = useState(""); // Ensure we're authenticated and have the token available
  const { authHeader } = useAuthHeader();
    const headers = { 
    "Content-Type": "application/json",
    ...authHeader,
  } 

  // Twilio Device state
  const [twilioDevice, setTwilioDevice] = useState<Device | null>(null);
  const [deviceReady, setDeviceReady] = useState(false);
  const [deviceError, setDeviceError] = useState("");

  // Initialize Twilio Device with access token (incoming calls only, no TwiML App)
  useEffect(() => {
    let cancelled = false;

    async function initDevice() {
      try {
        const resp = await fetch(`${API_BASE}/users/token`, {
          headers,
        });
        const data = await resp.json();

        if (cancelled) return;

        if (!resp.ok || !data.success) {
          setDeviceError("Could not initialize voice — token error");
          return;
        }

        const device = new Device(data.data.token, {
          codecPreferences: [Call.Codec.Opus, Call.Codec.PCMU],
          logLevel: 1,
        });

        device.on("registered", () => {
          if (!cancelled) setDeviceReady(true);
        });

        device.on("error", (err: Error) => {
          console.error("Twilio Device error:", err);
          if (!cancelled) setDeviceError(`Voice device error: ${err.message}`);
        });

        device.register();
        setTwilioDevice(device);
      } catch (err) {
        if (!cancelled) setDeviceError("Failed to initialize voice device");
      }
    }

    initDevice();
    return () => {
      cancelled = true;
      // Destroy device to release connections and remove listeners
      if (twilioDevice) {
        try {
          twilioDevice.destroy();
        } catch {
          /* ignore */
        }
      }
    };
  }, []);


  const handleCallEnded = useCallback(() => {
    setActiveCall(null);
    refetchCallHistory();
  }, []);

  if (activeCall) {
    return (
      <ActiveCallScreen
        contact={activeCall}
        device={twilioDevice}
        onCallEnded={handleCallEnded}
      />
    );
  }

  return (
    <div className="space-y-6 max-w-2xl mx-auto">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Voice Calls</h1>
          <p className="text-sm text-gray-500 mt-1">
            Tap a contact to start a call
          </p>
        </div>
        <div className="flex items-center gap-2">
          <div
            className={`w-3 h-3 rounded-full ${deviceReady ? "bg-green-400" : "bg-yellow-400 animate-pulse"}`}
          />
          <span className="text-xs text-gray-400">
            {deviceReady ? "Ready" : "Connecting…"}
          </span>
        </div>
      </div>

      {/* Device error */}
      {deviceError && (
        <div className="bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 text-amber-700 text-sm">
          ⚠️ {deviceError}
        </div>
      )}

      {/* Error */}
      {error && (
        <div className="bg-red-50 border border-red-200 rounded-xl px-4 py-3 text-red-700 text-sm">
          {error}
        </div>
      )}

      {/* Contact List */}
      <div>
        {/* Speed Dial section - use ContactCard for consistent appearance */}
        <div className="mb-4">
          <h3 className="text-sm font-semibold text-gray-700 mb-2">Speed Dial</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">

        {loadingHotlines? (
          <Card padding="lg">
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          </Card>
        ) : hotlinesData?.length === 0 ? (
          <Card padding="lg">
            <div className="text-center py-8">
              <span className="text-5xl block mb-4">📋</span>
              <p className="text-gray-500">No approved hotlines yet.</p>
              <p className="text-sm text-gray-400 mt-1">
                Ask your facility to approve hotlines for calling.
              </p>
            </div>
          </Card>
        ) : (
          <div>
            {hotlinesData?.map((hotline) => (
              <ContactCard
                key={hotline.id}
                contact={{
                  isAttorney: false,
                  relationship: hotline.firstName,
                  id: hotline.id,
                  familyMember: hotline,
                }}
                onCall={setActiveCall}
                disabled={!deviceReady}
              />
            ))}
          </div>
        )}
          </div>
        </div>

        <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span>👥</span> Approved Contacts
        </h2>

        {loadingContacts ? (
          <Card padding="lg">
            <div className="flex justify-center py-8">
              <LoadingSpinner size="lg" />
            </div>
          </Card>
        ) : contactsData?.length === 0 ? (
          <Card padding="lg">
            <div className="text-center py-8">
              <span className="text-5xl block mb-4">📋</span>
              <p className="text-gray-500">No approved contacts yet.</p>
              <p className="text-sm text-gray-400 mt-1">
                Ask your facility to approve contacts for calling.
              </p>
            </div>
          </Card>
        ) : (
          <div className="space-y-3">
            {contactsData?.map((c) => (
              <ContactCard
                key={c.id}
                contact={c}
                onCall={setActiveCall}
                disabled={!deviceReady}
              />
            ))}
          </div>
        )}
      </div>

      {/* Call History */}
      <div>
        <h2 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
          <span>🕐</span> Recent Calls
        </h2>

        {loadingHistory ? (
          <Card padding="md">
            <div className="flex justify-center py-6">
              <LoadingSpinner size="md" />
            </div>
          </Card>
        ) : callHistoryData?.length === 0 ? (
          <Card padding="md">
            <div className="text-center py-6">
              <p className="text-gray-500 text-sm">
                No calls yet. Make your first call above!
              </p>
            </div>
          </Card>
        ) : (
          <Card padding="none">
            {callHistoryData?.map((call) => (
              <CallHistoryItem key={call.id} call={call} />
            ))}
          </Card>
        )}
      </div>
    </div>
  );
}

// ==========================================
// Router wrapper
// ==========================================

export default function VoiceIncarcerated() {
  return (
    <Routes>
      <Route index element={<VoiceHome />} />
    </Routes>
  );
}
