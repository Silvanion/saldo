import { afterEach, describe, expect, it, vi } from "vitest";

const verifyIdToken = vi.fn();

vi.mock("firebase-admin/auth", () => ({
  getAuth: () => ({ verifyIdToken })
}));

describe("identifyUser", () => {
  afterEach(() => {
    verifyIdToken.mockReset();
  });

  it("sets req.user when the Bearer token is valid", async () => {
    verifyIdToken.mockResolvedValue({ uid: "user-123" });
    const { identifyUser } = await import("./security");
    const req: any = { headers: { authorization: "Bearer good-token" } };
    const next = vi.fn();

    await identifyUser(req, {}, next);

    expect(req.user).toEqual({ uid: "user-123" });
    expect(next).toHaveBeenCalledOnce();
  });

  it("leaves req.user unset and still calls next when the token is invalid", async () => {
    verifyIdToken.mockRejectedValue(new Error("invalid token"));
    const { identifyUser } = await import("./security");
    const req: any = { headers: { authorization: "Bearer bad-token" } };
    const next = vi.fn();

    await identifyUser(req, {}, next);

    expect(req.user).toBeUndefined();
    expect(next).toHaveBeenCalledOnce();
  });

  it("leaves req.user unset and still calls next when no Authorization header is sent (offline/local AI)", async () => {
    const { identifyUser } = await import("./security");
    const req: any = { headers: {} };
    const next = vi.fn();

    await identifyUser(req, {}, next);

    expect(req.user).toBeUndefined();
    expect(verifyIdToken).not.toHaveBeenCalled();
    expect(next).toHaveBeenCalledOnce();
  });
});

describe("aiPayloadLimiter", () => {
  const makeRes = () => {
    const res: any = {};
    res.status = vi.fn(() => res);
    res.json = vi.fn(() => res);
    return res;
  };
  const bigText = "x".repeat(40_000);

  it("rejects oversized text bodies on regular endpoints", async () => {
    const { aiPayloadLimiter } = await import("./security");
    const res = makeRes();
    const next = vi.fn();
    aiPayloadLimiter({ path: "/parse-natural", body: { text: bigText } }, res, next);
    expect(res.status).toHaveBeenCalledWith(413);
    expect(next).not.toHaveBeenCalled();
  });

  it("allows a larger profile snapshot on /chat", async () => {
    const { aiPayloadLimiter } = await import("./security");
    const res = makeRes();
    const next = vi.fn();
    aiPayloadLimiter({ path: "/chat", body: { message: "hi", profileData: { blob: bigText } } }, res, next);
    expect(next).toHaveBeenCalledOnce();
    expect(res.status).not.toHaveBeenCalled();
  });
});
