import { randomUUID } from "node:crypto";
import { Router, type IRouter } from "express";
import { and, desc, eq, sql } from "drizzle-orm";
import { db, activitiesTable, schoolsTable, teachersTable } from "@workspace/db";
import {
  CreateInstitutionBody,
  CreateInstitutionResponse,
  CreateInstitutionInviteParams,
  CreateInstitutionInviteResponse,
  EnrollMobileUserBody,
  EnrollMobileUserResponse,
  EnrollUserBody,
  EnrollUserParams,
  EnrollUserResponse,
  GetAdminOverviewQueryParams,
  GetAdminOverviewResponse,
  GetInstitutionParams,
  GetInstitutionResponse,
  ListInstitutionUsersParams,
  ListInstitutionUsersResponse,
  ListInstitutionsResponse,
  RevokeUserParams,
  RevokeUserResponse,
  UpdateInstitutionBody,
  UpdateInstitutionParams,
  UpdateInstitutionResponse,
} from "@workspace/api-zod";

const router: IRouter = Router();

type InstitutionRow = typeof schoolsTable.$inferSelect;
type UserRow = typeof teachersTable.$inferSelect;

function nowIso() {
  return new Date().toISOString();
}

const JOIN_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

function createJoinCode() {
  return Array.from({ length: 6 }, () => JOIN_CODE_ALPHABET[Math.floor(Math.random() * JOIN_CODE_ALPHABET.length)]).join("");
}

function normalizeJoinCode(value: string) {
  return value.trim().toUpperCase().replace(/[^A-Z0-9]/g, "");
}

function institutionInviteUrl(id: string, code: string) {
  return `xmix://join?code=${encodeURIComponent(code)}&institutionId=${encodeURIComponent(id)}`;
}

function mapUser(user: UserRow) {
  return {
    id: user.id,
    institutionId: user.schoolId,
    name: user.name,
    email: user.email,
    phone: user.phone,
    status: user.status === "revoked" ? "revoked" as const : "active" as const,
    joinedAt: user.joinedAt.toISOString(),
    lastActiveAt: user.lastActiveAt.toISOString(),
  };
}

async function activeUserCount(institutionId?: string) {
  const query = db
    .select({ count: sql<number>`count(*)` })
    .from(teachersTable);
  const rows = institutionId
    ? await query.where(and(eq(teachersTable.schoolId, institutionId), eq(teachersTable.status, "active")))
    : await query.where(eq(teachersTable.status, "active"));
  return Number(rows[0]?.count ?? 0);
}

async function totalUserCount(institutionId?: string) {
  const query = db.select({ count: sql<number>`count(*)` }).from(teachersTable);
  const rows = institutionId ? await query.where(eq(teachersTable.schoolId, institutionId)) : await query;
  return Number(rows[0]?.count ?? 0);
}

function mapInstitution(institution: InstitutionRow, activeUsers: number) {
  return {
    id: institution.id,
    joinCode: institution.joinCode,
    name: institution.name,
    adminName: institution.adminName,
    adminEmail: institution.adminEmail,
    licenseSeats: institution.licenseSeats,
    activeUsers,
    status: institution.status === "paused" ? "paused" as const : "active" as const,
    inviteUrl: institutionInviteUrl(institution.id, institution.joinCode),
    createdAt: institution.createdAt.toISOString(),
  };
}

async function getInstitutionWithCounts(id: string) {
  const [institution] = await db.select().from(schoolsTable).where(eq(schoolsTable.id, id));
  if (!institution) return null;
  return mapInstitution(institution, await activeUserCount(id));
}

function genericActivityMessage(message: string) {
  return message
    .replace(/\bteachers\b/gi, "users")
    .replace(/\bteacher\b/gi, "user")
    .replace(/\bschools\b/gi, "institutions")
    .replace(/\bschool\b/gi, "institution");
}

async function addActivity(kind: "user_joined" | "user_revoked" | "institution_created", message: string) {
  await db.insert(activitiesTable).values({
    id: `activity-${randomUUID()}`,
    kind,
    message: genericActivityMessage(message),
  });
}

