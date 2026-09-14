import { ContentSubmission, SubmissionStatus } from "../types";

async function handle<T>(res: Response): Promise<T> {
  if (!res.ok) {
    const err = await res.json().catch(() => ({}));
    throw new Error(err.error || "Request failed");
  }
  return res.json();
}

export async function adminLogin(email: string, password: string): Promise<{ email: string }> {
  const res = await fetch("/api/admin/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
    credentials: "include",
  });
  return handle(res);
}

export async function adminLogout(): Promise<void> {
  await fetch("/api/admin/logout", { method: "POST", credentials: "include" });
}

export async function adminMe(): Promise<{ email: string } | null> {
  const res = await fetch("/api/admin/me", { credentials: "include" });
  if (res.status === 401) return null;
  return handle(res);
}

export async function fetchAdminSubmissions(status?: SubmissionStatus): Promise<ContentSubmission[]> {
  const url = status ? `/api/admin/submissions?status=${status}` : "/api/admin/submissions";
  const res = await fetch(url, { credentials: "include" });
  const data = await handle<{ submissions: ContentSubmission[] }>(res);
  return data.submissions;
}

export async function updateSubmissionProduct(id: string, product: string): Promise<void> {
  const res = await fetch(`/api/admin/submissions/${id}/product`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product }),
    credentials: "include",
  });
  await handle(res);
}

export async function approveSubmission(id: string, product?: string): Promise<void> {
  const res = await fetch(`/api/admin/submissions/${id}/approve`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ product }),
    credentials: "include",
  });
  await handle(res);
}

export async function denySubmission(id: string, reason: string): Promise<void> {
  const res = await fetch(`/api/admin/submissions/${id}/deny`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ reason }),
    credentials: "include",
  });
  await handle(res);
}

export async function saveSubmissionComment(id: string, comment: string): Promise<void> {
  const res = await fetch(`/api/admin/submissions/${id}/comment`, {
    method: "PATCH",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ comment }),
    credentials: "include",
  });
  await handle(res);
}
