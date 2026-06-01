import React, { useState } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import { useNotification } from "../../hooks/NotificationContext";
import { useNavigate, Link } from "react-router-dom";
import { useAuth } from "../../hooks/AuthContext";
import { GoogleLogin } from "@react-oauth/google";
import { useTheme } from "../../hooks/ThemeContext";
import UserNameForm from "./UserNameForm";
import { Flame } from "lucide-react";

export default function LoginForm() {
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({ mode: "onChange" });
  const { theme } = useTheme();
  const navigate = useNavigate();
  const [showUsernameForm, setShowUsernameForm] = useState(false);
  const [googleCredentialResponse, setGoogleCredentialResponse] = useState({});
  const { showNotification } = useNotification();
  const { setUser, setLoading } = useAuth();

  const manualLogin = async (data) => {
    try {
      const response = await axios.post(
        `${import.meta.env.VITE_API_URL}/auth/login`,
        data,
        { withCredentials: true }
      );

      if (response.status === 200) {
        setUser(response.data.user);
        setLoading(false);
        navigate('/chats');
      }
    } catch (error) {
      console.error("Login failed:", error);
      showNotification(
        "error",
        error.response?.data?.message ?? "Internal Server Error"
      );
    }
  };

  const handleGoogleSuccess = async (credentialResponse) => {
    setGoogleCredentialResponse(credentialResponse);

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/google-check`, { token: credentialResponse.credential }, { withCredentials: true });
      if (response.status === 200) {
        if (response.data.available) {
          try {
            const r = await axios.post(
              `${import.meta.env.VITE_API_URL}/auth/google`,
              { token: credentialResponse.credential, available: response.data.available },
              { withCredentials: true }
            );

            if (r.status === 200) {
              const user = r.data.user;
              setUser(user);
              showNotification("success", "Login Successful!");
              navigate('/chats');
            } else {
              showNotification("error", "Failed to login");
            }
          } catch (error) {
            console.error("Google Auth API Error:", error);
            showNotification("error", "Authentication failed!");
          }
        } else {
          setShowUsernameForm(true);
        }
      }
    } catch (error) {
      showNotification("error", "Something went wrong!");
    }
  };

  const handleGoogleFailure = () => {
    console.error("Google Login Failed");
    showNotification("error", "Google Login Failed");
  };

  const onSubmit = async (data) => {
    manualLogin(data);
  };

  return (
    <div className="mt-10 w-full flex items-center justify-center p-1 bg-slate-50/50 dark:bg-zinc-950/40">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800 shadow-xl rounded-2xl p-4 sm:p-6 md:p-8 space-y-6 animate-scale-in">

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
                to={"/forgot-password"}
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
            disabled={isSubmitting}
            className="w-full mt-2 py-2.5 bg-indigo-500 hover:bg-indigo-600 active:scale-[0.98] text-white font-semibold rounded-xl shadow-md shadow-indigo-500/10 transition-all duration-150 flex items-center justify-center text-sm cursor-pointer disabled:opacity-50"
          >
            Login {isSubmitting && (
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
        <div className="w-full overflow-hidden rounded-xl border border-slate-200 dark:border-zinc-800/80 shadow-sm">
          <div className="w-full b-1">
            <GoogleLogin
              width="100%"
              size="large"
              text="continue_with"
              theme={theme === "dark" ? "filled_black" : "outline"}
              onSuccess={handleGoogleSuccess}
              onError={handleGoogleFailure}
            />
          </div>
        </div>

        {/* Footer Redirect */}
        <p className="text-center text-xs text-slate-500 dark:text-zinc-400 mt-4">
          New to FlashChat?{" "}
          <Link
            to="/register"
            className="text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold transition"
          >
            Create account
          </Link>
        </p>

        <UserNameForm setShowForm={setShowUsernameForm} showForm={showUsernameForm} credentialResponse={googleCredentialResponse} />
      </div>
    </div>
  );
}
