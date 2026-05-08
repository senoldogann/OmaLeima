import { assertPostRequest, jsonResponse } from "../_shared/http.ts";

Deno.serve((request: Request): Response => {
  const methodResponse = assertPostRequest(request);

  if (methodResponse !== null) {
    return methodResponse;
  }

  return jsonResponse(
    {
      message: "Recovery-link owner access was removed. Use the manual business owner account form instead.",
      status: "OWNER_ACCESS_FLOW_DEPRECATED",
    },
    410,
  );
});
