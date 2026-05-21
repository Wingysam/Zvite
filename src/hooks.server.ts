import db from "$lib/server/db";
import { getUserById } from "$lib/server/queries";
import { getUserIdFromSession, SESSION_COOKIE_NAME } from "$lib/server/session";
import { redirect, type Handle } from "@sveltejs/kit";

void db;

export const handle: Handle = async ({ event, resolve }) => {
  const session = event.cookies.get(SESSION_COOKIE_NAME);
  if (session) {
    const userId = getUserIdFromSession(session);
    if (userId) {
      const user = getUserById(userId);
      if (user) {
        event.locals.user = {
          id: user.id,
          email: user.email,
        };
      }
    }
  }

  if (event.url.pathname.startsWith("/dashboard") && !event.locals.user) {
    throw redirect(303, "/login");
  }

  return resolve(event);
};
