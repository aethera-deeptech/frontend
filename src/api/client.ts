import type { z } from 'zod';

import { getEnv } from '@/lib/env';

// The server answered with a status that is not a success
export class ApiError extends Error {
  readonly status: number;
  // The stable code of the API for the app to react to, for example `invalid_credentials`. Only a short lowercase word is
  // kept, so text from the body never reaches a screen or a report.
  readonly code: string | undefined;
  // How long the API asks the client to wait, in seconds, on a 429
  readonly retryAfterSeconds: number | undefined;
  // The code of each field that failed, for example `{ password: 'too_common' }`. Only short names and codes are kept.
  readonly fields: Readonly<Record<string, string>>;
  // The id of the search that already runs, on a 409 `pairing_running`. The API leaves it out when its lookup finds nothing.
  readonly pairingId: string | undefined;

  constructor(
    status: number,
    details: {
      code?: string;
      retryAfterSeconds?: number;
      fields?: Record<string, string>;
      pairingId?: string;
    } = {},
  ) {
    super(`The API answered with status ${status.toString()}.`);
    this.name = 'ApiError';
    this.status = status;
    this.code = details.code;
    this.retryAfterSeconds = details.retryAfterSeconds;
    this.fields = details.fields ?? {};
    this.pairingId = details.pairingId;
  }

  // The service could not answer in time, for example while its database is slow. It says to try again in a moment, and a write
  // may have been saved just before the time ran out.
  get busy(): boolean {
    return this.status === 503 && this.code === 'busy';
  }
}

const defaultBusyWaitSeconds = 2;
const longestBusyWaitSeconds = 10;

// How long to wait before the app asks again after a busy answer. The API says how long, and an answer that asks for more than
// a few seconds does not hold a screen for that long.
export function busyWaitMs(error: ApiError): number {
  const seconds = error.retryAfterSeconds ?? defaultBusyWaitSeconds;

  return Math.min(seconds, longestBusyWaitSeconds) * 1000;
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

// The API asks for this header with this value on a request that changes data. A page of another site cannot add the
// header without a preflight, and the CORS rules of the API refuse that, which stops a forged request with the cookie.
const requestedWith = 'aethera';
const safeMethods = new Set(['GET', 'HEAD', 'OPTIONS']);

const errorCodePattern = /^[a-z][a-z_]{0,63}$/;
// A day is longer than any wait that the API asks for, so a bigger number is not a wait
const longestWaitSeconds = 86_400;

const fieldNamePattern = /^[A-Za-z][A-Za-z0-9_]{0,63}$/;
// An id from the API goes into the address of a screen, so only a short word of letters, digits and hyphens is kept
const idPattern = /^[A-Za-z0-9][A-Za-z0-9-]{0,63}$/;

// The `fields` of a 422 answer, as name and code pairs. A name or a code in another shape is left out.
function readFields(value: unknown): Record<string, string> {
  const fields: Record<string, string> = {};

  if (typeof value === 'object' && value !== null) {
    for (const [name, code] of Object.entries(value)) {
      if (fieldNamePattern.test(name) && typeof code === 'string' && errorCodePattern.test(code)) {
        fields[name] = code;
      }
    }
  }
  return fields;
}

// The body of an error answer is `{ code, message, fields?, retryAfterSeconds?, pairingId? }`. A body that is missing, is not JSON or has
// another shape gives no details, and the status alone still tells what happened.
async function readErrorDetails(response: Response): Promise<{
  code?: string;
  retryAfterSeconds?: number;
  fields?: Record<string, string>;
  pairingId?: string;
}> {
  try {
    const body: unknown = JSON.parse(await response.text());

    if (typeof body !== 'object' || body === null) {
      return {};
    }
    const code = 'code' in body && typeof body.code === 'string' ? body.code : undefined;
    const wait = 'retryAfterSeconds' in body ? body.retryAfterSeconds : undefined;
    const fields = 'fields' in body ? readFields(body.fields) : undefined;
    const pairingId =
      'pairingId' in body && typeof body.pairingId === 'string' && idPattern.test(body.pairingId)
        ? body.pairingId
        : undefined;

    return {
      fields,
      pairingId,
      code: code !== undefined && errorCodePattern.test(code) ? code : undefined,
      retryAfterSeconds:
        typeof wait === 'number' &&
        Number.isInteger(wait) &&
        wait >= 1 &&
        wait <= longestWaitSeconds
          ? wait
          : undefined,
    };
  } catch {
    return {};
  }
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
  const changesData = !safeMethods.has(method.toUpperCase());
  const payloadText = body === undefined ? undefined : JSON.stringify(body);
  let response: Response;

  try {
    response = await fetch(url, {
      method,
      credentials: 'include',
      headers: {
        Accept: accept,
        ...(payloadText === undefined ? {} : { 'Content-Type': 'application/json' }),
        ...(changesData ? { 'X-Requested-With': requestedWith } : {}),
      },
      body: payloadText,
      signal,
    });
  } catch (error) {
    throw toNetworkError(error);
  }

  if (!response.ok) {
    throw new ApiError(response.status, await readErrorDetails(response));
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
