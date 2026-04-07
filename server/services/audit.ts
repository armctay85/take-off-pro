import { db } from "../db";
import { auditLogs, type InsertAuditLog } from "@shared/schema";
import type { Request } from "express";

/**
 * Audit logging service for tracking all data changes
 */
export class AuditLogger {
  /**
   * Log a create action
   */
  static async logCreate(
    req: Request,
    entityType: string,
    entityId: number,
    newValues: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId: this.getUserId(req),
      action: "CREATE",
      entityType,
      entityId,
      newValues,
      ipAddress: this.getClientIp(req),
      userAgent: req.headers["user-agent"] || null
    });
  }

  /**
   * Log an update action
   */
  static async logUpdate(
    req: Request,
    entityType: string,
    entityId: number,
    oldValues: Record<string, any>,
    newValues: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId: this.getUserId(req),
      action: "UPDATE",
      entityType,
      entityId,
      oldValues,
      newValues,
      ipAddress: this.getClientIp(req),
      userAgent: req.headers["user-agent"] || null
    });
  }

  /**
   * Log a delete action
   */
  static async logDelete(
    req: Request,
    entityType: string,
    entityId: number,
    oldValues: Record<string, any>
  ): Promise<void> {
    await this.log({
      userId: this.getUserId(req),
      action: "DELETE",
      entityType,
      entityId,
      oldValues,
      ipAddress: this.getClientIp(req),
      userAgent: req.headers["user-agent"] || null
    });
  }

  /**
   * Internal log method
   */
  private static async log(data: InsertAuditLog): Promise<void> {
    try {
      await db.insert(auditLogs).values(data);
    } catch (error) {
      // Don't fail the main operation if audit logging fails
      console.error("Failed to write audit log:", error);
    }
  }

  /**
   * Get user ID from request session
   */
  private static getUserId(req: Request): string | null {
    return (req.session as any)?.userId || null;
  }

  /**
   * Get client IP address
   */
  private static getClientIp(req: Request): string | null {
    const forwarded = req.headers["x-forwarded-for"];
    if (typeof forwarded === "string") {
      return forwarded.split(",")[0].trim();
    }
    return req.socket.remoteAddress || null;
  }
}
