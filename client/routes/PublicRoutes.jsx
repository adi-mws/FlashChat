import { Navigate } from "react-router-dom";
import { useAuth } from "../src/hooks/AuthContext";
import { CHAT_ROUTES } from "./routes";

export default function PublicRoutes({ children }) {
    const { user } = useAuth();

    return user ? <Navigate to={CHAT_ROUTES.root} replace /> : children;
}