"use client";

import { signOut, useSession } from "next-auth/react";
import { useEffect, useMemo, useState } from "react";

import { buttonStyles } from "@/components/Button";
import { useToast } from "@/components/ToastProvider";
import { PRODUCT_CATEGORIES } from "@/lib/constants";
import { cn, formatCurrency, getFriendlyErrorMessage } from "@/lib/utils";
import type { FulfillmentStatus, OrderRecord, ProductRecord } from "@/types";

type AdminTab = "overview" | "users" | "products" | "analytics";

type UserRecord = {
  _id: string;
  name: string;
  email: string;
  role: "buyer" | "seller" | "admin";
  isApproved: boolean;
  createdAt: string;
};

type AdminStats = {
  totalUsers: number;
  totalSellers: number;
  totalBuyers: number;
  pendingSellers: number;
  totalProducts: number;
  totalOrders: number;
  paidOrders: number;
  totalRevenue: number;
};

function RoleBadge({ role }: { role: string }) {
  const styles: Record<string, string> = {
    admin: "bg-rose-50 text-rose-700",
    seller: "bg-amber-50 text-amber-700",
    buyer: "bg-brand-50 text-brand-700",
  };
  return (
    <span
      className={cn(
        "rounded-full px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-[0.14em]",
        styles[role] ?? "bg-stone-100 text-stone-600",
      )}
    >
      {role}
    </span>
  );
}

function StatusDot({ ok }: { ok: boolean }) {
  return (
    <span
      className={cn(
        "inline-block h-2 w-2 rounded-full",
        ok ? "bg-emerald-500" : "bg-amber-400",
      )}
    />
  );
}

function StatCard({
  label,
  value,
  sub,
  accent,
}: {
  label: string;
  value: string | number;
  sub?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "surface-elevated flex flex-col gap-2 p-5",
        accent && "border border-brand-200 bg-brand-50/40",
      )}
    >
      <span className="text-xs font-semibold uppercase tracking-[0.18em] text-brand-400">
        {label}
      </span>
      <span className="text-3xl font-semibold tracking-[-0.04em] text-brand-900">{value}</span>
      {sub && <span className="text-xs text-stone-400">{sub}</span>}
    </div>
  );
}

