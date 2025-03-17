import React from "react";
import { useForm } from "react-hook-form";
import "./RegistrationForm.css"; // Import custom CSS
import { useNotification } from "../../contexts/NotificationContext";
import axios from "axios";
import { useNavigate } from "react-router-dom";
export default function RegistrationForm() {
  const { showNotification } = useNotification();
  const {
    register,
    handleSubmit,
    watch,
    reset,
    formState: { errors },
  } = useForm();
  const navigate = useNavigate();

  const onSubmit = async (data) => {
    try {
      // console.log(data)
      const response = await axios.post(`${import.meta.env.VITE_API_URL}/admin/register-admin`, data);
      if (response.status === 201) {
        // console.log("Registration Successful");
        showNotification("success", response.data.message)
        reset();
        navigate("/login");
        
      } else {
        showNotification("error", response.data.message);
      }

    } catch (e) {
      console.error(e.response.data.message);
      showNotification("error", e.response.data.message);

    }
  };

  return (
    <div className="register-container">
      <h2>Register</h2>
      <form onSubmit={handleSubmit(onSubmit)}>
        <div className="form-group">
          <label>Name:</label>
          <input
            type="text"
            {...register("name", { required: "Name is required" })}
          />
          {errors.name && <p className="error">{errors.name.message}</p>}
        </div>

        <div className="form-group">
          <label>Email:</label>
          <input
            type="email"
            {...register("email", { required: "Email is required" })}
          />
          {errors.email && <p className="error">{errors.email.message}</p>}
        </div>

        <div className="form-group">
          <label>Password:</label>
          <input
            type="password"
            {...register("password", {
              required: "Password is required",
              minLength: {
                value: 6,
                message: "Password must be at least 6 characters",
              },
            })}
          />
          {errors.password && <p className="error">{errors.password.message}</p>}
        </div>

        <div className="form-group">
          <label>Confirm Password:</label>
          <input
            type="password"
            {...register("confirmPassword", {
              required: "Confirm password is required",
              validate: (value) =>
                value === watch("password") || "Passwords do not match",
            })}
          />
          {errors.confirmPassword && (
            <p className="error">{errors.confirmPassword.message}</p>
          )}
        </div>

        <button type="submit">Register</button>
      </form>
    </div>
  );
}
