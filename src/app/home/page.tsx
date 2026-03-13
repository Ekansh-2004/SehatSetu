"use client";

import Link from "next/link";
import { Button } from "@/components/ui/button";
import {
  Stethoscope,
  ArrowRight,
  Mic,
  Calendar,
  Shield,
  FileText,
  Video,
  BarChart3,
  CheckCircle2,
  Lock,
  Database,
  Sparkles,
  Zap,
  Users,
  HeartPulse,
  Activity,
  ChevronRight,
  Star,
  Mail,
  Phone,
  MapPin,
} from "lucide-react";
import { motion, useScroll, useTransform } from "framer-motion";
import { Logo } from "@/components/ui/logo";
import { useRef } from "react";
import Script from "next/script";

const features = [
  {
    icon: Mic,
    title: "AI Scribe",
    description:
      "Speech recognition technology converts spoken consultations into written notes, allowing doctors to focus on patient care.",
    bgColor: "bg-blue-600",
    iconColor: "bg-blue-600",
    textColor: "text-slate-800",
  },
  {
    icon: Calendar,
    title: "Appointment Management",
    description:
      "Streamlined scheduling system with automated SMS reminders to help reduce missed appointments and optimize clinic capacity.",
    bgColor: "bg-teal-600",
    iconColor: "bg-teal-600",
    textColor: "text-slate-800",
  },
  {
    icon: BarChart3,
    title: "Analytics Dashboard",
    description:
      "Comprehensive dashboard providing insights into patient flow, appointments, and clinic operations for informed decision-making.",
    bgColor: "bg-orange-600",
    iconColor: "bg-orange-600",
    textColor: "text-slate-800",
  },
  {
    icon: Video,
    title: "Video Consultations",
    description:
      "Integrated telemedicine capabilities enabling remote patient consultations with secure, high-quality video communication.",
    bgColor: "bg-indigo-600",
    iconColor: "bg-indigo-600",
    textColor: "text-slate-800",
  },
  {
    icon: FileText,
    title: "Secure Medical Records",
    description:
      "HIPAA-compliant digital record management with encrypted storage and organized patient information access.",
    bgColor: "bg-rose-600",
    iconColor: "bg-rose-600",
    textColor: "text-slate-800",
  },
  {
    icon: Users,
    title: "Patient Portal",
    description:
      "Easy-to-use patient interface for appointment booking, SMS communication, and accessing medical information.",
    bgColor: "bg-purple-600",
    iconColor: "bg-purple-600",
    textColor: "text-slate-800",
  },
];

