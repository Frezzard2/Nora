"use client";

import { useActionState } from "react";
import { login, type LoginState } from "./actions";

export default function LoginForm({ tovabb }: { tovabb?: string }) {
  const [state, action, pending] = useActionState<LoginState, FormData>(login, {});

  return (
    <form action={action} className="card mt-6 p-5 sm:p-6">
      {tovabb ? <input type="hidden" name="tovabb" value={tovabb} /> : null}

      <label className="label" htmlFor="jelszo">
        Jelszó
      </label>
      <input
        id="jelszo"
        name="jelszo"
        type="password"
        autoComplete="current-password"
        autoFocus
        required
        className="field"
      />

      {state.error ? (
        <p
          role="alert"
          className="mt-4 rounded-[10px] border border-brick/30 bg-brick-soft px-4 py-3 text-[15px] leading-relaxed text-brick"
        >
          {state.error}
        </p>
      ) : null}

      <button type="submit" className="btn-primary mt-5 w-full" disabled={pending}>
        {pending ? "Belépés…" : "Belépés"}
      </button>
    </form>
  );
}
