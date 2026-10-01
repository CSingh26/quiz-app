export class AppError extends Error {
  constructor(
    public readonly code: string,
    message: string,
    public readonly status = 400,
  ) {
    super(message);
    this.name = "AppError";
  }
}

export function requireValue<T>(
  value: T | null | undefined,
  message = "This item was not found.",
): T {
  if (value === null || value === undefined)
    throw new AppError("RESOURCE_NOT_FOUND", message, 404);
  return value;
}
