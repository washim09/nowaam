"use client";

import { useCallback, useEffect, useRef, useState } from "react";

import { cn } from "@/lib/utils";

type Notification = {
  _id: string;
  type: string;
  title: string;
  message: string;
  read: boolean;
  createdAt: string;
  metadata?: Record<string, string>;
};

const TYPE_ICON: Record<string, string> = {
  order_placed: "🛒",
  payment_success: "✅",
  shipment_created: "📦",
  out_for_delivery: "🚚",
  delivered: "🎉",
  return_approved: "🔄",
  return_rejected: "❌",
  refund_initiated: "💳",
  refund_completed: "💰",
};

function formatRelativeTime(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins}m ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours}h ago`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d ago`;
  return new Date(dateStr).toLocaleDateString("en-IN", { day: "numeric", month: "short" });
}

export function NotificationBell() {
  const [isOpen, setIsOpen] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [unreadCount, setUnreadCount] = useState(0);
  const [isLoading, setIsLoading] = useState(false);
  const panelRef = useRef<HTMLDivElement>(null);
  const buttonRef = useRef<HTMLButtonElement>(null);

  const fetchNotifications = useCallback(async () => {
    setIsLoading(true);
    try {
      const res = await fetch("/api/notifications?limit=20");
      if (!res.ok) return;
      const data = (await res.json()) as {
        notifications: Notification[];
        unreadCount: number;
      };
      setNotifications(data.notifications);
      setUnreadCount(data.unreadCount);
    } catch (_) {
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    void fetchNotifications();
    const interval = setInterval(() => void fetchNotifications(), 60_000);
    return () => clearInterval(interval);
  }, [fetchNotifications]);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (
        panelRef.current &&
        !panelRef.current.contains(e.target as Node) &&
        !buttonRef.current?.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const markAllRead = async () => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ markAll: true }),
      });
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
      setUnreadCount(0);
    } catch (_) {}
  };

  const markRead = async (id: string) => {
    try {
      await fetch("/api/notifications", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ids: [id] }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n._id === id ? { ...n, read: true } : n)),
      );
      setUnreadCount((c) => Math.max(0, c - 1));
    } catch (_) {}
  };

  const handleOpen = () => {
    setIsOpen((prev) => !prev);
    if (!isOpen) void fetchNotifications();
  };

  return (
    <div className="relative">
      <button
        ref={buttonRef}
        type="button"
        onClick={handleOpen}
        aria-label={`Notifications${unreadCount > 0 ? ` (${unreadCount} unread)` : ""}`}
        className={cn(
          "relative grid h-10 w-10 place-items-center rounded-full transition-all duration-200",
          isOpen
            ? "bg-brand-100 text-brand-900"
            : "text-brand-600 hover:bg-brand-50 hover:text-brand-900",
        )}
      >
        <svg
          width="20"
          height="20"
          viewBox="0 0 24 24"
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
        >
          <path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9" />
          <path d="M13.73 21a2 2 0 0 1-3.46 0" />
        </svg>
        {unreadCount > 0 && (
          <span className="absolute -right-0.5 -top-0.5 flex h-4 w-4 items-center justify-center rounded-full bg-rose-500 text-[9px] font-bold text-white">
            {unreadCount > 9 ? "9+" : unreadCount}
          </span>
        )}
      </button>

      {isOpen && (
        <div
          ref={panelRef}
          className="absolute right-0 top-12 z-50 w-80 overflow-hidden rounded-[24px] border border-white/50 bg-white shadow-xl shadow-brand-900/10 sm:w-96"
        >
          <div className="flex items-center justify-between border-b border-brand-100/60 px-5 py-4">
            <div>
              <h3 className="font-semibold text-brand-900">Notifications</h3>
              {unreadCount > 0 && (
                <p className="mt-0.5 text-xs text-stone-500">
                  {unreadCount} unread
                </p>
              )}
            </div>
            {unreadCount > 0 && (
              <button
                type="button"
                onClick={() => void markAllRead()}
                className="text-xs font-semibold text-brand-600 hover:text-brand-900"
              >
                Mark all read
              </button>
            )}
          </div>

          <div className="max-h-[420px] overflow-y-auto">
            {isLoading && notifications.length === 0 ? (
              <div className="space-y-px p-3">
                {Array.from({ length: 3 }).map((_, i) => (
                  <div key={i} className="shimmer h-16 rounded-[18px] bg-brand-50" />
                ))}
              </div>
            ) : notifications.length === 0 ? (
              <div className="px-5 py-10 text-center">
                <p className="text-2xl">🔔</p>
                <p className="mt-2 text-sm text-stone-500">No notifications yet</p>
              </div>
            ) : (
              <div className="divide-y divide-brand-50">
                {notifications.map((n) => (
                  <button
                    key={n._id}
                    type="button"
                    onClick={() => { if (!n.read) void markRead(n._id); }}
                    className={cn(
                      "flex w-full gap-3 px-5 py-4 text-left transition-colors duration-150",
                      n.read
                        ? "hover:bg-brand-50/50"
                        : "bg-brand-50/60 hover:bg-brand-50",
                    )}
                  >
                    <span className="mt-0.5 flex-shrink-0 text-xl leading-none">
                      {TYPE_ICON[n.type] ?? "📋"}
                    </span>
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center justify-between gap-2">
                        <p
                          className={cn(
                            "truncate text-sm",
                            n.read ? "font-medium text-brand-900" : "font-semibold text-brand-900",
                          )}
                        >
                          {n.title}
                        </p>
                        {!n.read && (
                          <span className="h-2 w-2 flex-shrink-0 rounded-full bg-brand-600" />
                        )}
                      </div>
                      <p className="mt-0.5 line-clamp-2 text-xs text-stone-500">
                        {n.message}
                      </p>
                      <p className="mt-1 text-[10px] text-stone-400">
                        {formatRelativeTime(n.createdAt)}
                      </p>
                    </div>
                  </button>
                ))}
              </div>
            )}
          </div>

          <div className="border-t border-brand-100/60 px-5 py-3">
            <button
              type="button"
              onClick={() => void fetchNotifications()}
              className="text-xs font-semibold text-brand-600 hover:text-brand-900"
            >
              Refresh
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
