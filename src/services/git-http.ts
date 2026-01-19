/**
 * Custom HTTP client for isomorphic-git on React Native
 *
 * React Native's fetch doesn't support ReadableStream body,
 * so we use a simpler approach with array buffers.
 */

import type {HttpClient} from 'isomorphic-git';

async function collectBody(
  body: AsyncIterableIterator<Uint8Array> | undefined,
): Promise<Uint8Array | undefined> {
  if (!body) return undefined;

  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  for await (const chunk of body) {
    chunks.push(chunk);
    totalLength += chunk.length;
  }

  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const chunk of chunks) {
    result.set(chunk, offset);
    offset += chunk.length;
  }

  return result;
}

async function* streamFromArrayBuffer(
  buffer: ArrayBuffer,
): AsyncIterableIterator<Uint8Array> {
  yield new Uint8Array(buffer);
}

export const gitHttp: HttpClient = {
  async request({url, method = 'GET', headers = {}, body}) {
    const bodyData = await collectBody(body);

    try {
      const response = await fetch(url, {
        method,
        headers,
        body: bodyData,
      });

      const responseHeaders: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        responseHeaders[key.toLowerCase()] = value;
      });

      // Read entire response body as ArrayBuffer
      const responseBuffer = await response.arrayBuffer();

      return {
        url: response.url,
        method,
        statusCode: response.status,
        statusMessage: response.statusText || getStatusMessage(response.status),
        headers: responseHeaders,
        body: streamFromArrayBuffer(responseBuffer),
      };
    } catch (error) {
      // Provide better error messages
      if (error instanceof TypeError) {
        throw new Error(
          `Network error: ${error.message}. Check your internet connection.`,
        );
      }
      throw error;
    }
  },
};

function getStatusMessage(status: number): string {
  const messages: Record<number, string> = {
    200: 'OK',
    201: 'Created',
    301: 'Moved Permanently',
    302: 'Found',
    304: 'Not Modified',
    400: 'Bad Request',
    401: 'Unauthorized - Check your Personal Access Token',
    403: 'Forbidden - Token may lack required permissions',
    404: 'Not Found - Check the repository URL',
    500: 'Internal Server Error',
    502: 'Bad Gateway',
    503: 'Service Unavailable',
  };
  return messages[status] || 'Unknown';
}
