import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

type DeprecatedOwnerAccessResponse = {
  message: string;
  status: string;
};

export async function POST(): Promise<NextResponse<DeprecatedOwnerAccessResponse>> {
  return NextResponse.json(
    {
      message: "Recovery-link owner access was removed. Use the manual business owner account form instead.",
      status: "OWNER_ACCESS_FLOW_DEPRECATED",
    },
    {
      status: 410,
    }
  );
}
