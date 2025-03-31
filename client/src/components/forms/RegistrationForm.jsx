import React, { useState } from "react";
import { useForm } from "react-hook-form";
import axios from "axios";
import { useNavigate, Link } from "react-router-dom";
import { useNotification } from "../../contexts/NotificationContext";

export default function RegistrationForm() {
  const { showNotification } = useNotification();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);

  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors, isSubmitting }
  } = useForm({
    mode: "onChange"
  });

  // Submit handler
  const onSubmit = async (data) => {
    try {
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/auth/register`, data);

      if (response.status === 201) {
        showNotification("success", response.data.message);
        reset();
        navigate("/login");
      } else {
        showNotification("error", response.data.message);
      }
    } catch (e) {
      console.error(e.response?.data?.message);
      showNotification("error", e.response?.data?.message || "An error occurred");
    }
  };

  return (
    <div className="gap-10 w-full flex flex-col items-center justify-center p-5 dark:bg-black">
      <div className="flex flex-col justify-center text-center gap-2">
        <h2 className="dark:text-white text-2xl font-bold">Create an Account</h2>
        <p className="dark:text-gray-300 text-gray-600 text-sm">
          Sign up and start exploring new features!
        </p>
      </div>

      <form onSubmit={handleSubmit(onSubmit)} className="gap-5  text-sm flex flex-col bg-gray-50 2xs:p-10 p-5 rounded-lg dark:bg-gray-900">

        <div className="form-group flex gap-2 flex-col">
          <label className="dark:text-white">Full Name</label>
          <input
            className="py-3 focus:outline-1 w-60 xs:w-80 dark:bg-gray-950 outline-primary rounded-md bg-gray-100 px-5 dark:text-white"
            type="text"
            placeholder="Enter Full Name"
            {...register("name", { required: "Full name is required" })}
          />
          {errors.name && <p className="text-red-500 text-xs">{errors.name.message}</p>}
        </div>

        <div className="form-group flex gap-2 flex-col">
          <label className="dark:text-white">Email</label>
          <input
            className="py-3 focus:outline-1 dark:bg-gray-950 outline-primary rounded-md bg-gray-100 px-5 dark:text-white"
            type="email"
            placeholder="Enter Email"
            {...register("email", { required: "Email is required" })}
          />
          {errors.email && <p className="text-red-500 text-xs">{errors.email.message}</p>}
        </div>

        <div className="form-group flex gap-2 flex-col">
          <label className="dark:text-white">Password</label>
          <input
            className="py-3 focus:outline-1 outline-primary rounded-md bg-gray-100 px-5 dark:text-white dark:bg-gray-950"
            type="password"
            placeholder="Enter Password"
            {...register("password", {
              required: "Password is required",
              minLength: { value: 6, message: "Password must be at least 6 characters" }
            })}
          />
          {errors.password && <p className="text-red-500 text-xs">{errors.password.message}</p>}
        </div>

        <div className="form-group flex gap-2 flex-col">
          <label className="dark:text-white">Confirm Password</label>
          <input
            className="py-3 focus:outline-1 outline-primary rounded-md bg-gray-100 px-5 dark:text-white dark:bg-gray-950"
            type="password"
            placeholder="Confirm Password"
            {...register("confirmPassword", {
              required: "Confirm password is required",
              validate: (value) => value === watch("password") || "Passwords do not match"
            })}
          />
          {errors.confirmPassword && <p className="text-red-500 text-xs">{errors.confirmPassword.message}</p>}
        </div>

        <button
          type="submit"
          className={"py-2 flex items-center justify-center rounded-md bg-primary-1 hover:bg-primary transition duration-300 text-white"}
        >
          Register
          {isSubmitting && (
            <span className="animate-spin border-2 ms-2 block border-white rounded-full w-3 h-3 border-t-transparent"></span>
          )}
        </button>

        <Link to="/login" className="text-center dark:text-white hover:underline transition duration-300">
          Already have an account? Login
        </Link>
      </form>
    </div>
  );
}
