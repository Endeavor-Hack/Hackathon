// lib/feedRanking.js
// Personalised feed ranking. The brief requires the feed to "behave
// differently for students, alumni, and business users" — this is that
// per-role weighting. Kept simple + explainable rather than opaque.
//
// Score components (all additive):
//   +50 recency  — decayed by hours since posted
//   +30 from a direct connection
//   +15 role-affinity per role type
//   +10 if the post is video content (student/alumni feeds preference it)
//   +5  per like (small popularity signal)

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
      // Students prefer alumni posts (mentorship) and student peer content
      // Alumni prefer student posts (nurture the next cohort) and other alumni
      // Businesses prefer student/alumni content (candidate discovery)
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

      // Never surface a user's own post at the very top unless it's brand new.
      if (p.authorId === myUid && hours > 1) score -= 15;

      return { ...p, __score: score };
    })
    .sort((a, b) => b.__score - a.__score);
}

// Smart job matching: score an opportunity for a student profile.
// Used by the notifications trigger and by an "Recommended" section on
// the Opportunities screen.
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
