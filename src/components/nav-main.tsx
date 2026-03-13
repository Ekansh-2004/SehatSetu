"use client";

import { ChevronRight, type LucideIcon } from "lucide-react";
import { usePathname } from "next/navigation";
import Link from "next/link";
import { useState, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";

import {
  SidebarGroup,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubButton,
  SidebarMenuSubItem,
  useSidebar,
} from "@/components/ui/sidebar";

export function NavMain({
  items,
}: {
  items: {
    title: string;
    url: string;
    icon?: LucideIcon;
    iconClass?: string;
    isActive?: boolean;
    items?: {
      title: string;
      url: string;
    }[];
  }[];
}) {
  const pathname = usePathname();
  const { isMobile, setOpenMobile, state, toggleSidebar } = useSidebar();
  const [openSections, setOpenSections] = useState<Record<string, boolean>>({});
  const [activeSection, setActiveSection] = useState<string>("");

  // Determine active section based on pathname
  useEffect(() => {
    let currentActiveSection = "";
    let longestMatch = "";

    // Find the most specific match (longest URL that matches)
    for (const item of items) {
      // Check if we're on a sub-page of this section
      if (
        pathname?.startsWith(item.url + "/") &&
        item.url.length > longestMatch.length
      ) {
        currentActiveSection = item.title;
        longestMatch = item.url;
      }
      // Check if we're on the exact page
      if (pathname === item.url && item.url.length > longestMatch.length) {
        currentActiveSection = item.title;
        longestMatch = item.url;
      }
      // Check sub-items
      if (item.items?.some((subItem) => pathname === subItem.url)) {
        currentActiveSection = item.title;
        longestMatch = item.url;
      }
    }

    setActiveSection(currentActiveSection);

    // Keep the active section open and don't close it
    if (currentActiveSection) {
      setOpenSections((prev) => ({ ...prev, [currentActiveSection]: true }));
    }
  }, [pathname, items]);

  const toggleSection = useCallback(
    (title: string) => {
      // Don't close the currently active section
      if (title === activeSection) {
        return;
      }
      setOpenSections((prev) => ({ ...prev, [title]: !prev[title] }));
    },
    [activeSection]
  );

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
        delayChildren: 0.2,
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
      <SidebarGroupLabel>Platform</SidebarGroupLabel>
      <SidebarMenu>
        {state === "expanded" ? (
          <AnimatePresence mode="wait">
            <motion.div
              key="nav-main-expanded"
              variants={containerVariants}
              initial="collapsed"
              animate="expanded"
              exit="collapsed"
            >
              {items.map((item, index) => {
                const isOpen = openSections[item.title] || false;
                const isCurrentSection = activeSection === item.title;

                return (
                  <motion.div
                    key={item.title}
                    variants={itemVariants}
                    custom={index}
                  >
                    <SidebarMenuItem className="mb-1">
                      {item.items && item.items.length > 0 ? (
                        // Item with sub-items - navigate and toggle dropdown
                        <SidebarMenuButton asChild isActive={isCurrentSection}>
                          <Link
                            href={item.url}
                            onClick={() => {
                              // Always navigate to the main URL
                              handleNavigation();
                              // Also toggle the section dropdown
                              toggleSection(item.title);
                            }}
                            className="w-full justify-between"
                          >
                            <div className="flex items-center gap-2">
                              {item.icon && (
                                <item.icon className={item.iconClass} />
                              )}
                              <span>{item.title}</span>
                            </div>
                            <ChevronRight
                              className={`h-4 w-4 transition-transform duration-200 ${
                                openSections[item.title] ? "rotate-90" : ""
                              }`}
                            />
                          </Link>
                        </SidebarMenuButton>
                      ) : (
                        // Item without sub-items - direct route
                        <SidebarMenuButton
                          asChild
                          isActive={pathname === item.url}
                        >
                          <Link href={item.url} onClick={handleNavigation}>
                            {item.icon && (
                              <item.icon className={item.iconClass} />
                            )}
                            <span>{item.title}</span>
                          </Link>
                        </SidebarMenuButton>
                      )}
                      <AnimatePresence>
                        {state === "expanded" && isOpen && (
                          <motion.div
                            key={`${item.title}-submenu`}
                            initial={{ opacity: 0, height: 0 }}
                            animate={{ opacity: 1, height: "auto" }}
                            exit={{ opacity: 0, height: 0 }}
                            transition={{
                              duration: 0.3,
                              ease: "easeOut",
                            }}
                            style={{ overflow: "hidden" }}
                          >
                            <SidebarMenuSub className="pr-0 mr-0">
                              {item.items?.map((subItem, subIndex) => (
                                <motion.div
                                  key={subItem.title}
                                  initial={{ opacity: 0, y: -10 }}
                                  animate={{ opacity: 1, y: 0 }}
                                  exit={{ opacity: 0, y: -10 }}
                                  transition={{
                                    delay: subIndex * 0.05,
                                    type: "spring" as const,
                                    stiffness: 300,
                                    damping: 24,
                                  }}
                                >
                                  <SidebarMenuSubItem>
                                    <SidebarMenuSubButton
                                      asChild
                                      isActive={pathname === subItem.url}
                                    >
                                      <Link
                                        href={subItem.url}
                                        onClick={handleNavigation}
                                      >
                                        <span>{subItem.title}</span>
                                      </Link>
                                    </SidebarMenuSubButton>
                                  </SidebarMenuSubItem>
                                </motion.div>
                              ))}
                            </SidebarMenuSub>
                          </motion.div>
                        )}
                      </AnimatePresence>
                    </SidebarMenuItem>
                  </motion.div>
                );
              })}
            </motion.div>
          </AnimatePresence>
        ) : (
          // Collapsed state - show only icons
          items.map((item) => (
            <SidebarMenuItem key={item.title} className="mb-1">
              <SidebarMenuButton
                asChild
                tooltip={item.title}
                isActive={
                  item.items && item.items.length > 0
                    ? activeSection === item.title
                    : pathname === item.url
                }
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
                  {item.icon && <item.icon className={item.iconClass} />}
                </Link>
              </SidebarMenuButton>
            </SidebarMenuItem>
          ))
        )}
      </SidebarMenu>
    </SidebarGroup>
  );
}
