// Shared OTP store for send and verify routes
export const otpStore = new Map<string, { code: string; expiresAt: number; email: string }>();

// Clean expired OTPs every 10 minutes
if (typeof setInterval !== 'undefined') {
  setInterval(() => {
    const now = Date.now();
    for (const [key, value] of otpStore.entries()) {
      if (value.expiresAt < now) {
        otpStore.delete(key);
      }
    }
  }, 10 * 60 * 1000);
}

