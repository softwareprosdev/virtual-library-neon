declare module '@prisma/client' {
  export class PrismaClient {
    constructor(options?: any);
    [key: string]: any;
  }
  export type PrismaPromise<T> = Promise<T>;
}
