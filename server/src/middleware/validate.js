import { ZodError } from "zod";

export function validateBody(schema) {
  return (req, _res, next) => {
    try {
      req.validatedBody = schema.parse(req.body);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        err.status = 400;
      }
      next(err);
    }
  };
}

export function validateQuery(schema) {
  return (req, _res, next) => {
    try {
      req.validatedQuery = schema.parse(req.query);
      next();
    } catch (err) {
      if (err instanceof ZodError) {
        err.status = 400;
      }
      next(err);
    }
  };
}

