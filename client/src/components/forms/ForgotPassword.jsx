import React from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import { useNotification } from "../../hooks/NotificationContext";
import { useNavigate } from "react-router-dom";

export default function ForgotPassword() {
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm({
    mode: "onChange"
  });

  const onSubmit = async (data) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/user/forgot-password`, data);
      
      if (response.status === 200) {
        showNotification("success", "Password reset link sent to your email.");
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
    <div className="gap-10 w-full flex flex-col items-center justify-center p-5 dark:bg-black">
      <div className="flex align-items flex-col justify-center text-center gap-2">
        <h2 className="dark:text-white text-2xl font-bold">Forgot Password?</h2>
        <p className="dark:text-zinc-300 text-zinc-600 text-sm">Enter your email to receive a reset link.</p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="gap-5 text-sm flex flex-col bg-zinc-50 2xs:p-10 p-5 rounded-lg dark:bg-zinc-900">
        <div className="form-group flex gap-2 flex-col">
          <label className="dark:text-white">Email</label>
          <input
            className="py-3 focus:outline-1 xs:w-70 w-60 dark:bg-zinc-950 outline-primary rounded-md bg-zinc-100 px-5 dark:text-white"
            type="email"
            placeholder="Enter Email"
            {...register("email", { required: "Email is required" })}
          />
          {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
        </div>

        <button type="submit" className="flex justify-center items-center py-2 rounded-md bg-primary-1 hover:bg-primary transition duration-300 text-white">
          Send Link {isSubmitting ?<span className="animate-spin border-2 ms-2 block border-white rounded-full w-3 h-3 border-t-transparent"></span> : <></>}
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
