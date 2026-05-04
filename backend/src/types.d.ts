declare namespace Express {
  export interface Request {
    user?: {
      id: string;
      email?: string;
      planTier?: "FREE" | "PAID";
      sessionId?: string;
      tokenVersion?: number;
    };
  }
}
