import { useEffect, useMemo, useState } from "react";
import {
  collection, onSnapshot, doc, updateDoc, deleteDoc, serverTimestamp,
  query, where, getDocs, addDoc,
} from "firebase/firestore";
import { db } from "../firebase";

// Same scoring the mobile client uses — kept in step by hand to avoid
// a shared package (the admin-web workspace is intentionally separate).
function scoreOpportunity(opp, profile) {
  const oppSkills = (opp.skillsRequired || []).map((s) => s.toLowerCase());
  const mySkills = (profile.skills || []).map((s) => s.toLowerCase());
  const overlap = oppSkills.filter((s) => mySkills.includes(s)).length;
  let score = overlap * 15;
  if (opp.programme && profile.programme && opp.programme.toLowerCase() === profile.programme.toLowerCase()) score += 25;
  if (opp.location && profile.campus && opp.location.toLowerCase().includes(profile.campus.toLowerCase())) score += 10;
  return score;
}

export default function Opportunities() {
  const [items, setItems] = useState([]);
  const [filter, setFilter] = useState("pending");

  useEffect(() => {
    return onSnapshot(collection(db, "opportunities"), (snap) => {
      const list = snap.docs.map((d) => ({ id: d.id, ...d.data() }));
      list.sort((a, b) => (b.createdAt?.seconds || 0) - (a.createdAt?.seconds || 0));
      setItems(list);
    });
  }, []);

  const filtered = useMemo(() => {
    if (filter === "all") return items;
    return items.filter((o) => o.status === filter);
  }, [items, filter]);

  async function approve(id) {
    await updateDoc(doc(db, "opportunities", id), {
      status: "approved",
      approvedAt: serverTimestamp(),
    });
    // Smart job matching: find students+alumni whose profile aligns with
    // this listing and notify only them. The brief requires matching
    // logic, not a generic broadcast to everyone.
    const opp = items.find((o) => o.id === id);
    if (opp) await notifyMatches({ ...opp, id });
  }

  async function notifyMatches(opp) {
    const usersSnap = await getDocs(query(
      collection(db, "users"),
      where("status", "==", "active"),
      where("role", "in", ["student", "alumni"]),
    ));
    for (const d of usersSnap.docs) {
      const profile = { id: d.id, ...d.data() };
      const score = scoreOpportunity(opp, profile);
      if (score >= 20) {
        await addDoc(collection(db, "notifications"), {
          userId: profile.id,
          type: "opportunity_match",
          message: `New opportunity that matches your profile: "${opp.title}" at ${opp.companyName}`,
          relatedId: opp.id,
          matchScore: score,
          read: false,
          createdAt: serverTimestamp(),
        });
      }
    }
  }
  async function reject(id) {
    await updateDoc(doc(db, "opportunities", id), { status: "rejected" });
  }
  async function remove(id) {
    if (!confirm("Permanently remove this listing?")) return;
    await deleteDoc(doc(db, "opportunities", id));
  }

  return (
    <>
      <h2>Opportunity approval</h2>
      <p className="subtitle">Listings posted by businesses go live only after admin approval.</p>

      <div style={{ marginBottom: 16, display: "flex", gap: 8 }}>
        {["pending", "approved", "rejected", "all"].map((f) => (
          <button key={f} className={f === filter ? "" : "secondary"} onClick={() => setFilter(f)}>
            {f} ({f === "all" ? items.length : items.filter((o) => o.status === f).length})
          </button>
        ))}
      </div>

      {filtered.length === 0 && <p className="subtitle">Nothing to review right now.</p>}

      {filtered.map((o) => (
        <div key={o.id} className="card">
          <div className="row">
            <div className="grow">
              <div style={{ fontWeight: 700 }}>
                {o.title}
                <span className={"badge " + (o.status === "approved" ? "good" : o.status === "pending" ? "warn" : "danger")}>{o.status}</span>
                <span className="badge accent">{o.type}</span>
              </div>
              <div style={{ color: "var(--text-dim)", fontSize: 12, marginTop: 4 }}>
                {o.companyName} · {o.location || "—"}
              </div>
              {o.description && <p style={{ marginTop: 8, marginBottom: 0 }}>{o.description}</p>}
              {(o.skillsRequired || []).length > 0 && (
                <div style={{ marginTop: 8, display: "flex", gap: 6, flexWrap: "wrap" }}>
                  {o.skillsRequired.map((s) => <span key={s} className="badge">{s}</span>)}
                </div>
              )}
            </div>
            <div style={{ display: "flex", gap: 6 }}>
              {o.status === "pending" && <button onClick={() => approve(o.id)}>Approve</button>}
              {o.status !== "rejected" && <button className="secondary" onClick={() => reject(o.id)}>Reject</button>}
              <button className="danger" onClick={() => remove(o.id)}>Remove</button>
            </div>
          </div>
        </div>
      ))}
    </>
  );
}
