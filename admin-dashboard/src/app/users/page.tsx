"use client";

import { USERS } from "@/lib/data";
import { useSettings } from "@/components/settings-provider";
import { StatusBadge } from "@/components/status-badge";
import { tRole, tStatus } from "@/lib/i18n";

export default function UsersPage() {
  const { t } = useSettings();

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
          {t("users.title")}
        </h1>
        <p className="text-sm text-slate-700 dark:text-slate-300">
          {t("users.subtitle")}
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl bg-white shadow-sm ring-1 ring-slate-200 dark:bg-slate-900 dark:ring-slate-700">
        <table className="w-full text-start text-sm" aria-label={t("users.title")}>
          <thead className="border-b border-slate-100 bg-slate-50 text-xs uppercase tracking-wide text-slate-700 dark:border-slate-800 dark:bg-slate-800/50 dark:text-slate-300">
            <tr>
              <th scope="col" className="px-5 py-3 font-medium">{t("users.name")}</th>
              <th scope="col" className="px-5 py-3 font-medium">{t("users.email")}</th>
              <th scope="col" className="px-5 py-3 font-medium">{t("users.role")}</th>
              <th scope="col" className="px-5 py-3 font-medium">{t("users.status")}</th>
              <th scope="col" className="px-5 py-3 font-medium">{t("users.created")}</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-slate-800">
            {USERS.map((user) => (
              <tr
                key={user.id}
                className="hover:bg-slate-50/60 dark:hover:bg-slate-800/40"
              >
                <td className="px-5 py-3 font-medium text-slate-800 dark:text-slate-100">
                  {user.name}
                </td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                  {user.email}
                </td>
                <td className="px-5 py-3">
                  <span className="rounded-full bg-blue-50 px-2.5 py-0.5 text-xs font-medium text-blue-700 ring-1 ring-blue-100 dark:bg-blue-950/40 dark:text-blue-300 dark:ring-blue-900">
                    {t(tRole(user.role))}
                  </span>
                </td>
                <td className="px-5 py-3">
                  <StatusBadge
                    status={user.status}
                    label={t(tStatus(user.status))}
                  />
                </td>
                <td className="px-5 py-3 text-slate-600 dark:text-slate-300">
                  {user.createdAt}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
