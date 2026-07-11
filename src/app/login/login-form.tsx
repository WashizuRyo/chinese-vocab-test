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
        className="h-12 w-full rounded-xl border border-border bg-input px-4 text-base text-foreground outline-none focus:border-ring"
      />
      {state?.error ? <p className="text-sm text-rose-600">{state.error}</p> : null}
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
      className="h-12 w-full rounded-xl bg-primary text-base font-semibold text-primary-foreground shadow-sm transition-opacity disabled:opacity-50"
    >
      {pending ? "確認中..." : "入る"}
    </button>
  );
}
