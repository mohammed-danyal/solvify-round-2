import "dotenv/config";
import { Pool } from 'pg';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from "../../generated/prisma/client";

const connectionString = `${process.env.DATABASE_URL}`;
const NODE_ENV = process.env.NODE_ENV || "development" ;

const globalForPrisma = globalThis as unknown as {
    prisma: PrismaClient | undefined;
};

const createPrismaClient = () => {
    const pool = new Pool({ connectionString });
    const adapter = new PrismaPg(pool);
    
    return new PrismaClient({
        adapter,
        log:NODE_ENV === "development" ? ["query", "error", "warn"] : ["error"],
    });
};

const prisma = globalForPrisma.prisma ?? createPrismaClient();

if (NODE_ENV !== "production") {
    globalForPrisma.prisma = prisma;
}

export default prisma;  