function validEmail(email: string) {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function validPhone(phone: string) {
  const value = phone.trim();
  return /^\+?[\d\s().-]{7,20}$/.test(value) && value.replace(/\D/g, "").length >= 7;
}

async function enrollUser(
  institutionId: string,
  body: { name: string; email: string; phone: string; deviceId: string },
  req: { log: { warn: (context: object, message: string) => void } },
) {
  const institution = await getInstitutionWithCounts(institutionId);
  if (!institution) return { kind: "not_found" as const };
  if (institution.status === "paused") return { kind: "paused" as const };
  if (institution.activeUsers >= institution.licenseSeats) return { kind: "full" as const };

  const [existing] = await db
    .select()
    .from(teachersTable)
    .where(and(eq(teachersTable.schoolId, institutionId), eq(teachersTable.deviceId, body.deviceId)));

  const teacher = existing
    ? (await db
        .update(teachersTable)
        .set({ name: body.name.trim(), email: body.email.trim(), phone: body.phone.trim(), status: "active", lastActiveAt: new Date() })
        .where(eq(teachersTable.id, existing.id))
        .returning())[0]
    : (await db
        .insert(teachersTable)
        .values({
          id: `teacher-${randomUUID()}`,
          schoolId: institutionId,
          name: body.name.trim(),
          email: body.email.trim(),
          phone: body.phone.trim(),
          deviceId: body.deviceId.trim(),
          status: "active",
        })
        .returning())[0];

  if (!teacher) {
    req.log.warn({ institutionId }, "User enrollment returned no record");
    return { kind: "error" as const };
  }
  await addActivity("user_joined", `${teacher.name} joined ${institution.name}`);
  return { kind: "ok" as const, user: mapUser(teacher) };
}

router.get("/admin/overview", async (req, res): Promise<void> => {
  const parsed = GetAdminOverviewQueryParams.safeParse(req.query);
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message });
    return;
  }

  const { role, institutionId } = parsed.data;
  if (role === "institution_admin" && !institutionId) {
    res.status(400).json({ message: "An institution ID is required for Institution Admin access." });
    return;
  }

  const scopedInstitutionId = role === "institution_admin" ? institutionId : undefined;
  const institution = scopedInstitutionId ? await getInstitutionWithCounts(scopedInstitutionId) : null;
  if (scopedInstitutionId && !institution) {
    res.status(404).json({ message: "Institution not found." });
    return;
  }

  const institutions = scopedInstitutionId
    ? [institution!]
    : (await db.select().from(schoolsTable)).map((row) => mapInstitution(row, 0));
  const totalUsers = await totalUserCount(scopedInstitutionId);
  const activeUsers = await activeUserCount(scopedInstitutionId);
  const allocatedSeats = institutions.reduce((total, item) => total + item.licenseSeats, 0);
  const activities = await db.select().from(activitiesTable).orderBy(desc(activitiesTable.createdAt)).limit(8);

  const response = {
    role,
    institution,
    totalInstitutions: institutions.length,
    totalUsers,
    activeUsers,
    allocatedSeats,
    usedSeats: activeUsers,
    utilizationPercent: allocatedSeats ? Math.round((activeUsers / allocatedSeats) * 100) : 0,
    recentActivity: activities.map((activity) => ({
      id: activity.id,
      kind: activity.kind === "teacher_revoked" || activity.kind === "user_revoked"
        ? "user_revoked" as const
        : activity.kind === "school_created" || activity.kind === "institution_created"
          ? "institution_created" as const
          : "user_joined" as const,
      message: genericActivityMessage(activity.message),
      createdAt: activity.createdAt.toISOString(),
    })),
  };
  res.json(GetAdminOverviewResponse.parse(response));
});

router.get("/institutions", async (_req, res): Promise<void> => {
  const rows = await db.select().from(schoolsTable).orderBy(desc(schoolsTable.createdAt));
  const institutions = await Promise.all(rows.map(async (row) => mapInstitution(row, await activeUserCount(row.id))));
  res.json(ListInstitutionsResponse.parse({ institutions }));
});

router.post("/institutions", async (req, res): Promise<void> => {
  const parsed = CreateInstitutionBody.safeParse(req.body);
  if (!parsed.success || !Number.isInteger(parsed.data?.licenseSeats) || !validEmail(parsed.data?.adminEmail ?? "")) {
    res.status(400).json({ message: parsed.success ? "Provide a valid admin email and whole-number seat count." : parsed.error.message });
    return;
  }

  const id = `school-${randomUUID().slice(0, 8)}`;
  const joinCode = createJoinCode();
  const [school] = await db.insert(schoolsTable).values({
    id,
    joinCode,
    name: parsed.data.name.trim(),
    adminName: parsed.data.adminName.trim(),
    adminEmail: parsed.data.adminEmail.trim().toLowerCase(),
    licenseSeats: parsed.data.licenseSeats,
    status: "active",
  }).returning();
  if (!school) {
    res.status(500).json({ message: "Unable to create institution." });
    return;
  }
  await addActivity("institution_created", `${school.name} was added to XmiX`);
  res.status(201).json(CreateInstitutionResponse.parse(mapInstitution(school, 0)));
});

router.get("/institutions/:institutionId", async (req, res): Promise<void> => {
  const parsed = GetInstitutionParams.safeParse({ institutionId: req.params.institutionId });
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message });
    return;
  }
  const institution = await getInstitutionWithCounts(parsed.data.institutionId);
  if (!institution) {
    res.status(404).json({ message: "Institution not found." });
    return;
  }
  res.json(GetInstitutionResponse.parse(institution));
});

router.patch("/institutions/:institutionId", async (req, res): Promise<void> => {
  const params = UpdateInstitutionParams.safeParse({ institutionId: req.params.institutionId });
  const body = UpdateInstitutionBody.safeParse(req.body);
  if (!params.success || !body.success) {
    const message = !params.success ? params.error.message : body.success ? "Invalid request." : body.error.message;
    res.status(400).json({ message });
    return;
  }
  const activeUsers = await activeUserCount(params.data.institutionId);
  if (body.data.licenseSeats !== undefined && (!Number.isInteger(body.data.licenseSeats) || body.data.licenseSeats < activeUsers)) {
    res.status(400).json({ message: `License seats cannot be lower than the ${activeUsers} active users.` });
    return;
  }
  const values = Object.fromEntries(Object.entries(body.data).filter(([, value]) => value !== undefined));
  const [institution] = await db.update(schoolsTable).set(values).where(eq(schoolsTable.id, params.data.institutionId)).returning();
  if (!institution) {
    res.status(404).json({ message: "Institution not found." });
    return;
  }
  res.json(UpdateInstitutionResponse.parse(mapInstitution(institution, activeUsers)));
});

