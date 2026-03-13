"use client";

import { useEffect, useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Mail, Phone } from "lucide-react";

interface PatientItem {
  id: string;
  name: string;
  email: string;
  phone: string;
  image?: string | null;
}

const getInitials = (name: string) => {
  const parts = name.trim().split(/\s+/);
  const initials = parts.slice(0, 2).map(p => p[0]?.toUpperCase() || "").join("");
  return initials || "P";
};

const PatientsPage: React.FC = () => {
  const [patients, setPatients] = useState<PatientItem[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<string>("");

  useEffect(() => {
    const fetchPatients = async () => {
      setLoading(true);
      setError(null);
      try {
        const res = await fetch("/api/patients");
        const data: IApiResponse<Patient[]> = await res.json();
        if (!res.ok) throw new Error(data?.error || "Failed to load patients");
        setPatients((data?.data || []).map((p) => ({
          id: p.id,
          name: p.name,
          email: p.email,
          phone: p.phone,
          image: (p as unknown as { image?: string | null }).image ?? null,
        })));
      } catch (e: unknown) {
        const message = e instanceof Error ? e.message : "Failed to load patients";
        setError(message);
      } finally {
        setLoading(false);
      }
    };

    fetchPatients();
  }, []);

  const filtered = patients.filter((p) => {
    if (!filter.trim()) return true;
    const q = filter.toLowerCase();
    return (
      p.name.toLowerCase().includes(q) ||
      p.email.toLowerCase().includes(q) ||
      p.phone.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>Patients</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex gap-2">
            <Input
              placeholder="Filter by name, email, or phone"
              value={filter}
              onChange={(e) => setFilter(e.target.value)}
            />
            <Button onClick={() => setFilter("")} variant="secondary" disabled={!filter}>
              Clear
            </Button>
          </div>
        </CardContent>
      </Card>

      {loading && (
        <Card>
          <CardContent>
            <div className="p-6 text-muted-foreground">Loading patients...</div>
          </CardContent>
        </Card>
      )}

      {error && !loading && (
        <Card>
          <CardContent>
            <div className="p-6 text-red-600">{error}</div>
          </CardContent>
        </Card>
      )}

      {!loading && !error && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length === 0 ? (
            <Card className="sm:col-span-2 lg:col-span-3">
              <CardContent>
                <div className="p-6 text-muted-foreground">No patients found.</div>
              </CardContent>
            </Card>
          ) : (
            filtered.map((p) => (
              <Card key={p.id} className="h-full hover:shadow-lg transition-shadow">
                <CardHeader className="pb-2 min-h-[40px]">
                  <div className="flex items-center gap-3">
                    <Avatar className="size-10">
                      {p.image ? (
                        <AvatarImage alt={p.name} src={p.image} />
                      ) : (
                        <AvatarFallback>{getInitials(p.name)}</AvatarFallback>
                      )}
                    </Avatar>
                    <div>
                      <CardTitle className="text-base truncate">{p.name}</CardTitle>
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Mail className="h-4 w-4" />
                      <span className="truncate">{p.email}</span>
                    </div>
                    <div className="text-sm text-muted-foreground flex items-center gap-2">
                      <Phone className="h-4 w-4" />
                      <span className="truncate tabular-nums">{p.phone}</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            ))
          )}
        </div>
      )}
    </div>
  );
};

export default PatientsPage;