export default function LandingPage() {
  const containerRef = useRef(null);
  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ["start start", "end start"],
  });

  const y = useTransform(scrollYProgress, [0, 1], ["0%", "30%"]);
  const opacity = useTransform(scrollYProgress, [0, 0.5], [1, 0]);

  return (
    <>
      {/* Calendly badge widget */}
      <link href="https://assets.calendly.com/assets/external/widget.css" rel="stylesheet" />
      <Script
        src="https://assets.calendly.com/assets/external/widget.js"
        strategy="afterInteractive"
      />
      <Script id="calendly-widget" strategy="afterInteractive">
        {`
          window.onload = function() {
            if (window.Calendly) {
              Calendly.initBadgeWidget({
                url: 'https://calendly.com/ayush-agrawal-livconnect/30min',
                text: 'Schedule time with us',
                color: '#0069ff',
                textColor: '#ffffff',
                branding: true
              });
            }
          }
        `}
      </Script>

    <div ref={containerRef} className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100 overflow-hidden relative">
      {/* Futuristic Background Elements */}
      <div className="fixed inset-0 -z-10 overflow-hidden">
        {/* Animated Grid */}
        <div className="absolute inset-0 bg-[linear-gradient(to_right,#e0e7ff_1px,transparent_1px),linear-gradient(to_bottom,#e0e7ff_1px,transparent_1px)] bg-[size:4rem_4rem] opacity-30" />
        
        {/* Floating Gradient Orbs */}
        <motion.div
          animate={{
            scale: [1, 1.2, 1],
            x: [0, 30, 0],
            y: [0, -30, 0],
          }}
          transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-20 right-20 w-96 h-96 bg-gradient-to-br from-blue-200/40 to-indigo-300/40 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.3, 1],
            x: [0, -40, 0],
            y: [0, 40, 0],
          }}
          transition={{ duration: 25, repeat: Infinity, ease: "easeInOut", delay: 2 }}
          className="absolute bottom-20 left-20 w-[500px] h-[500px] bg-gradient-to-br from-purple-200/40 to-pink-300/40 rounded-full blur-3xl"
        />
        <motion.div
          animate={{
            scale: [1, 1.4, 1],
            rotate: [0, 180, 360],
          }}
          transition={{ duration: 30, repeat: Infinity, ease: "linear" }}
          className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-br from-indigo-200/30 to-blue-300/30 rounded-full blur-3xl"
        />
        
        {/* Floating 3D Shapes */}
        <motion.div
          animate={{
            y: [0, -40, 0],
            rotateZ: [0, 10, 0],
            rotateX: [0, 15, 0],
          }}
          transition={{ duration: 8, repeat: Infinity, ease: "easeInOut" }}
          className="absolute top-32 right-32 w-40 h-40 border-4 border-blue-300/30 rounded-3xl backdrop-blur-sm bg-white/5 hidden lg:block"
          style={{ transform: "perspective(1000px) rotateX(45deg) rotateZ(45deg)" }}
        />
        <motion.div
          animate={{
            y: [0, 40, 0],
            rotateZ: [0, -10, 0],
          }}
          transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
          className="absolute bottom-32 left-32 w-32 h-32 border-4 border-purple-300/30 rounded-full backdrop-blur-sm bg-white/5 hidden lg:block"
        />
      </div>

      {/* Glassmorphic Navigation */}
      <motion.nav
        initial={{ y: -100, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        transition={{ duration: 0.8, ease: "easeOut" }}
        className="sticky top-0 z-50 border-b border-indigo-200/50 backdrop-blur-2xl bg-white/70 shadow-lg shadow-indigo-100/50"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center h-20">
            <Link href="/home" className="flex items-center space-x-3 group">
              <div className="relative">
                <Logo size="sm" />
              </div>
            </Link>
            <div className="flex items-center space-x-4">
              <Link href="/privacy-policy">
                <Button variant="ghost" size="sm" className="hidden sm:inline-flex text-slate-700 hover:text-blue-600 hover:bg-blue-50">
                  Privacy Policy
                </Button>
              </Link>
              <Link href="/book">
                <Button variant="outline" size="sm" className="hidden md:inline-flex border-2 border-blue-500 text-blue-600 hover:bg-blue-50">
                  Book Appointment
                </Button>
              </Link>
              <Link href="/doctor/sign-in">
                <Button
                  size="sm"
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  <Stethoscope className="h-4 w-4 mr-2" />
                  Provider Portal
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </motion.nav>

      {/* Hero Section */}
      <section className="relative pt-32 pb-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto relative z-10">
          <motion.div
            style={{ y, opacity }}
            className="text-center space-y-12"
          >
            {/* Futuristic Badge */}
            <motion.div
              initial={{ opacity: 0, scale: 0.8 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.8 }}
              className="flex justify-center"
            >
              <div className="inline-flex items-center space-x-3 px-8 py-4 rounded-full border-2 border-blue-300/50 bg-gradient-to-r from-white/80 to-blue-50/80 backdrop-blur-xl">
                <Sparkles className="h-5 w-5 text-blue-600" />
                <span className="text-sm font-bold bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                  Modern Healthcare Management Platform
                </span>
                <Zap className="h-5 w-5 text-indigo-600" />
              </div>
            </motion.div>

            {/* Hero Heading */}
            <motion.div
              initial={{ opacity: 0, y: 40 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 1, delay: 0.2 }}
              className="space-y-8"
            >
              <h1 className="text-6xl sm:text-7xl lg:text-8xl xl:text-9xl font-black tracking-tight leading-none">
                <motion.span
                  className="block text-slate-800 mb-4"
                  initial={{ opacity: 0, x: -50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.3 }}
                >
                  Transform
                </motion.span>
                <motion.span
                  className="block relative"
                  initial={{ opacity: 0, x: 50 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.8, delay: 0.5 }}
                >
                  <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent">
                    Clinical Care
                  </span>
                </motion.span>
              </h1>
              <motion.p
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                transition={{ duration: 1, delay: 0.7 }}
                className="text-2xl sm:text-3xl lg:text-4xl text-slate-600 max-w-5xl mx-auto leading-relaxed font-medium"
              >
                Streamline your practice with integrated appointment management, 
                voice documentation, and secure patient records
              </motion.p>
            </motion.div>

            {/* CTA Buttons */}
            <motion.div
              initial={{ opacity: 0, y: 30 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.8, delay: 0.9 }}
              className="flex flex-col sm:flex-row items-center justify-center gap-6 pt-8"
            >
              <Link href="/book">
                <Button
                  size="lg"
                  className="px-12 py-8 text-xl font-bold bg-blue-600 hover:bg-blue-700 text-white"
                >
                  Book an Appointment
                  <ArrowRight className="ml-2 h-6 w-6" />
                </Button>
              </Link>
              <Link href="/doctor/sign-up">
                <Button
                  size="lg"
                  variant="outline"
                  className="px-12 py-8 text-xl border-2 border-blue-500 text-blue-600 hover:bg-blue-50"
                >
                  Join as Provider
                  <ChevronRight className="ml-2 h-6 w-6" />
                </Button>
              </Link>
            </motion.div>
          </motion.div>
        </div>
      </section>

      {/* Features Section - Modern Cards */}
      <section className="relative py-32 px-4 sm:px-6 lg:px-8 bg-white/40 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="text-center mb-24"
          >
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true }}
              className="inline-block mb-8"
            >
              <div className="inline-flex items-center space-x-2 px-6 py-3 rounded-full border-2 border-purple-300/50 bg-gradient-to-r from-purple-50 to-pink-50 backdrop-blur-xl">
                <Star className="h-5 w-5 text-purple-600" />
                <span className="text-sm font-bold text-purple-700">
                  Comprehensive Features
                </span>
              </div>
            </motion.div>
            <h2 className="text-5xl sm:text-6xl lg:text-7xl font-black mb-8 text-slate-800">
              Everything You Need
              <span className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mt-2">
                In One Platform
              </span>
            </h2>
            <p className="text-xl text-slate-600 max-w-3xl mx-auto">
              Streamlined tools designed for modern healthcare practices
            </p>
          </motion.div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
            {features.map((feature, index) => (
              <motion.div
                key={index}
                initial={{ opacity: 0, y: 50 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ delay: index * 0.1, duration: 0.8 }}
                whileHover={{ y: -8 }}
                className="group relative"
              >
                {/* Card */}
                <div className="relative h-full bg-white rounded-2xl p-8 border border-slate-200 group-hover:border-slate-300 transition-all duration-300 shadow-md group-hover:shadow-xl">
                  {/* Icon */}
                  <div className="mb-6">
                    <div className={`w-16 h-16 rounded-xl ${feature.iconColor} flex items-center justify-center shadow-sm`}>
                      <feature.icon className="h-8 w-8 text-white" />
                    </div>
                  </div>
                  
                  <h3 className={`text-2xl font-bold mb-4 ${feature.textColor}`}>
                    {feature.title}
                  </h3>
                  <p className="text-slate-600 leading-relaxed">
                    {feature.description}
                  </p>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Security Section */}
      <section className="relative py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            whileInView={{ opacity: 1, scale: 1 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="relative overflow-hidden rounded-[3rem] border-2 border-emerald-300/50 shadow-2xl shadow-emerald-200/50"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-emerald-50 via-teal-50 to-cyan-100" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_70%_30%,rgba(16,185,129,0.1),transparent_50%)]" />
            
            <div className="relative p-12 lg:p-20">
              <div className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-8">
                  <motion.div
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    className="inline-flex items-center space-x-2 px-6 py-3 rounded-full border-2 border-emerald-400/50 bg-white/80 backdrop-blur-xl"
                  >
                    <Shield className="h-5 w-5 text-emerald-600" />
                    <span className="text-sm font-bold text-emerald-700">
                      Enterprise Security
                    </span>
                  </motion.div>
                  
                  <motion.h2
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.2 }}
                    className="text-5xl lg:text-6xl font-black text-slate-800 leading-tight"
                  >
                    Security &
                    <span className="block bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent">
                      Compliance
                    </span>
                  </motion.h2>
                  
                  <motion.p
                    initial={{ opacity: 0, x: -30 }}
                    whileInView={{ opacity: 1, x: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.3 }}
                    className="text-xl text-slate-700 leading-relaxed"
                  >
                    Built with security at its core. All data is encrypted and stored 
                    in HIPAA-compliant infrastructure with Business Associate Agreements in place.
                  </motion.p>

                  <motion.div
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true }}
                    transition={{ delay: 0.4 }}
                    className="grid sm:grid-cols-2 gap-6 pt-4"
                  >
                    {[
                      { icon: Shield, title: "HIPAA Compliant", desc: "Healthcare standards" },
                      { icon: Lock, title: "Encrypted Storage", desc: "End-to-end security" },
                      { icon: Database, title: "Secure Cloud", desc: "Protected infrastructure" },
                      { icon: Activity, title: "Access Controls", desc: "Role-based permissions" },
                    ].map((item, i) => (
                      <motion.div
                        key={i}
                        whileHover={{ scale: 1.05, x: 10 }}
                        className="flex items-start space-x-4 p-6 rounded-2xl bg-white/80 backdrop-blur-xl border-2 border-emerald-200/50 hover:border-emerald-300 transition-all shadow-lg hover:shadow-xl"
                      >
                        <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-emerald-500 to-teal-600 flex items-center justify-center flex-shrink-0 shadow-lg">
                          <item.icon className="h-6 w-6 text-white" />
                        </div>
                        <div>
                          <div className="font-bold text-slate-800 text-lg">{item.title}</div>
                          <div className="text-sm text-slate-600">{item.desc}</div>
                        </div>
                      </motion.div>
                    ))}
                  </motion.div>
                </div>

                <motion.div
                  initial={{ opacity: 0, scale: 0.8 }}
                  whileInView={{ opacity: 1, scale: 1 }}
                  viewport={{ once: true }}
                  transition={{ delay: 0.5, duration: 1 }}
                  className="relative hidden lg:block"
                >
                  <div className="relative">
                    <motion.div
                      animate={{ rotate: 360, scale: [1, 1.1, 1] }}
                      transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
                      className="absolute inset-0 bg-gradient-to-r from-emerald-300/40 to-teal-300/40 rounded-full blur-3xl"
                    />
                    <motion.div
                      animate={{ y: [-10, 10, -10] }}
                      transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                    >
                      <Shield className="relative h-80 w-80 text-emerald-600 mx-auto drop-shadow-2xl" />
                    </motion.div>
                  </div>
                </motion.div>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Contact Us Section */}
      <section id="contact" className="relative py-32 px-4 sm:px-6 lg:px-8 bg-gradient-to-br from-slate-900 to-blue-900">
        <div className="max-w-7xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 40 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="text-4xl lg:text-5xl font-black text-white mb-6">
              Get in Touch
            </h2>
            <p className="text-xl text-blue-200 max-w-3xl mx-auto">
              Ready to streamline your practice? Contact us to learn more.
            </p>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-8">
            <motion.a
              href="mailto:sales@livconnect.ai"
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              whileHover={{ y: -8 }}
              className="group"
            >
              <div className="bg-white/10 backdrop-blur-xl border-2 border-white/20 rounded-2xl p-8 text-center hover:bg-white/20 transition-all duration-300 h-full">
                <div className="w-16 h-16 rounded-full bg-blue-600 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <Mail className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Email Us
                </h3>
                <p className="text-blue-200 mb-4">
                  Get in touch with our team
                </p>
                <p className="text-blue-300 font-mono text-sm">
                  sales@livconnect.ai
                </p>
              </div>
            </motion.a>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.1 }}
              whileHover={{ y: -8 }}
              className="group cursor-pointer"
            >
              <div className="bg-white/10 backdrop-blur-xl border-2 border-white/20 rounded-2xl p-8 text-center hover:bg-white/20 transition-all duration-300 h-full">
                <div className="w-16 h-16 rounded-full bg-indigo-600 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <Calendar className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">
                  Schedule a Demo
                </h3>
                <p className="text-blue-200 mb-4">
                  See our platform in action
                </p>
                <p className="text-blue-300 text-sm">
                  Click the floating button to book
                </p>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ delay: 0.2 }}
              whileHover={{ y: -8 }}
              className="group"
            >
              <div className="bg-white/10 backdrop-blur-xl border-2 border-white/20 rounded-2xl p-8 text-center hover:bg-white/20 transition-all duration-300 h-full">
                <div className="w-16 h-16 rounded-full bg-purple-600 flex items-center justify-center mx-auto mb-6 group-hover:scale-110 transition-transform">
                  <MapPin className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-bold text-white mb-2">Visit Us</h3>
                <p className="text-blue-200 mb-4">
                  Connect with our team
                </p>
                <p className="text-blue-300 text-sm">
                  United States
                </p>
              </div>
            </motion.div>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative py-32 px-4 sm:px-6 lg:px-8">
        <div className="max-w-6xl mx-auto">
          <motion.div
            initial={{ opacity: 0, y: 50 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 1 }}
            className="relative overflow-hidden rounded-[3rem] border-2 border-purple-300/50 shadow-2xl shadow-purple-200/50"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-purple-50 via-indigo-50 to-blue-100" />
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(99,102,241,0.1),transparent_50%)]" />
            
            <div className="relative p-12 lg:p-24 text-center">
              <motion.div
                initial={{ scale: 0 }}
                whileInView={{ scale: 1 }}
                viewport={{ once: true }}
                transition={{ duration: 0.6 }}
                className="w-24 h-24 mx-auto mb-8 rounded-full bg-gradient-to-br from-blue-600 to-purple-600 flex items-center justify-center shadow-2xl shadow-purple-300/50"
              >
                <HeartPulse className="h-12 w-12 text-white" />
              </motion.div>

              <h2 className="text-5xl lg:text-7xl font-black text-slate-800 mb-6">
                Ready to Transform
                <span className="block bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 bg-clip-text text-transparent mt-2">
                  Your Practice?
                </span>
              </h2>
              <p className="text-2xl text-slate-700 max-w-3xl mx-auto mb-12 leading-relaxed">
                Join healthcare providers who have streamlined their operations with Clinix
              </p>
              <div className="flex flex-col sm:flex-row items-center justify-center gap-6">
                <Link href="/doctor/sign-up">
                  <Button
                    size="lg"
                    className="px-12 py-8 text-xl font-bold bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    Join as Provider
                    <Zap className="ml-2 h-6 w-6" />
                  </Button>
                </Link>
                <Link href="/book">
                  <Button
                    size="lg"
                    variant="outline"
                    className="px-12 py-8 text-xl border-2 border-purple-500 text-purple-600 hover:bg-purple-50"
                  >
                    Book Appointment
                  </Button>
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative border-t-2 border-slate-300/50 bg-gradient-to-br from-slate-50 to-slate-100 py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="grid md:grid-cols-5 gap-12 mb-16">
            {/* Company Info */}
            <div className="md:col-span-2 space-y-6">
              <Logo size="md" />
              <p className="text-slate-600 leading-relaxed max-w-md">
                Modern healthcare management platform for streamlined medical practices.
              </p>
              <div className="flex items-center space-x-4">
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <Shield className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold">HIPAA Compliant</span>
                </div>
                <div className="flex items-center space-x-2 text-sm text-slate-600">
                  <Lock className="h-4 w-4 text-blue-600" />
                  <span className="font-semibold">Encrypted</span>
                </div>
              </div>
            </div>

            {/* Product */}
            <div>
              <h4 className="font-bold text-slate-900 mb-6 text-lg">
                Product
              </h4>
              <ul className="space-y-4">
                {["Features", "Security", "Book Appointment"].map((item, i) => (
                  <li key={i}>
                    <Link
                      href="#"
                      className="text-slate-600 hover:text-blue-600 transition-colors flex items-center space-x-2 group"
                    >
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      <span>{item}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* Company */}
            <div>
              <h4 className="font-bold text-slate-900 mb-6 text-lg">
                Company
              </h4>
              <ul className="space-y-4">
                {[
                  { label: "About Us", href: "#" },
                  { label: "Privacy Policy", href: "/privacy-policy" },
                  { label: "Terms of Service", href: "#" },
                  { label: "Contact", href: "#contact" },
                ].map((item, i) => (
                  <li key={i}>
                    <Link
                      href={item.href}
                      className="text-slate-600 hover:text-blue-600 transition-colors flex items-center space-x-2 group"
                    >
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>

            {/* For Providers */}
            <div>
              <h4 className="font-bold text-slate-900 mb-6 text-lg">For Providers</h4>
              <ul className="space-y-4">
                {[
                  { label: "Provider Login", href: "/doctor/sign-in" },
                  { label: "Join as Provider", href: "/doctor/sign-up" },
                ].map((item, i) => (
                  <li key={i}>
                    <Link
                      href={item.href}
                      className="text-slate-600 hover:text-blue-600 transition-colors flex items-center space-x-2 group"
                    >
                      <ChevronRight className="h-4 w-4 group-hover:translate-x-1 transition-transform" />
                      <span>{item.label}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          </div>

          {/* Contact Info Bar */}
          <div className="border-t-2 border-slate-300/50 pt-12 mb-12">
            <div className="grid md:grid-cols-2 gap-8">
              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-xl bg-blue-600 flex items-center justify-center flex-shrink-0">
                  <Mail className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 mb-1">
                    Contact Sales
                  </div>
                  <a
                    href="mailto:sales@livconnect.ai"
                    className="text-blue-600 hover:text-blue-700 font-semibold text-lg"
                  >
                    sales@livconnect.ai
                  </a>
                </div>
              </div>

              <div className="flex items-start space-x-4">
                <div className="w-12 h-12 rounded-xl bg-purple-600 flex items-center justify-center flex-shrink-0">
                  <MapPin className="h-6 w-6 text-white" />
                </div>
                <div>
                  <div className="font-bold text-slate-900 mb-1">
                    Location
                  </div>
                  <p className="text-slate-600">
                    United States
                  </p>
                </div>
              </div>
            </div>
          </div>

          {/* Bottom Bar */}
          <div className="border-t-2 border-slate-300/50 pt-8">
            <div className="flex flex-col md:flex-row justify-between items-center gap-6">
              <p className="text-slate-600 text-sm">
                © 2025 <span className="font-bold">CLINIX</span>{" "}
                <span className="text-slate-500">by livconnect</span>. All
                rights reserved.
              </p>
              <div className="flex items-center space-x-8">
                <div className="flex items-center space-x-6 text-sm">
                  {[
                    { icon: Shield, label: "HIPAA" },
                    { icon: Lock, label: "Encrypted" },
                    { icon: CheckCircle2, label: "Secure" },
                  ].map((item, i) => (
                    <div
                      key={i}
                      className="flex items-center space-x-2 text-slate-600"
                    >
                      <item.icon className="h-4 w-4 text-blue-600" />
                      <span className="font-semibold">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </footer>
    </div>
    </>
  );
}
