import { Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";
import { selectUser } from "../src/redux/slices/authSlice";
import { MARKETING_ROUTES, ADMIN_ROUTES } from "./routes";

/**
 * Route guard for standard user app routes (/app, /chat, /settings, desktop layout).
 * - Unauthenticated users are redirected to landing/login.
 * - Logged-in Admins are STRICTLY forbidden from entering /app and redirected to /flsh-ad-pnl.
 * - Standard users are allowed through.
 */
export default function UserRoute({ children }) {
    const user = useSelector(selectUser);
    const location = useLocation();

    if (!user) {
        const returnUrl = location.pathname + location.search;
        return <Navigate to={`${MARKETING_ROUTES.login}?redirect=${encodeURIComponent(returnUrl)}`} replace />;
    }

    if (user.role === "admin" || user.role === "superadmin") {
        return <Navigate to={ADMIN_ROUTES.dashboard} replace />;
    }

    return children;
}
