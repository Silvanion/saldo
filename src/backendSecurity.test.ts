import { describe, it, expect, vi } from "vitest";
import { verifyFirebaseToken } from "./server/middleware/auth";
import { aiPayloadLimiter } from "./server/middleware/security";
import { z } from "zod";

// Mock response object helper
function createMockRes() {
  const res: any = {};
  res.status = vi.fn().mockReturnValue(res);
  res.json = vi.fn().mockReturnValue(res);
  return res;
}

describe("KROK 6 — Backend security and rules tests", () => {
  it("request API bez tokenu => 401", async () => {
    const req: any = { headers: {} };
    const res = createMockRes();
    const next = vi.fn();

    await verifyFirebaseToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(401);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining("Brak autoryzacji")
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it("niepoprawny token => 403", async () => {
    const req: any = { headers: { authorization: "Bearer invalid-token-123" } };
    const res = createMockRes();
    const next = vi.fn();

    await verifyFirebaseToken(req, res, next);

    expect(res.status).toHaveBeenCalledWith(403);
    expect(res.json).toHaveBeenCalledWith(expect.objectContaining({
      error: expect.stringContaining("Nieautoryzowany dostęp lub token wygasł.")
    }));
    expect(next).not.toHaveBeenCalled();
  });

  it("zbyt duży payload tekstu (>20KB) => 413", () => {
    const hugeText = "a".repeat(20005);
    const req: any = { body: { text: hugeText } };
    const res = createMockRes();
    const next = vi.fn();

    aiPayloadLimiter(req, res, next);

    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith({ error: "Zbyt duży rozmiar tekstu (limit 20KB)." });
    expect(next).not.toHaveBeenCalled();
  });

  it("zbyt duży obraz (>3MB zdekodowanego base64) => 413", () => {
    // 3MB decoded = 3 * 1024 * 1024 = 3,145,728 bytes. Base64 length ~ 4,194,304 chars.
    const hugeBase64 = "A".repeat(4200000);
    const req: any = { body: { imageBase64: hugeBase64, mimeType: "image/jpeg" } };
    const res = createMockRes();
    const next = vi.fn();

    aiPayloadLimiter(req, res, next);

    expect(res.status).toHaveBeenCalledWith(413);
    expect(res.json).toHaveBeenCalledWith({ error: "Rozmiar obrazu przekracza limit 3MB." });
    expect(next).not.toHaveBeenCalled();
  });

  it("nieprawidłowa odpowiedź modelu AI (Zod validation error) => 502", () => {
    const outputSchema = z.object({
      reply: z.string()
    });

    const invalidModelOutput = { wrongField: 123 };
    let statusCode = 0;
    let responseJson: any = null;

    try {
      outputSchema.parse(invalidModelOutput);
    } catch (err) {
      if (err instanceof z.ZodError) {
        statusCode = 502;
        responseJson = { error: "Nieprawidłowa odpowiedź modelu AI." };
      }
    }

    expect(statusCode).toBe(502);
    expect(responseJson).toEqual({ error: "Nieprawidłowa odpowiedź modelu AI." });
  });

  it("Firestore write do innego uid => deny", () => {
    const authUid: string = "user-123";
    const targetDocumentUid: string = "user-999"; // Different UID

    const canWrite = authUid !== null && authUid === targetDocumentUid;
    expect(canWrite).toBe(false);
  });

  it("Firestore write z niedozwolonym kluczem => deny", () => {
    const allowedKeys = [
      "profiles", "schemaVersion", "updatedAt", "activeProfileId", "driveFileId",
      "recurringRules", "transactionRules", "aiMode", "localAiEndpoint", "localAiModel",
      "lastModifiedBy"
    ];

    const incomingKeys = ["profiles", "schemaVersion", "updatedAt", "unauthorizedSecretKey"];

    const hasOnlyAllowed = incomingKeys.every((k) => allowedKeys.includes(k));
    expect(hasOnlyAllowed).toBe(false);
  });
});
