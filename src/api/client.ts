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

// An abort is known by its name. An instanceof check fails for an error from another realm, for example in a test
// environment or from an iframe.
function isAbort(error: unknown): boolean {
  return (
    typeof error === 'object' && error !== null && 'name' in error && error.name === 'AbortError'
  );
}

// A failure while the request or its body is in flight is a lost connection, unless the caller aborted or the server answered
function toNetworkError(error: unknown): Error {
  if (error instanceof ApiError || isAbort(error)) {
    return error as Error;
  }
  return new NetworkError();
}

async function send(path: string, accept: string, options: RequestOptions): Promise<Response> {
  const { method = 'GET', body, signal } = options;

  // A path always starts with one slash, so it can never change the host of the address
  if (!/^\/(?!\/)/.test(path)) {
    throw new Error(`The API path must start with one slash, got "${path}".`);
  }
  // These two can fail because of a wrong build setting or a body that cannot be written, which is a bug and not a lost
  // connection, so they stay outside the try below.
  const url = `${getEnv().apiBaseUrl}${path}`;
  const payloadText = body === undefined ? undefined : JSON.stringify(body);
  let response: Response;

  try {
    response = await fetch(url, {
      method,
      credentials: 'include',
      headers: {
        Accept: accept,
        ...(payloadText === undefined ? {} : { 'Content-Type': 'application/json' }),
      },
      body: payloadText,
      signal,
    });
  } catch (error) {
    throw toNetworkError(error);
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
  let text: string;

  try {
    // A body that is cut off halfway fails here, like a lost connection
    // An answer without a body, for example 204, is read as null
    text = await response.text();
  } catch (error) {
    throw toNetworkError(error);
  }
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

  let blob: Blob;

  try {
    blob = await response.blob();
  } catch (error) {
    throw toNetworkError(error);
  }

  // An empty answer, or a page that a proxy or the app fallback sends with status 200, is not a report. The type of the
  // answer can be missing or wrong, so the first bytes of the file have to say PDF as well.
  if (blob.size === 0 || (blob.type !== '' && !blob.type.startsWith('application/pdf'))) {
    throw new ContractError();
  }
  if ((await blob.slice(0, 4).text()) !== '%PDF') {
    throw new ContractError();
  }
  return blob.type === '' ? new Blob([blob], { type: 'application/pdf' }) : blob;
}
