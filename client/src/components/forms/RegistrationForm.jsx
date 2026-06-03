import React, { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { useNotification } from "../../hooks/NotificationContext";
import { MARKETING_ROUTES } from "../../../routes/routes";
import useDebounce from "../../hooks/useDebounce";
import { Flame, CheckCircle2, XCircle } from "lucide-react";

export default function RegistrationForm() {
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [checkingUsername, setCheckingUsername] = useState(false);
  const [usernameAvailable, setUsernameAvailable] = useState(null);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({ mode: "onChange" });

  const username = watch("username");
  const debouncedUsername = useDebounce(username, 500);

  useEffect(() => {
    const checkUsername = async () => {
      if (!debouncedUsername || errors.username) {
        setUsernameAvailable(null);
        return;
      }

      try {
        setCheckingUsername(true);
        const res = await axios.get(
          `${import.meta.env.VITE_API_URL}/auth/check-username/${debouncedUsername}`
        );
        setUsernameAvailable(res.data.available);
      } catch (err) {
        console.error("Username check error:", err);
        setUsernameAvailable(false);
      } finally {
        setCheckingUsername(false);
      }
    };

    checkUsername();
  }, [debouncedUsername, errors.username]);

  const onSubmit = async (data) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/register`, data);

      if (response.status === 201) {
        showNotification("success", response.data.message);
        reset();
        navigate(MARKETING_ROUTES.login);
      } else {
        showNotification("error", response.data.message);
      }
    } catch (e) {
      console.error(e.response?.data?.message);
      showNotification("error", e.response?.data?.message || "An error occurred");
    }
  };

  return (
    <div className="mt-10 w-full flex items-center justify-center p-1 bg-slate-50/50 dark:bg-zinc-950/40">
      <div className="w-full max-w-md bg-white dark:bg-zinc-900 border border-slate-200/50 dark:border-zinc-800 shadow-xl rounded-2xl p-4 sm:p-6 md:p-8 space-y-6 animate-scale-in">
        
        {/* Branding & Header */}
        <div className="flex flex-col items-center text-center space-y-2">
          <div className="flex items-center justify-center h-12 w-12 rounded-xl bg-indigo-500 text-white shadow-md shadow-indigo-500/20 mb-1">
            <Flame size={24} fill="white" />
          </div>
          <h2 className="text-2xl font-bold tracking-tight text-slate-800 dark:text-zinc-100">Create Account</h2>
          <p className="text-sm text-slate-500 dark:text-zinc-400">
            Sign up to start communicating in real-time
          </p>
        </div>

        {/* Registration Form */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          
          {/* Username Field */}
          <div className="space-y-1.5 relative">
            <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Username</label>
            <div className="relative">
              <input
                className="w-full pl-4 pr-10 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-150 text-sm"
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
              <div className="absolute right-3.5 top-1/2 -translate-y-1/2 flex items-center justify-center">
                {checkingUsername ? (
                  <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin"></div>
                ) : usernameAvailable === true ? (
                  <CheckCircle2 size={18} className="text-emerald-500" />
                ) : usernameAvailable === false ? (
                  <XCircle size={18} className="text-red-500" />
                ) : null}
              </div>
            </div>
            {errors.username && (
              <p className="text-red-500 text-xs mt-1 font-medium">{errors.username.message}</p>
            )}
          </div>

          {/* Full Name Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Full Name</label>
            <input
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-150 text-sm"
              type="text"
              placeholder="Enter full name"
              {...register("name", { required: "Full name is required" })}
            />
            {errors.name && (
              <p className="text-red-500 text-xs mt-1 font-medium">{errors.name.message}</p>
            )}
          </div>

          {/* Email Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Email Address</label>
            <input
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-150 text-sm"
              type="email"
              placeholder="name@example.com"
              {...register("email", { required: "Email is required" })}
            />
            {errors.email && (
              <p className="text-red-500 text-xs mt-1 font-medium">{errors.email.message}</p>
            )}
          </div>

          {/* Password Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Password</label>
            <input
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-150 text-sm"
              type="password"
              placeholder="••••••••"
              {...register("password", {
                required: "Password is required",
                minLength: { value: 6, message: "Password must be at least 6 characters" }
              })}
            />
            {errors.password && (
              <p className="text-red-500 text-xs mt-1 font-medium">{errors.password.message}</p>
            )}
          </div>

          {/* Confirm Password Field */}
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-500 dark:text-zinc-400">Confirm Password</label>
            <input
              className="w-full px-4 py-2.5 rounded-xl border border-slate-200 dark:border-zinc-800/80 bg-slate-50 dark:bg-zinc-950 text-slate-800 dark:text-zinc-100 placeholder-slate-400 dark:placeholder-zinc-600 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-150 text-sm"
              type="password"
              placeholder="••••••••"
              {...register("confirmPassword", {
                required: "Confirm password is required",
                validate: (value) => value === watch("password") || "Passwords do not match"
              })}
            />
            {errors.confirmPassword && (
              <p className="text-red-500 text-xs mt-1 font-medium">{errors.confirmPassword.message}</p>
            )}
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={checkingUsername || usernameAvailable === false || isSubmitting}
            className="w-full mt-4 py-2.5 bg-indigo-500 hover:bg-indigo-600 active:scale-[0.98] text-white font-semibold rounded-xl shadow-md shadow-indigo-500/10 transition-all duration-150 flex items-center justify-center text-sm cursor-pointer disabled:opacity-50"
          >
            Register
            {isSubmitting && (
              <span className="animate-spin border-2 ms-2 block border-white rounded-full w-3.5 h-3.5 border-t-transparent"></span>
            )}
          </button>
        </form>

        {/* Redirect Link */}
        <p className="text-center text-xs text-slate-500 dark:text-zinc-400 mt-4">
          Already have an account?{" "}
          <Link
            to={MARKETING_ROUTES.login}
            className="text-indigo-500 hover:text-indigo-600 dark:hover:text-indigo-400 font-semibold transition"
          >
            Login
          </Link>
        </p>

      </div>
    </div>
  );
}