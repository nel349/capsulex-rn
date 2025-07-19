import nodeFetch, { Request, Response, Headers, FormData } from 'node-fetch';

// Set Node.js's fetch, Request, Response, Headers, and FormData as globals
// These are needed for API calls within the Node.js test environment
// and for compatibility with libraries that expect these globals.

// @ts-ignore
global.fetch = nodeFetch;
// @ts-ignore
global.Request = Request;
// @ts-ignore
global.Response = Response;
// @ts-ignore
global.Headers = Headers;
// @ts-ignore
global.FormData = FormData;
