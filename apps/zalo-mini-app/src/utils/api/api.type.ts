export type TApiHttpMethod = 'GET' | 'POST' | 'PUT' | 'DELETE' | 'PATCH';

export interface IApiRequestOptions {
  path: string;
  method?: TApiHttpMethod;
  body?: unknown;
}
