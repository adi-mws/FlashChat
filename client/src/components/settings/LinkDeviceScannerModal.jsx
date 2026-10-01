import React, { useState, useEffect, useRef } from "react";
import { Html5Qrcode } from "html5-qrcode";
import axios from "axios";
import { useSelector } from "react-redux";
import { selectUser } from "../../redux/slices/authSlice";
import { getSessionPrivateKey } from "../../lib/e2ee";
import { Camera, QrCode, X, CheckCircle2, ShieldCheck, AlertCircle, RefreshCw, KeyRound, MonitorSmartphone } from "lucide-react";

export default function LinkDeviceScannerModal({ isOpen, onClose, onDeviceLinked }) {
  const user = useSelector(selectUser);

  const [activeTab, setActiveTab] = useState("camera"); // "camera" | "code"
  const [manualCode, setManualCode] = useState("");
  const [scannedData, setScannedData] = useState(null);
  const [approving, setApproving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  const [cameraError, setCameraError] = useState(null);

  const html5QrCodeRef = useRef(null);
  const scannerContainerId = "qr-reader-container";

  // Start camera scanner
  const startScanner = async () => {
    setCameraError(null);
    try {
      if (html5QrCodeRef.current) {
        try {
          await html5QrCodeRef.current.stop();
        } catch (e) {
          // ignore
        }
      }

      const qrScanner = new Html5Qrcode(scannerContainerId);
      html5QrCodeRef.current = qrScanner;

      await qrScanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 220, height: 220 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          handleScanSuccess(decodedText);
        },
        (error) => {
          // quiet scan frame failure
        }
      );
    } catch (err) {
      console.warn("Failed to start camera scanner:", err);
      setCameraError("Camera access denied or unavailable. You can enter the 6-character code manually below.");
      setActiveTab("code");
    }
  };

  const stopScanner = async () => {
    if (html5QrCodeRef.current) {
      try {
        await html5QrCodeRef.current.stop();
        html5QrCodeRef.current.clear();
      } catch (err) {
        // ignore
      }
      html5QrCodeRef.current = null;
    }
  };

  useEffect(() => {
    if (isOpen && activeTab === "camera" && !scannedData && !success) {
      // Small timeout to allow DOM container to render
      const t = setTimeout(() => {
        startScanner();
      }, 300);
      return () => {
        clearTimeout(t);
        stopScanner();
      };
    } else {
      stopScanner();
    }
  }, [isOpen, activeTab, scannedData, success]);

  const handleScanSuccess = (text) => {
    try {
      const parsed = JSON.parse(text);
      if (parsed.type === "flashchat_companion_pair" && parsed.pairingId) {
        stopScanner();
        setScannedData(parsed);
        setError(null);
      } else {
        setError("Invalid FlashChat QR Code.");
      }
    } catch (e) {
      // If plain text pairing code
      if (text.startsWith("FC-")) {
        stopScanner();
        setScannedData({ pairingCode: text });
        setError(null);
      } else {
        setError("Unrecognized QR Code format.");
      }
    }
  };

  const handleManualSubmit = (e) => {
    e.preventDefault();
    const cleanCode = manualCode.trim().toUpperCase();
    if (!cleanCode) return;
    setScannedData({ pairingCode: cleanCode });
    setError(null);
  };

  const handleApprove = async () => {
    try {
      setApproving(true);
      setError(null);

      // Export local private key to securely transfer to the new companion device
      let localPrivateKey = null;
      if (user?.sessionId) {
        localPrivateKey = getSessionPrivateKey(user.sessionId);
      }
      if (!localPrivateKey && user?.username) {
        localPrivateKey = localStorage.getItem(`e2ee_private_key_${user.username}`);
      }
      if (!localPrivateKey && user?.id) {
        localPrivateKey = localStorage.getItem(`e2ee_private_key_${user.id}`);
      }
      if (!localPrivateKey) {
        localPrivateKey = localStorage.getItem("e2ee_private_key");
      }

      const payload = {
        pairingId: scannedData?.pairingId || null,
        pairingCode: scannedData?.pairingCode || null,
        keyPayload: localPrivateKey || null,
      };

      await axios.post(`${import.meta.env.VITE_API_URL}/auth/companion/approve`, payload, {
        withCredentials: true,
      });

      setSuccess(true);
      if (onDeviceLinked) onDeviceLinked();

      setTimeout(() => {
        handleModalClose();
      }, 1500);

    } catch (err) {
      console.error("Failed to approve device pairing:", err);
      setError(err.response?.data?.message || "Failed to link device. Please verify the code and try again.");
    } finally {
      setApproving(false);
    }
  };

  const handleModalClose = () => {
    stopScanner();
    setScannedData(null);
    setManualCode("");
    setError(null);
    setSuccess(false);
    onClose();
  };

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 z-50 overflow-y-auto bg-slate-900/60 dark:bg-black/80 backdrop-blur-md animate-fade-in p-4 sm:p-6"
      onClick={(e) => {
        if (e.target === e.currentTarget) handleModalClose();
      }}
    >
      <div
        className="min-h-full flex items-center justify-center py-4 sm:py-8"
        onClick={(e) => {
          if (e.target === e.currentTarget) handleModalClose();
        }}
      >
        <div
          className="relative w-full max-w-md my-auto bg-white dark:bg-zinc-900 border border-slate-200/80 dark:border-zinc-800 shadow-2xl rounded-3xl p-6 sm:p-8 space-y-6 animate-scale-in text-slate-800 dark:text-zinc-100"
          onClick={(e) => e.stopPropagation()}
        >
          
          {/* Close Button */}
          <button
            onClick={handleModalClose}
            className="absolute top-5 right-5 p-2 rounded-xl text-slate-400 hover:text-slate-600 dark:hover:text-zinc-200 hover:bg-slate-100 dark:hover:bg-zinc-800 transition cursor-pointer"
          >
            <X size={18} />
          </button>

        {/* Header */}
        <div className="text-center space-y-1.5">
          <div className="inline-flex items-center justify-center h-12 w-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/40 text-indigo-500 border border-indigo-100 dark:border-indigo-900/60 mb-1">
            <MonitorSmartphone size={24} />
          </div>
          <h3 className="text-xl font-bold tracking-tight">Link a New Device</h3>
          <p className="text-xs text-slate-500 dark:text-zinc-400">
            Scan the QR code shown on your other screen or enter its pairing code.
          </p>
        </div>

        {/* Error notification */}
        {error && (
          <div className="flex items-start gap-2.5 p-3 rounded-xl border border-red-200 bg-red-50 text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-400 text-xs">
            <AlertCircle size={16} className="shrink-0 mt-0.5" />
            <p className="leading-relaxed">{error}</p>
          </div>
        )}

        {/* Success State */}
        {success ? (
          <div className="flex flex-col items-center justify-center py-8 space-y-3 animate-scale-in">
            <div className="h-16 w-16 rounded-full bg-emerald-500/10 text-emerald-500 flex items-center justify-center">
              <CheckCircle2 size={40} />
            </div>
            <h4 className="text-base font-bold text-slate-800 dark:text-zinc-100">Device Linked Successfully!</h4>
            <p className="text-xs text-slate-500 dark:text-zinc-400 text-center">
              Your chats and encryption keys have been paired with the companion device.
            </p>
          </div>
        ) : scannedData ? (
          /* Confirmation Screen */
          <div className="space-y-5 animate-scale-in">
            <div className="p-4 rounded-2xl border border-indigo-100 dark:border-indigo-900/40 bg-indigo-50/50 dark:bg-indigo-950/20 space-y-3">
              <div className="flex items-center gap-3">
                <div className="h-10 w-10 rounded-xl bg-indigo-500 text-white flex items-center justify-center">
                  <KeyRound size={20} />
                </div>
                <div>
                  <h4 className="text-sm font-bold text-slate-800 dark:text-zinc-100">Authorize Companion Device</h4>
                  <p className="text-xs text-indigo-600 dark:text-indigo-400 font-mono font-semibold">
                    Code: {scannedData.pairingCode}
                  </p>
                </div>
              </div>
              <p className="text-xs text-slate-600 dark:text-zinc-300 leading-relaxed">
                By authorizing, this new device will be granted access to your account and receive your End-to-End Encryption keys so you can chat from both screens.
              </p>
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setScannedData(null)}
                disabled={approving}
                className="flex-1 py-2.5 border border-slate-200 dark:border-zinc-800 text-slate-700 dark:text-zinc-300 text-xs font-semibold rounded-xl hover:bg-slate-50 dark:hover:bg-zinc-800 transition cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleApprove}
                disabled={approving}
                className="flex-1 py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-xl shadow-md shadow-indigo-500/15 transition flex items-center justify-center gap-1.5 cursor-pointer disabled:opacity-50"
              >
                {approving ? (
                  <>
                    <RefreshCw size={14} className="animate-spin" /> Authorizing...
                  </>
                ) : (
                  <>
                    <ShieldCheck size={15} /> Authorize Device
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          /* Scanner / Input Tabs */
          <div className="space-y-4">
            {/* Tabs */}
            <div className="flex p-1 bg-slate-100 dark:bg-zinc-950 rounded-xl">
              <button
                type="button"
                onClick={() => setActiveTab("camera")}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "camera"
                    ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300"
                }`}
              >
                <Camera size={14} /> Scan with Camera
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("code")}
                className={`flex-1 py-2 text-xs font-semibold rounded-lg transition cursor-pointer flex items-center justify-center gap-1.5 ${
                  activeTab === "code"
                    ? "bg-white dark:bg-zinc-900 text-slate-900 dark:text-zinc-100 shadow-sm"
                    : "text-slate-500 hover:text-slate-700 dark:hover:text-zinc-300"
                }`}
              >
                <KeyRound size={14} /> Enter Code
              </button>
            </div>

            {/* Tab 1: Camera Scanner */}
            {activeTab === "camera" && (
              <div className="space-y-3">
                <div className="relative rounded-2xl overflow-hidden bg-black aspect-square flex items-center justify-center border border-slate-200 dark:border-zinc-800">
                  <div id={scannerContainerId} className="w-full h-full" />
                </div>
                {cameraError && (
                  <p className="text-[11px] text-amber-600 dark:text-amber-400 text-center leading-normal">
                    {cameraError}
                  </p>
                )}
              </div>
            )}

            {/* Tab 2: Manual Code Input */}
            {activeTab === "code" && (
              <form onSubmit={handleManualSubmit} className="space-y-3 pt-2">
                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400">
                    Pairing Code
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. FC-8492"
                    value={manualCode}
                    onChange={(e) => setManualCode(e.target.value)}
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-950 font-mono text-center tracking-widest text-base font-bold text-slate-800 dark:text-zinc-100 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition uppercase"
                    maxLength={10}
                    required
                  />
                  <p className="text-[10px] text-slate-400 dark:text-zinc-500 text-center">
                    Look at the pairing code shown on the companion device screen.
                  </p>
                </div>
                <button
                  type="submit"
                  disabled={!manualCode.trim()}
                  className="w-full py-2.5 bg-indigo-500 hover:bg-indigo-600 text-white text-xs font-semibold rounded-xl shadow-sm transition disabled:opacity-50 cursor-pointer"
                >
                  Verify Code
                </button>
              </form>
            )}
          </div>
        )}

        </div>
      </div>
    </div>
  );
}
