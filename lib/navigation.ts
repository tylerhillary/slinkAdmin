import { Clock3, LayoutDashboard, Link2, Mail, Sparkles, Wand2 } from "lucide-react";
import type { LucideIcon } from "lucide-react";

import type { FilterKey, SegmentKey } from "@/types";

export interface NavItem {
  filter: FilterKey;
  /** Sidebar label. */
  label: string;
  /** Breadcrumb leaf and page heading. */
  title: string;
  description: string;
  icon: LucideIcon;
  /** Which count feeds this item's badge. */
  countKey: SegmentKey;
}

/**
 * The console's primary navigation.
 *
 * Every entry maps onto a filter the registration queue already supports, so
 * navigating never issues a different query — it re-slices the live snapshot.
 */
export const NAV_ITEMS: readonly NavItem[] = [
  {
    filter: "registered",
    label: "Overview",
    title: "Registration Overview",
    description:
      "Every learner in the intake pipeline, newest first, with readiness and tutor-matching state.",
    icon: LayoutDashboard,
    countKey: "registered",
  },
  {
    filter: "new-skill",
    label: "New Skills",
    title: "New Skill Submissions",
    description: "Registrations that arrived through a direct client submission.",
    icon: Sparkles,
    countKey: "newSkill",
  },
  {
    filter: "pending-skill",
    label: "Pending Review",
    title: "Pending Review",
    description: "Learners awaiting a tutor match or a readiness decision.",
    icon: Clock3,
    countKey: "pending",
  },
  {
    filter: "connected-skill",
    label: "Connected",
    title: "Connected Learners",
    description: "Learners already linked to a tutor, with the assigned contact on record.",
    icon: Link2,
    countKey: "connected",
  },
  {
    filter: "mailed",
    label: "Mail Queue",
    title: "Assessment Mail Queue",
    description: "Candidates currently moving through the automated assessment pipeline.",
    icon: Mail,
    countKey: "mailed",
  },
  {
    filter: "suggested-skill",
    label: "AI Suggested",
    title: "AI Suggested Matches",
    description: "Records surfaced by the suggestion pipeline rather than a direct signup.",
    icon: Wand2,
    countKey: "suggested",
  },
] as const;

export function findNavItem(filter: FilterKey): NavItem {
  return NAV_ITEMS.find((item) => item.filter === filter) ?? (NAV_ITEMS[0] as NavItem);
}
