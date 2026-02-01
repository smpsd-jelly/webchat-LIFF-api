import "express";

declare global {
  namespace Express {
    interface Request {
      user?: { line_user_id: string };
      admin?: { admin_user_id: bigint; role?: string };
    }
  }
}
export {};
