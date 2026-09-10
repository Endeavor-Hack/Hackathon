import { useEffect, useState } from "react";
import {
  collection, onSnapshot, addDoc, doc, deleteDoc, serverTimestamp,
  query, where, getDocs,
} from "firebase/firestore";
import { db, auth } from "../firebase";

const EMPTY = { title: "", body: "", target: "all" };

export default function Announcements() {
  const [items, setItems] = useState([]);
  const [form, setForm] = useState(EMPTY);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    return onSnapshot(collection(db, "announcements"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setItems(list);
    });
  }, []);

  function set(k, v) { setForm((prev) => ({ ...prev, [k]: v })); }

  async function broadcast() {
    if (!form.title || !form.body) { alert("Title and body required."); return; }
    setBusy(true);
    try {
      const created = await addDoc(collection(db, "announcements"), {
        title: form.title.trim(),
        body: form.body.trim(),
        target: form.target,
        createdBy: auth.currentUser.uid,
        createdAt: serverTimestamp(),
      });

      // Fan out per-user notification docs
      let usersQ = query(collection(db, "users"), where("status", "==", "active"));
      if (form.target !== "all") {
        usersQ = query(collection(db, "users"), where("status", "==", "active"), where("role", "==", form.target));
      }
      const snap = await getDocs(usersQ);
      for (const d of snap.docs) {
        await addDoc(collection(db, "notifications"), {
          userId: d.id,
          type: "announcement",
          message: form.title.trim(),
          relatedId: created.id,
          read: false,
          createdAt: serverTimestamp(),
        });
      }
      setForm(EMPTY);
    } catch (err) {
      alert(err.message);
    } finally {
      setBusy(false);
    }
  }

  async function remove(id) {
    if (!confirm("Delete this announcement?")) return;
    await deleteDoc(doc(db, "announcements", id));
  }

  return (
    <>
      <h2>Announcements</h2>
      <p className="subtitle">Broadcast to everyone or a specific role. Recipients see the message as a notification and a pinned banner on the feed.</p>

      <div className="card">
        <label>Title</label>
        <input value={form.title} onChange={(e) => set("title", e.target.value)} />
        <div style={{ height: 12 }} />
        <label>Body</label>
        <textarea value={form.body} onChange={(e) => set("body", e.target.value)} />
        <div style={{ height: 12 }} />
        <label>Target</label>
        <select value={form.target} onChange={(e) => set("target", e.target.value)}>
          <option value="all">Everyone</option>
          <option value="student">Students</option>
          <option value="alumni">Alumni</option>
          <option value="business">Businesses</option>
        </select>
        <div style={{ height: 12 }} />
        <button onClick={broadcast} disabled={busy}>{busy ? "Broadcasting…" : "Broadcast"}</button>
      </div>

      <div className="section-title">History</div>
      {items.map((a) => (
        <div key={a.id} className="card">
          <div className="row">
            <div className="grow">
              <div style={{ fontWeight: 700 }}>
                {a.title}
                <span className="badge accent">{a.target}</span>
              </div>
              <div style={{ color: "var(--text-dim)", fontSize: 12, marginTop: 4 }}>
                {a.createdAt?.toDate?.().toLocaleString?.() || ""}
              </div>
              <p style={{ marginTop: 8, marginBottom: 0 }}>{a.body}</p>
            </div>
            <div>
              <button className="danger" onClick={() => remove(a.id)}>Delete</button>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
