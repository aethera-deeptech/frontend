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

async function send(path: string, accept: string, options: RequestOptions): Promise<Response> {
  const { method = 'GET', body, signal } = options;
  let response: Response;

  try {
    response = await fetch(`${getEnv().apiBaseUrl}${path}`, {
      method,
      credentials: 'include',
      headers: {
        Accept: accept,
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

  return response;
}

// Every call to the API goes through here. The session is a cookie that the API sets, so the cookie is always sent.
export async function apiRequest<T>(
  path: string,
  schema: z.ZodType<T>,
  options: RequestOptions = {},
): Promise<T> {
  const response = await send(path, 'application/json', options);

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

// A call whose answer is a file, for example the PDF of a report
export async function apiDownload(
  path: string,
  options: { signal?: AbortSignal } = {},
): Promise<Blob> {
  const response = await send(path, 'application/pdf', options);
  return response.blob();
}
