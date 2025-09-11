import { NextRequest } from "next/server";
import { withApi } from "@/lib/withApi";
import { firestoreServices } from "@/lib/services/firestore";
import { notFound, badRequest } from "@/lib/errors";
import { success, error } from "@/lib/response";
import { UpdateUserInput } from "@/lib/types/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (_req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const id = params.id;
    const user = await firestoreServices.users.getUser(id);
    if (!user) return error(notFound("User not found"));
    return success(user);
  } catch (err) {
    console.error('Error fetching user:', err);
    return error(notFound("User not found"));
  }
});

export const PATCH = withApi(async (req: NextRequest, { params }: { params: { id: string } }) => {
  try {
    const id = params.id;
    const updates = await req.json() as UpdateUserInput;
    await firestoreServices.users.updateUser(id, updates);
    const updatedUser = await firestoreServices.users.getUser(id);
    if (!updatedUser) return error(notFound("User not found"));
    return success(updatedUser);
  } catch (err) {
    console.error('Error updating user:', err);
    return error(badRequest("Failed to update user"));
  }
});
