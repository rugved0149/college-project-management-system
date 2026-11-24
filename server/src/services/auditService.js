import { db } from '../config/database.js';

export function recordAudit(user, req, action, resourceType, resourceId, details = {}) {
  if (!user?.user_id) return;
  db.prepare(`INSERT INTO audit_logs(user_id, action, resource_type, resource_id, details, ip_address)
    VALUES (?, ?, ?, ?, ?, ?)`).run(
    user.user_id,
    action,
    resourceType,
    resourceId == null ? null : String(resourceId),
    JSON.stringify(details),
    req.ip || null
  );
}
