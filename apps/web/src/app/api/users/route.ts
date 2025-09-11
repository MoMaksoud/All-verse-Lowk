import { NextRequest } from "next/server";
import { withApi } from "@/lib/withApi";
import { firestoreServices } from "@/lib/services/firestore";
import { success, error } from "@/lib/response";
import { internal, badRequest } from "@/lib/errors";
import { CreateUserInput } from "@/lib/types/firestore";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export const GET = withApi(async (req: NextRequest) => {
  try {
    const url = new URL(req.url);
    const role = url.searchParams.get("role") as 'buyer' | 'seller' | 'admin' | null;
    const q = url.searchParams.get("q") ?? undefined;

    let users;
    if (role) {
      users = await firestoreServices.users.getUsersByRole(role);
    } else {
      // For now, return empty array since we don't have a getAll method
      // In production, you'd implement pagination for all users
      users = [];
    }

    // Apply search filter if provided
    const filteredUsers = q 
      ? users.filter(user => user.displayName.toLowerCase().includes(q.toLowerCase()))
      : users;

    return success({ 
      items: filteredUsers, 
      total: filteredUsers.length, 
      page: 1, 
      limit: 100, 
      hasMore: false 
    });
  } catch (err) {
    console.error('Error fetching users:', err);
    return error(internal('Failed to fetch users'));
  }
});

export const POST = withApi(async (req: NextRequest) => {
  try {
    const body = await req.json() as CreateUserInput & { uid: string };
    
    if (!body.uid) {
      return error(badRequest('User ID is required'));
    }

    const user = await firestoreServices.users.createUser(body.uid, body);
    return success(user, { status: 201 });
  } catch (err) {
    console.error('Error creating user:', err);
    return error(badRequest('Failed to create user'));
  }
});
