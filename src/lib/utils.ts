import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

// Route segment to readable name mapping
const routeNames: Record<string, string> = {
  dashboard: "Dashboard",
  overview: "Overview",
  analytics: "Analytics",
  patients: "Patients",
  records: "Patient Records",
  appointments: "Appointments",
  calendar: "Calendar",
  billing: "Billing",
  tasks: "Tasks",
  pharmacy: "Pharmacy",
  reports: "Reports",
  staff: "Staff Management",
  history: "Patient History",
  lab: "Lab Reports",
  prescriptions: "Prescriptions",
};

// Roles that should be omitted from breadcrumbs
const rolePrefixes = ["doctor", "nurse", "staff", "admin"];

export const generateBreadcrumbs: (path: string) => BreadcrumbItemType[] = (path: string) => {
  const segments = path.split("/").filter(Boolean);
  const breadcrumbs: BreadcrumbItemType[] = [];

  // Skip the first segment if it's a role prefix
  const startIndex = segments.length > 0 && rolePrefixes.includes(segments[0]) ? 1 : 0;
  const relevantSegments = segments.slice(startIndex);

  for (let i = 0; i < relevantSegments.length; i++) {
    const segment = relevantSegments[i];
    // Reconstruct the href including the role prefix for proper navigation
    const href = "/" + segments.slice(0, startIndex + i + 1).join("/");
    const name =
      routeNames[segment] ||
      segment.charAt(0).toUpperCase() + segment.slice(1);

    breadcrumbs.push({
      name,
      href,
      isLast: i === relevantSegments.length - 1,
    });
  }

  return breadcrumbs;
};
