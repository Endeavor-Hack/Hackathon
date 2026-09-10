import { useEffect, useMemo, useState } from "react";
import { collection, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";
import {
  BarChart, Bar, PieChart, Pie, Cell, LineChart, Line,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, Legend,
} from "recharts";

const COLORS = ["#F2560A", "#8C1C13", "#22C55E", "#FBBF24", "#3B82F6", "#9AA3BD"];

export default function Analytics() {
  const [users, setUsers] = useState([]);
  const [posts, setPosts] = useState([]);
  const [opps, setOpps] = useState([]);
  const [videos, setVideos] = useState(0);

  useEffect(() => {
    const u1 = onSnapshot(collection(db, "users"), (s) => setUsers(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    const u2 = onSnapshot(collection(db, "posts"), (s) => {
      const list = s.docs.map((d) => ({ id: d.id, ...d.data() }));
      setPosts(list);
      setVideos(list.filter((p) => p.videoUrl).length);
    });
    const u3 = onSnapshot(collection(db, "opportunities"), (s) => setOpps(s.docs.map((d) => ({ id: d.id, ...d.data() }))));
    return () => { u1(); u2(); u3(); };
  }, []);

  const usersByRole = useMemo(() => {
    const counts = {};
    users.forEach((u) => { counts[u.role || "unknown"] = (counts[u.role || "unknown"] || 0) + 1; });
    return Object.entries(counts).map(([role, count]) => ({ role, count }));
  }, [users]);

  const registrations = useMemo(() => {
    // Bucket registrations by day for last 30 days
    const buckets = {};
    users.forEach((u) => {
      const d = u.createdAt?.toDate?.();
      if (!d) return;
      const key = d.toISOString().slice(0, 10);
      buckets[key] = (buckets[key] || 0) + 1;
    });
    return Object.entries(buckets)
      .sort(([a], [b]) => (a < b ? -1 : 1))
      .slice(-30)
      .map(([date, count]) => ({ date, count }));
  }, [users]);

  const oppsByStatus = useMemo(() => {
    const counts = { pending: 0, approved: 0, rejected: 0 };
    opps.forEach((o) => { counts[o.status] = (counts[o.status] || 0) + 1; });
    return Object.entries(counts).map(([status, count]) => ({ status, count }));
  }, [opps]);

  const activeUsersCount = users.filter((u) => u.status === "active").length;
  const pendingCount = users.filter((u) => u.status === "pending").length;
  const flaggedCount = posts.filter((p) => p.flagged).length;

  return (
    <>
      <h2>Platform analytics</h2>
      <p className="subtitle">Live snapshot of the whole platform.</p>

      <div className="grid">
        <Stat label="Registered users" value={users.length} />
        <Stat label="Active users" value={activeUsersCount} />
        <Stat label="Pending approvals" value={pendingCount} />
        <Stat label="Posts" value={posts.length} />
        <Stat label="Videos" value={videos} />
        <Stat label="Opportunities" value={opps.length} />
        <Stat label="Flagged content" value={flaggedCount} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
        <div className="chart-card">
          <h3>Users by type</h3>
          <ResponsiveContainer width="100%" height={220}>
            <PieChart>
              <Pie data={usersByRole} dataKey="count" nameKey="role" outerRadius={80} label>
                {usersByRole.map((_, i) => <Cell key={i} fill={COLORS[i % COLORS.length]} />)}
              </Pie>
              <Tooltip />
            </PieChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card">
          <h3>Opportunity approval pipeline</h3>
          <ResponsiveContainer width="100%" height={220}>
            <BarChart data={oppsByStatus}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A3350" />
              <XAxis dataKey="status" stroke="#9AA3BD" />
              <YAxis stroke="#9AA3BD" allowDecimals={false} />
              <Tooltip />
              <Bar dataKey="count" fill="#F2560A" />
            </BarChart>
          </ResponsiveContainer>
        </div>

        <div className="chart-card" style={{ gridColumn: "1 / -1" }}>
          <h3>Registrations over time</h3>
          <ResponsiveContainer width="100%" height={220}>
            <LineChart data={registrations}>
              <CartesianGrid strokeDasharray="3 3" stroke="#2A3350" />
              <XAxis dataKey="date" stroke="#9AA3BD" />
              <YAxis stroke="#9AA3BD" allowDecimals={false} />
              <Tooltip />
              <Line type="monotone" dataKey="count" stroke="#F2560A" strokeWidth={2} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      </div>
    </>
  );
}

function Stat({ label, value }) {
  return (
    <div className="stat">
      <div className="label">{label}</div>
      <div className="value">{value}</div>
    </div>
  );
}
