import {
  addOrganizationMember,
  getOrganizationById,
  getUserByEmail,
  isOrganizationMember,
  listOrganizationMembers,
  removeOrganizationMember,
} from "$lib/server/queries";
import { error, fail, redirect } from "@sveltejs/kit";
import type { Actions, PageServerLoad } from "./$types";

export const load: PageServerLoad = ({ locals, params }) => {
  if (!locals.user) {
    throw redirect(303, "/login");
  }

  const org = getOrganizationById(params.orgId);
  if (!org) {
    throw error(404, "Organization not found");
  }

  if (!isOrganizationMember(org.id, locals.user.id)) {
    throw error(403, "You are not a member of this organization");
  }

  const members = listOrganizationMembers(org.id);

  return {
    organization: org,
    members,
    currentUserId: locals.user.id,
  };
};

export const actions: Actions = {
  addMember: async ({ locals, params, request }) => {
    if (!locals.user) {
      throw redirect(303, "/login");
    }

    const org = getOrganizationById(params.orgId);
    if (!org) {
      throw error(404, "Organization not found");
    }

    if (!isOrganizationMember(org.id, locals.user.id)) {
      throw error(403, "You are not a member of this organization");
    }

    const data = Object.fromEntries(await request.formData());
    const email = String(data.email ?? "")
      .trim()
      .toLowerCase();

    if (!email) {
      return fail(400, { addMemberError: "Email address is required." });
    }

    const userToAdd = getUserByEmail(email);
    if (!userToAdd) {
      return fail(400, {
        addMemberError: "No user found with that email address.",
      });
    }

    if (userToAdd.id === locals.user.id) {
      return fail(400, {
        addMemberError: "You are already a member of this group.",
      });
    }

    if (isOrganizationMember(org.id, userToAdd.id)) {
      return fail(400, {
        addMemberError: "That user is already a member of this group.",
      });
    }

    const added = addOrganizationMember(org.id, userToAdd.id);
    if (!added) {
      return fail(400, { addMemberError: "Unable to add member." });
    }

    return { success: true, addedEmail: email };
  },
  leave: async ({ locals, params }) => {
    if (!locals.user) {
      throw redirect(303, "/login");
    }

    const org = getOrganizationById(params.orgId);
    if (!org) {
      throw error(404, "Organization not found");
    }

    if (!isOrganizationMember(org.id, locals.user.id)) {
      throw error(403, "You are not a member of this organization");
    }

    const removed = removeOrganizationMember(org.id, locals.user.id);
    if (!removed) {
      return fail(400, { leaveError: "Unable to leave group." });
    }

    throw redirect(303, "/dashboard");
  },
};
