"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  User,
  Mail,
  Phone,
  Calendar,
  MapPin,
  Video,
  Stethoscope,
  ChevronRight,
  ChevronLeft,
  Check,
  Loader2,
  FileCheck,
} from "lucide-react";
import { toast } from "sonner";
import InstantBookingForm from "@/components/InstantBookingForm";

// Check if instant booking is enabled
const INSTANT_BOOKING_ENABLED = process.env.NEXT_PUBLIC_INSTANT_BOOKING === 'true';

interface PatientSession {
  id: string;
  name: string;
  email: string;
  phone?: string | null;
  dateOfBirth?: string | null;
  gender?: string | null;
  street?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

const steps = [
  { id: 1, title: "Personal Info", icon: User },
  { id: 2, title: "Address", icon: MapPin },
  { id: 3, title: "Review", icon: FileCheck },
];

export default function NewPatientFormPage() {
  const router = useRouter();
  const [patient, setPatient] = useState<PatientSession | null>(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [currentStep, setCurrentStep] = useState(1);

  const [formData, setFormData] = useState({
    // Personal Info
    name: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    // Address
    street: "",
    city: "",
    state: "",
    zipCode: "",
    // Emergency Contact
    emergencyContactName: "",
    emergencyContactPhone: "",
    emergencyContactRelationship: "",
    // Consultation preference
    consultationMode: "" as "video" | "physical" | "",
  });

  useEffect(() => {
    fetchPatientData();
  }, []);

  const fetchPatientData = async () => {
    try {
      const response = await fetch("/api/patient/session");
      const data = await response.json();

      if (data.success && data.patient) {
        setPatient(data.patient);
        
        // Format dateOfBirth for input field (YYYY-MM-DD)
        let formattedDOB = "";
        if (data.patient.dateOfBirth) {
          const dob = new Date(data.patient.dateOfBirth);
          formattedDOB = dob.toISOString().split('T')[0];
        }

        // Pre-fill form with patient data (autofill but keep editable)
        setFormData(prev => ({
          ...prev,
          name: data.patient.name || "",
          email: data.patient.email || "",
          phone: data.patient.phone || "",
          dateOfBirth: formattedDOB || "",
          gender: data.patient.gender || "",
          street: data.patient.street || "",
          city: data.patient.city || "",
          state: data.patient.state || "",
          zipCode: data.patient.zipCode || "",
        }));
      } else {
        router.push("/patient/sign-in");
      }
    } catch (error) {
      console.error("Error fetching patient data:", error);
      router.push("/patient/sign-in");
    } finally {
      setLoading(false);
    }
  };

  const validateStep = (step: number): boolean => {
    switch (step) {
      case 1:
        if (!formData.name || !formData.email || !formData.dateOfBirth || !formData.gender) {
          toast.error("Please fill in all required fields");
          return false;
        }
        // Validate phone if provided
        if (formData.phone && formData.phone.length < 10) {
          toast.error("Please enter a valid phone number");
          return false;
        }
        return true;
      case 2:
        // Address is optional
        return true;
      case 3:
        if (!formData.consultationMode) {
          toast.error("Please choose consultation type (Video or Physical)");
          return false;
        }
        return true;
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateStep(currentStep)) {
      setCurrentStep(prev => Math.min(prev + 1, 3));
    }
  };

  const handleBack = () => {
    setCurrentStep(prev => Math.max(prev - 1, 1));
  };

  const handleSubmit = async () => {
    if (!validateStep(currentStep)) return;

    setSubmitting(true);

    try {
      if (formData.consultationMode === "physical") {
        const locationCaptured = await new Promise<boolean>((resolve) => {
          if (!("geolocation" in navigator)) {
            toast.error("Location is required for physical consultation.");
            resolve(false);
            return;
          }

          navigator.geolocation.getCurrentPosition(
            async (position) => {
              try {
                const response = await fetch("/api/user/location", {
                  method: "POST",
                  headers: { "Content-Type": "application/json" },
                  body: JSON.stringify({
                    role: "patient",
                    latitude: position.coords.latitude,
                    longitude: position.coords.longitude,
                  }),
                });

                const data = await response.json().catch(() => ({}));
                if (!response.ok || !data.success) {
                  toast.error(data.error || "Failed to capture your location.");
                  resolve(false);
                  return;
                }

                resolve(true);
              } catch {
                toast.error("Failed to capture your location.");
                resolve(false);
              }
            },
            () => {
              toast.error("Please allow location access for physical consultation.");
              resolve(false);
            },
            {
              enableHighAccuracy: true,
              timeout: 12000,
              maximumAge: 0,
            }
          );
        });

        if (!locationCaptured) {
          setSubmitting(false);
          return;
        }
      }

      const response = await fetch("/api/patient-forms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...formData,
          phone: formData.phone || "",
          consultationMode: formData.consultationMode,
          // Send empty arrays for removed fields
          medicalHistory: [],
          allergies: [],
          currentMedications: [],
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Form submitted successfully!");
        router.push("/patient/dashboard/forms");
      } else {
        toast.error(data.error || "Failed to submit form");
      }
    } catch (error) {
      console.error("Error submitting form:", error);
      toast.error("An error occurred while submitting the form");
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-emerald-200 rounded-full animate-spin border-t-emerald-600 mx-auto" />
          <p className="mt-4 text-gray-500">Loading form...</p>
        </div>
      </div>
    );
  }

  // Render instant booking form if enabled
  if (INSTANT_BOOKING_ENABLED && patient) {
    return <InstantBookingForm patient={patient} />;
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="max-w-3xl mx-auto space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-gray-900">Patient Intake Form</h1>
        <p className="text-gray-500">Please provide your information</p>
      </motion.div>

      {/* Progress Steps */}
      <motion.div variants={itemVariants}>
        <div className="flex items-center justify-center gap-4">
          {steps.map((step, index) => {
            const StepIcon = step.icon;
            const isActive = currentStep === step.id;
            const isCompleted = currentStep > step.id;

            return (
              <div key={step.id} className="flex items-center">
                <div
                  className={`flex items-center gap-2 px-4 py-2 rounded-full transition-all ${
                    isActive
                      ? "bg-emerald-100 text-emerald-700 border border-emerald-200"
                      : isCompleted
                      ? "bg-emerald-50 text-emerald-600"
                      : "bg-gray-100 text-gray-400"
                  }`}
                >
                  <div className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                    isCompleted
                      ? "bg-emerald-600 text-white"
                      : isActive
                      ? "bg-emerald-200 text-emerald-700"
                      : "bg-gray-200 text-gray-500"
                  }`}>
                    {isCompleted ? <Check className="h-3 w-3" /> : step.id}
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">{step.title}</span>
                </div>
                {index < steps.length - 1 && (
                  <div className={`w-12 lg:w-20 h-0.5 mx-2 ${
                    isCompleted ? "bg-emerald-500" : "bg-gray-200"
                  }`} />
                )}
              </div>
            );
          })}
        </div>
      </motion.div>

      {/* Form Card */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardHeader>
            <CardTitle className="text-gray-900 flex items-center gap-2">
              {(() => {
                const CurrentIcon = steps[currentStep - 1].icon;
                return <CurrentIcon className="h-5 w-5 text-emerald-600" />;
              })()}
              {steps[currentStep - 1].title}
            </CardTitle>
            <CardDescription>
              {currentStep === 1 && "Enter your basic personal information"}
              {currentStep === 2 && "Provide your address and emergency contact"}
              {currentStep === 3 && "Review your information before submitting"}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Step 1: Personal Info */}
            {currentStep === 1 && (
              <div className="space-y-4">
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Full Name *</Label>
                    <div className="relative">
                      <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        value={formData.name}
                        onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                        className="pl-10"
                        placeholder="John Doe"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Email *</Label>
                    <div className="relative">
                      <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="email"
                        value={formData.email}
                        onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                        className="pl-10"
                        placeholder="john@example.com"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label>Phone Number <span className="text-gray-400 text-xs">(Optional)</span></Label>
                    <div className="relative">
                      <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="tel"
                        value={formData.phone}
                        onChange={(e) => setFormData(prev => ({ ...prev, phone: e.target.value }))}
                        className="pl-10"
                        placeholder="+1 (555) 123-4567"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Date of Birth *</Label>
                    <div className="relative">
                      <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                      <Input
                        type="date"
                        value={formData.dateOfBirth}
                        onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                        className="pl-10"
                        required
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Gender *</Label>
                  <Select
                    value={formData.gender}
                    onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select gender" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="male">Male</SelectItem>
                      <SelectItem value="female">Female</SelectItem>
                      <SelectItem value="other">Other</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              </div>
            )}

            {/* Step 2: Address */}
            {currentStep === 2 && (
              <div className="space-y-6">
                <div className="space-y-4">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Address</h3>
                  
                  <div className="space-y-2">
                    <Label>Street Address</Label>
                    <Input
                      value={formData.street}
                      onChange={(e) => setFormData(prev => ({ ...prev, street: e.target.value }))}
                      placeholder="123 Main St"
                    />
                  </div>

                  <div className="grid gap-4 sm:grid-cols-3">
                    <div className="space-y-2">
                      <Label>City</Label>
                      <Input
                        value={formData.city}
                        onChange={(e) => setFormData(prev => ({ ...prev, city: e.target.value }))}
                        placeholder="New York"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>State</Label>
                      <Input
                        value={formData.state}
                        onChange={(e) => setFormData(prev => ({ ...prev, state: e.target.value }))}
                        placeholder="NY"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>ZIP Code</Label>
                      <Input
                        value={formData.zipCode}
                        onChange={(e) => setFormData(prev => ({ ...prev, zipCode: e.target.value }))}
                        placeholder="10001"
                      />
                    </div>
                  </div>
                </div>

                <div className="space-y-4 pt-4 border-t border-gray-100">
                  <h3 className="text-sm font-medium text-gray-500 uppercase tracking-wide">Emergency Contact</h3>
                  
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Contact Name</Label>
                      <Input
                        value={formData.emergencyContactName}
                        onChange={(e) => setFormData(prev => ({ ...prev, emergencyContactName: e.target.value }))}
                        placeholder="Jane Doe"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Contact Phone</Label>
                      <Input
                        type="tel"
                        value={formData.emergencyContactPhone}
                        onChange={(e) => setFormData(prev => ({ ...prev, emergencyContactPhone: e.target.value }))}
                        placeholder="+1 (555) 987-6543"
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <Label>Relationship</Label>
                    <Select
                      value={formData.emergencyContactRelationship}
                      onValueChange={(value) => setFormData(prev => ({ ...prev, emergencyContactRelationship: value }))}
                    >
                      <SelectTrigger>
                        <SelectValue placeholder="Select relationship" />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="spouse">Spouse</SelectItem>
                        <SelectItem value="parent">Parent</SelectItem>
                        <SelectItem value="sibling">Sibling</SelectItem>
                        <SelectItem value="child">Child</SelectItem>
                        <SelectItem value="friend">Friend</SelectItem>
                        <SelectItem value="other">Other</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            )}

            {/* Step 3: Review */}
            {currentStep === 3 && (
              <div className="space-y-6">
                {/* Personal Information Review */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                    <User className="h-5 w-5 text-emerald-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Personal Information</h3>
                  </div>
                  <div className="grid gap-4 sm:grid-cols-2">
                    <div>
                      <p className="text-sm text-gray-500">Full Name</p>
                      <p className="text-gray-900 font-medium mt-1">{formData.name || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Email</p>
                      <p className="text-gray-900 font-medium mt-1">{formData.email || "—"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Phone Number</p>
                      <p className="text-gray-900 font-medium mt-1">{formData.phone || "Not provided"}</p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Date of Birth</p>
                      <p className="text-gray-900 font-medium mt-1">
                        {formData.dateOfBirth 
                          ? new Date(formData.dateOfBirth).toLocaleDateString("en-US", {
                              month: "long",
                              day: "numeric",
                              year: "numeric",
                            })
                          : "—"}
                      </p>
                    </div>
                    <div>
                      <p className="text-sm text-gray-500">Gender</p>
                      <p className="text-gray-900 font-medium mt-1 capitalize">{formData.gender || "—"}</p>
                    </div>
                  </div>
                </div>

                {/* Address Review */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                    <MapPin className="h-5 w-5 text-blue-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Address</h3>
                  </div>
                  {(formData.street || formData.city || formData.state || formData.zipCode) ? (
                    <div className="space-y-2">
                      {formData.street && (
                        <p className="text-gray-900">{formData.street}</p>
                      )}
                      <p className="text-gray-900">
                        {[formData.city, formData.state, formData.zipCode]
                          .filter(Boolean)
                          .join(", ") || "—"}
                      </p>
                    </div>
                  ) : (
                    <p className="text-gray-500">Not provided</p>
                  )}
                </div>

                {/* Emergency Contact Review */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                    <Phone className="h-5 w-5 text-violet-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Emergency Contact</h3>
                  </div>
                  {formData.emergencyContactName || formData.emergencyContactPhone ? (
                    <div className="space-y-2">
                      {formData.emergencyContactName && (
                        <div>
                          <p className="text-sm text-gray-500">Contact Name</p>
                          <p className="text-gray-900 font-medium mt-1">{formData.emergencyContactName}</p>
                        </div>
                      )}
                      {formData.emergencyContactPhone && (
                        <div>
                          <p className="text-sm text-gray-500">Contact Phone</p>
                          <p className="text-gray-900 font-medium mt-1">{formData.emergencyContactPhone}</p>
                        </div>
                      )}
                      {formData.emergencyContactRelationship && (
                        <div>
                          <p className="text-sm text-gray-500">Relationship</p>
                          <p className="text-gray-900 font-medium mt-1 capitalize">{formData.emergencyContactRelationship}</p>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-gray-500">Not provided</p>
                  )}
                </div>

                {/* Consultation Mode */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2 pb-2 border-b border-gray-200">
                    <Video className="h-5 w-5 text-indigo-600" />
                    <h3 className="text-lg font-semibold text-gray-900">Consultation Type *</h3>
                  </div>
                  <div className="grid sm:grid-cols-2 gap-3">
                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, consultationMode: "video" }))}
                      className={`p-4 rounded-xl border text-left transition ${
                        formData.consultationMode === "video"
                          ? "border-indigo-500 bg-indigo-50"
                          : "border-gray-200 hover:border-indigo-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Video className="h-4 w-4 text-indigo-600" />
                        <p className="font-medium text-gray-900">Video Consultation</p>
                      </div>
                      <p className="text-sm text-gray-600">Talk to doctor online via video call.</p>
                    </button>

                    <button
                      type="button"
                      onClick={() => setFormData((prev) => ({ ...prev, consultationMode: "physical" }))}
                      className={`p-4 rounded-xl border text-left transition ${
                        formData.consultationMode === "physical"
                          ? "border-emerald-500 bg-emerald-50"
                          : "border-gray-200 hover:border-emerald-300"
                      }`}
                    >
                      <div className="flex items-center gap-2 mb-1">
                        <Stethoscope className="h-4 w-4 text-emerald-600" />
                        <p className="font-medium text-gray-900">Physical Consultation</p>
                      </div>
                      <p className="text-sm text-gray-600">Visit clinic/hospital for in-person consultation.</p>
                    </button>
                  </div>
                </div>

                {/* Info Box */}
                <div className="p-4 bg-blue-50 rounded-lg border border-blue-100">
                  <p className="text-sm text-blue-700">
                    Please review all information carefully. You can go back to make changes if needed.
                  </p>
                </div>
              </div>
            )}

            {/* Navigation Buttons */}
            <div className="flex justify-between pt-6 border-t border-gray-100">
              <Button
                variant="outline"
                onClick={handleBack}
                disabled={currentStep === 1}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />
                Back
              </Button>

              {currentStep < 3 ? (
                <Button
                  onClick={handleNext}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  Next
                  <ChevronRight className="h-4 w-4 ml-1" />
                </Button>
              ) : (
                <Button
                  onClick={handleSubmit}
                  disabled={submitting}
                  className="bg-emerald-600 hover:bg-emerald-700 text-white"
                >
                  {submitting ? (
                    <>
                      <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                      Submitting...
                    </>
                  ) : (
                    <>
                      <Check className="h-4 w-4 mr-2" />
                      Submit Form
                    </>
                  )}
                </Button>
              )}
            </div>
          </CardContent>
        </Card>
      </motion.div>
    </motion.div>
  );
}
