declare module "@vercel/node" {
  export interface VercelRequest {
    method?: string;
    headers: Record<string, string | string[] | undefined>;
    query: Record<string, string | string[] | undefined>;
    body: unknown;
    url?: string;
  }
  export interface VercelResponse {
    status(code: number): VercelResponse;
    json(body: unknown): void;
    setHeader(name: string, value: string): void;
    getHeader?(name: string): string | string[] | undefined;
  }
}
