import { hashPassword, verifyPassword } from "$lib/server/auth";
import {
  createOrganization,
  getUserById,
  listOrganizationsForUser,
  listPartiesForUser,
  updateUserPassword,
} from "$lib/server/queries";
import { renderMarkdownSafe } from "$lib/server/markdown";
import { fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ locals }) => {
  if (!locals.user) {
    throw redirect(303, "/login");
  }

  const parties = listPartiesForUser(locals.user.id).map((party) => ({
    ...party,
    descriptionExcerpt: party.description
      ? truncateText(stripHtml(renderMarkdownSafe(party.description)), 2)
      : null,
  }));

  return {
    parties,
    organizations: listOrganizationsForUser(locals.user.id),
  };
};

export const actions: Actions = {
  createGroup: async ({ locals, request }) => {
    if (!locals.user) {
      throw redirect(303, "/login");
    }

    const data = Object.fromEntries(await request.formData());
    const name = String(data.name ?? "").trim();

    if (!name) {
      return fail(400, { error: "Group name is required." });
    }

    const org = createOrganization(name, locals.user.id);
    throw redirect(303, `/organization/${org.id}`);
  },
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

function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, "");
}

function truncateText(text: string, maxSentences: number): string {
  const sentenceEndings = text.match(/[^.!?]*[.!?]+/g);
  if (!sentenceEndings) {
    // No sentence endings found, truncate by character count
    const maxChars = 200;
    if (text.length <= maxChars) return text;
    return text.slice(0, maxChars).trimEnd() + "...";
  }

  const truncated = sentenceEndings
    .slice(0, maxSentences)
    .map((s) => s.trim())
    .join(" ");

  if (sentenceEndings.length > maxSentences || truncated.length > 200) {
    return truncated.slice(0, 200).trimEnd() + "...";
  }

  return truncated;
}
