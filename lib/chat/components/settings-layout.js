"use client";
import { jsx, jsxs } from "react/jsx-runtime";
import { useState, useEffect } from "react";
import { PageLayout } from "./page-layout.js";
import { UserIcon, ClockIcon, ZapIcon, MessageIcon, GitBranchIcon, SettingsIcon } from "./icons.js";
const TABS = [
  { id: "event-handler", label: "Event Handler", href: "/admin/event-handler", icon: MessageIcon },
  { id: "harness", label: "Harness", href: "/admin/harness/runs", icon: ZapIcon },
  { id: "github", label: "GitHub", href: "/admin/github", icon: GitBranchIcon },
  { id: "users", label: "Users", href: "/admin/users", icon: UserIcon },
  { id: "crons", label: "Crons", href: "/admin/crons", icon: ClockIcon },
  { id: "triggers", label: "Triggers", href: "/admin/triggers", icon: ZapIcon },
  { id: "general", label: "General", href: "/admin/general", icon: SettingsIcon }
];
function SettingsLayout({ session, children }) {
  const [activePath, setActivePath] = useState("");
  useEffect(() => {
    setActivePath(window.location.pathname);
  }, []);
  return /* @__PURE__ */ jsxs(PageLayout, { session, children: [
    /* @__PURE__ */ jsx("div", { className: "mb-6", children: /* @__PURE__ */ jsx("h1", { className: "text-2xl font-semibold", children: "Admin" }) }),
    /* @__PURE__ */ jsx("div", { className: "flex gap-1 border-b border-border mb-6 overflow-x-auto scrollbar-hide max-w-full", children: TABS.map((tab) => {
      const isActive = activePath === tab.href || activePath.startsWith(tab.href + "/");
      const Icon = tab.icon;
      return /* @__PURE__ */ jsxs(
        "a",
        {
          href: tab.href,
          className: `inline-flex items-center gap-2 px-3 py-2 min-h-[44px] shrink-0 text-sm font-medium border-b-2 transition-colors ${isActive ? "border-foreground text-foreground" : "border-transparent text-muted-foreground hover:text-foreground hover:border-border"}`,
          children: [
            /* @__PURE__ */ jsx(Icon, { size: 14 }),
            tab.label
          ]
        },
        tab.id
      );
    }) }),
    children
  ] });
}
export {
  SettingsLayout
};
