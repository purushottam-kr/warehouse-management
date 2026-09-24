import type { NextRequest } from "next/server";

import { errorResponse } from "@/lib/api/error-response";
import { parseListQuery } from "@/lib/api/list-query";
import { requirePermission } from "@/lib/auth/authorization";
import { listUsersQuerySchema } from "@/lib/validators/user";
import {
  listUsers,
  listUsersPage,
} from "@/services/user.service";

export const GET = async (request: NextRequest) => {
  try {
    await requirePermission("USER_MANAGE");

    const parsed = parseListQuery(
      request,
      listUsersQuerySchema,
    );

    if (!parsed.ok) {
      return parsed.response;
    }

    /*
     * No query parameters: return the full unpaged
     * list for backward compatibility. List pages
     * send page/pageSize and receive the paginated
     * response shape `{ data, pagination }`.
     */
    if (parsed.empty) {
      const users = await listUsers();

      return Response.json({
        data: users,
      });
    }

    const page = await listUsersPage(parsed.query);

    return Response.json({
      data: page.users,
      pagination: page.pagination,
    });
  } catch (error) {
    return errorResponse(error);
  }
};
