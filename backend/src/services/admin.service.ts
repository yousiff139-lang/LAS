import { AppDataSource } from '../config/database';
import { Admin, AuditAction } from '../models';
import { AppError } from '../middleware/errorHandler';
import { env } from '../config/env';
import { auditService } from './audit.service';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';

const adminRepository = AppDataSource.getRepository(Admin);

export interface LoginDto {
    email: string;
}

export interface CreateAdminDto {
    username: string;
    password?: string;
    full_name: string;
    email: string;
}

export interface ChangePasswordDto {
    current_password: string;
    new_password: string;
}

export interface AdminResponse {
    admin_id: string;
    username: string;
    full_name: string;
    email?: string;
    is_active: boolean;
    last_login?: Date;
    created_at: Date;
}

// Token blacklist for logout (in production, use Redis)
const tokenBlacklist = new Set<string>();

export const adminService = {
    /**
     * Admin login - email only (no password)
     */
    async login(
        data: LoginDto,
        ipAddress?: string,
        userAgent?: string
    ): Promise<{ token: string; admin: AdminResponse }> {
        // Find admin by email
        const admin = await adminRepository.findOne({
            where: { email: data.email },
        });

        if (!admin) {
            throw new AppError('Invalid email. Access denied.', 401);
        }

        if (!admin.is_active) {
            throw new AppError('Account is disabled', 403);
        }

        // Update last login
        await adminRepository.update(admin.admin_id, { last_login: new Date() });

        // Generate JWT token (8 hours = 28800 seconds)
        const expiresInSeconds = 28800;
        const token = jwt.sign(
            {
                id: admin.admin_id,
                username: admin.username,
                email: admin.email,
                role: 'admin',
            },
            env.jwt.secret,
            { expiresIn: expiresInSeconds }
        );

        // Log the action
        await auditService.logAdminLogin(admin.admin_id, ipAddress, userAgent);

        return {
            token,
            admin: this.toResponse(admin),
        };
    },

    /**
     * Admin logout - invalidate token
     */
    async logout(token: string, adminId: string, ipAddress?: string): Promise<void> {
        tokenBlacklist.add(token);
        await auditService.logAdminLogout(adminId, ipAddress);
    },

    /**
     * Check if token is blacklisted
     */
    isTokenBlacklisted(token: string): boolean {
        return tokenBlacklist.has(token);
    },

    /**
     * Get admin by ID
     */
    async findById(adminId: string): Promise<Admin> {
        const admin = await adminRepository.findOne({
            where: { admin_id: adminId },
        });

        if (!admin) {
            throw new AppError('Admin not found', 404);
        }

        return admin;
    },

    /**
     * Get current admin info
     */
    async getMe(adminId: string): Promise<AdminResponse> {
        const admin = await this.findById(adminId);
        return this.toResponse(admin);
    },

    /**
     * Create a new admin (for initial setup or super admin)
     */
    async create(data: CreateAdminDto): Promise<AdminResponse> {
        // Check if email already exists
        const existing = await adminRepository.findOne({
            where: { email: data.email },
        });

        if (existing) {
            throw new AppError('Email already exists', 409);
        }

        // Hash password if provided, otherwise use placeholder
        const passwordHash = data.password
            ? await bcrypt.hash(data.password, 12)
            : await bcrypt.hash('email-only-auth', 12);

        const admin = adminRepository.create({
            username: data.username,
            password_hash: passwordHash,
            full_name: data.full_name,
            email: data.email,
            is_active: true,
        });

        const saved = await adminRepository.save(admin);
        return this.toResponse(saved);
    },

    /**
     * Change admin password
     */
    async changePassword(
        adminId: string,
        data: ChangePasswordDto,
        ipAddress?: string
    ): Promise<void> {
        const admin = await this.findById(adminId);

        // Verify current password
        const isValid = await bcrypt.compare(data.current_password, admin.password_hash);
        if (!isValid) {
            throw new AppError('Current password is incorrect', 401);
        }

        // Validate new password
        if (data.new_password.length < 8) {
            throw new AppError('New password must be at least 8 characters', 400);
        }

        // Hash and update
        const newHash = await bcrypt.hash(data.new_password, 12);
        await adminRepository.update(adminId, { password_hash: newHash });

        // Log the action
        await auditService.log({
            action: AuditAction.ADMIN_PASSWORD_CHANGE,
            admin_id: adminId,
            ip_address: ipAddress,
        });
    },

    /**
     * Check if any admin exists (for initial setup)
     */
    async hasAnyAdmin(): Promise<boolean> {
        const count = await adminRepository.count();
        return count > 0;
    },

    /**
     * Seed initial admin (for first run)
     */
    async seedInitialAdmin(): Promise<AdminResponse | null> {
        const hasAdmin = await this.hasAnyAdmin();
        if (hasAdmin) {
            return null;
        }

        console.log('Creating initial admin account...');
        return this.create({
            username: 'karrarmayaly',
            password: 'Karrarmayaly#2025',
            full_name: 'Karrar Al-Mayaly',
            email: 'karrarmayaly@gmail.com',
        });
    },

    /**
     * Convert Admin entity to response (without sensitive data)
     */
    toResponse(admin: Admin): AdminResponse {
        return {
            admin_id: admin.admin_id,
            username: admin.username,
            full_name: admin.full_name,
            email: admin.email,
            is_active: admin.is_active,
            last_login: admin.last_login,
            created_at: admin.created_at,
        };
    },
};
