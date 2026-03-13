"use client";

import { useState, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import {
  FileText,
  Clock,
  CheckCircle2,
  Search,
  Eye,
  ChevronRight,
  Calendar,
  Filter,
  CalendarPlus,
  ArrowLeft,
} from "lucide-react";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface FormSubmission {
  id: string;
  name: string;
  email: string;
  phone: string;
  dateOfBirth: string;
  gender: string;
  status: string;
  createdAt: string;
  notes?: string;
  medicalHistory?: string[];
  allergies?: string[];
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

export default function PatientFormsPage() {
  const router = useRouter();
  const [forms, setForms] = useState<FormSubmission[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [instantBookingEnabled, setInstantBookingEnabled] = useState(false);

  const fetchForms = useCallback(async () => {
    try {
      const response = await fetch("/api/patient/forms");
      const data = await response.json();

      if (data.success) {
        setForms(data.data || []);
      }
    } catch (error) {
      console.error("Error fetching forms:", error);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    setInstantBookingEnabled(process.env.NEXT_PUBLIC_INSTANT_BOOKING === 'true');
    fetchForms();
  }, [fetchForms]);

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
    return configs[status.toLowerCase()] || configs.pending;
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  const filteredForms = forms.filter((form) => {
    const matchesSearch =
      form.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      form.email.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = statusFilter === "all" || form.status === statusFilter;
    return matchesSearch && matchesStatus;
  });

  if (loading) {
    return (
      <div className="space-y-4">
        {[...Array(3)].map((_, i) => (
          <div key={i} className="h-24 bg-gray-100 rounded-xl animate-pulse" />
        ))}
      </div>
    );
  }

  // Show message when instant booking is enabled
  if (instantBookingEnabled) {
    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-6"
      >
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="py-16 text-center">
            <div className="p-4 bg-emerald-100 rounded-full w-fit mx-auto mb-6">
              <CalendarPlus className="h-12 w-12 text-emerald-600" />
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-3">
              Instant Booking Enabled
            </h3>
            <p className="text-gray-500 max-w-md mx-auto mb-6">
              With instant booking, you can directly book appointments with available doctors 
              without submitting intake forms. Your appointment history is available in the 
              Appointments section.
            </p>
            <div className="flex flex-col sm:flex-row gap-3 justify-center">
              <Button
                onClick={() => router.push("/patient/dashboard/forms/new")}
                className="bg-emerald-600 hover:bg-emerald-700 text-white"
              >
                <CalendarPlus className="h-4 w-4 mr-2" />
                Book an Appointment
              </Button>
              <Button
                variant="outline"
                onClick={() => router.push("/patient/dashboard")}
                className="border-gray-200"
              >
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back to Dashboard
              </Button>
            </div>
          </CardContent>
        </Card>
      </motion.div>
    );
  }

  return (
    <motion.div
      variants={containerVariants}
      initial="hidden"
      animate="visible"
      className="space-y-6"
    >
      {/* Header */}
      <motion.div variants={itemVariants}>
        <h1 className="text-2xl font-bold text-gray-900">My Forms</h1>
        <p className="text-gray-500">View and manage your submitted intake forms</p>
      </motion.div>

      {/* Filters */}
      <motion.div variants={itemVariants}>
        <Card className="bg-white border-gray-200 shadow-sm">
          <CardContent className="p-4">
            <div className="flex flex-col sm:flex-row gap-4">
              <div className="relative flex-1">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  placeholder="Search forms..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-10"
                />
              </div>
              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger className="w-full sm:w-48">
                  <Filter className="h-4 w-4 mr-2 text-gray-400" />
                  <SelectValue placeholder="Filter by status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="pending">Pending</SelectItem>
                  <SelectItem value="reviewed">Reviewed</SelectItem>
                  <SelectItem value="slots_sent">Slots Sent</SelectItem>
                  <SelectItem value="slots_confirmed">Confirmed</SelectItem>
                  <SelectItem value="appointment_booked">Booked</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>
      </motion.div>

      {/* Forms List */}
      {filteredForms.length === 0 ? (
        <motion.div variants={itemVariants}>
          <Card className="bg-white border-gray-200 shadow-sm">
            <CardContent className="py-16 text-center">
              <FileText className="h-16 w-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-700 mb-2">No Forms Found</h3>
              <p className="text-gray-500 mb-6">
                {searchQuery || statusFilter !== "all"
                  ? "No forms match your search criteria"
                  : "You haven't submitted any intake forms yet"}
              </p>
              <p className="text-sm text-gray-400">
                Use the "New Intake Form" button in the navigation bar to submit your first form.
              </p>
            </CardContent>
          </Card>
        </motion.div>
      ) : (
        <motion.div variants={containerVariants} className="space-y-4">
          {filteredForms.map((form) => {
            const statusConfig = getStatusConfig(form.status);
            const StatusIcon = statusConfig.icon;
            // Calculate form number based on original forms array (most recent = highest number)
            const originalIndex = forms.findIndex(f => f.id === form.id);
            const formNumber = forms.length - originalIndex;

            return (
              <motion.div key={form.id} variants={itemVariants}>
                <Card 
                  className="bg-white border-gray-200 hover:border-emerald-300 hover:shadow-md transition-all cursor-pointer group shadow-sm"
                  onClick={() => router.push(`/patient/dashboard/forms/${form.id}`)}
                >
                  <CardContent className="p-6">
                    <div className="flex items-start justify-between">
                      <div className="flex items-start gap-4 flex-1">
                        <div className="p-3 bg-emerald-100 rounded-xl">
                          <FileText className="h-6 w-6 text-emerald-600" />
                        </div>
                        <div className="space-y-2 flex-1">
                          <div className="flex items-center gap-3">
                            <h3 className="font-semibold text-gray-900">Intake Form #{formNumber}</h3>
                            <Badge className={statusConfig.color}>
                              <StatusIcon className="h-3 w-3 mr-1" />
                              {statusConfig.label}
                            </Badge>
                          </div>
                          <div className="flex flex-wrap items-center gap-4 text-sm text-gray-500">
                            <span className="flex items-center gap-1">
                              <Calendar className="h-3.5 w-3.5" />
                              Submitted {formatDate(form.createdAt)}
                            </span>
                            <span>{form.name}</span>
                          </div>
                          {form.notes && (
                            <p className="text-sm text-gray-500 bg-gray-50 px-3 py-2 rounded-lg">
                              <span className="font-medium text-gray-600">Staff Notes:</span> {form.notes}
                            </p>
                          )}
                          {form.slotOffers && form.slotOffers.length > 0 && (
                            <div className="mt-3">
                              <p className="text-xs text-violet-600 mb-2">Slot offers available:</p>
                              <div className="flex flex-wrap gap-2">
                                {form.slotOffers.map((offer) => (
                                  <Badge
                                    key={offer.id}
                                    variant="outline"
                                    className="border-violet-200 text-violet-600"
                                  >
                                    {offer.doctorName} • {offer.status}
                                  </Badge>
                                ))}
                              </div>
                            </div>
                          )}
                        </div>
                      </div>
                      <div className="opacity-0 group-hover:opacity-100 transition-opacity">
                        <ChevronRight className="h-5 w-5 text-gray-400" />
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </motion.div>
      )}
    </motion.div>
  );
}
