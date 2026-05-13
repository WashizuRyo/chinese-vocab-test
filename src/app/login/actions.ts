"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { AUTH_COOKIE_NAME, computeAuthToken, timingSafeEqual } from "@/lib/auth";

export interface LoginState {
  error?: string;
}

const SAFE_NEXT = /^\/(?!\/)[\w/\-?=&%.]*$/;

export async function login(_prev: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const nextRaw = String(formData.get("next") ?? "/");
  const next = SAFE_NEXT.test(nextRaw) ? nextRaw : "/";

  const expectedPassword = process.env.APP_PASSWORD ?? "";
  if (!expectedPassword) {
    redirect(next);
  }
  if (!timingSafeEqual(password, expectedPassword)) {
    return { error: "合言葉が違います" };
  }

  const token = await computeAuthToken();
  if (!token) return { error: "サーバー設定エラー" };

  const c = await cookies();
  c.set(AUTH_COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 60,
  });

  redirect(next);
}
