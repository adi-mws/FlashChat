import { Navigate } from "react-router-dom";
import { useAuth } from "../src/hooks/AuthContext";

export default function PublicRoutes({ children }) {
    const { user } = useAuth();

    return user ? <Navigate to="/chats" replace /> : children;
}