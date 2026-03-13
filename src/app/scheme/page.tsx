"use client";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Logo } from "@/components/ui/logo";
import { motion } from "framer-motion";
import {
  ArrowLeft,
  CheckCircle,
  ChevronDown,
  ExternalLink,
  Frown,
  Heart,
  Mic,
  Search,
  Shield,
  Stethoscope,
  Users,
  Volume2,
  VolumeX,
} from "lucide-react";
import Link from "next/link";
import { useSearchParams, useRouter } from "next/navigation";
import { Suspense, useEffect, useRef, useState } from "react";

declare global {
  interface Window {
    webkitSpeechRecognition?: any;
    SpeechRecognition?: any;
  }
}

type OutputLanguage = "en-IN" | "hi-IN" | "mr-IN" | "ta-IN" | "te-IN";

const languageConfig: Record<OutputLanguage, { label: string; queryHint: string }> = {
  "en-IN": { label: "English", queryHint: "Tell me schemes related to budget" },
  "hi-IN": { label: "हिंदी (Hindi)", queryHint: "बजट से जुड़ी योजनाएं बताएं" },
  "mr-IN": { label: "मराठी (Marathi)", queryHint: "अर्थसंकल्पाशी संबंधित योजना सांगा" },
  "ta-IN": { label: "தமிழ் (Tamil)", queryHint: "பட்ஜெட்டிற்கு தொடர்பான திட்டங்களை சொல்லுங்கள்" },
  "te-IN": { label: "తెలుగు (Telugu)", queryHint: "బడ్జెట్‌కు సంబంధించిన పథకాలు చెప్పండి" },
};

const localizedUi: Record<OutputLanguage, {
  navigatorTitle: string;
  voicePrompt: string;
  speakIn: string;
  yourQuestion: string;
  search: string;
  recommendations: string;
  details: string;
  hideDetails: string;
  googleSearch: string;
  narration: string;
  noMatch: string;
}> = {
  "en-IN": {
    navigatorTitle: "Scheme Navigator",
    voicePrompt: "Tap to ask by voice",
    speakIn: "I will speak in",
    yourQuestion: "Your question",
    search: "Search",
    recommendations: "AI Recommendations",
    details: "More details",
    hideDetails: "Hide details",
    googleSearch: "Search About This Scheme",
    narration: "Listen",
    noMatch: "No schemes match this query. Try broader terms.",
  },
  "hi-IN": {
    navigatorTitle: "योजना नेविगेटर",
    voicePrompt: "आवाज से पूछने के लिए टैप करें",
    speakIn: "उत्तर की भाषा",
    yourQuestion: "आपका सवाल",
    search: "खोजें",
    recommendations: "AI सुझाव",
    details: "और जानकारी",
    hideDetails: "कम दिखाएं",
    googleSearch: "इस योजना के बारे में खोजें",
    narration: "सुनें",
    noMatch: "इस सवाल के लिए योजना नहीं मिली। दूसरा शब्द लिखें।",
  },
  "mr-IN": {
    navigatorTitle: "योजना नेव्हिगेटर",
    voicePrompt: "आवाजाने विचारण्यासाठी टॅप करा",
    speakIn: "उत्तराची भाषा",
    yourQuestion: "तुमचा प्रश्न",
    search: "शोधा",
    recommendations: "AI शिफारसी",
    details: "अधिक माहिती",
    hideDetails: "कमी दाखवा",
    googleSearch: "या योजनेबद्दल शोधा",
    narration: "ऐका",
    noMatch: "या प्रश्नासाठी योजना सापडली नाही. वेगळे शब्द वापरा.",
  },
  "ta-IN": {
    navigatorTitle: "திட்ட வழிகாட்டி",
    voicePrompt: "குரலில் கேட்க தட்டவும்",
    speakIn: "பதில் மொழி",
    yourQuestion: "உங்கள் கேள்வி",
    search: "தேடுக",
    recommendations: "AI பரிந்துரைகள்",
    details: "மேலும் விவரம்",
    hideDetails: "குறைக்க",
    googleSearch: "இந்த திட்டத்தை தேடுக",
    narration: "கேளுங்கள்",
    noMatch: "இந்த கேள்விக்கு திட்டம் கிடைக்கவில்லை. வேறு சொற்கள் முயற்சிக்கவும்.",
  },
  "te-IN": {
    navigatorTitle: "పథక మార్గదర్శి",
    voicePrompt: "వాయిస్ ద్వారా అడగడానికి ట్యాప్ చేయండి",
    speakIn: "సమాధాన భాష",
    yourQuestion: "మీ ప్రశ్న",
    search: "శోధించండి",
    recommendations: "AI సిఫార్సులు",
    details: "మరింత వివరాలు",
    hideDetails: "దాచు",
    googleSearch: "ఈ పథకం గురించి శోధించండి",
    narration: "వినండి",
    noMatch: "ఈ ప్రశ్నకు పథకాలు దొరకలేదు. మరో పదంతో ప్రయత్నించండి.",
  },
};

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
  localizedSummary?: string;
  narrationText?: string;
  googleQuery?: string;
  matchReasons?: string[];
  score?: number;
};

