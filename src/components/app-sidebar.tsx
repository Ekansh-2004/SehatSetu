"use client";

import * as React from "react";
import {
  Calendar,
  CreditCard,
  FileText,
  LayoutDashboard,
  Users,
  Pill,
  Clock,
  BookOpen,
  UserCog,
  Search,
  Scan,
  Shield,
  PhoneIncoming,
} from "lucide-react";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { Logo } from "@/components/ui/logo";

import { NavMain } from "@/components/nav-main";
//import { NavProjects } from "@/components/nav-projects";
import { NavUser } from "@/components/nav-user";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarRail,
  useSidebar,
} from "@/components/ui/sidebar";

const data = {
  user: {
    name: "Dr. Neeraj Rohilla",
    email: "sarah.johnson@clinic.com",
  },
  navMain: [
    {
      title: "Dashboard",
      url: "/doctor/dashboard",
      icon: LayoutDashboard,
      iconClass: "sidebar-icon-dashboard",
      // items: [
      //   {
      //     title: "Overview",
      //     url: "/doctor/dashboard/overview",
      //     isActive: true,
      //   },
      //   {
      //     title: "Analytics",
      //     url: "/doctor/dashboard/analytics",
      //   },
      // ],
    },
    {
      title: "Patient Management",
      url: "/doctor/dashboard/patients",
      icon: Users,
      iconClass: "sidebar-icon-patients",
    },
    {
      title: "Call Requests",
      url: "/doctor/dashboard/patient-requests",
      icon: PhoneIncoming,
      iconClass: "sidebar-icon-requests",
    },
    {
      title: "Appointments",
      url: "/doctor/dashboard/appointments",
      icon: Calendar,
      iconClass: "sidebar-icon-appointments",
      items: [
        {
          title: "Calendar",
          url: "/doctor/dashboard/appointments",
        },
        {
          title: "Video Consultations",
          url: "/doctor/dashboard/appointments/consultation",
        },
        {
          title: "Physical Consultations",
          url: "/doctor/dashboard/physical-consultations",
        },
      ],
    },
    {
      title: "Availability",
      url: "/doctor/dashboard/availability",
      icon: Clock,
      iconClass: "sidebar-icon-availability",
      items: [
        {
          title: "Schedule Settings",
          url: "/doctor/dashboard/availability",
        },
      ],
    },
    {
      title: "Medical Records",
      url: "/doctor/dashboard/records",
      icon: FileText,
      iconClass: "sidebar-icon-records",
      // items: [
      //   {
      //     title: "Patient History",
      //     url: "/doctor/dashboard/records/history",
      //   },
      //   {
      //     title: "Lab Reports",
      //     url: "/doctor/dashboard/records/lab",
      //   },
      //   {
      //     title: "Prescriptions",
      //     url: "/doctor/dashboard/records/prescriptions",
      //   },
      // ],
    },
    {
      title: "Medical Imaging",
      url: "/doctor/dashboard/medical-imaging",
      icon: Scan,
      iconClass: "sidebar-icon-imaging",
      badge: "Beta",
    },
    {
      title: "Government Schemes",
      url: "/scheme?role=doctor",
      icon: Shield,
      iconClass: "sidebar-icon-schemes",
    },
  ],
  clinicModules: [
    {
      name: "Billing & Payments",
      url: "/doctor/dashboard/billing",
      icon: CreditCard,
      iconClass: "sidebar-icon-billing",
    },
    {
      name: "Tasks & Reminders",
      url: "/doctor/dashboard/tasks",
      icon: Clock,
      iconClass: "sidebar-icon-tasks",
    },
    {
      name: "Pharmacy",
      url: "/doctor/dashboard/pharmacy",
      icon: Pill,
      iconClass: "sidebar-icon-pharmacy",
    },
    {
      name: "Reports",
      url: "/doctor/dashboard/reports",
      icon: BookOpen,
      iconClass: "sidebar-icon-reports",
    },
    {
      name: "Staff Management",
      url: "/doctor/dashboard/staff",
      icon: UserCog,
      iconClass: "sidebar-icon-staff",
    },
  ],
};

export function AppSidebar({ ...props }: React.ComponentProps<typeof Sidebar>) {
  const { state, toggleSidebar, isMobile } = useSidebar();
  const router = useRouter();

  const footerVariants = {
    expanded: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.4,
      },
    },
    collapsed: {
      transition: {
        staggerChildren: 0.05,
        staggerDirection: -1,
      },
    },
  };

  const footerItemVariants = {
    expanded: {
      opacity: 1,
      x: 0,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 24,
      },
    },
    collapsed: {
      opacity: 0,
      x: -20,
      transition: {
        type: "spring" as const,
        stiffness: 300,
        damping: 24,
      },
    },
  };

  return (
    <Sidebar collapsible="icon" {...props}>
      <SidebarHeader>
        {/* Logo branding - only show when expanded */}
        {state === "expanded" ? (
          <div className="flex items-center justify-center p-4">
            <Logo size="md" />
          </div>
        ) : (
          <div className="flex items-center justify-center p-4">
            <Logo size="sm" variant="icon" />
          </div>
        )}
      </SidebarHeader>
      <SidebarContent>
        <motion.div
          initial={{ opacity: 0, x: -30 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.5, ease: "easeOut" }}
          className="h-full"
        >
          <NavMain items={data.navMain} />
          {/* <NavProjects projects={data.clinicModules} /> */}
        </motion.div>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu>
          {state === "expanded" ? (
            <AnimatePresence mode="wait">
              <motion.div
                key="footer-expanded"
                variants={footerVariants}
                initial="collapsed"
                animate="expanded"
                exit="collapsed"
              >
                <motion.div variants={footerItemVariants}>
                  <SidebarMenuItem className="hidden"></SidebarMenuItem>
                </motion.div>
              </motion.div>
            </AnimatePresence>
          ) : (
            // Collapsed state - show only icons
            <>
              <SidebarMenuItem>
                <SidebarMenuButton asChild tooltip="Search">
                  <Link
                    href="/search"
                    onClick={(e) => {
                      if (!isMobile) {
                        e.preventDefault();
                        toggleSidebar();
                        setTimeout(() => {
                          router.push("/search");
                        }, 100);
                      }
                    }}
                  >
                    <Search className="sidebar-icon-search" />
                  </Link>
                </SidebarMenuButton>
              </SidebarMenuItem>
            </>
          )}
        </SidebarMenu>
        <NavUser />
      </SidebarFooter>
      <SidebarRail />
      <style jsx global>{`
        .sidebar,
        .Sidebar,
        .sidebar-content,
        .SidebarContent {
          background: rgba(255, 255, 255, 0.75) !important;
          backdrop-filter: blur(16px) !important;
          box-shadow: 0 8px 32px 0 rgba(31, 38, 135, 0.07) !important;
        }
      `}</style>
    </Sidebar>
  );
}