function OverviewTab({ stats }: { stats: AdminStats | null }) {
  if (!stats) {
    return (
      <div className="surface-elevated p-8 text-center text-sm text-stone-400">
        Loading stats…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Users" value={stats.totalUsers} sub={`${stats.totalSellers} sellers · ${stats.totalBuyers} buyers`} />
        <StatCard label="Pending Sellers" value={stats.pendingSellers} sub="Awaiting approval" accent={stats.pendingSellers > 0} />
        <StatCard label="Total Products" value={stats.totalProducts} />
        <StatCard label="Total Orders" value={stats.totalOrders} sub={`${stats.paidOrders} paid`} />
      </div>
      <StatCard
        label="Platform Revenue"
        value={formatCurrency(stats.totalRevenue)}
        sub="From paid orders only"
        accent
      />
    </div>
  );
}

function UsersTab({
  users,
  isLoading,
  onUsersChange,
}: {
  users: UserRecord[];
  isLoading: boolean;
  onUsersChange: (u: UserRecord[]) => void;
}) {
  const { toast } = useToast();
  const [roleFilter, setRoleFilter] = useState<"all" | "buyer" | "seller" | "pending">("all");
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const filtered = useMemo(() => {
    if (roleFilter === "all") return users;
    if (roleFilter === "pending") return users.filter((u) => u.role === "seller" && !u.isApproved);
    return users.filter((u) => u.role === roleFilter);
  }, [users, roleFilter]);

  const patch = async (id: string, payload: { role?: string; isApproved?: boolean }) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = (await res.json()) as { error?: string; user?: UserRecord };
      if (!res.ok) throw new Error(data.error);
      onUsersChange(users.map((u) => (u._id === id ? (data.user ?? u) : u)));
      toast({ variant: "success", title: "User updated" });
    } catch (e) {
      toast({ variant: "error", title: "Update failed", description: getFriendlyErrorMessage(e) });
    } finally {
      setActionLoading(null);
    }
  };

  const deleteUser = async (id: string) => {
    setActionLoading(id);
    try {
      const res = await fetch(`/api/admin/users/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error);
      onUsersChange(users.filter((u) => u._id !== id));
      toast({ variant: "success", title: "User deleted" });
    } catch (e) {
      toast({ variant: "error", title: "Delete failed", description: getFriendlyErrorMessage(e) });
    } finally {
      setActionLoading(null);
      setConfirmDelete(null);
    }
  };

  const FILTERS: Array<{ id: typeof roleFilter; label: string }> = [
    { id: "all", label: "All Users" },
    { id: "seller", label: "Sellers" },
    { id: "buyer", label: "Buyers" },
    { id: "pending", label: "Pending Approval" },
  ];

  const formatJoinedDate = (value: string) =>
    new Date(value).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });

  const renderUserActions = (user: UserRecord) => (
    <div className="flex flex-wrap gap-1.5">
      {user.role === "seller" && !user.isApproved && (
        <button
          type="button"
          disabled={actionLoading === user._id}
          onClick={() => void patch(user._id, { isApproved: true })}
          className="rounded-full bg-emerald-600 px-3 py-1 text-xs font-semibold text-white hover:bg-emerald-700 disabled:opacity-50"
        >
          Approve
        </button>
      )}
      {user.role === "seller" && user.isApproved && (
        <button
          type="button"
          disabled={actionLoading === user._id}
          onClick={() => void patch(user._id, { isApproved: false })}
          className="rounded-full bg-amber-500 px-3 py-1 text-xs font-semibold text-white hover:bg-amber-600 disabled:opacity-50"
        >
          Suspend
        </button>
      )}
      {user.role === "buyer" && (
        <button
          type="button"
          disabled={actionLoading === user._id}
          onClick={() => void patch(user._id, { role: "seller" })}
          className="rounded-full bg-amber-100 px-3 py-1 text-xs font-semibold text-amber-800 hover:bg-amber-200 disabled:opacity-50"
        >
          Make Seller
        </button>
      )}
      {user.role === "seller" && (
        <button
          type="button"
          disabled={actionLoading === user._id}
          onClick={() => void patch(user._id, { role: "buyer" })}
          className="rounded-full bg-brand-100 px-3 py-1 text-xs font-semibold text-brand-800 hover:bg-brand-200 disabled:opacity-50"
        >
          Make Buyer
        </button>
      )}
      {confirmDelete === user._id ? (
        <>
          <button
            type="button"
            onClick={() => void deleteUser(user._id)}
            disabled={actionLoading === user._id}
            className="rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
          >
            Confirm
          </button>
          <button
            type="button"
            onClick={() => setConfirmDelete(null)}
            className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600 hover:bg-stone-200"
          >
            Cancel
          </button>
        </>
      ) : (
        <button
          type="button"
          onClick={() => setConfirmDelete(user._id)}
          className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100"
        >
          Delete
        </button>
      )}
    </div>
  );

  return (
    <div className="surface-elevated space-y-5 p-6">
      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => setRoleFilter(f.id)}
            className={cn(
              "rounded-full px-4 py-1.5 text-sm font-semibold transition-all duration-200",
              roleFilter === f.id
                ? "bg-brand-700 text-white"
                : "bg-brand-50 text-brand-700 hover:bg-brand-100",
            )}
          >
            {f.label}
            <span className="ml-2 text-[10px] opacity-70">
              {f.id === "all"
                ? users.length
                : f.id === "pending"
                  ? users.filter((u) => u.role === "seller" && !u.isApproved).length
                  : users.filter((u) => u.role === f.id).length}
            </span>
          </button>
        ))}
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-stone-400">Loading users…</div>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center text-sm text-stone-400">No users found.</div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {filtered.map((user) => (
              <article key={user._id} className="rounded-[22px] bg-brand-50/55 p-4">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="font-semibold text-brand-900">{user.name}</p>
                    <p className="mt-1 break-all text-sm text-stone-500">{user.email}</p>
                  </div>
                  <div className="flex flex-wrap items-center gap-2">
                    <RoleBadge role={user.role} />
                    <span className="inline-flex items-center gap-1.5 rounded-full bg-white px-3 py-1 text-xs text-stone-500 shadow-sm">
                      <StatusDot ok={user.isApproved} />
                      <span>{user.isApproved ? "Active" : "Pending"}</span>
                    </span>
                  </div>
                </div>
                <p className="mt-3 text-xs text-stone-400">Joined {formatJoinedDate(user.createdAt)}</p>
                <div className="mt-4">{renderUserActions(user)}</div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-left">
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-[0.18em] text-brand-400">Name</th>
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-[0.18em] text-brand-400">Email</th>
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-[0.18em] text-brand-400">Role</th>
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-[0.18em] text-brand-400">Status</th>
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-[0.18em] text-brand-400">Joined</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-400">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {filtered.map((user) => (
                <tr key={user._id} className="group">
                  <td className="py-3 pr-4 font-medium text-brand-900">{user.name}</td>
                  <td className="py-3 pr-4 text-stone-500">{user.email}</td>
                  <td className="py-3 pr-4">
                    <RoleBadge role={user.role} />
                  </td>
                  <td className="py-3 pr-4">
                    <span className="flex items-center gap-1.5">
                      <StatusDot ok={user.isApproved} />
                      <span className="text-xs text-stone-500">
                        {user.isApproved ? "Active" : "Pending"}
                      </span>
                    </span>
                  </td>
                  <td className="py-3 pr-4 text-xs text-stone-400">{formatJoinedDate(user.createdAt)}</td>
                  <td className="py-3">{renderUserActions(user)}</td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function ProductsTab({
  products,
  users,
  isLoading,
  onProductsChange,
}: {
  products: ProductRecord[];
  users: UserRecord[];
  isLoading: boolean;
  onProductsChange: (p: ProductRecord[]) => void;
}) {
  const { toast } = useToast();
  const [search, setSearch] = useState("");
  const [categoryFilter, setCategoryFilter] = useState("All");
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);

  const sellerMap = useMemo(() => {
    const map: Record<string, string> = {};
    for (const u of users) map[u._id] = u.name;
    return map;
  }, [users]);

  const filtered = useMemo(() => {
    return products.filter((p) => {
      const matchSearch = search === "" || p.name.toLowerCase().includes(search.toLowerCase());
      const matchCat = categoryFilter === "All" || p.category === categoryFilter;
      return matchSearch && matchCat;
    });
  }, [products, search, categoryFilter]);

  const handleDelete = async (id: string) => {
    setDeletingId(id);
    try {
      const res = await fetch(`/api/products/${id}`, { method: "DELETE" });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) throw new Error(data.error);
      onProductsChange(products.filter((p) => p._id !== id));
      toast({ variant: "success", title: "Product deleted" });
    } catch (e) {
      toast({ variant: "error", title: "Delete failed", description: getFriendlyErrorMessage(e) });
    } finally {
      setDeletingId(null);
      setConfirmDelete(null);
    }
  };

  const renderDeleteAction = (productId: string) =>
    confirmDelete === productId ? (
      <div className="flex flex-wrap gap-1.5">
        <button
          type="button"
          disabled={deletingId === productId}
          onClick={() => void handleDelete(productId)}
          className="rounded-full bg-rose-600 px-3 py-1 text-xs font-semibold text-white hover:bg-rose-700 disabled:opacity-50"
        >
          Confirm
        </button>
        <button
          type="button"
          onClick={() => setConfirmDelete(null)}
          className="rounded-full bg-stone-100 px-3 py-1 text-xs font-semibold text-stone-600"
        >
          Cancel
        </button>
      </div>
    ) : (
      <button
        type="button"
        onClick={() => setConfirmDelete(productId)}
        className="rounded-full bg-rose-50 px-3 py-1 text-xs font-semibold text-rose-600 hover:bg-rose-100"
      >
        Delete
      </button>
    );

  return (
    <div className="surface-elevated space-y-5 p-6">
      <div className="flex flex-wrap gap-3">
        <input
          type="text"
          placeholder="Search products…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="input-shell min-w-0 w-full flex-1 sm:min-w-[200px]"
        />
        <select
          value={categoryFilter}
          onChange={(e) => setCategoryFilter(e.target.value)}
          className="input-shell w-full sm:w-auto"
        >
          <option value="All">All Categories</option>
          {PRODUCT_CATEGORIES.map((c) => (
            <option key={c} value={c}>{c}</option>
          ))}
        </select>
      </div>

      {isLoading ? (
        <div className="py-8 text-center text-sm text-stone-400">Loading products…</div>
      ) : filtered.length === 0 ? (
        <div className="py-8 text-center text-sm text-stone-400">No products found.</div>
      ) : (
        <>
          <div className="space-y-3 md:hidden">
            {filtered.map((product) => (
              <article key={product._id} className="rounded-[22px] bg-brand-50/55 p-4">
                <div className="flex gap-3">
                  {product.image && (
                    <img
                      src={product.image}
                      alt={product.name}
                      className="h-16 w-16 flex-shrink-0 rounded-[16px] object-cover"
                    />
                  )}
                  <div className="min-w-0 flex-1">
                    <p className="line-clamp-2 font-semibold text-brand-900">{product.name}</p>
                    <p className="mt-1 text-xs text-stone-500">{product.category ?? "-"}</p>
                    <p className="mt-2 text-sm text-stone-500">
                      {product.sellerId
                        ? (sellerMap[product.sellerId] ?? product.sellerId.slice(-6))
                        : "Unassigned"}
                    </p>
                  </div>
                </div>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
                  <p className="text-lg font-semibold text-brand-900">{formatCurrency(product.price)}</p>
                  {renderDeleteAction(product._id)}
                </div>
              </article>
            ))}
          </div>

          <div className="hidden overflow-x-auto md:block">
            <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-brand-100 text-left">
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-[0.18em] text-brand-400">Product</th>
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-[0.18em] text-brand-400">Category</th>
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-[0.18em] text-brand-400">Price</th>
                <th className="pb-3 pr-4 text-xs font-semibold uppercase tracking-[0.18em] text-brand-400">Seller</th>
                <th className="pb-3 text-xs font-semibold uppercase tracking-[0.18em] text-brand-400">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-brand-50">
              {filtered.map((product) => (
                <tr key={product._id}>
                  <td className="py-3 pr-4">
                    <div className="flex items-center gap-3">
                      {product.image && (
                        <img
                          src={product.image}
                          alt={product.name}
                          className="h-10 w-10 rounded-lg object-cover"
                        />
                      )}
                      <span className="font-medium text-brand-900 line-clamp-1">{product.name}</span>
                    </div>
                  </td>
                  <td className="py-3 pr-4 text-xs text-stone-500">{product.category ?? "-"}</td>
                  <td className="py-3 pr-4 font-medium text-brand-900">
                    {formatCurrency(product.price)}
                  </td>
                  <td className="py-3 pr-4 text-xs text-stone-500">
                    {product.sellerId
                      ? (sellerMap[product.sellerId] ?? product.sellerId.slice(-6))
                      : <span className="italic text-stone-300">Unassigned</span>}
                  </td>
                  <td className="py-3">{renderDeleteAction(product._id)}</td>
                </tr>
              ))}
            </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function AnalyticsTab({
  orders,
  products,
  users,
}: {
  orders: OrderRecord[];
  products: ProductRecord[];
  users: UserRecord[];
}) {
  const paidOrders = orders.filter((o) => o.paymentStatus === "paid");
  const totalRevenue = paidOrders.reduce((s, o) => s + o.totalAmount, 0);
  const avgOrderValue = paidOrders.length > 0 ? totalRevenue / paidOrders.length : 0;

  const statusCounts = orders.reduce<Record<string, number>>((acc, o) => {
    const key = o.fulfillmentStatus ?? "pending";
    acc[key] = (acc[key] ?? 0) + 1;
    return acc;
  }, {});

  const productRevMap: Record<string, number> = {};
  for (const o of paidOrders) {
    for (const item of o.items ?? []) {
      productRevMap[item.productId] =
        (productRevMap[item.productId] ?? 0) + item.unitPrice * item.quantity;
    }
  }

  const productMap = Object.fromEntries(products.map((p) => [p._id, p]));
  const sellerMap = Object.fromEntries(users.map((u) => [u._id, u.name]));

  const topProducts = Object.entries(productRevMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([id, rev]) => ({ product: productMap[id], rev, id }));

  const sellerRevMap: Record<string, number> = {};
  for (const [pid, rev] of Object.entries(productRevMap)) {
    const sellerId = productMap[pid]?.sellerId;
    if (sellerId) sellerRevMap[sellerId] = (sellerRevMap[sellerId] ?? 0) + rev;
  }
  const topSellers = Object.entries(sellerRevMap)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([sid, rev]) => ({ name: sellerMap[sid] ?? sid.slice(-6), rev }));

  const STATUS_LABELS: Record<string, string> = {
    pending: "Pending",
    processing: "Processing",
    shipped: "Shipped",
    delivered: "Delivered",
    cancelled: "Cancelled",
    refund_requested: "Refund Req.",
  };

  return (
    <div className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <StatCard label="Total Revenue" value={formatCurrency(totalRevenue)} accent />
        <StatCard label="Paid Orders" value={paidOrders.length} />
        <StatCard label="Avg Order Value" value={formatCurrency(avgOrderValue)} />
        <StatCard label="Total Orders" value={orders.length} />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <div className="surface-elevated p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-brand-400">
            Orders by Status
          </h3>
          {Object.keys(statusCounts).length === 0 ? (
            <p className="text-sm text-stone-400">No orders yet.</p>
          ) : (
            <div className="space-y-3">
              {Object.entries(statusCounts).map(([status, count]) => {
                const pct = orders.length > 0 ? (count / orders.length) * 100 : 0;
                return (
                  <div key={status}>
                    <div className="mb-1 flex justify-between text-xs">
                      <span className="font-medium text-brand-700">
                        {STATUS_LABELS[status] ?? status}
                      </span>
                      <span className="text-stone-400">
                        {count} ({pct.toFixed(0)}%)
                      </span>
                    </div>
                    <div className="h-1.5 w-full rounded-full bg-brand-50">
                      <div
                        className="h-1.5 rounded-full bg-brand-500 transition-all"
                        style={{ width: `${pct}%` }}
                      />
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="surface-elevated p-6">
          <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-brand-400">
            Top Sellers by Revenue
          </h3>
          {topSellers.length === 0 ? (
            <p className="text-sm text-stone-400">No seller revenue data yet.</p>
          ) : (
            <div className="space-y-3">
              {topSellers.map((s, i) => (
                <div key={s.name} className="flex flex-wrap items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs font-bold text-brand-300">#{i + 1}</span>
                    <span className="text-sm font-medium text-brand-900 line-clamp-1">{s.name}</span>
                  </div>
                  <span className="shrink-0 text-sm font-semibold text-brand-700">
                    {formatCurrency(s.rev)}
                  </span>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="surface-elevated p-6">
        <h3 className="mb-4 text-sm font-semibold uppercase tracking-[0.18em] text-brand-400">
          Top 10 Products by Revenue
        </h3>
        {topProducts.length === 0 ? (
          <p className="text-sm text-stone-400">No revenue data yet.</p>
        ) : (
          <div className="space-y-3">
            {topProducts.map(({ product, rev, id }, i) => (
              <div key={id} className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex min-w-0 items-center gap-2">
                  <span className="text-xs font-bold text-brand-300">#{i + 1}</span>
                  <span className="truncate text-sm font-medium text-brand-900">
                    {product?.name ?? `Product ${id.slice(-6)}`}
                  </span>
                </div>
                <span className="shrink-0 text-sm font-semibold text-brand-700">
                  {formatCurrency(rev)}
                </span>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

export function SuperAdminClient() {
  const { data: session } = useSession();
  const { toast } = useToast();

  const [activeTab, setActiveTab] = useState<AdminTab>("overview");
  const [stats, setStats] = useState<AdminStats | null>(null);
  const [users, setUsers] = useState<UserRecord[]>([]);
  const [products, setProducts] = useState<ProductRecord[]>([]);
  const [orders, setOrders] = useState<OrderRecord[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingProducts, setIsLoadingProducts] = useState(true);

  useEffect(() => {
    const loadAll = async () => {
      try {
        const [statsRes, usersRes, productsRes, ordersRes] = await Promise.all([
          fetch("/api/admin/stats", { cache: "no-store" }),
          fetch("/api/admin/users", { cache: "no-store" }),
          fetch("/api/products", { cache: "no-store" }),
          fetch("/api/orders", { cache: "no-store" }),
        ]);

        const [statsData, usersData, productsData, ordersData] = await Promise.all([
          statsRes.json() as Promise<{ stats?: AdminStats }>,
          usersRes.json() as Promise<{ users?: UserRecord[] }>,
          productsRes.json() as Promise<{ products?: ProductRecord[] }>,
          ordersRes.json() as Promise<{ orders?: OrderRecord[] }>,
        ]);

        if (statsData.stats) setStats(statsData.stats);
        if (usersData.users) setUsers(usersData.users);
        if (productsData.products) setProducts(productsData.products);
        if (ordersData.orders) setOrders(ordersData.orders);
      } catch (e) {
        toast({
          variant: "error",
          title: "Load error",
          description: getFriendlyErrorMessage(e),
        });
      } finally {
        setIsLoadingUsers(false);
        setIsLoadingProducts(false);
      }
    };

    void loadAll();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const TABS: Array<{ id: AdminTab; label: string; count?: number }> = [
    { id: "overview", label: "Overview" },
    {
      id: "users",
      label: "Users",
      count: stats?.pendingSellers ?? undefined,
    },
    { id: "products", label: "Products", count: products.length || undefined },
    { id: "analytics", label: "Analytics" },
  ];

  return (
    <div className="space-y-6">
      <div className="surface-elevated p-6 sm:p-8">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
          <div>
            <span className="eyebrow">Platform control</span>
            <h2 className="mt-4 text-3xl font-semibold tracking-[-0.05em] text-brand-900 sm:text-4xl">
              Super Admin
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-stone-500">
              Manage users, moderate products, and monitor platform-wide analytics.
            </p>
          </div>
          <div className="flex flex-shrink-0 flex-wrap items-center gap-3">
            {session?.user?.name && (
              <div className="rounded-[20px] bg-rose-50 px-4 py-2.5 text-center">
                <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-rose-400">
                  Admin
                </p>
                <p className="mt-0.5 text-sm font-semibold text-rose-900">
                  {session.user.name}
                </p>
              </div>
            )}
            <button
              type="button"
              onClick={() => void signOut({ callbackUrl: "/auth/signin" })}
              className={buttonStyles({ variant: "secondary", size: "sm" })}
            >
              Sign out
            </button>
          </div>
        </div>

        <div className="mt-6 grid grid-cols-2 gap-2 sm:flex sm:flex-wrap">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              type="button"
              onClick={() => setActiveTab(tab.id)}
              className={cn(
                "inline-flex w-full items-center justify-center gap-2 rounded-full px-4 py-2 text-center text-sm font-semibold transition-all duration-300 sm:w-auto sm:justify-start",
                activeTab === tab.id
                  ? "bg-brand-700 text-white shadow-sm"
                  : "border border-white/85 bg-white/75 text-brand-700 shadow-sm backdrop-blur hover:bg-white",
              )}
            >
              {tab.label}
              {tab.count !== undefined && tab.count > 0 && (
                <span
                  className={cn(
                    "inline-flex min-h-5 min-w-5 items-center justify-center rounded-full px-1.5 text-[10px] font-semibold",
                    activeTab === tab.id ? "bg-white/20 text-white" : "bg-rose-100 text-rose-700",
                  )}
                >
                  {tab.count}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {activeTab === "overview" && <OverviewTab stats={stats} />}
      {activeTab === "users" && (
        <UsersTab
          users={users}
          isLoading={isLoadingUsers}
          onUsersChange={setUsers}
        />
      )}
      {activeTab === "products" && (
        <ProductsTab
          products={products}
          users={users}
          isLoading={isLoadingProducts}
          onProductsChange={setProducts}
        />
      )}
      {activeTab === "analytics" && (
        <AnalyticsTab orders={orders} products={products} users={users} />
      )}
    </div>
  );
}
