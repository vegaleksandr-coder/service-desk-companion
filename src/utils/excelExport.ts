import * as XLSX from "xlsx";
import { supabase } from "@/integrations/supabase/client";
import { statusLabels } from "@/types/ticket";

type PeriodType = "month" | "quarter" | "half_year" | "year" | "all";

function getStartDate(period: PeriodType): Date | null {
  const now = new Date();
  switch (period) {
    case "month":
      return new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
    case "quarter":
      return new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    case "half_year":
      return new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
    case "year":
      return new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
    case "all":
      return null;
  }
}

export const periodLabels: Record<PeriodType, string> = {
  month: "За месяц",
  quarter: "За квартал",
  half_year: "За полугодие",
  year: "За год",
  all: "За весь период",
};

export type { PeriodType };

export async function exportTicketStats(period: PeriodType) {
  const startDate = getStartDate(period);

  let query = supabase.from("tickets").select("status, category_id, categories(name)");
  if (startDate) {
    query = query.gte("created_at", startDate.toISOString());
  }

  const { data: tickets, error } = await query;
  if (error) throw error;

  // Overall stats
  const statuses: Array<keyof typeof statusLabels> = ["new", "in_progress", "awaiting", "resolved", "closed"];
  const totalRow: Record<string, string | number> = { "Категория": "ИТОГО", "Всего": tickets.length };
  for (const s of statuses) {
    totalRow[statusLabels[s]] = tickets.filter((t) => t.status === s).length;
  }

  // Group by category
  const categoryMap = new Map<string, { name: string; tickets: typeof tickets }>();
  for (const t of tickets) {
    const catId = t.category_id || "no_category";
    const catName = (t.categories as any)?.name || "Без категории";
    if (!categoryMap.has(catId)) {
      categoryMap.set(catId, { name: catName, tickets: [] });
    }
    categoryMap.get(catId)!.tickets.push(t);
  }

  const rows: Array<Record<string, string | number>> = [totalRow];
  for (const [, cat] of categoryMap) {
    const row: Record<string, string | number> = {
      "Категория": cat.name,
      "Всего": cat.tickets.length,
    };
    for (const s of statuses) {
      row[statusLabels[s]] = cat.tickets.filter((t) => t.status === s).length;
    }
    rows.push(row);
  }

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Статистика заявок");

  // Auto-width
  const colWidths = Object.keys(rows[0]).map((key) => ({
    wch: Math.max(key.length, ...rows.map((r) => String(r[key]).length)) + 2,
  }));
  ws["!cols"] = colWidths;

  XLSX.writeFile(wb, `Статистика_заявок_${periodLabels[period].replace(/\s/g, "_")}.xlsx`);
}

export async function exportUsers() {
  const { data: profiles, error: pErr } = await supabase
    .from("profiles")
    .select("user_id, name, email, created_at")
    .order("created_at", { ascending: false });
  if (pErr) throw pErr;

  const { data: roles, error: rErr } = await supabase.from("user_roles").select("user_id, role");
  if (rErr) throw rErr;

  const roleMap = new Map<string, string>();
  for (const r of roles || []) roleMap.set(r.user_id, r.role);

  const roleRu: Record<string, string> = {
    admin: "Администратор",
    executor: "Исполнитель",
    user: "Пользователь",
  };

  const rows = (profiles || []).map((p) => ({
    "Имя": p.name,
    "Email": p.email,
    "Роль": roleRu[roleMap.get(p.user_id) || "user"] || "Пользователь",
    "Дата регистрации": new Date(p.created_at).toLocaleDateString("ru-RU"),
  }));

  const ws = XLSX.utils.json_to_sheet(rows);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Пользователи");

  const colWidths = Object.keys(rows[0] || {}).map((key) => ({
    wch: Math.max(key.length, ...rows.map((r) => String((r as any)[key]).length)) + 2,
  }));
  ws["!cols"] = colWidths;

  XLSX.writeFile(wb, "Пользователи.xlsx");
}

export interface ImportUserRow {
  name: string;
  email: string;
  role: string;
  password: string;
}

export function downloadImportTemplate() {
  const templateData = [
    {
      "Имя": "Иван Петров",
      "Email": "ivan.petrov@example.com",
      "Роль": "executor",
      "Пароль": "SecurePass123!", // Optional - will be auto-generated if empty
    },
    {
      "Имя": "Мария Сидорова",
      "Email": "maria.sidorova@example.com",
      "Роль": "user",
      "Пароль": "", // Leave empty for auto-generation
    },
    {
      "Имя": "Петр Иванов",
      "Email": "petr.ivanov@example.com",
      "Роль": "admin",
      "Пароль": "AnotherPassword456!",
    },
  ];

  const ws = XLSX.utils.json_to_sheet(templateData);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Пользователи");

  const colWidths = Object.keys(templateData[0]).map((key) => ({
    wch: Math.max(key.length, 25),
  }));
  ws["!cols"] = colWidths;

  XLSX.writeFile(wb, "Шаблон_импорта_пользователей.xlsx");
}

export function parseUsersExcel(file: File): Promise<ImportUserRow[]> {
   return new Promise((resolve, reject) => {
     const reader = new FileReader();
     reader.onload = (e) => {
       try {
         const data = new Uint8Array(e.target?.result as ArrayBuffer);
         const wb = XLSX.read(data, { type: "array" });
         const ws = wb.Sheets[wb.SheetNames[0]];
         const json = XLSX.utils.sheet_to_json<Record<string, string>>(ws);

         const roleMap: Record<string, string> = {
           "администратор": "admin",
           "исполнитель": "executor",
           "пользователь": "user",
           "admin": "admin",
           "executor": "executor",
           "user": "user",
         };

         const users: ImportUserRow[] = json
           .filter((row) => row["Email"] || row["email"])
           .map((row) => ({
             name: row["Имя"] || row["name"] || row["Name"] || "",
             email: (row["Email"] || row["email"] || "").trim().toLowerCase(),
             role: roleMap[(row["Роль"] || row["role"] || row["Role"] || "user").toLowerCase()] || "user",
             password: row["Пароль"] || row["password"] || row["Password"] || "",
           }));

         resolve(users);
       } catch (err) {
         reject(err);
       }
     };
     reader.onerror = reject;
     reader.readAsArrayBuffer(file);
   });
}
