import { PrismaClient } from '@prisma/client';
declare global {
    var prisma: PrismaClient | undefined;
}
export declare const prisma: PrismaClient<import(".prisma/client").Prisma.PrismaClientOptions, never, import("@prisma/client/runtime/library").DefaultArgs>;
export { PrismaClient };
export declare function disconnectDb(): Promise<void>;
export declare function connectDb(): Promise<void>;
//# sourceMappingURL=index.d.ts.map