"use client";

import { useState, Suspense } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { LogIn, Loader2, User, Mail, Phone, Lock, Calendar } from "lucide-react";
import PhoneInput, { getCountryCallingCode } from "react-phone-number-input";
import type { Country } from "react-phone-number-input";
import "react-phone-number-input/style.css";
import { Logo } from "@/components/ui/logo";
import { toast } from "sonner";

function PatientSignUpForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectUrl = searchParams?.get('redirect_url') || '/patient/dashboard';
  
  const [loading, setLoading] = useState(false);
  const [selectedCountry, setSelectedCountry] = useState<Country>("US");
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    dateOfBirth: "",
    gender: "",
    password: "",
    confirmPassword: "",
    consentToAlerts: false,
    acceptPrivacyPolicy: false,
  });

  // Phone is optional - check if phone number actually has digits beyond just the country code
  const currentCountryCode = `+${getCountryCallingCode(selectedCountry)}`;
  const hasPhoneNumber = formData.phone && 
    formData.phone.trim().length > 0 && 
    formData.phone.trim() !== currentCountryCode;
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.dateOfBirth) {
      toast.error("Please enter your date of birth");
      return;
    }

    if (!formData.gender) {
      toast.error("Please select your gender");
      return;
    }

    if (formData.password !== formData.confirmPassword) {
      toast.error("Passwords do not match");
      return;
    }

    // Only require SMS consent if phone number is provided
    if (hasPhoneNumber && !formData.consentToAlerts) {
      toast.error("Please consent to receive appointment details and alerts on your phone number");
      return;
    }

    if (!formData.acceptPrivacyPolicy) {
      toast.error("Please accept the privacy policy to continue");
      return;
    }

    setLoading(true);

    try {
      const countryCode = `+${getCountryCallingCode(selectedCountry)}`;
      const response = await fetch("/api/patient/sign-up", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: formData.name,
          email: formData.email,
          phone: formData.phone || null,
          countryCode: countryCode,
          dateOfBirth: formData.dateOfBirth,
          gender: formData.gender,
          password: formData.password,
          consentToAlerts: hasPhoneNumber ? formData.consentToAlerts : false,
        }),
      });

      const data = await response.json();

      if (data.success) {
        toast.success("Account created successfully!");
        router.push(redirectUrl);
      } else {
        toast.error(data.error || "Failed to create account");
      }
    } catch (error) {
      console.error("Error signing up:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-[80vh] space-y-6 p-4">
      <div className="text-center space-y-2 w-full">
        <div className="flex justify-center mb-4">
          <Logo size="lg" />
        </div>
        <h1 className="text-3xl font-bold text-gray-900">Book Your Appointment</h1>
        <p className="text-gray-600">Create an account to continue</p>
      </div>

      <Card className="w-full max-w-md shadow-xl">
        <CardHeader>
          <CardTitle>Patient Information</CardTitle>
          <CardDescription>Fill in your details to get started</CardDescription>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <Label htmlFor="name">Full Name *</Label>
              <div className="relative">
                <User className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="name"
                  value={formData.name}
                  onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="email">Email *</Label>
              <div className="relative">
                <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="email"
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData(prev => ({ ...prev, email: e.target.value }))}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="phone">Phone Number <span className="text-gray-400 text-xs font-normal">(Optional)</span></Label>
              <div className="phone-input-wrapper">
                <PhoneInput
                  international
                  defaultCountry="US"
                  value={formData.phone}
                  country={selectedCountry}
                  onChange={(value: string | undefined) => setFormData(prev => ({ ...prev, phone: value || "" }))}
                  onCountryChange={(country: Country | undefined) => {
                    if (country) {
                      setSelectedCountry(country);
                    }
                  }}
                  className="phone-input"
                  placeholder="For SMS appointment reminders"
                />
              </div>
              <style jsx global>{`
                .phone-input-wrapper {
                  width: 100%;
                }
                .phone-input-wrapper .PhoneInput {
                  display: flex;
                  align-items: center;
                  gap: 0.5rem;
                  width: 100%;
                }
                .phone-input-wrapper .PhoneInputCountry {
                  display: flex;
                  align-items: center;
                  margin-right: 0.5rem;
                }
                .phone-input-wrapper .PhoneInputCountryIcon {
                  width: 1.5rem;
                  height: 1.5rem;
                  border-radius: 0.25rem;
                  box-shadow: 0 0 0 1px rgba(0, 0, 0, 0.1);
                }
                .phone-input-wrapper .PhoneInputCountrySelect {
                  padding: 0.5rem;
                  border-radius: 0.375rem;
                  border: 1px solid #d1d5db;
                  background: white;
                  cursor: pointer;
                  font-size: 0.875rem;
                  margin-right: 0.5rem;
                }
                .phone-input-wrapper .PhoneInputCountrySelect:focus {
                  outline: none;
                  border-color: #3b82f6;
                  ring: 2px;
                  ring-color: #3b82f6;
                }
                .phone-input-wrapper .PhoneInputInput {
                  flex: 1;
                  height: 2.5rem;
                    border-radius: 0.375rem;
                    border: 1px solid #d1d5db;
                    padding: 0 0.75rem;
                    font-size: 0.875rem;
                    outline: none;
                    transition: all 0.2s;
                    background: white;
                }
                .phone-input-wrapper .PhoneInputInput:focus {
                  border-color: #3b82f6;
                  ring: 2px;
                  ring-color: #3b82f6;
                }
                .phone-input-wrapper .PhoneInputInput::placeholder {
                  color: #9ca3af;
                }
              `}</style>
            </div>

            <div>
              <Label htmlFor="dateOfBirth">Date of Birth *</Label>
              <div className="relative">
                <Calendar className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="dateOfBirth"
                  type="date"
                  value={formData.dateOfBirth}
                  onChange={(e) => setFormData(prev => ({ ...prev, dateOfBirth: e.target.value }))}
                  className="pl-10"
                  required
                />
              </div>
            </div>

            <div>
              <Label htmlFor="gender">Gender *</Label>
              <Select value={formData.gender} onValueChange={(value) => setFormData(prev => ({ ...prev, gender: value }))} required>
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

            <div>
              <Label htmlFor="password">Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="password"
                  type="password"
                  value={formData.password}
                  onChange={(e) => setFormData(prev => ({ ...prev, password: e.target.value }))}
                  className="pl-10"
                  required
                  minLength={8}
                  placeholder="At least 8 characters"
                />
              </div>
            </div>

            <div>
              <Label htmlFor="confirmPassword">Confirm Password *</Label>
              <div className="relative">
                <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
                <Input
                  id="confirmPassword"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData(prev => ({ ...prev, confirmPassword: e.target.value }))}
                  className="pl-10"
                  required
                  minLength={8}
                />
              </div>
            </div>

            <div className="space-y-3 pt-2">
              {hasPhoneNumber && (
                <div className="flex items-start space-x-2 p-3 rounded-lg border bg-blue-50/50 border-blue-200 transition-all">
                  <Checkbox
                    id="consentToAlerts"
                    checked={formData.consentToAlerts}
                    onCheckedChange={(checked) => setFormData(prev => ({ ...prev, consentToAlerts: checked as boolean }))}
                  />
                  <label
                    htmlFor="consentToAlerts"
                    className="text-sm leading-tight text-gray-700 cursor-pointer"
                  >
                    I consent to receive appointment details and alerts for consultation on this number *
                    <span className="block text-xs text-gray-400 mt-1">
                      Message & data rates may apply
                    </span>
                  </label>
                </div>
              )}

              <div className="flex items-start space-x-2">
                <Checkbox
                  id="acceptPrivacyPolicy"
                  checked={formData.acceptPrivacyPolicy}
                  onCheckedChange={(checked) => setFormData(prev => ({ ...prev, acceptPrivacyPolicy: checked as boolean }))}
                />
                <label
                  htmlFor="acceptPrivacyPolicy"
                  className="text-sm text-gray-600 leading-tight cursor-pointer"
                >
                  By clicking continue, I agree to Clinix's{" "}
                  <Link href="/privacy-policy" target="_blank" className="text-blue-600 hover:underline">
                    privacy policy
                  </Link>
                  {" "}*
                </label>
              </div>
            </div>

            <Button 
              type="submit" 
              className="w-full bg-blue-600 hover:bg-blue-700"
              disabled={loading}
            >
              {loading ? (
                <>
                  <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                  Creating Account...
                </>
              ) : (
                "Create Account"
              )}
            </Button>
          </form>

          <div className="text-center mt-4 space-y-4">
            <div className="text-sm text-gray-500">
              Already have an account?
            </div>
            <Link href="/patient/sign-in">
              <Button variant="outline" className="w-full border-blue-600 text-blue-600 hover:bg-blue-50">
                <LogIn className="h-4 w-4 mr-2" />
                Sign In
              </Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

export default function PatientSignUpPage() {
  return (
    <Suspense fallback={
      <div className="flex items-center justify-center min-h-[80vh]">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading...</p>
        </div>
      </div>
    }>
      <PatientSignUpForm />
    </Suspense>
  );
}
