import { prisma } from "@/lib/prisma/client";
import { Prisma } from "@prisma/client";
import { IAuthCredentialRepository } from "../domain/auth-credential.repository";

export class PrismaAuthCredentialRepository implements IAuthCredentialRepository {
    private prisma: any;

    constructor(prismaInstance?: any) {
        this.prisma = prismaInstance || prisma;
    }

    async findByEmail(email: string) {
        return this.prisma.authCredential.findUnique({
            where: { email: email.toLowerCase().trim() },
            include: { user: true },
        });
    }

    async findByLogin(login: string) {
        return this.prisma.authCredential.findUnique({
            where: { login: login.toLowerCase().trim() },
            include: { user: true },
        });
    }

    async findByUserId(userId: string) {
        return this.prisma.authCredential.findUnique({
            where: { userId },
            include: { user: true },
        });
    }

    async findByIdentifier(identifier: string) {
        const normalizedIdentifier = identifier.toLowerCase().trim();

        let credential = await this.findByEmail(normalizedIdentifier);
        if (credential) return credential;

        credential = await this.findByLogin(normalizedIdentifier);
        if (credential) return credential;

        const cpfClean = normalizedIdentifier.replace(/\D/g, "");
        if (cpfClean.length === 11) {
            const user = await this.prisma.user.findUnique({
                where: { cpf: cpfClean },
                select: { id: true },
            });
            if (user) {
                credential = await this.findByUserId(user.id);
            }
        }

        return credential;
    }

    async create(data: Prisma.AuthCredentialCreateInput) {
        return this.prisma.authCredential.create({
            data,
            include: { user: true },
        });
    }

    async update(id: string, data: Prisma.AuthCredentialUpdateInput) {
        return this.prisma.authCredential.update({
            where: { id },
            data,
            include: { user: true }
        });
    }

    async updateByUserId(userId: string, data: Prisma.AuthCredentialUpdateInput) {
        return this.prisma.authCredential.update({
            where: { userId },
            data,
            include: { user: true },
        });
    }

    async updateLastLogin(userId: string) {
        return this.prisma.authCredential.update({
            where: { userId },
            data: { lastLoginAt: new Date() },
        });
    }

    async setCustomLogin(userId: string, login: string) {
        const existing = await this.findByLogin(login);
        if (existing && existing.userId !== userId) {
            throw new Error("Login já está em uso");
        }

        return this.prisma.authCredential.update({
            where: { userId },
            data: { login: login.toLowerCase().trim() },
        });
    }

    async setMfaEnabled(userId: string, enabled: boolean, secret?: string) {
        return this.prisma.authCredential.update({
            where: { userId },
            data: {
                mfaEnabled: enabled,
                mfaSecret: enabled ? secret : null,
            },
        });
    }

    async updatePassword(userId: string, hashedPassword: string) {
        return this.prisma.authCredential.update({
            where: { userId },
            data: { password: hashedPassword },
        });
    }

    async setSystemUse(userId: string, enabled: boolean) {
        return this.prisma.authCredential.update({
            where: { userId },
            data: { systemUse: enabled },
        });
    }

    async emailExists(email: string, excludeUserId?: string): Promise<boolean> {
        const credential = await this.prisma.authCredential.findUnique({
            where: { email: email.toLowerCase().trim() },
            select: { userId: true },
        });
        if (!credential) return false;
        if (excludeUserId && credential.userId === excludeUserId) return false;
        return true;
    }

    async loginExists(login: string, excludeUserId?: string): Promise<boolean> {
        const credential = await this.prisma.authCredential.findUnique({
            where: { login: login.toLowerCase().trim() },
            select: { userId: true },
        });
        if (!credential) return false;
        if (excludeUserId && credential.userId === excludeUserId) return false;
        return true;
    }
}
