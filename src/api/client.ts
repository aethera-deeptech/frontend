import type { z } from 'zod';

import { getEnv } from '@/lib/env';

// The server answered with a status that is not a success
export class ApiError extends Error {
  readonly status: number;

  constructor(status: number) {
    super(`The API answered with status ${status.toString()}.`);
    this.name = 'ApiError';
    this.status = status;
  }
}

// The request never got an answer, for example because the phone has no connection
export class NetworkError extends Error {
  constructor() {
    super('The API could not be reached.');
    this.name = 'NetworkError';
  }
}

// The answer did not have the shape that the screens expect
export class ContractError extends Error {
  constructor() {
    super('The API answered with data in an unexpected shape.');
    this.name = 'ContractError';
  }
}

interface RequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  signal?: AbortSignal;
}

// Every call to the API goes through here. The session is a cookie that the API sets, so the cookie is always sent.
export async function apiRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  { method = 'GET', body, signal }: RequestOptions = {},
): Promise<T> {
  let response: Response;

  try {
    response = await fetch(`${getEnv().apiBaseUrl}${path}`, {
      method,
      credentials: 'include',
      headers: {
        Accept: 'application/json',
        ...(body === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
      signal,
    });
  } catch (error) {
    if (error instanceof DOMException && error.name === 'AbortError') {
      throw error;
    }
    throw new NetworkError();
  }

  if (!response.ok) {
    throw new ApiError(response.status);
  }

  // An answer without a body, for example 204, is read as null
  const text = await response.text();
  let payload: unknown = null;

  if (text !== '') {
    try {
      payload = JSON.parse(text);
    } catch {
      throw new ContractError();
    }
  }

  const parsed = schema.safeParse(payload);

  if (!parsed.success) {
    throw new ContractError();
  }

  return parsed.data;
}
