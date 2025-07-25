import React from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import { useNotification } from "../../hooks/NotificationContext";
import { useNavigate, useLocation } from "react-router-dom";

export default function ResetPassword() {
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const location = useLocation();

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "onChange",
  });

  const { token } = useParams();

  const onSubmit = async (data) => {
    if (!token) {
      showNotification("error", "Invalid or missing reset token.");
      return;
    }

    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/reset-password`, {
        token,
        newPassword: data.password
      });

      if (response.status === 200) {
        showNotification("success", "Password reset successful!");
        navigate("/login");
      } else {
        showNotification("error", response.data.message);
      }
    } catch (e) {
      console.error(e.response?.data?.message || e.message);
      showNotification("error", e.response?.data?.message || "Something went wrong.");
    }
  };

  return (
    <div className="gap-10 w-full flex flex-col items-center p-5 dark:bg-black min-h-screen">
      <div className="flex flex-col mt-10 justify-center text-center gap-2">
        <h2 className="dark:text-white text-2xl font-bold">Reset Password</h2>
        <p className="dark:text-zinc-300 text-zinc-600 text-sm">Enter your new password.</p>
      </div>

      <form
        onSubmit={handleSubmit(onSubmit)}
        className="gap-5 text-sm flex flex-col bg-zinc-50 2xs:p-10 p-5 rounded-lg dark:bg-zinc-900"
      >
        <div className="form-group flex gap-2 flex-col">
          <label className="dark:text-white">New Password</label>
          <input
            className="py-3 focus:outline-1 dark:bg-zinc-950 outline-primary rounded-md bg-zinc-100 px-5 dark:text-white"
            type="password"
            placeholder="Enter New Password"
            {...register("password", {
              required: "New Password is required",
              minLength: {
                value: 6,
                message: "Password must be at least 6 characters"
              }
            })}
          />
          {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}
        </div>

        <div className="form-group flex gap-2 flex-col">
          <label className="dark:text-white">Confirm Password</label>
          <input
            className="py-3 focus:outline-1 dark:bg-zinc-950 outline-primary rounded-md w-60 sm:w-80 bg-zinc-100 px-5 dark:text-white"
            type="password"
            placeholder="Confirm New Password"
            {...register("confirmPassword", {
              required: "Confirm password is required",
              validate: (value) =>
                value === watch("password") || "Passwords do not match"
            })}
          />
          {errors.confirmPassword && (
            <p className="text-red-500 text-xs">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={isSubmitting}
          className="py-2 rounded-md bg-primary-1 hover:bg-primary transition duration-300 text-white flex items-center justify-center disabled:opacity-50"
        >
          Reset Password
          {isSubmitting && (
            <span className="animate-spin border-2 ms-2 block border-white rounded-full w-3 h-3 border-t-transparent"></span>
          )}
        </button>

        <div className="flex justify-center gap-5">
          <button
            onClick={() => navigate("/login")}
            type="button"
            className="text-sm text-primary hover:underline transition duration-300"
          >
            Back to Login
          </button>
        </div>
      </form>
    </div>
  );
}
