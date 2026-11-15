import type { NextFunction, Request, RequestHandler, Response } from "express";
import { ZodError, type ZodType } from "zod";
import { badRequest } from "../lib/errors.js";

export interface FieldIssue {
  path: string;
  message: string;
}

export function zodIssues(error: ZodError): FieldIssue[] {
  return error.issues.map((issue) => ({
    path: issue.path.join(".") || "(root)",
    message: issue.message,
  }));
}

function parse(schema: ZodType, value: unknown): unknown {
  try {
    return schema.parse(value);
  } catch (error) {
    if (error instanceof ZodError) {
      throw badRequest("Request validation failed", { fields: zodIssues(error) });
    }
    throw error;
  }
}

/** Replaces `req.body` with the parsed value, so handlers see typed data. */
export function validateBody(schema: ZodType): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      req.body = parse(schema, req.body);
      next();
    } catch (error) {
      next(error);
    }
  };
}

/** Replaces `req.query` with the parsed value. Query values are strings. */
export function validateQuery(schema: ZodType): RequestHandler {
  return (req: Request, _res: Response, next: NextFunction) => {
    try {
      // Express 5 makes `req.query` a getter; assigning the parsed object keeps
      // downstream handlers simple.
      Object.defineProperty(req, "query", {
        value: parse(schema, req.query),
        writable: true,
        configurable: true,
        enumerable: true,
      });
      next();
    } catch (error) {
      next(error);
    }
  };
}
