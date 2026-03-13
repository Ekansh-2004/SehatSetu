import type { 
  LoginFormValues, 
  RegisterFormValues, 
  ForgotPasswordFormValues,
  ChangePasswordFormValues,
  VerifyPhoneFormValues,
  VerifyEmailFormValues
} from "@/lib/schemas";

// Default form values
export const LOGIN_DEFAULT_VALUES: LoginFormValues = {
  email: "",
  password: "",
  rememberMe: false,
};

export const REGISTER_DEFAULT_VALUES: RegisterFormValues = {
  firstName: "",
  lastName: "",
  email: "",
  phone: "",
  password: "",
  confirmPassword: "",
  terms: false,
};

export const FORGOT_PASSWORD_DEFAULT_VALUES: ForgotPasswordFormValues = {
  email: "",
};

export const CHANGE_PASSWORD_DEFAULT_VALUES: ChangePasswordFormValues = {
  currentPassword: "",
  newPassword: "",
  confirmPassword: "",
};

export const VERIFY_PHONE_DEFAULT_VALUES: VerifyPhoneFormValues = {
  phone: "",
  code: "",
};

export const VERIFY_EMAIL_DEFAULT_VALUES: VerifyEmailFormValues = {
  code: "",
};

// Form field configurations
export const FORM_FIELD_CONFIG = {
  password: {
    minLength: 8,
    placeholder: "Must be at least 8 characters",
  },
  phone: {
    minLength: 10,
    placeholder: "+1 (555) 000-0000",
  },
  email: {
    placeholder: "your.email@example.com",
  },
  verificationCode: {
    placeholder: "000000",
    maxLength: 6,
  },
} as const;

// Auth-related constants
export const AUTH_ROUTES = {
  login: "/login",
  register: "/register",
  forgotPassword: "/forgot-password",
  changePassword: "/change-password",
  verifyPhone: "/verify-phone",
  verifyEmail: "/verify-email",
  terms: "/terms",
  privacy: "/privacy",
} as const;

// Visual content for different auth pages - Made generic for both doctors and patients
export const AUTH_VISUALS = {
  login: {
    title: "Welcome back",
    subtitle: "Sign in to your account to continue",
  },
  register: {
    title: "Create your account",
    subtitle: "Join our platform and get started today",
  },
  forgotPassword: {
    title: "Reset your password",
    subtitle: "Enter your email address and we'll send you a link to reset your password",
  },
  changePassword: {
    title: "Update your password",
    subtitle: "Choose a strong password to keep your account secure",
  },
  verifyPhone: {
    title: "Verify your phone number",
    subtitle: "We've sent a verification code to your phone number for added security",
  },
  verifyEmail: {
    title: "Verify your email address",
    subtitle: "Please enter the verification code we sent to your email",
  }
} as const;

export const MUSCLE_TERMS = [
  // Head & Neck
  "temporalis", "masseter", "occipitalis", "frontalis",
  "sternocleidomastoid", "scalenes", "splenius capitis", "splenius cervicis",
  "levator scapulae", "suboccipital muscles",

  // Shoulders & Upper Back
  "trapezius", "deltoid", "supraspinatus", "infraspinatus", "teres major", "teres minor",
  "subscapularis", "rhomboid major", "rhomboid minor", "latissimus dorsi",

  // Chest & Core
  "pectoralis major", "pectoralis minor", "serratus anterior", "intercostals",
  "rectus abdominis", "transversus abdominis", "external obliques", "internal obliques",
  "diaphragm", "erector spinae", "multifidus", "quadratus lumborum",

  // Arm & Forearm
  "biceps brachii", "brachialis", "triceps brachii", "coracobrachialis",
  "brachioradialis", "pronator teres", "supinator", "flexor carpi radialis",
  "flexor carpi ulnaris", "palmaris longus", "extensor carpi radialis", "extensor carpi ulnaris",
  "flexor digitorum", "extensor digitorum",

  // Pelvis & Hip
  "gluteus maximus", "gluteus medius", "gluteus minimus",
  "piriformis", "iliopsoas", "tensor fasciae latae", "adductor longus", "adductor brevis",
  "adductor magnus", "gracilis", "obturator internus", "obturator externus",
  "gemellus superior", "gemellus inferior", "quadratus femoris",

  // Thigh
  "quadriceps", "rectus femoris", "vastus lateralis", "vastus medialis", "vastus intermedius",
  "sartorius", "hamstrings", "biceps femoris", "semitendinosus", "semimembranosus",

  // Lower Leg
  "tibialis anterior", "gastrocnemius", "soleus", "plantaris", "fibularis longus",
  "fibularis brevis", "extensor hallucis longus", "flexor hallucis longus",
  "flexor digitorum longus", "extensor digitorum longus",

  // Foot (optional)
  "abductor hallucis", "flexor digitorum brevis", "abductor digiti minimi",

  // Misc (common alt names)
  "calf", "neck muscles", "core muscles", "lumbar muscles", "hip flexors", "hip extensors",
  "shoulder stabilizers", "rotator cuff"
]; 