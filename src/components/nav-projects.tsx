"use client";

import {
  Folder,
  Forward,
  MoreHorizontal,
  Trash2,
  type LucideIcon,
} from "lucide-react";
import Link from "next/link";
import { useCallback } from "react";
import { usePathname } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuAction,
  SidebarMenuButton,
  SidebarMenuItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function NavProjects({
  projects,
}: {
  projects: {
    name: string;
    url: string;
    icon: LucideIcon;
    iconClass?: string;
  }[];
}) {
  const { isMobile, setOpenMobile, state, toggleSidebar } = useSidebar();
  const pathname = usePathname();

  // Close mobile sidebar when navigation occurs
  const handleNavigation = useCallback(() => {
    if (isMobile) {
      setOpenMobile(false);
    }
  }, [isMobile, setOpenMobile]);

  const containerVariants = {
    expanded: {
      transition: {
        staggerChildren: 0.1,
        delayChildren: 0.3,
      },
    },
    collapsed: {
      transition: {
        staggerChildren: 0.05,
        staggerDirection: -1,
      },
    },
  };

  const itemVariants = {
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
    <SidebarGroup>
      <SidebarGroupLabel>Projects</SidebarGroupLabel>
      <SidebarMenu>
        {state === "expanded" ? (
          <AnimatePresence mode="wait">
            <motion.div
              key="nav-projects-expanded"
              variants={containerVariants}
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
            >
              {projects.map((item, index) => (
                <motion.div
                  key={item.name}
                  variants={itemVariants}
                  custom={index}
                >
                  <SidebarMenuItem className="mb-1">
                    <SidebarMenuButton asChild isActive={pathname === item.url}>
                      <Link href={item.url} onClick={handleNavigation}>
                        <item.icon className={item.iconClass} />
                        <span>{item.name}</span>
                      </Link>
                    </SidebarMenuButton>
                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <SidebarMenuAction showOnHover>
                          <MoreHorizontal />
                          <span className="sr-only">More</span>
                        </SidebarMenuAction>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent
                        className="w-48 rounded-lg"
                        side="bottom"
                        align="end"
                      >
                        <DropdownMenuItem>
                          <Folder className="text-muted-foreground" />
                          <span>View Project</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem>
                          <Forward className="text-muted-foreground" />
                          <span>Share Project</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <DropdownMenuItem>
                          <Trash2 className="text-muted-foreground" />
                          <span>Delete Project</span>
                        </DropdownMenuItem>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </SidebarMenuItem>
                </motion.div>
              ))}
              <motion.div variants={itemVariants}>
                <SidebarMenuItem className="mb-1">
                  <SidebarMenuButton className="text-sidebar-foreground/70">
                    <MoreHorizontal className="text-sidebar-foreground/70" />
                    <span>More</span>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </motion.div>
            </motion.div>
          </AnimatePresence>
        ) : (
          // Collapsed state - show only icons
          projects.map((item) => (
            <SidebarMenuItem key={item.name} className="mb-1">
              <SidebarMenuButton
                asChild
                tooltip={item.name}
                isActive={pathname === item.url}
              >
                <Link
                  href={item.url}
                  onClick={() => {
                    if (!isMobile) {
                      // On desktop, navigate immediately and expand sidebar
                      toggleSidebar();
                      // Don't prevent default - let the navigation happen naturally
                    } else {
                      // On mobile, handle navigation normally
                      handleNavigation();
                    }
                  }}
                >
                  <item.icon className={item.iconClass} />
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
