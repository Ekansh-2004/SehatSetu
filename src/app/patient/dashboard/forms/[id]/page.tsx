"use client";

import { useState, useEffect, use } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  FileText,
  User,
  MapPin,
  Clock,
  CheckCircle2,
  ChevronLeft,
  Stethoscope,
  Eye,
  Calendar,
} from "lucide-react";

interface FormSubmission {
  id: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  street?: string;
  city?: string;
  state?: string;
  zipCode?: string;
  emergencyContactName?: string;
  emergencyContactPhone?: string;
  emergencyContactRelationship?: string;
  medicalHistory: string[];
  allergies: string[];
  currentMedications: string[];
  insuranceProvider?: string;
  insurancePolicyNumber?: string;
  insuranceGroupNumber?: string;
  status: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  slotOffers?: Array<{
    id: string;
    status: string;
    doctorName: string;
    slots: any;
    patientConfirmedSlot: any;
  }>;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { opacity: 1, transition: { staggerChildren: 0.05 } }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function FormDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const router = useRouter();
  const [form, setForm] = useState<FormSubmission | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchFormData();
  }, [id]);

  const fetchFormData = async () => {
    try {
      // Fetch all patient forms and find the one with matching ID
      const response = await fetch("/api/patient/forms");
      const data = await response.json();

      if (data.success && data.data) {
        const matchedForm = data.data.find((f: FormSubmission) => f.id === id);
        if (matchedForm) {
          setForm(matchedForm);
        } else {
          router.push("/patient/dashboard/forms");
        }
      }
    } catch (error) {
      console.error("Error fetching form:", error);
      router.push("/patient/dashboard/forms");
    } finally {
      setLoading(false);
    }
  };

  const getStatusConfig = (status: string) => {
    const configs: Record<string, { color: string; icon: typeof Clock; label: string }> = {
      pending: {
        color: "bg-amber-100 text-amber-700 border-amber-200",
        icon: Clock,
        label: "Pending Review",
      },
      reviewed: {
        color: "bg-blue-100 text-blue-700 border-blue-200",
        icon: Eye,
        label: "Reviewed",
      },
      slots_sent: {
        color: "bg-violet-100 text-violet-700 border-violet-200",
        icon: Calendar,
        label: "Slots Offered",
      },
      slots_confirmed: {
        color: "bg-emerald-100 text-emerald-700 border-emerald-200",
        icon: CheckCircle2,
        label: "Slot Confirmed",
      },
      appointment_booked: {
        color: "bg-emerald-100 text-emerald-700 border-emerald-200",
        icon: CheckCircle2,
        label: "Appointment Booked",
      },
    };
    return configs[status?.toLowerCase()] || configs.pending;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      weekday: "long",
      month: "long",
      day: "numeric",
      year: "numeric",
    });
  };

  const formatDateShort = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
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

  if (!form) {
    return null;
  }

  const statusConfig = getStatusConfig(form.status);
  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Back Button & Header */}
      <motion.div variants={itemVariants} className="space-y-4">
        <Button
          variant="ghost"
          onClick={() => router.push("/patient/dashboard/forms")}
          className="text-gray-500 hover:text-gray-700 hover:bg-gray-100 -ml-2"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back to Forms
        </Button>

        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-2xl font-bold text-gray-900">Intake Form Details</h1>
              <Badge className={statusConfig.color}>
                <StatusIcon className="h-3 w-3 mr-1" />
                {statusConfig.label}
              </Badge>
            </div>
            <p className="text-gray-500 mt-1 flex items-center gap-2">
              <Clock className="h-4 w-4" />
              Submitted on {formatDate(form.createdAt)}
            </p>
          </div>
        </div>
      </motion.div>

      {/* Staff Notes */}
      {form.notes && (
        <motion.div variants={itemVariants}>
          <Card className="bg-blue-50 border-blue-100 shadow-sm">
            <CardContent className="p-4">
              <div className="flex items-start gap-3">
                <div className="p-2 bg-blue-100 rounded-lg">
                  <Stethoscope className="h-5 w-5 text-blue-600" />
                </div>
                <div>
                  <p className="font-medium text-blue-700">Staff Notes</p>
                  <p className="text-sm text-gray-700 mt-1">{form.notes}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {/* Slot Offers */}
      {form.slotOffers && form.slotOffers.length > 0 && (
        <motion.div variants={itemVariants}>
          <Card className="bg-violet-50 border-violet-100 shadow-sm">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <Calendar className="h-5 w-5 text-violet-600" />
                Appointment Slot Offers
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              {form.slotOffers.map((offer) => (
                <div
                  key={offer.id}
                  className="p-4 bg-white rounded-xl border border-gray-100"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium text-gray-900">{offer.doctorName}</p>
                      <p className="text-sm text-gray-500 capitalize">{offer.status}</p>
                    </div>
                    {offer.patientConfirmedSlot && (
                      <Badge className="bg-emerald-100 text-emerald-700 border-emerald-200">
                        <CheckCircle2 className="h-3 w-3 mr-1" />
                        Confirmed
                      </Badge>
                    )}
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>
        </motion.div>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Personal Information */}
        <motion.div variants={itemVariants}>
          <Card className="bg-white border-gray-200 shadow-sm h-full">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <User className="h-5 w-5 text-emerald-600" />
                Personal Information
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid gap-4 sm:grid-cols-2">
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Full Name</p>
                  <p className="text-gray-900 mt-1">{form.name}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Email</p>
                  <p className="text-gray-900 mt-1">{form.email}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Phone</p>
                  <p className="text-gray-900 mt-1">{form.phone || "Not provided"}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Date of Birth</p>
                  <p className="text-gray-900 mt-1">{formatDateShort(form.dateOfBirth)}</p>
                </div>
                <div>
                  <p className="text-xs text-gray-400 uppercase tracking-wide">Gender</p>
                  <p className="text-gray-900 mt-1 capitalize">{form.gender}</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </motion.div>

        {/* Address & Emergency Contact */}
        <motion.div variants={itemVariants}>
          <Card className="bg-white border-gray-200 shadow-sm h-full">
            <CardHeader>
              <CardTitle className="text-gray-900 flex items-center gap-2">
                <MapPin className="h-5 w-5 text-blue-600" />
                Address & Emergency Contact
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-6">
              <div>
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Address</p>
                {form.street || form.city || form.state || form.zipCode ? (
                  <p className="text-gray-900">
                    {form.street && <span>{form.street}<br /></span>}
                    {form.city && <span>{form.city}, </span>}
                    {form.state && <span>{form.state} </span>}
                    {form.zipCode && <span>{form.zipCode}</span>}
                  </p>
                ) : (
                  <p className="text-gray-400">Not provided</p>
                )}
              </div>

              <div className="pt-4 border-t border-gray-100">
                <p className="text-xs text-gray-400 uppercase tracking-wide mb-2">Emergency Contact</p>
                {form.emergencyContactName ? (
                  <div className="space-y-1">
                    <p className="text-gray-900">{form.emergencyContactName}</p>
                    <p className="text-sm text-gray-500">{form.emergencyContactPhone}</p>
                    {form.emergencyContactRelationship && (
                      <p className="text-sm text-gray-400 capitalize">{form.emergencyContactRelationship}</p>
                    )}
                  </div>
                ) : (
                  <p className="text-gray-400">Not provided</p>
                )}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      </div>

    </motion.div>
  );
}
