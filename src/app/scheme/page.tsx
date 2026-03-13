"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { motion } from "framer-motion";
import { ArrowLeft, CheckCircle, ExternalLink, Shield, Stethoscope, Users, Heart, Frown } from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useState } from "react";

const roleConfig = {
  patient: {
    title: "Patient Healthcare Schemes",
    subtitle: "Government schemes for patients and citizens",
    icon: Users,
    color: "from-blue-500 to-cyan-600",
    bgColor: "from-blue-50 to-cyan-50",
  },
  doctor: {
    title: "Doctor Support Programs",
    subtitle: "Government schemes and incentives for healthcare providers",
    icon: Stethoscope,
    color: "from-emerald-500 to-teal-600",
    bgColor: "from-emerald-50 to-teal-50",
  },
  staff: {
    title: "Healthcare Staff Programs",
    subtitle: "Government schemes and benefits for medical support staff",
    icon: Shield,
    color: "from-purple-500 to-pink-600",
    bgColor: "from-purple-50 to-pink-50",
  },
};

type SchemeType = {
  id: number;
  title: string;
  description: string;
  benefits: string[];
  eligibility: string;
  coverage: string;
  category: string;
  status: string;
};

function SchemeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roleStr = searchParams?.get("role") || "patient";
  const role = roleStr as keyof typeof roleConfig;
  
  const [schemes, setSchemes] = useState<SchemeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchSchemes = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`/api/schemes?role=${role}`);
        const data = await res.json();
        
        if (data.schemes && data.schemes.length > 0) {
          setSchemes(data.schemes);
        } else {
          // Empty array handling
          setSchemes([]);
        }
      } catch (error) {
        console.error("Failed to fetch schemes:", error);
        setSchemes([]); // Force empty state on error
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchSchemes();
  }, [role]);

  const config = roleConfig[role] || roleConfig.patient;
  const SchemeIcon = config.icon || Heart;

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-slate-100">
      {/* Header */}
      <div className={`relative overflow-hidden bg-gradient-to-r ${config.bgColor} border-b border-slate-200`}>
        <div className="absolute inset-0 bg-white/50" />
        <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
          <div className="flex items-center justify-between mb-8">
            <Button variant="ghost" className="flex items-center space-x-2" onClick={() => router.back()}>
              <ArrowLeft className="h-4 w-4" />
              <span>Back</span>
            </Button>
            <Logo size="sm" />
          </div>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="text-center"
          >
            <div className={`inline-flex items-center justify-center w-20 h-20 rounded-2xl bg-gradient-to-br ${config.color} mb-6 shadow-lg`}>
              <config.icon className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-4xl sm:text-5xl font-black text-slate-800 mb-4">{config.title}</h1>
            <p className="text-xl text-slate-600 max-w-2xl mx-auto">{config.subtitle}</p>
          </motion.div>
        </div>
      </div>

      {/* Content */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16">
        {/* Role Switcher */}
        <div className="flex justify-center mb-12">
          <div className="inline-flex bg-white rounded-2xl p-2 shadow-lg border border-slate-200">
            {Object.entries(roleConfig).map(([key, cfg]) => (
              <Link key={key} href={`/scheme?role=${key}`}>
                <Button
                  variant={role === key ? "default" : "ghost"}
                  className={`flex items-center space-x-2 px-6 py-3 rounded-xl ${
                    role === key ? `bg-gradient-to-r ${cfg.color} text-white shadow-md` : "text-slate-600 hover:text-slate-800"
                  }`}
                >
                  <cfg.icon className="h-4 w-4" />
                  <span className="font-medium">{cfg.title.split(" ")[0]}</span>
                </Button>
              </Link>
            ))}
          </div>
        </div>

        {/* Schemes Grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
          {loading ? (
            /* Skeleton Loading State */
            Array.from({ length: 3 }).map((_, i) => (
              <Card key={i} className="h-full border-slate-200 animate-pulse">
                <CardHeader className="pb-4">
                  <div className="w-12 h-12 rounded-xl bg-slate-200 mb-4" />
                  <div className="h-6 bg-slate-200 rounded w-3/4 mb-2" />
                  <div className="h-4 bg-slate-200 rounded w-full mb-1" />
                  <div className="h-4 bg-slate-200 rounded w-5/6" />
                </CardHeader>
                <CardContent>
                  <div className="h-20 bg-slate-200 rounded w-full mb-4" />
                  <div className="h-10 bg-slate-300 rounded w-full mt-4" />
                </CardContent>
              </Card>
            ))
          ) : schemes.length === 0 ? (
            /* EXACTLY WHAT YOU ASKED FOR: Empty State when no schemes */
            <motion.div 
              initial={{ opacity: 0, scale: 0.95 }}
              animate={{ opacity: 1, scale: 1 }}
              className="col-span-full py-20 text-center bg-white rounded-3xl border border-slate-200 shadow-sm"
            >
              <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-slate-100 mb-6">
                <Frown className="h-10 w-10 text-slate-400" />
              </div>
              <h3 className="text-2xl font-bold text-slate-800 mb-2">No Schemes Available Currently</h3>
              <p className="text-slate-500 max-w-md mx-auto">
                {error 
                  ? "We couldn't connect to the government portals right now. Please try again later."
                  : "There are currently no active government schemes listed for this category. We regularly check official sources for updates."}
              </p>
              <Button 
                onClick={() => window.location.reload()} 
                variant="outline" 
                className="mt-6 border-slate-300 text-slate-700"
              >
                Refresh Data
              </Button>
            </motion.div>
          ) : (
            /* Real Data Map */
            schemes.map((scheme, index) => (
              <motion.div
                key={scheme.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
              >
                <Card className="h-full hover:shadow-xl transition-all duration-300 border-slate-200 hover:border-slate-300 group flex flex-col">
                  <CardHeader className="pb-4 flex-none">
                    <div className="flex items-start justify-between mb-4">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center shadow-md`}>
                        <SchemeIcon className="h-6 w-6 text-white" />
                      </div>
                      <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                        {scheme.status}
                      </Badge>
                    </div>
                    <CardTitle className="text-xl font-bold text-slate-800 group-hover:text-slate-900">{scheme.title}</CardTitle>
                    <CardDescription className="text-slate-600 leading-relaxed">{scheme.description}</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 flex-grow flex flex-col">
                    <div className="flex-grow">
                      <h4 className="font-semibold text-slate-800 mb-2 flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                        Key Benefits
                      </h4>
                      <ul className="space-y-1">
                        {scheme.benefits?.map((benefit, idx) => (
                          <li key={idx} className="text-sm text-slate-600 flex items-start">
                            <span className="text-green-500 mr-2 mt-1">•</span>
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="border-t border-slate-200 pt-4 space-y-3 flex-none">
                      <div>
                        <span className="text-sm font-medium text-slate-700">Eligibility:</span>
                        <p className="text-sm text-slate-600 mt-1">{scheme.eligibility}</p>
                      </div>
                      <div>
                        <span className="text-sm font-medium text-slate-700">Coverage:</span>
                        <p className="text-sm text-slate-600 mt-1 font-semibold text-slate-800">{scheme.coverage}</p>
                      </div>
                      <Badge variant="outline" className="text-xs">
                        {scheme.category}
                      </Badge>
                    </div>

                    <Button className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white flex-none">
                      Apply Now
                      <ExternalLink className="h-4 w-4 ml-2" />
                    </Button>
                  </CardContent>
                </Card>
              </motion.div>
            ))
          )}
        </div>
      </div>
    </div>
  );
}

export default function SchemePage() {
  return (
    <Suspense fallback={
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-slate-900"></div>
      </div>
    }>
      <SchemeContent />
    </Suspense>
  );
}
