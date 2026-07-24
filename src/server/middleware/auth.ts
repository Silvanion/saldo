import express from "express";
import { getAuth, DecodedIdToken } from "firebase-admin/auth";

declare global {
  namespace Express {
    interface Request {
      user?: DecodedIdToken;
    }
  }
}

export const verifyFirebaseToken = async (
  req: express.Request,
  res: express.Response,
  next: express.NextFunction
) => {
  const token = req.headers.authorization?.split("Bearer ")[1];
  
  if (!token || token === "undefined") {
    // We explicitly reject undefined tokens now. Demo users cannot access AI endpoints.
    return res.status(401).json({ error: "Brak autoryzacji. Tryb demonstracyjny nie wspiera funkcji AI." });
  }

  try {
    const adminAuth = getAuth();
    const decodedToken = await adminAuth.verifyIdToken(token);
    req.user = decodedToken;
    next();
  } catch (error) {
    return res.status(403).json({ error: "Nieautoryzowany dostęp lub token wygasł." });
  }
};
