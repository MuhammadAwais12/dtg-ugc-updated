export async function loginWithCreatorCode(
  code: string
): Promise<{ isValid: boolean; code?: string; name?: string; error?: string }> {
  const res = await fetch("/api/creator-auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ code }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    return { isValid: false, error: data?.error || "Login failed" };
  }
  return data;
}

export async function signupCreator(
  name: string,
  email: string
): Promise<{ name: string; email: string; code: string }> {
  const res = await fetch("/api/creator-auth/signup", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ name, email }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.error || "Signup failed");
  }
  return data;
}
