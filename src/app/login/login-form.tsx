"use client";

import { useActionState } from "react";
import { useFormStatus } from "react-dom";
import { type LoginState, login } from "./actions";

const initial: LoginState = {};

export function LoginForm({ next }: { next: string }) {
  const [state, formAction] = useActionState(login, initial);

  return (
    <form action={formAction} className="flex flex-col gap-3">
      <input type="hidden" name="next" value={next} />
      <input
        type="password"
        name="password"
        required
        autoComplete="current-password"
        enterKeyHint="go"
        placeholder="あいことば"
        className="h-12 w-full rounded-xl border border-zinc-300 bg-white px-4 text-base text-zinc-900 outline-none focus:border-zinc-500 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100 dark:placeholder:text-zinc-500 dark:focus:border-zinc-400"
      />
      {state?.error ? (
        <p className="text-sm text-rose-600 dark:text-rose-400">{state.error}</p>
      ) : null}
      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <button
      type="submit"
      disabled={pending}
      className="h-12 w-full rounded-xl bg-zinc-900 text-base font-semibold text-white shadow-sm transition-opacity disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-950"
    >
      {pending ? "確認中..." : "入る"}
    </button>
  );
}
