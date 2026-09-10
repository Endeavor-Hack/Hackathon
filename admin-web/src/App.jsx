import { Routes, Route, Navigate, NavLink } from "react-router-dom";
import { signOut } from "firebase/auth";
import { auth } from "./firebase";
import { AuthProvider, useAuth } from "./AuthContext";
import Login from "./pages/Login.jsx";
import Users from "./pages/Users.jsx";
import Opportunities from "./pages/Opportunities.jsx";
import Content from "./pages/Content.jsx";
import Events from "./pages/Events.jsx";
import Announcements from "./pages/Announcements.jsx";
import Analytics from "./pages/Analytics.jsx";

export default function App() {
  return (
    <AuthProvider>
      <Shell />
    </AuthProvider>
  );
}

function Shell() {
  const { firebaseUser, isAdminClaim, initializing } = useAuth();

  if (initializing) return <Splash>Loading…</Splash>;
  if (!firebaseUser) return <Login />;
  if (!isAdminClaim) {
    return (
      <Splash>
        <h1>Not authorized</h1>
        <p>Your account is signed in, but doesn't have the admin claim.</p>
        <p>Ask an existing admin to run <code>npm run make-admin YOUR_UID</code>, then sign out and back in.</p>
        <button className="secondary" onClick={() => signOut(auth)}>Sign out</button>
      </Splash>
    );
  }

  return (
    <div className="layout">
      <nav className="sidebar">
        <h1>Endeavour · Admin</h1>
        <NavLink to="/analytics" className={({ isActive }) => isActive ? "active" : ""}>Analytics</NavLink>
        <NavLink to="/users" className={({ isActive }) => isActive ? "active" : ""}>Users</NavLink>
        <NavLink to="/opportunities" className={({ isActive }) => isActive ? "active" : ""}>Opportunities</NavLink>
        <NavLink to="/content" className={({ isActive }) => isActive ? "active" : ""}>Content moderation</NavLink>
        <NavLink to="/events" className={({ isActive }) => isActive ? "active" : ""}>Events</NavLink>
        <NavLink to="/announcements" className={({ isActive }) => isActive ? "active" : ""}>Announcements</NavLink>
        <div className="spacer" />
        <div className="signout">{firebaseUser.email}</div>
        <button className="secondary" onClick={() => signOut(auth)}>Sign out</button>
      </nav>
      <main className="main">
        <Routes>
          <Route path="/" element={<Navigate to="/analytics" replace />} />
          <Route path="/analytics" element={<Analytics />} />
          <Route path="/users" element={<Users />} />
          <Route path="/opportunities" element={<Opportunities />} />
          <Route path="/content" element={<Content />} />
          <Route path="/events" element={<Events />} />
          <Route path="/announcements" element={<Announcements />} />
        </Routes>
      </main>
    </div>
  );
}

function Splash({ children }) {
  return (
    <div className="login-wrapper">
      <div className="login-box">{children}</div>
    </div>
  );
}
