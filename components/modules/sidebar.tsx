"use client";

import { PanelLeftClose, PanelLeftOpen, ShieldCheck } from "lucide-react";
import Image from "next/image";

import { useRegistry } from "@/components/providers/registry-provider";
import { CountPill } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { formatInteger } from "@/lib/domain/format";
import { NAV_ITEMS } from "@/lib/navigation";
import { cn } from "@/lib/utils";

export interface SidebarProps {
  collapsed: boolean;
  onToggleCollapsed: () => void;
  /** Mobile off-canvas state. Ignored at `lg` and above. */
  mobileOpen: boolean;
  onCloseMobile: () => void;
}

export function Sidebar({
  collapsed,
  onToggleCollapsed,
  mobileOpen,
  onCloseMobile,
}: SidebarProps) {
  const { activeFilter, setActiveFilter, counts } = useRegistry();

  return (
    <>
      {mobileOpen ? (
        <button
          type="button"
          aria-label="Close navigation"
          onClick={onCloseMobile}
          className="fixed inset-0 z-40 animate-fade-in bg-black/40 backdrop-blur-[2px] lg:hidden"
        />
      ) : null}

      <aside
        aria-label="Primary navigation"
        data-collapsed={collapsed || undefined}
        className={cn(
          "fixed inset-y-0 left-0 z-50 flex flex-col border-r border-line bg-surface",
          "transition-all duration-150 ease-in-out",
          "lg:static lg:z-auto lg:translate-x-0",
          mobileOpen ? "translate-x-0" : "-translate-x-full",
          collapsed ? "w-[4.25rem]" : "w-[15.5rem]",
        )}
      >
        {/* Brand */}
        <div
          className={cn(
            "flex h-14 shrink-0 items-center gap-2.5 border-b border-line px-3",
            collapsed && "justify-center px-0",
          )}
        >
          <Image
            src="/img/slink.png"
            alt=""
            width={28}
            height={28}
            className="h-7 w-7 shrink-0 rounded object-contain"
            priority
          />
          {!collapsed ? (
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-semibold tracking-tight text-content">
                Slink
              </p>
              <p className="truncate text-2xs text-content-subtle">Admin Console</p>
            </div>
          ) : null}
        </div>

        {/* Segments */}
        <nav className="scrollbar-thin flex-1 overflow-y-auto px-2 py-3">
          {!collapsed ? (
            <p className="px-2 pb-2 text-2xs font-semibold uppercase tracking-widest text-content-subtle">
              Pipeline
            </p>
          ) : null}

          <ul className="space-y-0.5">
            {NAV_ITEMS.map((item) => {
              const isActive = activeFilter === item.filter;
              const Icon = item.icon;
              const count = counts[item.countKey];

              return (
                <li key={item.filter}>
                  <button
                    type="button"
                    onClick={() => {
                      setActiveFilter(item.filter);
                      onCloseMobile();
                    }}
                    aria-current={isActive ? "page" : undefined}
                    title={collapsed ? `${item.label} (${formatInteger(count)})` : undefined}
                    className={cn(
                      "group relative flex w-full items-center rounded-md text-sm",
                      "transition-all duration-150 ease-in-out",
                      collapsed ? "h-9 justify-center px-0" : "h-9 gap-2.5 px-2",
                      isActive
                        ? "bg-accent-soft font-medium text-accent"
                        : "text-content-muted hover:bg-surface-subtle hover:text-content",
                    )}
                  >
                    {/* Active rail */}
                    <span
                      aria-hidden
                      className={cn(
                        "absolute left-0 top-1/2 h-4 w-0.5 -translate-y-1/2 rounded-r-full bg-accent",
                        "transition-opacity duration-150",
                        isActive ? "opacity-100" : "opacity-0",
                      )}
                    />
                    <Icon
                      className={cn(
                        "h-4 w-4 shrink-0 transition-colors duration-150",
                        isActive ? "text-accent" : "text-content-subtle group-hover:text-content",
                      )}
                      strokeWidth={1.75}
                      aria-hidden
                    />
                    {!collapsed ? (
                      <>
                        <span className="flex-1 truncate text-left">{item.label}</span>
                        <CountPill value={formatInteger(count)} active={isActive} />
                      </>
                    ) : null}
                  </button>
                </li>
              );
            })}
          </ul>
        </nav>

        {/* Footer: identity + collapse control */}
        <div className="shrink-0 border-t border-line p-2">
          <div
            className={cn(
              "flex items-center gap-2.5 rounded-md px-2 py-2",
              collapsed && "justify-center px-0",
            )}
          >
            <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-accent-soft text-accent">
              <ShieldCheck className="h-3.5 w-3.5" strokeWidth={2} aria-hidden />
            </span>
            {!collapsed ? (
              <div className="min-w-0 flex-1">
                <p className="truncate text-xs font-medium text-content">Admin User</p>
                <p className="truncate text-2xs text-content-subtle">Full access</p>
              </div>
            ) : null}
          </div>

          <Button
            variant="ghost"
            size={collapsed ? "icon" : "sm"}
            onClick={onToggleCollapsed}
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
            className={cn("mt-1 hidden lg:inline-flex", collapsed ? "mx-auto" : "w-full")}
            leading={
              collapsed ? (
                <PanelLeftOpen className="h-4 w-4" aria-hidden />
              ) : (
                <PanelLeftClose className="h-4 w-4" aria-hidden />
              )
            }
          >
            {!collapsed ? "Collapse" : null}
          </Button>
        </div>
      </aside>
    </>
  );
}
