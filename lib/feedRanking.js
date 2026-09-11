// How the home feed and the opportunities screen decide what goes at
// the top. The brief asks for a feed that "behaves differently for
// students, alumni, and business users" — the per-role affinity bit
// below is where that happens.
//
// Everything here is explainable on purpose. If a demo attendee asks
// why a specific post is ranked #1, we can walk them through the
// score add-up rather than pointing at a black box.
//
// Score components (all additive):
//   +50 recency     — decays with hours since posted
//   +30 connection  — post is from a direct connection
//   +15–20 affinity — how relevant this author's role is to the viewer
//   +10 video       — video posts float up a bit
//   +5 per like     — small popularity nudge, capped at 100
//   −15 self post   — your own post stops hogging the top after 1h

const HOURS_MS = 1000 * 60 * 60;

export function rankFeed(posts, ctx) {
  const { myUid, role, connectionIds } = ctx;
  const now = Date.now();

  return posts
    .map((p) => {
      const ts = p.createdAt?.toDate ? p.createdAt.toDate().getTime() : 0;
      const hours = ts ? Math.max(1, (now - ts) / HOURS_MS) : 24 * 30;
      let score = 50 / Math.log2(hours + 2);

      if (connectionIds?.has?.(p.authorId)) score += 30;

      // Per-role affinity:
      // • Students prefer alumni content (mentorship value) + peers
      // • Alumni prefer student content (grow the next cohort) + alumni
      // • Businesses prefer student/alumni content (talent discovery)
      if (role === "student") {
        if (p.authorRole === "alumni") score += 20;
        else if (p.authorRole === "student") score += 15;
      } else if (role === "alumni") {
        if (p.authorRole === "student") score += 18;
        else if (p.authorRole === "alumni") score += 15;
      } else if (role === "business") {
        if (p.authorRole === "student" || p.authorRole === "alumni") score += 18;
      }

      if (p.videoUrl) score += 10;
      score += Math.min(20, (p.likedBy?.length || 0)) * 5;

      // Your own post shouldn't camp at the top of your own feed after
      // the first hour — you already know what you posted.
      if (p.authorId === myUid && hours > 1) score -= 15;

      return { ...p, __score: score };
    })
    .sort((a, b) => b.__score - a.__score);
}

// Score an opportunity against a student profile. Used both by the
// "Recommended for you" strip on the opportunities screen and by the
// admin approval flow to decide who gets an opportunity_match
// notification when a listing goes live.
export function scoreOpportunity(opp, profile) {
  if (!profile) return 0;
  const oppSkills = (opp.skillsRequired || []).map((s) => s.toLowerCase());
  const mySkills = (profile.skills || []).map((s) => s.toLowerCase());
  const overlap = oppSkills.filter((s) => mySkills.includes(s)).length;

  let score = overlap * 15;
  if (opp.programme && profile.programme && opp.programme.toLowerCase() === profile.programme.toLowerCase()) {
    score += 25;
  }
  if (opp.location && profile.campus && opp.location.toLowerCase().includes(profile.campus.toLowerCase())) {
    score += 10;
  }
  return score;
}
