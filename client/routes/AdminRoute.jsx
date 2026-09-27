import { Navigate } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectUser } from "../src/redux/slices/authSlice";
import { CHAT_ROUTES } from "./routes";

/**
 * Route guard for Supreme Admin Console (/flsh-ad-pnl).
 * - Standard logged-in users are STRICTLY forbidden from viewing the admin panel and redirected to /app/chats.
 * - Admins and unauthenticated users (for direct admin credentials login) are allowed through.
 */
export default function AdminRoute({ children }) {
    const user = useSelector(selectUser);

    if (user && user.role !== "admin") {
        return <Navigate to={CHAT_ROUTES.root} replace />;
    }

    return children;
}
