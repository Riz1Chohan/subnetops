declare module "@prisma/client" {
  export class PrismaClient {
    constructor(options?: any);
    [key: string]: any;
    $connect(): Promise<void>;
    $disconnect(): Promise<void>;
    $queryRaw<T = unknown>(...args: any[]): Promise<T>;
  }
}
