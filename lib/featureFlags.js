// Central switchboard for anything that depends on Cloud Functions
// being deployed. If you flip one of these to `true` but the matching
// function isn't live yet, the app will surface 404s to the user — so
// the defaults here should mirror what's actually deployed.
//
// To spin the backend up for the first time:
//   cd functions && npm install && firebase deploy --only functions
// (plus the corresponding secrets — see functions/index.js for which
// ones each feature needs).

export const featureFlags = {
  // Backed by sendSignupOtp / verifySignupOtp / sendPasswordResetOtp /
  // resetPasswordWithOtp + EMAIL_USER + EMAIL_PASSWORD secrets.
  //
  // If false, signup writes emailVerified: true immediately and the
  // /verify-otp screen is skipped. The Forgot-password link is also
  // hidden so it doesn't lead nowhere.
  otpVerification: true,

  // Backed by chatWithAssistant, parseCvText, analyzeCv,
  // generateInterviewQuestions, getInterviewFeedback + GROQ_API_KEY.
  //
  // If false, the AI-flavoured quicklinks (Interview prep, CV checker,
  // AI assistant) and the CV auto-fill button on the profile are hidden.
  aiFeatures: true,

  // Backed by the processVideo Storage-triggered Cloud Function on
  // the Blaze plan.
  //
  // If false, the "Add video" button in the post composer is hidden.
  // Posts that were created with a video before turning this off will
  // still show their thumbnail if the function ran successfully.
  videoTranscoding: true,
};
