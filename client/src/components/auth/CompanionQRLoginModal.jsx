import React, { useState, useEffect, useRef } from "react";
import { QRCodeSVG } from "qrcode.react";
import { io } from "socket.io-client";
import axios from "axios";
import { useDispatch } from "react-redux";
import { useNavigate } from "react-router-dom";
import { setUser, initE2EEKeys } from "../../redux/slices/authSlice";
import { CHAT_ROUTES } from "../../routes/routes";
import { generateE2EEKeyPair, saveSessionPrivateKey, saveSessionPublicKey } from "../../lib/e2ee";
import { QrCode, MonitorSmartphone, X, RefreshCw, CheckCircle2, ShieldCheck, AlertCircle, Copy, Check } from "lucide-react";
import { createPortal } from "react-dom";

export default function CompanionQRLoginModal({ isOpen, onClose }) {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [pairingData, setPairingData] = useState(null);
  const [error, setError] = useState(null);
  const [pairedSuccess, setPairedSuccess] = useState(false);
  const [copiedCode, setCopiedCode] = useState(false);
  const [timeLeft, setTimeLeft] = useState(180);

  const socketRef = useRef(null);
  const pollTimerRef = useRef(null);
  const generatedKeyPairRef = useRef(null);

  // Generate ephemeral keys and initiate pairing session on backend
  const initPairing = async () => {
    try {
      setLoading(true);
      setError(null);
      setPairedSuccess(false);

      // Generate a fresh key pair for this companion browser
      const keyPair = await generateE2EEKeyPair();
      generatedKeyPairRef.current = keyPair;

      const userAgent = navigator.userAgent;
      let browser = "Browser";
      if (userAgent.includes("Chrome")) browser = "Chrome";
      else if (userAgent.includes("Firefox")) browser = "Firefox";
      else if (userAgent.includes("Safari")) browser = "Safari";
      else if (userAgent.includes("Edge")) browser = "Edge";

      let os = "Desktop";
      if (userAgent.includes("Win")) os = "Windows";
      else if (userAgent.includes("Mac")) os = "macOS";
      else if (userAgent.includes("Linux")) os = "Linux";
      else if (userAgent.includes("Android")) os = "Android";
      else if (userAgent.includes("iPhone") || userAgent.includes("iPad")) os = "iOS";

      const res = await axios.post(`${import.meta.env.VITE_API_URL}/auth/companion/init`, {
        publicKey: keyPair.publicKeyString,
        os,
        browser,
      });

      const { pairingId, pairingCode, expiresAt } = res.data;
      setPairingData({ pairingId, pairingCode, expiresAt });
      setTimeLeft(180);

      // Connect pairing socket
      if (socketRef.current) {
        socketRef.current.disconnect();
      }

      const socketUrl =
        import.meta.env.VITE_BACKEND_URL ||
        import.meta.env.VITE_API_URL?.replace(/\/api$/, "") ||
        "http://localhost:3000";
      const socket = io(socketUrl, {
        withCredentials: true,
        query: { pairingId },
        transports: ["websocket", "polling"],
      });
      socketRef.current = socket;

      socket.on("companion_approved", (data) => {
        handleApprovalSuccess(data, pairingId);
      });

      // Start fallback polling every 2.5 seconds
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      pollTimerRef.current = setInterval(async () => {
        try {
          const pollRes = await axios.get(
            `${import.meta.env.VITE_API_URL}/auth/companion/status/${pairingId}`,
            { withCredentials: true }
          );
          if (pollRes.data.status === "approved") {
            handleApprovalSuccess(pollRes.data, pairingId);
          } else if (pollRes.data.status === "expired") {
            setError("Pairing session expired. Please refresh the QR code.");
            clearInterval(pollTimerRef.current);
          }
        } catch (err) {
          // ignore transient poll errors
        }
      }, 2500);

    } catch (err) {
      console.error("Failed to initialize companion pairing:", err);
      setError("Failed to create pairing session. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  const handleApprovalSuccess = async (data, pairingId) => {
    if (pairedSuccess) return;
    setPairedSuccess(true);
    if (pollTimerRef.current) clearInterval(pollTimerRef.current);
    if (socketRef.current) socketRef.current.disconnect();

    let user = data?.user;

    // ALWAYS call HTTP claim endpoint with credentials so browser sets the auth cookie!
    try {
      const claimRes = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/companion/claim`,
        { pairingId },
        { withCredentials: true }
      );
      if (claimRes.data?.user) {
        user = claimRes.data.user;
      }
    } catch (err) {
      console.warn("Claim endpoint call had warning/error (continuing with socket payload):", err);
    }

    // Save this session's private and public keys in keyStore
    if (user?.sessionId && generatedKeyPairRef.current) {
      saveSessionPrivateKey(user.sessionId, generatedKeyPairRef.current.privateKeyString);
      saveSessionPublicKey(user.sessionId, generatedKeyPairRef.current.publicKeyString);
    }

    // If existing device transferred an unencrypted private key directly:
    if (user?.transferredKeyPayload) {
      if (user.sessionId) {
        saveSessionPrivateKey(user.sessionId, user.transferredKeyPayload);
      }
      if (user.username) {
        localStorage.setItem(`e2ee_private_key_${user.username}`, user.transferredKeyPayload);
      }
      if (user.id || user._id) {
        localStorage.setItem(`e2ee_private_key_${user.id || user._id}`, user.transferredKeyPayload);
      }
      localStorage.setItem("e2ee_private_key", user.transferredKeyPayload);
    }

    dispatch(setUser(user));
    dispatch(initE2EEKeys(user));

    setTimeout(() => {
      onClose();
      navigate(CHAT_ROUTES.root);
    }, 1200);
  };

  useEffect(() => {
    if (isOpen) {
      initPairing();
    }
    return () => {
      if (pollTimerRef.current) clearInterval(pollTimerRef.current);
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [isOpen]);

  // Countdown timer
  useEffect(() => {
    if (!isOpen || timeLeft <= 0 || pairedSuccess) return;
    const timer = setInterval(() => {
      setTimeLeft((t) => {
        if (t <= 1) {
          clearInterval(timer);
          setError("QR code expired. Please refresh to generate a new one.");
          return 0;
        }
        return t - 1;
      });
    }, 1000);
    return () => clearInterval(timer);
  }, [isOpen, timeLeft, pairedSuccess]);

  if (!isOpen) return null;

  const qrPayload = pairingData
    ? JSON.stringify({
        type: "flashchat_companion_pair",
        pairingId: pairingData.pairingId,
        pairingCode: pairingData.pairingCode,
        v: 1,
      })
    : "";

  const handleCopyCode = () => {
    if (!pairingData?.pairingCode) return;
    navigator.clipboard.writeText(pairingData.pairingCode);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const formatTimer = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins}:${secs < 10 ? "0" : ""}${secs}`;
  };

  return createPortal(
    <div
      className="fixed inset-0 z-[100] overflow-y-auto bg-slate-900/60 dark:bg-black/80 backdrop-blur-md animate-fade-in p-4 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="min-h-full flex items-center justify-center py-4 sm:py-8"
        onClick={(e) => {
          if (e.target === e.currentTarget) onClose();
        }}
      >
        <div
          className="relative w-full max-w-md my-auto bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xl rounded-2xl p-5 sm:p-7 space-y-4 sm:space-y-5 animate-scale-in text-slate-800 dark:text-zinc-100"
          onClick={(e) => e.stopPropagation()}
        >
          
          {/* Close Button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <X size={18} />
          </button>

          {/* Header */}
          <div className="text-center space-y-1.5 pr-6 pl-2 sm:px-0">
            <div className="inline-flex items-center justify-center h-11 w-11 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 border border-indigo-100 dark:border-indigo-900/60 mb-0.5">
              <QrCode size={22} />
            </div>
            <h3 className="text-lg sm:text-xl font-bold tracking-tight">Log In with QR Code</h3>
            <p className="text-xs text-slate-500 dark:text-zinc-400 max-w-sm mx-auto leading-relaxed">
              Scan this code from an already logged-in device to link this browser instantly without a password.
            </p>
          </div>

          {/* QR Display Card */}
          <div className="flex flex-col items-center justify-center p-4 sm:p-5 bg-slate-50 dark:bg-zinc-950 rounded-2xl border border-slate-100 dark:border-zinc-800/80 relative min-h-[230px]">
            {loading && (
              <div className="flex flex-col items-center gap-3">
                <RefreshCw className="animate-spin text-indigo-500" size={32} />
                <p className="text-xs font-semibold text-slate-500">Generating secure pairing key...</p>
              </div>
            )}

            {!loading && error && (
              <div className="flex flex-col items-center text-center gap-3 p-4">
                <AlertCircle className="text-red-500" size={36} />
                <p className="text-xs font-semibold text-red-600 dark:text-red-400">{error}</p>
                <button
                  onClick={initPairing}
                  className="mt-2 px-4 py-2 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-xl shadow-sm transition flex items-center gap-1.5"
                >
                  <RefreshCw size={13} /> Refresh QR Code
                </button>
              </div>
            )}

            {!loading && !error && pairedSuccess && (
              <div className="flex flex-col items-center gap-3 py-6 animate-scale-in">
                <div className="h-16 w-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
                  <CheckCircle2 size={40} />
                </div>
                <h4 className="text-base font-bold text-slate-800 dark:text-zinc-100">Device Linked!</h4>
                <p className="text-xs text-slate-500 dark:text-zinc-400">Loading your encrypted chats...</p>
              </div>
            )}

            {!loading && !error && !pairedSuccess && pairingData && (
              <div className="flex flex-col items-center space-y-3">
                {/* QR Container */}
                <div className="p-2.5 bg-white rounded-2xl shadow-sm border border-slate-200/60 relative group">
                  <QRCodeSVG
                    value={qrPayload}
                    size={172}
                    level="H"
                    includeMargin={false}
                  />
                </div>

                {/* Status and Timer */}
                <div className="flex items-center gap-2 text-[11px] text-slate-500 dark:text-zinc-400">
                  <span className="relative flex h-2 w-2">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
                    <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
                  </span>
                  <span>Waiting for approval • Expires in <strong className="text-slate-700 dark:text-zinc-200">{formatTimer(timeLeft)}</strong></span>
                </div>
              </div>
            )}
          </div>

          {/* Pairing Code Alternative */}
          {!loading && !error && !pairedSuccess && pairingData && (
            <div className="p-3 rounded-xl border border-slate-200/60 dark:border-zinc-800 bg-white dark:bg-zinc-900/60 flex items-center justify-between">
              <div className="space-y-0.5">
                <span className="text-[10px] uppercase font-bold text-slate-400 dark:text-zinc-500 tracking-wider">
                  Or enter this code on your phone
                </span>
                <p className="text-sm sm:text-base font-mono font-bold tracking-widest text-indigo-600 dark:text-indigo-400">
                  {pairingData.pairingCode}
                </p>
              </div>
              <button
                onClick={handleCopyCode}
                className="p-2 rounded-lg text-slate-500 hover:text-slate-700 dark:text-zinc-400 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition flex items-center gap-1 text-xs font-semibold cursor-pointer"
                title="Copy code"
              >
                {copiedCode ? <Check size={15} className="text-emerald-500" /> : <Copy size={15} />}
                <span>{copiedCode ? "Copied" : "Copy"}</span>
              </button>
            </div>
          )}

          {/* Instructions */}
          <div className="space-y-1.5 pt-2 border-t border-slate-100 dark:border-zinc-800/80 text-[11px] text-slate-500 dark:text-zinc-400">
            <p className="font-semibold text-slate-700 dark:text-zinc-300">How to link:</p>
            <ol className="list-decimal list-inside space-y-0.5 leading-relaxed">
              <li>Open FlashChat on your primary logged-in device.</li>
              <li>Go to <strong>Settings &rarr; Linked Devices</strong>.</li>
              <li>Tap <strong>Link a Device</strong> and point your camera here.</li>
            </ol>
          </div>

        </div>
      </div>
    </div>,
    document.body
  );
}
