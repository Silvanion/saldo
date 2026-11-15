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

describe("requireLocalApiToken (SEC-11)", () => {
  const TOKEN = "a".repeat(64);
  const res = () => {
    const r: any = { statusCode: 200, body: undefined };
    r.status = (c: number) => { r.statusCode = c; return r; };
    r.json = (b: unknown) => { r.body = b; return r; };
    return r;
  };
  afterEach(() => { delete process.env.SALDO_API_TOKEN; });

  it("bez skonfigurowanego tokenu (hosting web) nie blokuje", async () => {
    const { requireLocalApiToken } = await import("./security");
    const next = vi.fn();
    requireLocalApiToken({ headers: { host: "example.com" } } as any, res(), next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("z tokenem: brak lub zły token → 401, poprawny → przepuszcza", async () => {
    process.env.SALDO_API_TOKEN = TOKEN;
    const { requireLocalApiToken } = await import("./security");
    for (const headers of [{ host: "127.0.0.1:47819" }, { host: "127.0.0.1:47819", "x-saldo-token": "b".repeat(64) }, { host: "127.0.0.1:47819", "x-saldo-token": "short" }]) {
      const r = res(); const next = vi.fn();
      requireLocalApiToken({ headers } as any, r, next);
      expect(r.statusCode).toBe(401);
      expect(next).not.toHaveBeenCalled();
    }
    const next = vi.fn();
    requireLocalApiToken({ headers: { host: "127.0.0.1:47819", "x-saldo-token": TOKEN } } as any, res(), next);
    expect(next).toHaveBeenCalledOnce();
  });

  it("z tokenem: obcy nagłówek Host (DNS rebinding) → 403 nawet z poprawnym tokenem", async () => {
    process.env.SALDO_API_TOKEN = TOKEN;
    const { requireLocalApiToken } = await import("./security");
    for (const host of ["evil.example", "evil.example:47819", "127.0.0.1.evil.example", undefined]) {
      const r = res(); const next = vi.fn();
      requireLocalApiToken({ headers: { host, "x-saldo-token": TOKEN } } as any, r, next);
      expect(r.statusCode).toBe(403);
      expect(next).not.toHaveBeenCalled();
    }
  });

  it("z tokenem: localhost i 127.0.0.1 (z portem i bez) są akceptowane", async () => {
    process.env.SALDO_API_TOKEN = TOKEN;
    const { requireLocalApiToken } = await import("./security");
    for (const host of ["localhost:3000", "127.0.0.1:47819", "localhost", "[::1]:3000"]) {
      const next = vi.fn();
      requireLocalApiToken({ headers: { host, "x-saldo-token": TOKEN } } as any, res(), next);
      expect(next).toHaveBeenCalledOnce();
    }
  });
});