function SchemeContent() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const roleStr = searchParams?.get("role") || "patient";
  const role = roleStr as keyof typeof roleConfig;
  
  const [schemes, setSchemes] = useState<SchemeType[]>([]);
  const [recommendedSchemes, setRecommendedSchemes] = useState<SchemeType[]>([]);
  const [loading, setLoading] = useState(true);
  const [navigatorLoading, setNavigatorLoading] = useState(false);
  const [error, setError] = useState(false);
  const [query, setQuery] = useState("");
  const [outputLanguage, setOutputLanguage] = useState<OutputLanguage>("en-IN");
  const [isListening, setIsListening] = useState(false);
  const [speechSupported, setSpeechSupported] = useState(false);
  const [expandedCard, setExpandedCard] = useState<Record<number, boolean>>({});
  const [speakingSchemeId, setSpeakingSchemeId] = useState<number | null>(null);
  const recognitionRef = useRef<any>(null);

  const copy = localizedUi[outputLanguage];

  useEffect(() => {
    const fetchSchemes = async () => {
      setLoading(true);
      setError(false);
      try {
        const res = await fetch(`/api/schemes?role=${role}`);
        const data = await res.json();
        
        if (data.schemes && data.schemes.length > 0) {
          setSchemes(data.schemes);
          setRecommendedSchemes(data.schemes);
        } else {
          // Empty array handling
          setSchemes([]);
          setRecommendedSchemes([]);
        }
      } catch (error) {
        console.error("Failed to fetch schemes:", error);
        setSchemes([]); // Force empty state on error
        setRecommendedSchemes([]);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchSchemes();
  }, [role]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    setSpeechSupported(Boolean(SR));
  }, []);

  useEffect(() => {
    return () => {
      if (typeof window !== "undefined" && "speechSynthesis" in window) {
        window.speechSynthesis.cancel();
      }
    };
  }, []);

  const fetchNavigatorRecommendations = async (searchText: string) => {
    setNavigatorLoading(true);
    try {
      const response = await fetch("/api/schemes/navigator", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          query: searchText.trim(),
          language: outputLanguage,
        }),
      });

      if (!response.ok) {
        throw new Error(`Navigator API failed with ${response.status}`);
      }

      const data = await response.json();
      setRecommendedSchemes(Array.isArray(data.schemes) ? data.schemes : []);
      setError(false);
    } catch (navigatorError) {
      console.error("Navigator search failed:", navigatorError);
      setError(true);
      setRecommendedSchemes([]);
    } finally {
      setNavigatorLoading(false);
    }
  };

  useEffect(() => {
    if (!query.trim()) {
      setRecommendedSchemes(schemes);
      return;
    }

    const timer = setTimeout(() => {
      void fetchNavigatorRecommendations(query);
    }, 250);

    return () => clearTimeout(timer);
  }, [outputLanguage, role, schemes]);

  const getNarrationText = (scheme: SchemeType) => {
    if (scheme.narrationText) {
      return scheme.narrationText;
    }
    if (outputLanguage === "hi-IN") {
      return `${scheme.title}. लाभ: ${scheme.benefits.join(", ")}. पात्रता: ${scheme.eligibility}. कवरेज: ${scheme.coverage}.`;
    }
    if (outputLanguage === "mr-IN") {
      return `${scheme.title}. लाभ: ${scheme.benefits.join(", ")}. पात्रता: ${scheme.eligibility}. संरक्षण: ${scheme.coverage}.`;
    }
    if (outputLanguage === "ta-IN") {
      return `${scheme.title}. நன்மைகள்: ${scheme.benefits.join(", ")}. தகுதி: ${scheme.eligibility}. கவரேஜ்: ${scheme.coverage}.`;
    }
    if (outputLanguage === "te-IN") {
      return `${scheme.title}. ప్రయోజనాలు: ${scheme.benefits.join(", ")}. అర్హత: ${scheme.eligibility}. కవరేజ్: ${scheme.coverage}.`;
    }
    return `${scheme.title}. Benefits: ${scheme.benefits.join(", ")}. Eligibility: ${scheme.eligibility}. Coverage: ${scheme.coverage}.`;
  };

  const getDetailSummary = (scheme: SchemeType) => {
    if (scheme.localizedSummary) {
      return scheme.localizedSummary;
    }
    if (outputLanguage === "hi-IN") {
      return `यह योजना ${scheme.category} श्रेणी में आती है। मुख्य लाभ: ${scheme.benefits.join(", ")}। पात्रता: ${scheme.eligibility}। कवरेज: ${scheme.coverage}।`;
    }
    if (outputLanguage === "mr-IN") {
      return `ही योजना ${scheme.category} प्रकारात येते. मुख्य लाभ: ${scheme.benefits.join(", ")}. पात्रता: ${scheme.eligibility}. संरक्षण: ${scheme.coverage}.`;
    }
    if (outputLanguage === "ta-IN") {
      return `இந்த திட்டம் ${scheme.category} வகையில் வருகிறது. முக்கிய நன்மைகள்: ${scheme.benefits.join(", ")}. தகுதி: ${scheme.eligibility}. கவரேஜ்: ${scheme.coverage}.`;
    }
    if (outputLanguage === "te-IN") {
      return `ఈ పథకం ${scheme.category} విభాగానికి చెందినది. ప్రధాన ప్రయోజనాలు: ${scheme.benefits.join(", ")}. అర్హత: ${scheme.eligibility}. కవరేజ్: ${scheme.coverage}.`;
    }
    return `This ${scheme.category} scheme offers ${scheme.benefits.join(", ")}. Eligibility: ${scheme.eligibility}. Coverage: ${scheme.coverage}.`;
  };

  const toggleVoiceInput = () => {
    if (typeof window === "undefined") return;
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) return;

    if (isListening && recognitionRef.current) {
      recognitionRef.current.stop();
      return;
    }

    const recognition = new SR();
    recognition.lang = outputLanguage;
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    recognition.onstart = () => setIsListening(true);
    recognition.onend = () => setIsListening(false);
    recognition.onerror = () => setIsListening(false);
    recognition.onresult = (event: any) => {
      const transcript = event?.results?.[0]?.[0]?.transcript?.trim();
      if (transcript) {
        setQuery(transcript);
        void fetchNavigatorRecommendations(transcript);
      }
    };

    recognitionRef.current = recognition;
    recognition.start();
  };

  const speakScheme = (scheme: SchemeType) => {
    if (typeof window === "undefined" || !("speechSynthesis" in window)) return;

    if (speakingSchemeId === scheme.id) {
      window.speechSynthesis.cancel();
      setSpeakingSchemeId(null);
      return;
    }

    window.speechSynthesis.cancel();
    const utterance = new SpeechSynthesisUtterance(getNarrationText(scheme));
    utterance.lang = outputLanguage;
    utterance.rate = 0.95;
    utterance.onend = () => setSpeakingSchemeId(null);
    utterance.onerror = () => setSpeakingSchemeId(null);
    setSpeakingSchemeId(scheme.id);
    window.speechSynthesis.speak(utterance);
  };

  const searchSchemeOnGoogle = (scheme: SchemeType) => {
    const googleQuery = scheme.googleQuery || `${scheme.title} scheme eligibility official`;
    const url = `https://www.google.com/search?q=${encodeURIComponent(googleQuery)}`;
    window.open(url, "_blank", "noopener,noreferrer");
  };

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

        <Card className="mb-10 border-slate-200 shadow-sm">
          <CardHeader className="pb-4">
            <CardTitle className="text-2xl text-slate-800">{copy.navigatorTitle}</CardTitle>
            <CardDescription className="text-slate-600">{copy.voicePrompt}</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex flex-col sm:flex-row gap-3 sm:items-center">
              <label className="text-sm text-slate-600 sm:min-w-28">{copy.speakIn}:</label>
              <select
                value={outputLanguage}
                onChange={(e) => setOutputLanguage(e.target.value as OutputLanguage)}
                className="h-10 rounded-md border border-slate-300 bg-white px-3 text-sm text-slate-800"
              >
                {Object.entries(languageConfig).map(([key, value]) => (
                  <option key={key} value={key}>
                    {value.label}
                  </option>
                ))}
              </select>
              <Button
                type="button"
                variant={isListening ? "default" : "outline"}
                onClick={toggleVoiceInput}
                disabled={!speechSupported}
                className="sm:ml-auto"
              >
                <Mic className="h-4 w-4 mr-2" />
                {isListening ? "Listening..." : "Voice Input"}
              </Button>
            </div>

            <div className="flex flex-col sm:flex-row gap-3">
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter") {
                    void fetchNavigatorRecommendations(query);
                  }
                }}
                placeholder={languageConfig[outputLanguage].queryHint}
                className="h-11 flex-1 rounded-lg border border-slate-300 bg-white px-4 text-base text-slate-800"
              />
              <Button
                type="button"
                variant="secondary"
                className="h-11 px-5"
                onClick={() => void fetchNavigatorRecommendations(query)}
                disabled={navigatorLoading}
              >
                <Search className="h-4 w-4 mr-2" />
                {navigatorLoading ? "Searching..." : copy.search}
              </Button>
            </div>

            {query.trim() ? (
              <div className="rounded-lg bg-slate-50 border border-slate-200 px-4 py-3 text-sm text-slate-700">
                <span className="font-semibold">{copy.yourQuestion}:</span> {query}
              </div>
            ) : null}
          </CardContent>
        </Card>

        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xl font-bold text-slate-800">{copy.recommendations}</h2>
          <p className="text-sm text-slate-500">{recommendedSchemes.length} schemes found</p>
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
          ) : recommendedSchemes.length === 0 ? (
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
                  : query.trim()
                  ? copy.noMatch
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
            recommendedSchemes.map((scheme, index) => (
              <motion.div
                key={scheme.id}
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: index * 0.1, duration: 0.6 }}
              >
                <Card className="h-full hover:shadow-xl transition-all duration-300 border-slate-200 hover:border-slate-300 group flex flex-col">
                  <CardHeader className="pb-4 flex-none">
                    <div className="flex items-start justify-between mb-4 gap-3">
                      <div className={`w-12 h-12 rounded-xl bg-gradient-to-br ${config.color} flex items-center justify-center shadow-md`}>
                        <SchemeIcon className="h-6 w-6 text-white" />
                      </div>
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary" className="bg-green-100 text-green-700 border-green-200">
                          {scheme.status}
                        </Badge>
                        <Button
                          type="button"
                          variant="outline"
                          size="icon"
                          className="h-8 w-8"
                          onClick={() => speakScheme(scheme)}
                          title={copy.narration}
                        >
                          {speakingSchemeId === scheme.id ? <VolumeX className="h-4 w-4" /> : <Volume2 className="h-4 w-4" />}
                        </Button>
                      </div>
                    </div>
                    <CardTitle className="text-xl font-bold text-slate-800 group-hover:text-slate-900">{scheme.title}</CardTitle>
                    <CardDescription className="text-slate-600 leading-relaxed">{getDetailSummary(scheme)}</CardDescription>
                  </CardHeader>

                  <CardContent className="space-y-4 flex-grow flex flex-col">
                    <div className="flex-grow">
                      <h4 className="font-semibold text-slate-800 mb-2 flex items-center">
                        <CheckCircle className="h-4 w-4 text-green-600 mr-2" />
                        Key Benefits
                      </h4>
                      <ul className="space-y-1">
                        {scheme.benefits?.slice(0, 2).map((benefit, idx) => (
                          <li key={idx} className="text-sm text-slate-600 flex items-start">
                            <span className="text-green-500 mr-2 mt-1">•</span>
                            {benefit}
                          </li>
                        ))}
                      </ul>
                    </div>

                    <div className="border-t border-slate-200 pt-4 space-y-3 flex-none">
                      <Button
                        type="button"
                        variant="ghost"
                        className="w-full justify-between border border-slate-200"
                        onClick={() =>
                          setExpandedCard((prev) => ({ ...prev, [scheme.id]: !prev[scheme.id] }))
                        }
                      >
                        <span>{expandedCard[scheme.id] ? copy.hideDetails : copy.details}</span>
                        <ChevronDown className={`h-4 w-4 transition-transform ${expandedCard[scheme.id] ? "rotate-180" : ""}`} />
                      </Button>

                      {expandedCard[scheme.id] ? (
                        <div className="space-y-3 rounded-lg border border-slate-200 p-3 bg-slate-50">
                          <div>
                            <span className="text-sm font-medium text-slate-700">Eligibility:</span>
                            <p className="text-sm text-slate-600 mt-1">{scheme.eligibility}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-slate-700">Coverage:</span>
                            <p className="text-sm text-slate-600 mt-1 font-semibold text-slate-800">{scheme.coverage}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-slate-700">Description:</span>
                            <p className="text-sm text-slate-600 mt-1">{scheme.description}</p>
                          </div>
                          <div>
                            <span className="text-sm font-medium text-slate-700">All Benefits:</span>
                            <ul className="mt-1 space-y-1">
                              {scheme.benefits?.map((benefit, idx) => (
                                <li key={idx} className="text-sm text-slate-600">• {benefit}</li>
                              ))}
                            </ul>
                          </div>
                        </div>
                      ) : null}

                      <div>
                        <Badge variant="outline" className="text-xs">
                          {scheme.category}
                        </Badge>
                      </div>
                    </div>

                    <Button
                      type="button"
                      className="w-full mt-4 bg-slate-900 hover:bg-slate-800 text-white flex-none"
                      onClick={() => searchSchemeOnGoogle(scheme)}
                    >
                      {copy.googleSearch}
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