router.post("/institutions/:institutionId/invite", async (req, res): Promise<void> => {
  const parsed = CreateInstitutionInviteParams.safeParse({ institutionId: req.params.institutionId });
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message });
    return;
  }
  const institution = await getInstitutionWithCounts(parsed.data.institutionId);
  if (!institution) {
    res.status(404).json({ message: "Institution not found." });
    return;
  }
  res.json(CreateInstitutionInviteResponse.parse({
    institutionId: institution.id,
    code: institution.joinCode,
    url: institutionInviteUrl(institution.id, institution.joinCode),
    createdAt: nowIso(),
  }));
});

router.get("/institutions/:institutionId/users", async (req, res): Promise<void> => {
  const parsed = ListInstitutionUsersParams.safeParse({ institutionId: req.params.institutionId });
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message });
    return;
  }
  const institution = await getInstitutionWithCounts(parsed.data.institutionId);
  if (!institution) {
    res.status(404).json({ message: "Institution not found." });
    return;
  }
  const users = await db.select().from(teachersTable)
    .where(eq(teachersTable.schoolId, parsed.data.institutionId))
    .orderBy(desc(teachersTable.joinedAt));
  res.json(ListInstitutionUsersResponse.parse({ users: users.map(mapUser) }));
});

router.post("/institutions/:institutionId/users", async (req, res): Promise<void> => {
  const params = EnrollUserParams.safeParse({ institutionId: req.params.institutionId });
  const body = EnrollUserBody.safeParse(req.body);
  if (!params.success || !body.success || !validEmail(body.data?.email ?? "") || !validPhone(body.data?.phone ?? "")) {
    res.status(400).json({ message: !params.success ? params.error.message : !body.success ? body.error.message : "Provide a valid user email and phone number." });
    return;
  }
  const result = await enrollUser(params.data.institutionId, body.data, req);
  if (result.kind === "not_found") {
    res.status(404).json({ message: "Institution not found." });
    return;
  }
  if (result.kind === "paused") {
    res.status(409).json({ message: "This institution workspace is paused." });
    return;
  }
  if (result.kind === "full") {
    res.status(409).json({ message: "This institution has no available license seats." });
    return;
  }
  if (result.kind === "error") {
    res.status(500).json({ message: "Unable to enroll user." });
    return;
  }
  res.status(201).json(EnrollUserResponse.parse(result.user));
});

router.post("/users/:userId/revoke", async (req, res): Promise<void> => {
  const parsed = RevokeUserParams.safeParse({ userId: req.params.userId });
  if (!parsed.success) {
    res.status(400).json({ message: parsed.error.message });
    return;
  }
  const [user] = await db.update(teachersTable)
    .set({ status: "revoked" })
    .where(eq(teachersTable.id, parsed.data.userId))
    .returning();
  if (!user) {
    res.status(404).json({ message: "User not found." });
    return;
  }
  await addActivity("user_revoked", `${user.name}'s institution access was revoked`);
  res.json(RevokeUserResponse.parse(mapUser(user)));
});

router.post("/mobile/enroll", async (req, res): Promise<void> => {
  const parsed = EnrollMobileUserBody.safeParse(req.body);
  if (!parsed.success || !validEmail(parsed.data?.email ?? "") || !validPhone(parsed.data?.phone ?? "")) {
    res.status(400).json({ message: parsed.success ? "Provide a valid user email and phone number." : parsed.error.message });
    return;
  }
  const requestedInstitutionId = parsed.data.institutionId?.trim();
  const requestedJoinCode = parsed.data.joinCode ? normalizeJoinCode(parsed.data.joinCode) : "";
  let institutionId = requestedInstitutionId;
  if (requestedJoinCode) {
    const [institution] = await db.select({ id: schoolsTable.id })
      .from(schoolsTable)
      .where(eq(schoolsTable.joinCode, requestedJoinCode));
    institutionId = institution?.id;
  }
  if (!institutionId) {
    res.status(404).json({ message: "That institution code was not found. Check the code and try again." });
    return;
  }
  const result = await enrollUser(institutionId, parsed.data, req);
  if (result.kind === "not_found") {
    res.status(404).json({ message: "Institution not found." });
    return;
  }
  if (result.kind === "paused" || result.kind === "full") {
    res.status(409).json({ message: result.kind === "paused" ? "This institution workspace is paused." : "This institution has no available license seats." });
    return;
  }
  if (result.kind === "error") {
    res.status(500).json({ message: "Unable to enroll user." });
    return;
  }
  res.status(201).json(EnrollMobileUserResponse.parse(result.user));
});

export default router;