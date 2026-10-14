import { z } from 'zod';
import { clubRoleSchema, memberStatusSchema } from '../enums';
import { timestampSchema, uuidSchema } from '../primitives';

export const clubMemberSchema = z.object({
  id: uuidSchema,
  club_id: uuidSchema,
  profile_id: uuidSchema,
  role: clubRoleSchema,
  status: memberStatusSchema,
  joined_at: timestampSchema,
});
export type ClubMember = z.infer<typeof clubMemberSchema>;

/** Kulübe katılma talebi (client yalnızca club_id verir; role/status sunucuda). */
export const clubJoinSchema = clubMemberSchema.pick({ club_id: true });
export type ClubJoin = z.infer<typeof clubJoinSchema>;

/** Admin'in üye yönetimi: rol/durum güncelleme. */
export const clubMemberManageSchema = clubMemberSchema.pick({ role: true, status: true }).partial();
export type ClubMemberManage = z.infer<typeof clubMemberManageSchema>;
