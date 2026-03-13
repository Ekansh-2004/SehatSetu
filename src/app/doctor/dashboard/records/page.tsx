"use client";

import { useEffect, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { 
  Search, 
  User, 
  Mail, 
  Phone, 
  Calendar,
  FileText,
  ChevronRight,
  Users,
  Loader2,
  FolderSearch
} from "lucide-react";

interface PatientItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  createdAt: string;
}

const containerVariants = {
  hidden: { opacity: 0 },
  visible: { 
    opacity: 1, 
    transition: { staggerChildren: 0.08 } 
  }
};

const itemVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: { opacity: 1, y: 0 }
};

export default function RecordsSearchPage() {
  const [query, setQuery] = useState("");
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<PatientItem[]>([]);
  const [hasSearched, setHasSearched] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return;
    
    setLoading(true);
    setHasSearched(true);
    try {
      const res = await fetch(`/api/patients/search?q=${encodeURIComponent(query)}`);
      const data = await res.json();
      setResults(data?.data || []);
    } catch {
      setResults([]);
    } finally {
      setLoading(false);
    }
  }, [query]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && query.trim()) {
      handleSearch();
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="min-h-[80vh] space-y-8">
      {/* Header */}
      <motion.div 
        initial={{ opacity: 0, y: -20 }}
        animate={{ opacity: 1, y: 0 }}
        className="space-y-2"
      >
        <div className="flex items-center gap-3">
          <div className="p-2.5 bg-gradient-to-br from-teal-500 to-emerald-600 rounded-xl shadow-lg shadow-teal-500/20">
            <FileText className="h-6 w-6 text-white" />
          </div>
          <div>
            <h1 className="text-2xl font-bold text-gray-900">Medical Records</h1>
            <p className="text-gray-500 text-sm">Search and view patient documents</p>
          </div>
        </div>
      </motion.div>

      {/* Search Section */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
      >
        <Card className="border-0 shadow-xl bg-gradient-to-br from-white to-gray-50/80 overflow-hidden">
          <CardContent className="p-6">
            <div className="flex flex-col sm:flex-row gap-3">
              <div className="relative flex-1">
                <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-gray-400" />
                <Input
                  placeholder="Search by patient name, email, or phone number..."
                  value={query}
                  onChange={(e) => setQuery(e.target.value)}
                  onKeyDown={handleKeyDown}
                  className="pl-12 h-12 text-base bg-white border-gray-200 focus:border-teal-400 focus:ring-teal-400/20 rounded-xl shadow-sm"
                />
              </div>
              <Button 
                onClick={handleSearch} 
                disabled={loading || !query.trim()}
                className="h-12 px-8 bg-gradient-to-r from-teal-500 to-emerald-600 hover:from-teal-600 hover:to-emerald-700 text-white rounded-xl shadow-lg shadow-teal-500/25 transition-all duration-200 hover:shadow-xl hover:shadow-teal-500/30"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Searching...
                  </>
                ) : (
                  <>
                    <Search className="h-4 w-4 mr-2" />
                    Search
                  </>
                )}
              </Button>
            </div>
            <p className="text-xs text-gray-400 mt-3 flex items-center gap-1">
              <span>💡</span> Press Enter to search quickly
            </p>
          </CardContent>
        </Card>
      </motion.div>

      {/* Results Section */}
      <AnimatePresence mode="wait">
        {loading ? (
          /* Loading Skeletons */
          <motion.div
            key="loading"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3"
          >
            {[...Array(6)].map((_, i) => (
              <div 
                key={i} 
                className="h-40 bg-gradient-to-br from-gray-100 to-gray-50 rounded-2xl animate-pulse"
              />
            ))}
          </motion.div>
        ) : results.length > 0 ? (
          /* Results Grid */
          <motion.div
            key="results"
            variants={containerVariants}
            initial="hidden"
            animate="visible"
          >
            <div className="flex items-center justify-between mb-4">
              <div className="flex items-center gap-2">
                <Users className="h-5 w-5 text-teal-600" />
                <span className="font-semibold text-gray-700">
                  {results.length} Patient{results.length !== 1 ? 's' : ''} Found
                </span>
              </div>
              <Badge variant="outline" className="bg-teal-50 text-teal-700 border-teal-200">
                Showing all results
              </Badge>
            </div>

            <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
              {results.map((patient) => (
                <motion.div key={patient.id} variants={itemVariants}>
                  <Link href={`/doctor/dashboard/records/${patient.id}`}>
                    <Card className="group h-full border-0 shadow-md hover:shadow-xl bg-white rounded-2xl overflow-hidden transition-all duration-300 hover:-translate-y-1 cursor-pointer">
                      <CardContent className="p-0">
                        {/* Card Header */}
                        <div className="p-5 bg-gradient-to-br from-teal-500 to-emerald-600">
                          <div className="flex items-center gap-3">
                            <div className="w-12 h-12 rounded-full bg-white/20 backdrop-blur-sm flex items-center justify-center">
                              <User className="h-6 w-6 text-white" />
                            </div>
                            <div className="flex-1 min-w-0">
                              <h3 className="font-semibold text-white truncate text-lg">
                                {patient.name}
                              </h3>
                              <p className="text-teal-100 text-sm truncate">
                                Patient
                              </p>
                            </div>
                            <ChevronRight className="h-5 w-5 text-white/60 group-hover:text-white group-hover:translate-x-1 transition-all" />
                          </div>
                        </div>

                        {/* Card Body */}
                        <div className="p-5 space-y-3">
                          <div className="flex items-center gap-3 text-sm">
                            <div className="p-2 bg-gray-100 rounded-lg">
                              <Mail className="h-4 w-4 text-gray-500" />
                            </div>
                            <span className="text-gray-600 truncate flex-1">
                              {patient.email || "No email"}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <div className="p-2 bg-gray-100 rounded-lg">
                              <Phone className="h-4 w-4 text-gray-500" />
                            </div>
                            <span className="text-gray-600 truncate flex-1">
                              {patient.phone || "No phone"}
                            </span>
                          </div>
                          <div className="flex items-center gap-3 text-sm">
                            <div className="p-2 bg-gray-100 rounded-lg">
                              <Calendar className="h-4 w-4 text-gray-500" />
                            </div>
                            <span className="text-gray-600 truncate flex-1">
                              Joined {formatDate(patient.createdAt)}
                            </span>
                          </div>
                        </div>

                        {/* Card Footer */}
                        <div className="px-5 pb-5">
                          <div className="flex items-center justify-between p-3 bg-gray-50 rounded-xl group-hover:bg-teal-50 transition-colors">
                            <span className="text-sm font-medium text-gray-600 group-hover:text-teal-700">
                              View Documents
                            </span>
                            <FileText className="h-4 w-4 text-gray-400 group-hover:text-teal-600" />
                          </div>
                        </div>
                      </CardContent>
                    </Card>
                  </Link>
                </motion.div>
              ))}
            </div>
          </motion.div>
        ) : hasSearched ? (
          /* No Results */
          <motion.div
            key="no-results"
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0 }}
          >
            <Card className="border-0 shadow-lg bg-white rounded-2xl">
              <CardContent className="py-16 text-center">
                <div className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-gray-100 to-gray-50 rounded-full flex items-center justify-center">
                  <FolderSearch className="h-10 w-10 text-gray-400" />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">No Patients Found</h3>
                <p className="text-gray-500 max-w-md mx-auto">
                  We couldn't find any patients matching "<span className="font-medium text-gray-700">{query}</span>". 
                  Try adjusting your search terms.
                </p>
              </CardContent>
            </Card>
          </motion.div>
        ) : (
          /* Initial State */
          <motion.div
            key="initial"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
          >
            <Card className="border-0 shadow-lg bg-gradient-to-br from-white to-gray-50/50 rounded-2xl overflow-hidden">
              <CardContent className="py-16 text-center">
                <div className="w-24 h-24 mx-auto mb-6 bg-gradient-to-br from-teal-100 to-emerald-100 rounded-full flex items-center justify-center">
                  <Search className="h-12 w-12 text-teal-500" />
                </div>
                <h3 className="text-xl font-semibold text-gray-700 mb-2">Search for Patients</h3>
                <p className="text-gray-500 max-w-md mx-auto mb-6">
                  Enter a patient's name, email, or phone number to find and view their medical documents.
                </p>
                <div className="flex flex-wrap justify-center gap-2">
                  <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 px-3 py-1">
                    🔍 Search by name
                  </Badge>
                  <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 px-3 py-1">
                    📧 Search by email
                  </Badge>
                  <Badge variant="outline" className="bg-gray-50 text-gray-600 border-gray-200 px-3 py-1">
                    📱 Search by phone
                  </Badge>
                </div>
              </CardContent>
            </Card>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
