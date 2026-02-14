import { z } from "zod";
import { ApiResponse } from "./response";

type ValidatorSuccess<T> = {
  success: true;
  data: T;
};

type ValidatorError = {
  success: false;
  response: Response;
};

type ValidatorResult<T> = ValidatorSuccess<T> | ValidatorError;

/**
 * Utility for validating data using Zod
 * and returning consistent API responses.
 */
export class Validator {
  /**
   * Validates data against a Zod schema.
   */
  static validate<T>(
    schema: z.ZodSchema<T>,
    data: unknown,
  ): ValidatorResult<T> {
    const result = schema.safeParse(data);

    if (result.success) {
      return {
        success: true,
        data: result.data,
      };
    }

    const errors = result.error.issues.map((issue) => {
      const path = issue.path.join(".");
      return path ? `${path}: ${issue.message}` : issue.message;
    });

    return {
      success: false,
      response: ApiResponse.validationError(errors),
    };
  }

  /**
   * Validates URL search/query parameters.
   */
  static validateQuery<T>(
    schema: z.ZodSchema<T>,
    params: URLSearchParams,
  ): ValidatorResult<T> {
    const rawParams = Object.fromEntries(params.entries());

    return this.validate(schema, rawParams);
  }
}
