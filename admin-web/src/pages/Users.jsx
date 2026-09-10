import { useEffect, useMemo, useState } from "react";
import {
  collection, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp,
} from "firebase/firestore";
import { db, storage } from "../firebase";
import { getDownloadURL, ref } from "firebase/storage";

// Handles both business approvals and alumni verification review.
// Suspend flips status to "suspended"; the app's gatekeeper treats
// non-active users the same as pending. Remove is a hard delete of the
// user doc — the auth account itself lingers until manually removed
// from Firebase Auth (or via a Cloud Function on delete).
export default function Users() {
  const [users, setUsers] = useState([]);
  const [filter, setFilter] = useState("pending");
  const [verifyUrls, setVerifyUrls] = useState({});

  useEffect(() => {
    return onSnapshot(collection(db, "users"), (snap) => {
      setUsers(snap.docs.map((d) => ({ id: d.id, ...d.data() })));
    });
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return users;
    if (filter === "pending") return users.filter((u) => u.status === "pending");
    if (filter === "active") return users.filter((u) => u.status === "active");
    if (filter === "suspended") return users.filter((u) => u.status === "suspended");
    return users.filter((u) => u.role === filter);
  }, [users, filter]);

  async function approve(uid) {
    await updateDoc(doc(db, "users", uid), {
      status: "active",
      approvedAt: serverTimestamp(),
    });
  }
  async function suspend(uid) {
    if (!confirm("Suspend this user?")) return;
    await updateDoc(doc(db, "users", uid), { status: "suspended" });
  }
  async function reinstate(uid) {
    await updateDoc(doc(db, "users", uid), { status: "active" });
  }
  async function remove(uid) {
    if (!confirm("Permanently remove this user's profile? Their auth account will still exist until manually deleted.")) return;
    await deleteDoc(doc(db, "users", uid));
  }

  async function loadVerification(uid, path) {
    try {
      const url = await getDownloadURL(ref(storage, path));
      setVerifyUrls((prev) => ({ ...prev, [uid]: url }));
    } catch (err) {
      alert("Could not load verification doc: " + err.message);
    }
  }

  return (
    <>
      <h2>Users</h2>
      <p className="subtitle">Approve, suspend, remove. Verify alumni identity documents here.</p>

      <div style={{ marginBottom: 16, display: "flex", gap: 8, flexWrap: "wrap" }}>
        {["pending", "active", "suspended", "all", "student", "alumni", "business", "admin"].map((f) => (
          <button
            key={f}
            className={f === filter ? "" : "secondary"}
            onClick={() => setFilter(f)}
          >
            {f} ({f === "all" ? users.length : (
              f === "pending" || f === "active" || f === "suspended"
                ? users.filter((u) => u.status === f).length
                : users.filter((u) => u.role === f).length
            )})
          </button>
        ))}
      </div>

      {filtered.length === 0 && <p className="subtitle">No users match this filter.</p>}

      {filtered.map((u) => (
        <div key={u.id} className="card">
          <div className="row">
            <div className="grow">
              <div style={{ fontWeight: 700 }}>
                {u.fullName || u.email}
                <span className={"badge " + (u.status === "active" ? "good" : u.status === "pending" ? "warn" : u.status === "suspended" ? "danger" : "")}>
                  {u.status}
                </span>
                <span className="badge accent">{u.role}</span>
              </div>
              <div style={{ color: "var(--text-dim)", marginTop: 4, fontSize: 12 }}>
                {u.email} · UID {u.id}
                {u.programme ? ` · ${u.programme}` : ""}
                {u.graduationYear ? ` · grad ${u.graduationYear}` : ""}
              </div>

              {u.role === "alumni" && u.verificationDocPath && (
                <div style={{ marginTop: 8 }}>
                  <button className="secondary" onClick={() => loadVerification(u.id, u.verificationDocPath)}>
                    View verification document
                  </button>
                  {verifyUrls[u.id] && (
                    <a href={verifyUrls[u.id]} target="_blank" rel="noreferrer" style={{ marginLeft: 12 }}>
                      Open in new tab ↗
                    </a>
                  )}
                </div>
              )}
            </div>

            <div style={{ display: "flex", gap: 6 }}>
              {u.status === "pending" && <button onClick={() => approve(u.id)}>Approve</button>}
              {u.status === "active" && u.role !== "admin" && <button className="secondary" onClick={() => suspend(u.id)}>Suspend</button>}
              {u.status === "suspended" && <button onClick={() => reinstate(u.id)}>Reinstate</button>}
              {u.role !== "admin" && <button className="danger" onClick={() => remove(u.id)}>Remove</button>}
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
