"use client";

import { useEffect } from "react";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  doctorRegistrationSchema,
  type DoctorRegistrationData,
} from "@/lib/validation/schemas";
import { useAppSelector } from "@/store/hooks";
import { fetchDoctorInfo, updateDoctorProfile } from "@/store/api/doctorApi";

interface DoctorRegistrationModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function DoctorRegistrationModal({
  isOpen,
  onClose,
}: DoctorRegistrationModalProps) {
  const doctor = useAppSelector((state) => state.doctor.doctor.data);
  const error = useAppSelector((state) => state.doctor.doctor.error);

  useEffect(() => {
    const fetchDoctor = async () => {
      const doctor = await fetchDoctorInfo();
      console.log("Doctor data:", doctor);
    };
    fetchDoctor();
  }, []);

  const form = useForm<DoctorRegistrationData>({
    resolver: zodResolver(doctorRegistrationSchema),
    defaultValues: {
      name: doctor?.name || "",
      email: doctor?.email || "",
      phone: doctor?.phone || "",
      specialty: doctor?.specialty || "",
      experience: doctor?.experience || 0,
      rating: doctor?.rating || 0,
      consultationFee: doctor?.consultationFee || 0,
      location: doctor?.location || "",
      bio: doctor?.bio || "",
      education: doctor?.education || [""],
      languages: doctor?.languages || ["English"],
    },
  });

  // Autofill form when initialData changes
  useEffect(() => {
    if (doctor) {
      form.reset({
        name: doctor.name || "",
        email: doctor.email || "",
        phone: doctor.phone || "",
        specialty: doctor.specialty || "",
        experience: doctor.experience || 0,
        rating: doctor.rating || 0,
        consultationFee: doctor.consultationFee || 0,
        location: doctor.location || "",
        bio: doctor.bio || "",
        education: doctor.education || [""],
        languages: doctor.languages || ["English"],
      });
    }
  }, [doctor, form]);

  const onSubmit = async (values: DoctorRegistrationData) => {
    try {
      const result = await updateDoctorProfile(values);
      if (result) {
        onClose();
      }
    } catch (error) {
      console.error("Failed to update doctor profile:", error);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Edit Doctor Profile</DialogTitle>
        </DialogHeader>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded">
            {error}
          </div>
        )}

        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
          {/* Basic Information */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="name">Full Name</Label>
              <Input
                id="name"
                {...form.register("name")}
                placeholder="Dr. John Doe"
              />
              {form.formState.errors.name && (
                <p className="text-red-500 text-sm mt-1">
                  {form.formState.errors.name.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                {...form.register("email")}
                placeholder="doctor@example.com"
              />
              {form.formState.errors.email && (
                <p className="text-red-500 text-sm mt-1">
                  {form.formState.errors.email.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                {...form.register("phone")}
                placeholder="+1 (555) 123-4567"
              />
              {form.formState.errors.phone && (
                <p className="text-red-500 text-sm mt-1">
                  {form.formState.errors.phone.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="specialty">Specialty</Label>
              <Input
                id="specialty"
                {...form.register("specialty")}
                placeholder="Cardiology"
              />
              {form.formState.errors.specialty && (
                <p className="text-red-500 text-sm mt-1">
                  {form.formState.errors.specialty.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="experience">Years of Experience</Label>
              <Input
                id="experience"
                type="number"
                {...form.register("experience", { valueAsNumber: true })}
                placeholder="5"
              />
              {form.formState.errors.experience && (
                <p className="text-red-500 text-sm mt-1">
                  {form.formState.errors.experience.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="rating">Rating</Label>
              <Input
                id="rating"
                type="number"
                step="0.1"
                min="0"
                max="5"
                {...form.register("rating", { valueAsNumber: true })}
                placeholder="4.5"
              />
              {form.formState.errors.rating && (
                <p className="text-red-500 text-sm mt-1">
                  {form.formState.errors.rating.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="consultationFee">Consultation Fee ($)</Label>
              <Input
                id="consultationFee"
                type="number"
                {...form.register("consultationFee", { valueAsNumber: true })}
                placeholder="150"
              />
              {form.formState.errors.consultationFee && (
                <p className="text-red-500 text-sm mt-1">
                  {form.formState.errors.consultationFee.message}
                </p>
              )}
            </div>

            <div>
              <Label htmlFor="location">Location</Label>
              <Input
                id="location"
                {...form.register("location")}
                placeholder="New York, NY"
              />
              {form.formState.errors.location && (
                <p className="text-red-500 text-sm mt-1">
                  {form.formState.errors.location.message}
                </p>
              )}
            </div>
          </div>

          {/* Bio */}
          <div>
            <Label htmlFor="bio">Bio</Label>
            <Textarea
              id="bio"
              {...form.register("bio")}
              placeholder="Tell patients about your background, expertise, and approach to care..."
              rows={4}
            />
            {form.formState.errors.bio && (
              <p className="text-red-500 text-sm mt-1">
                {form.formState.errors.bio.message}
              </p>
            )}
          </div>

          {/* Education */}
          <div>
            <Label htmlFor="education">Education (one per line)</Label>
            <Textarea
              id="education"
              {...form.register("education")}
              placeholder="Medical Degree from Harvard Medical School&#10;Residency at Johns Hopkins Hospital"
              rows={3}
            />
            {form.formState.errors.education && (
              <p className="text-red-500 text-sm mt-1">
                {form.formState.errors.education.message}
              </p>
            )}
          </div>

          {/* Languages */}
          <div>
            <Label htmlFor="languages">Languages (comma-separated)</Label>
            <Input
              id="languages"
              {...form.register("languages")}
              placeholder="English, Spanish, French"
            />
            {form.formState.errors.languages && (
              <p className="text-red-500 text-sm mt-1">
                {form.formState.errors.languages.message}
              </p>
            )}
          </div>

          {/* Form Actions */}
          <div className="flex justify-end space-x-2">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={form.formState.isSubmitting}>
              {form.formState.isSubmitting ? "Saving..." : "Save Profile"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
