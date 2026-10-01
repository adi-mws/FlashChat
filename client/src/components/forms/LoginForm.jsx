import React, { useState, useEffect } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import { useNotification } from "../../hooks/useNotification";
import { useNavigate, Link, useSearchParams, useLocation } from "react-router-dom";
import { useDispatch, useSelector } from "react-redux";
import { setUser } from "../../redux/slices/authSlice";
import { selectTheme } from "../../redux/slices/uiSlice";
import { MARKETING_ROUTES, CHAT_ROUTES } from "../../routes/routes";
import { GoogleLogin } from "@react-oauth/google";
import UserNameForm from "./UserNameForm";
import CompanionQRLoginModal from "../auth/CompanionQRLoginModal";
import { AlertCircle, CheckCircle2, Flame, QrCode } from "lucide-react";
import { getOrCreateDeviceId } from "../../lib/e2ee/keyStore";
import { useRef } from "react";
export default function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ mode: "onChange" });
  const dispatch = useDispatch();
  const theme = useSelector(selectTheme);
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const location = useLocation();
  const redirectUrl = searchParams.get('redirect');

  const [showUsernameForm, setShowUsernameForm] = useState(false);
  const [showQRModal, setShowQRModal] = useState(false);
  const [googleCredentialResponse, setGoogleCredentialResponse] = useState({});
  const [loading, setLoading] = useState(false);
  const { showNotification } = useNotification();
  const googleWrapperRef = useRef(null);
  const [googleBtnWidth, setGoogleBtnWidth] = useState(384);

  useEffect(() => {
    const updateWidth = () => {
      if (googleWrapperRef.current) {
        const clientWidth = googleWrapperRef.current.clientWidth;
        if (clientWidth > 0) {
          const targetWidth = Math.min(400, Math.max(200, Math.floor(clientWidth)));
          setGoogleBtnWidth(targetWidth);
        }
      }
    };

    updateWidth();
    window.addEventListener("resize", updateWidth);
    return () => window.removeEventListener("resize", updateWidth);
  }, []);
  const [alertMessage, setAlertMessage] = useState({ show: false, message: "", type: "" });
  const isSuccessAlert = alertMessage.type === "success";
  const alertClasses = isSuccessAlert
    ? "border-emerald-200 bg-emerald-50 text-emerald-700 dark:border-emerald-500/30 dark:bg-emerald-500/10 dark:text-emerald-300"
    : "border-red-200 bg-red-50 text-red-700 dark:border-red-500/30 dark:bg-red-500/10 dark:text-red-500";

  const handleAlert = (type, message) => {
    setAlertMessage({ show: true, message, type });
  }

  const navigateAfterLogin = (loggedUser) => {
    if (loggedUser?.role === 'admin' || loggedUser?.role === 'superadmin') {
      navigate('/flsh-ad-pnl');
    } else if (redirectUrl && redirectUrl.startsWith('/')) {
      navigate(redirectUrl);
    } else {
      navigate(CHAT_ROUTES.root);
    }
  };

  const manualLogin = async (data) => {
    try {
      setLoading(true);
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/login`,
        { ...data, deviceId: getOrCreateDeviceId() },
        { withCredentials: true }
      );

      if (response.status === 200) {
        const loggedUser = response.data.user;
        dispatch(setUser(loggedUser));
        navigateAfterLogin(loggedUser);
      }
    } catch (error) {
      console.error("Login failed:", error);
      handleAlert(
        "error",
        error.response?.data?.message ?? "Internal Server Error"
      );
    } finally {
      setLoading(false);
    }
  };  

  const handleGoogleSuccess = async (credentialResponse) => {
    setGoogleCredentialResponse(credentialResponse);

    try {
      setLoading(true);
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/google-check`, { token: credentialResponse.credential }, { withCredentials: true });
      if (response.status === 200) {
        if (response.data.available) {
          try {
            const r = await axios.post(
              `${import.meta.env.VITE_API_URL}/auth/google`,
              { token: credentialResponse.credential, available: response.data.available, deviceId: getOrCreateDeviceId() },
              { withCredentials: true }
            );

            if (r.status === 200) {
              const userData = r.data.user;
              dispatch(setUser(userData));
              handleAlert("success", "Login Successful!");
              navigateAfterLogin(userData);
            } else {
              handleAlert("error", "Failed to login");
            }
          } catch (error) {
            console.error("Google Auth API Error:", error);
            handleAlert("error", "Authentication failed!");
          }
        } else {
          setShowUsernameForm(true);
        }
      }
    } catch (error) {
      handleAlert("error", "Something went wrong!");
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleFailure = () => {
    console.error("Google Login Failed");
    showNotification("error", "Google Login Failed");
  };

  const onSubmit = async (data) => {
    await manualLogin(data);
  };

  return (
    <div className="mt-10 w-full flex items-center justify-center p-1 bg-slate-50/50 dark:bg-zinc-950/40">
      <div className="relative w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800 shadow-xl rounded-2xl p-4 sm:p-6 md:p-8 space-y-6 animate-scale-in">

        {/* Loading Overlay with Spinning Circle */}
        {loading && (
          <div className="absolute inset-0 bg-white/80 dark:bg-zinc-900/80 backdrop-blur-[2px] rounded-2xl flex flex-col items-center justify-center gap-3 z-30 animate-fade-in">
            <div className="w-10 h-10 border-4 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
            <p className="text-xs font-semibold text-slate-700 dark:text-zinc-200 tracking-wide">
              Logging you in...
            </p>
          </div>
        )}

        {/* Branding & Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-indigo-500 text-white shadow-md shadow-indigo-500/20 mb-1">
            <Flame size={24} fill="white" />
          </div>
          <h2 className="text-md sm:text-lg md:text-xl lg:text-2xl font-bold tracking-tight text-slate-800 dark:text-zinc-100">Welcome Back!</h2>
          <p className="text-xs sm:text-sm text-slate-500 dark:text-zinc-400">
            Login and start chatting with your friends instantly
          </p>
        </div>

        {/* Alert Message */}
        {alertMessage.show && (
          <div
            className={`flex items-center gap-3 rounded-xl border px-4 py-3 text-sm shadow-sm ${alertClasses}`}
            role="alert"
          >
            {isSuccessAlert ? (
              <CheckCircle2 className="h-4 w-4 shrink-0" />
            ) : (
              <AlertCircle className="h-4 w-4 shrink-0" />
            )}
            <div className="min-w-0">
              <p className="mt-0.5 leading-5">{alertMessage.message}</p>
            </div>
          </div>
        )}

        {/* Manual Login Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Username</label>
            <input
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-150 text-sm"
              type="text"
              placeholder="Enter username"
              {...register("username", {
                required: "Username is required",
                pattern: {
                  value: /^[a-z0-9_-]+$/,
                  message: "Only lowercase letters, numbers, _ and - allowed"
                }
              })}
            />
            {errors.username && (
              <p className="text-red-500 text-xs mt-1 font-medium">{errors.username.message}</p>
            )}
          </div>

          <div className="space-y-1.5">
            <div className="flex justify-between items-center">
              <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Password</label>
              <Link
                className="text-xs text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold"
                to={MARKETING_ROUTES.forgotPassword}
              >
                Forgot Password?
              </Link>
            </div>
            <input
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-150 text-sm"
              placeholder="Enter password"
              type="password"
              {...register("password", { required: "Password is required" })}
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1 font-medium">{errors.password.message}</p>
            )}
          </div>

          <button
            type="submit"
            disabled={loading || isSubmitting}
            className="w-full mt-2 py-2.5 bg-indigo-500 hover:bg-indigo-600 active:scale-[0.98] text-white font-semibold rounded-xl shadow-md shadow-indigo-500/10 transition-all duration-150 flex items-center justify-center text-sm cursor-pointer disabled:opacity-50"
          >
            Login {(loading || isSubmitting) && (
              <span className="animate-spin border-2 ms-2 block border-white rounded-full w-3.5 h-3.5 border-t-transparent"></span>
            )}
          </button>
        </form>

        {/* Divider */}
        <div className="relative flex items-center justify-center my-4">
          <div className="border-t border-slate-200 dark:border-zinc-800 w-full" />
          <span className="absolute bg-white dark:bg-zinc-900 px-3 text-xs text-slate-400 dark:text-zinc-500">
            or continue with
          </span>
        </div>

        {/* Google Authentication */}
        <div
          ref={googleWrapperRef}
          className={`w-full flex justify-center items-center min-h-[44px] ${loading ? 'pointer-events-none opacity-60' : ''}`}
        >
          <GoogleLogin
            width={googleBtnWidth}
            size="large"
            text="continue_with"
            theme={theme === "dark" ? "filled_black" : "outline"}
            shape="rectangular"
            containerProps={{ className: "google-btn-container" }}
            onSuccess={handleGoogleSuccess}
            onError={handleGoogleFailure}
          />
        </div>

        {/* QR Companion Login Button */}
        <button
          type="button"
          disabled={loading}
          onClick={() => setShowQRModal(true)}
          className="w-full mt-3 py-2.5 px-4 bg-slate-100 hover:bg-slate-200/80 dark:bg-zinc-800/80 dark:hover:bg-zinc-800 text-slate-700 dark:text-zinc-200 font-semibold rounded-xl transition-all duration-150 flex items-center justify-center gap-2 text-sm cursor-pointer border border-slate-200/60 dark:border-zinc-700/60 disabled:opacity-50"
        >
          <QrCode size={16} className="text-indigo-500" />
          <span>Log In with QR Code</span>
        </button>

        {/* Footer Redirect */}
        <p className="text-center text-xs text-slate-500 dark:text-zinc-400 mt-4">
          New to FlashChat?{" "}
          <Link
            to={`${MARKETING_ROUTES.register}${location.search}`}
            className="text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold transition"
          >
            Create account
          </Link>
        </p>

        <CompanionQRLoginModal isOpen={showQRModal} onClose={() => setShowQRModal(false)} />
        <UserNameForm setShowForm={setShowUsernameForm} showForm={showUsernameForm} credentialResponse={googleCredentialResponse} />
      </div>
    </div>
  );
}
