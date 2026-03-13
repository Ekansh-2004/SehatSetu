"use client";

import { AppSidebar } from "@/components/app-sidebar";
import { BreadcrumbItem, BreadcrumbPage } from "@/components/ui/breadcrumb";
import {
  Breadcrumb,
  BreadcrumbLink,
  BreadcrumbList,
  BreadcrumbSeparator,
} from "@/components/ui/breadcrumb";
import { Separator } from "@/components/ui/separator";
import {
  SidebarInset,
  SidebarProvider,
  SidebarTrigger,
} from "@/components/ui/sidebar";
import { ReactNode, useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { generateBreadcrumbs } from "@/lib/utils";
import { Logo } from "@/components/ui/logo";

import { useUser } from "@clerk/nextjs";

const DashboardLayout: React.FC<{ children: ReactNode }> = ({ children }) => {
  const pathname = usePathname();
  const router = useRouter();
  const { user, isLoaded } = useUser();
  const [breadcrumbs, setBreadcrumbs] = useState<BreadcrumbItemType[]>([]);

  useEffect(() => {
    if (pathname) {
      setBreadcrumbs(generateBreadcrumbs(pathname));
    }
  }, [pathname]);

  // Role validation - redirect if not doctor
  useEffect(() => {
    if (isLoaded && user) {
      const userRole = user.unsafeMetadata?.role as string;
      if (userRole && userRole !== "doctor") {
        router.push("/doctor/dashboard");
      }
    }
  }, [isLoaded, user, router]);

  if (!isLoaded) {
    return (
      <div className="min-h-screen flex items-center justify-center">
        <div className="text-lg">Loading...</div>
      </div>
    );
  }

  return (
    <SidebarProvider className="p-2">
      <AppSidebar />
      <SidebarInset className="bg-sidebar">
        <div className="flex flex-col min-h-full w-full">
          <div className="bg-white rounded-sm shadow-md overflow-hidden flex-1 flex flex-col min-h-0">
            <header className="flex h-16 shrink-0 items-center gap-2 transition-[width,height] ease-linear group-has-data-[collapsible=icon]/sidebar-wrapper:h-12 bg-white border-b border-gray-100">
              <div className="flex items-center gap-2 px-4">
                <SidebarTrigger className="-ml-1" />
                <Separator
                  orientation="vertical"
                  className="mr-2 data-[orientation=vertical]:h-4 bg-gray-200/60"
                />
                <Logo size="sm" variant="icon" className="mr-4" />
                <Breadcrumb>
                  <BreadcrumbList>
                    {breadcrumbs.map((crumb, index) => (
                      <div key={crumb.href} className="flex items-center">
                        {index > 0 && (
                          <BreadcrumbSeparator className="mx-2 text-gray-300" />
                        )}
                        <BreadcrumbItem
                          className={index === 0 ? "hidden md:block" : ""}
                        >
                          {crumb.isLast ? (
                            <BreadcrumbPage>{crumb.name}</BreadcrumbPage>
                          ) : (
                            <BreadcrumbLink href={crumb.href}>
                              {crumb.name}
                            </BreadcrumbLink>
                          )}
                        </BreadcrumbItem>
                      </div>
                    ))}
                  </BreadcrumbList>
                </Breadcrumb>
              </div>
            </header>
            <div className="flex-1 p-6 bg-gradient-to-br from-slate-50/50 to-blue-50/30">
              {children}
            </div>
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  );
};

export default DashboardLayout;
