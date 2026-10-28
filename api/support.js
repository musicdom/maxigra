import { auth, body, errorResponse, reply } from "./_lib.js";
import { submitAppSupport } from "../lib/support.js";

export async function OPTIONS() { return reply({ ok: true }); }

export async function POST(request) {
  try {
    const payload = await body(request);
    const user = auth(request, payload?.initData || "");
    const message = String(payload?.message || "").trim();
    await submitAppSupport(user, message);
    return reply({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}

export default { POST, OPTIONS };
