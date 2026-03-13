"use client";

import { useUser } from "@clerk/nextjs";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Stethoscope,
  ArrowRight,
  Calendar,
  Users,
  Clock,
  MapPin,
} from "lucide-react";
import { motion } from "framer-motion";
import { Logo } from "@/components/ui/logo";

export default function Home() {
  const { isLoaded } = useUser();

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50/30 to-indigo-50/20 dark:from-slate-950 dark:via-blue-950/30 dark:to-indigo-950/20">
      {/* Background Pattern */}
      <div className="absolute inset-0 opacity-40">
        <div
          className="absolute inset-0 bg-gradient-to-r from-transparent via-white/5 to-transparent dark:via-white/[0.02] bg-[length:60px_60px] bg-repeat"
          style={{
            backgroundImage: `radial-gradient(circle at 30px 30px, rgba(156,146,172,0.03) 1px, transparent 1px)`,
          }}
        />
      </div>

      {/* Animated Background Elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-32 w-80 h-80 bg-gradient-to-br from-blue-400/20 to-indigo-600/20 rounded-full blur-3xl animate-pulse" />
        <div className="absolute -bottom-40 -left-32 w-80 h-80 bg-gradient-to-br from-purple-400/20 to-pink-600/20 rounded-full blur-3xl animate-pulse delay-1000" />
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-br from-emerald-400/10 to-teal-600/10 rounded-full blur-3xl animate-pulse delay-500" />
      </div>

      {/* Doctor Portal Button - Top Right Corner */}
      <div className="relative z-20 p-4">
        <div className="flex justify-end">
          <Link href="/doctor/sign-in">
            <Button
              size="sm"
              className="bg-emerald-600 hover:bg-emerald-700 text-white"
            >
              <Stethoscope className="h-4 w-4 mr-2" />
              Provider Portal
            </Button>
          </Link>
        </div>
      </div>

      {/* Main Content */}
      <div className="relative z-10 min-h-screen flex items-center justify-center p-4">
        <motion.div
          initial={{ opacity: 0, y: 40 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, ease: "easeOut" }}
          className="w-full max-w-4xl space-y-8"
        >
          {/* Header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2, duration: 0.7, ease: "easeOut" }}
            className="text-center space-y-4"
          >
            <div className="flex justify-center mb-6">
              <Logo size="lg" />
            </div>
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 dark:text-white">
              Welcome to <span className="text-blue-600">HealthCare</span>
            </h1>
            <p className="text-xl text-gray-600 dark:text-gray-300 max-w-3xl mx-auto">
              Quick and easy appointment booking with our healthcare
              professionals
            </p>
          </motion.div>

          {/* Patient Booking Section - Main Focus */}
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.4, duration: 0.7, ease: "easeOut" }}
            className="max-w-2xl mx-auto"
          >
            <Card className="group hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 border-0 shadow-lg bg-white/80 backdrop-blur-sm">
              <CardHeader className="text-center pb-4">
                <div className="mx-auto w-20 h-20 bg-blue-100 rounded-full flex items-center justify-center mb-4 group-hover:bg-blue-200 transition-colors">
                  <Calendar className="h-10 w-10 text-blue-600" />
                </div>
                <CardTitle className="text-3xl font-bold text-gray-900">
                  Book Your Appointment
                </CardTitle>
                <CardDescription className="text-gray-600 text-lg">
                  Quick and easy appointment booking with our healthcare
                  professionals
                </CardDescription>
              </CardHeader>
              <CardContent className="space-y-6">
                {/* Features */}
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-center">
                  <div className="flex flex-col items-center space-y-2">
                    <Users className="h-6 w-6 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Secure & Private
                    </span>
                  </div>
                  <div className="flex flex-col items-center space-y-2">
                    <Clock className="h-6 w-6 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Easy Booking
                    </span>
                  </div>
                  <div className="flex flex-col items-center space-y-2">
                    <MapPin className="h-6 w-6 text-blue-600" />
                    <span className="text-sm font-medium text-gray-700">
                      Online Consultation
                    </span>
                  </div>
                </div>

                {/* Main CTA */}
                <div className="space-y-3 pt-4">
                  <Link href="/book" className="block">
                    <Button className="w-full bg-blue-600 hover:bg-blue-700 text-white text-lg py-6">
                      Book Appointment Now
                      <ArrowRight className="ml-2 h-5 w-5" />
                    </Button>
                  </Link>
                  <p className="text-xs text-gray-500 text-center">
                    Secure payment processing • 24/7 availability • Professional
                    healthcare
                  </p>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
