import { verifyPassword } from "$lib/server/auth";
import { getUserByEmail } from "$lib/server/queries";
import {
  createSessionValue,
  SESSION_COOKIE_NAME,
  SESSION_COOKIE_OPTIONS,
} from "$lib/server/session";
import { fail, redirect } from "@sveltejs/kit";
import type { Actions } from "./$types";

export const actions: Actions = {
  default: async ({ cookies, request }) => {
    const data = Object.fromEntries(await request.formData());
    const email = String(data.email ?? "")
      .trim()
      .toLowerCase();
    const password = String(data.password ?? "");

    if (!email || !password) {
      return fail(400, { error: "Email and password are required." });
    }

    const user = getUserByEmail(email);
    if (!user || !verifyPassword(password, user.password_hash)) {
      return fail(400, { error: "Invalid email or password." });
    }

    cookies.set(
      SESSION_COOKIE_NAME,
      createSessionValue(user.id),
      SESSION_COOKIE_OPTIONS,
    );
    throw redirect(303, "/dashboard");
  },
};
