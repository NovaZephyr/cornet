export type RememberedAccount = {
  id: string;
  email: string;
  username?: string;
  displayName?: string;
  avatarPath?: string | null;
  addedAt: number;
};

const STORAGE_KEY = "corenetwork-remembered-accounts";

function read(): RememberedAccount[] {
  if (typeof window === "undefined") return [];
  try {
    const parsed = JSON.parse(localStorage.getItem(STORAGE_KEY) || "[]");
    return Array.isArray(parsed) ? parsed.filter((item) => item && typeof item.id === "string") : [];
  } catch {
    return [];
  }
}

function write(accounts: RememberedAccount[]) {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(accounts.slice(0, 8)));
}

export function getRememberedAccounts(): RememberedAccount[] {
  return read().sort((a, b) => b.addedAt - a.addedAt);
}

export function rememberAccount(account: Omit<RememberedAccount, "addedAt">) {
  const current = read().filter((item) => item.id !== account.id);
  write([{ ...account, addedAt: Date.now() }, ...current]);
}

export function forgetAccount(id: string) {
  write(read().filter((item) => item.id !== id));
}

export function maskEmail(email: string) {
  const [local = "", domain = ""] = email.split("@");
  if (!local || !domain) return "••••••••";
  const maskedLocal = local.length <= 2 ? `${local[0] ?? "•"}***` : `${local[0]}${"*".repeat(Math.min(5, Math.max(3, local.length - 2)))}${local.at(-1)}`;
  const [host, ...suffix] = domain.split(".");
  const maskedHost = host ? `${host[0]}${"*".repeat(Math.min(5, Math.max(2, host.length - 1)))}` : "***";
  return `${maskedLocal}@${maskedHost}${suffix.length ? `.${suffix.join(".")}` : ""}`;
}
