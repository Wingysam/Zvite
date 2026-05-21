import { hashPassword, verifyPassword } from "$lib/server/auth";
import {
  getUserById,
  listPartiesForUser,
  updateUserPassword,
} from "$lib/server/queries";
import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ locals }) => {
  if (!locals.user) {
    throw redirect(303, "/login");
  }

  return {
    parties: listPartiesForUser(locals.user.id),
  };
};

export const actions: Actions = {
  changePassword: async ({ locals, request }) => {
    if (!locals.user) {
      throw redirect(303, "/login");
    }

    const data = Object.fromEntries(await request.formData());
    const currentPassword = String(data.currentPassword ?? "");
    const newPassword = String(data.newPassword ?? "");
    const confirmPassword = String(data.confirmPassword ?? "");

    if (!currentPassword || !newPassword || !confirmPassword) {
      return fail(400, { error: "All password fields are required." });
    }
    if (newPassword.length < 8) {
      return fail(400, {
        error: "New password must be at least 8 characters long.",
      });
    }
    if (newPassword !== confirmPassword) {
      return fail(400, { error: "New passwords do not match." });
    }

    const storedUser = getUserById(locals.user.id);
    if (
      !storedUser ||
      !verifyPassword(currentPassword, storedUser.password_hash)
    ) {
      return fail(400, { error: "Current password is incorrect." });
    }

    updateUserPassword(locals.user.id, hashPassword(newPassword));
    return { success: true, message: "Password updated successfully." };
  },
};
