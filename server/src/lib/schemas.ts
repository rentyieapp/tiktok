import { z } from 'zod';
import {
  CASTLE_LOOKS,
  LOCALES,
  SOLDIER_LOOKS,
  SYSTEM_COMMANDS,
  TEAM_COUNT_OPTIONS,
  WIN_CONDITIONS,
} from '../../../shared/types.js';
import { isHexColor } from '../../../shared/defaults.js';
import { badRequest } from './errors.js';

export function parseBody<S extends z.ZodTypeAny>(schema: S, data: unknown): z.infer<S> {
  const result = schema.safeParse(data ?? {});
  if (!result.success) {
    const details: Record<string, string[]> = {};
    for (const issue of result.error.issues) {
      const key = issue.path.length ? issue.path.join('.') : '_';
      details[key] = [...(details[key] ?? []), issue.message];
    }
    throw badRequest('Gönderilen bilgiler geçersiz. Lütfen alanları kontrol et.', details);
  }
  return result.data;
}

export const emailSchema = z
  .string()
  .trim()
  .min(5, 'Geçerli bir e-posta adresi gir.')
  .max(254)
  .email('Geçerli bir e-posta adresi gir.')
  .transform((value) => value.toLowerCase());

export const passwordSchema = z
  .string()
  .min(8, 'Şifre en az 8 karakter olmalı.')
  .max(72, 'Şifre en fazla 72 karakter olabilir.')
  .refine((value) => /[A-Za-zÇĞİÖŞÜçğıöşü]/.test(value), 'Şifre en az bir harf içermeli.')
  .refine((value) => /\d/.test(value), 'Şifre en az bir rakam içermeli.');

export const registerSchema = z
  .object({
    email: emailSchema,
    password: passwordSchema,
    displayName: z.string().trim().min(2, 'Görünen ad en az 2 karakter olmalı.').max(60),
  })
  .strict();

export const loginSchema = z
  .object({
    email: emailSchema,
    password: z.string().min(1, 'Şifre gerekli.').max(200),
  })
  .strict();

const colorSchema = z
  .string()
  .trim()
  .refine((value) => isHexColor(value), 'Renk #RRGGBB biçiminde olmalı (örn. #f59e0b).');

const commandSchema = z.string().trim().min(2, 'Komut en az 2 karakter olmalı.').max(32);

const emblemUrlSchema = z
  .union([z.string().trim().max(500), z.null()])
  .optional()
  .refine(
    (value) =>
      value === undefined ||
      value === null ||
      value === '' ||
      value.startsWith('/uploads/') ||
      /^https:\/\/[^\s]+$/i.test(value),
    'Amblem adresi https:// ile başlayan bir adres veya yüklenmiş bir görsel olmalı.',
  );

export const teamSchema = z
  .object({
    slot: z.number().int().min(1).max(8),
    name: z.string().trim().min(2, 'Takım adı en az 2 karakter olmalı.').max(40),
    primaryColor: colorSchema,
    secondaryColor: colorSchema,
    emblemUrl: emblemUrlSchema,
    symbol: z.string().trim().min(1).max(8),
    soldierLook: z.enum(SOLDIER_LOOKS),
    castleLook: z.enum(CASTLE_LOOKS),
    joinCommand: commandSchema,
    description: z.string().trim().max(200).default(''),
  })
  .strict();

export const settingsSchema = z
  .object({
    roundDurationSec: z.number().int().min(30).max(300),
    startingSoldiers: z.number().int().min(5).max(100),
    soldierProductionRate: z.number().min(0.5).max(10),
    castleHp: z.number().int().min(200).max(5000),
    attackPower: z.number().int().min(1).max(20),
    defensePower: z.number().int().min(0).max(20),
    joinSoldierBonus: z.number().int().min(0).max(20),
    playerAttackBonusPercent: z.number().int().min(0).max(10),
    giftAttackDamage: z.number().int().min(0).max(500),
    likeShieldStrength: z.number().min(0).max(0.5),
    likeShieldDurationSec: z.number().int().min(0).max(30),
    commentSoldierBonus: z.number().int().min(0).max(20),
    enableGifts: z.boolean(),
    enableLikes: z.boolean(),
    enableComments: z.boolean(),
    winCondition: z.enum(WIN_CONDITIONS),
    commandCooldownMs: z.number().int().min(0).max(10000),
    maxPlayersPerTeam: z.number().int().min(0).max(500),
  })
  .strict();

export const createGameSchema = z
  .object({
    gameName: z.string().trim().min(2, 'Oyun adı en az 2 karakter olmalı.').max(60),
    language: z.enum(LOCALES),
    teamCount: z.union([z.literal(2), z.literal(4), z.literal(8)]),
    teams: z.array(teamSchema).optional(),
    settings: settingsSchema.partial().optional(),
  })
  .strict();

export const updateGameSchema = z
  .object({
    gameName: z.string().trim().min(2).max(60).optional(),
    language: z.enum(LOCALES).optional(),
    teamCount: z.union([z.literal(2), z.literal(4), z.literal(8)]).optional(),
    teams: z.array(teamSchema).optional(),
    settings: settingsSchema.partial().optional(),
    wizardCompleted: z.boolean().optional(),
  })
  .strict();

export const updateCommandsSchema = z
  .object({
    language: z.enum(LOCALES).optional(),
    overrides: z
      .record(z.enum(SYSTEM_COMMANDS), z.string().trim().min(1).max(24))
      .optional(),
    teams: z
      .array(
        z.object({
          slot: z.number().int().min(1).max(8),
          joinCommand: commandSchema,
        }),
      )
      .max(8)
      .optional(),
  })
  .strict();

export const profileSchema = z
  .object({
    displayName: z.string().trim().min(2, 'Görünen ad en az 2 karakter olmalı.').max(60),
  })
  .strict();

export const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(1, 'Mevcut şifre gerekli.').max(200),
    newPassword: passwordSchema,
  })
  .strict();

export const checkoutSchema = z
  .object({
    packageId: z.string().trim().min(1).max(64),
    couponCode: z.string().trim().max(40).optional(),
  })
  .strict();

export const testPaymentSchema = z
  .object({
    outcome: z.enum(['success', 'failure']).default('success'),
  })
  .strict();

export const toggleLiveSchema = z
  .object({
    enabled: z.boolean(),
  })
  .strict();

export const testLiveEventSchema = z
  .object({
    type: z.enum(['gift', 'like', 'comment']),
    teamSlot: z.number().int().min(1).max(8),
    playerName: z.string().trim().min(1).max(32).default('Test İzleyici'),
    amount: z.number().int().min(1).max(20).default(1),
    externalId: z.string().trim().min(3).max(80).optional(),
  })
  .strict();

export const createSessionSchema = z.object({}).strict().optional();

export const TEAM_COUNT_VALUES = TEAM_COUNT_OPTIONS;

/* ------------------------------------------------------------------ */
/* Admin / katalog                                                     */
/* ------------------------------------------------------------------ */

const slugSchema = z
  .string()
  .trim()
  .min(2)
  .max(63)
  .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slug küçük harf, rakam ve tire içerebilir.');

const optionalHttpsUrl = z
  .union([z.string().trim().max(500), z.null()])
  .optional()
  .refine(
    (value) =>
      value === undefined ||
      value === null ||
      value === '' ||
      /^https:\/\/[^\s]+$/i.test(value),
    'Adres https:// ile başlamalı.',
  );

export const adminGameProductSchema = z
  .object({
    name: z.string().trim().min(2).max(60),
    slug: slugSchema,
    category: z.string().trim().min(2).max(30),
    tagline: z.string().trim().min(2).max(100),
    description: z.string().trim().max(300).default(''),
    symbol: z.string().trim().min(1).max(8),
    coverUrl: optionalHttpsUrl,
    status: z.enum(['live', 'coming_soon', 'hidden']),
    engineKey: z.enum(['fan_battle', 'coming_soon']),
    sortOrder: z.number().int().min(0).max(999),
  })
  .strict();

export const adminPackageSchema = z
  .object({
    name: z.string().trim().min(2).max(60),
    tagline: z.string().trim().min(2).max(100),
    description: z.string().trim().max(300).default(''),
    priceCents: z.number().int().min(0).max(10_000_000),
    currency: z.string().trim().length(3).default('TRY'),
    maxTeams: z.union([z.literal(2), z.literal(4), z.literal(8)]),
    durationDays: z.number().int().min(1).max(365),
    features: z.array(z.string().trim().min(1).max(120)).max(15).default([]),
    highlight: z.boolean().default(false),
    sortOrder: z.number().int().min(0).max(999).default(0),
    isActive: z.boolean().default(true),
    shopierUrl: optionalHttpsUrl,
    shopierProductId: z.string().trim().max(80).optional(),
  })
  .strict();

export const shopierProductMapSchema = z
  .object({
    packageId: z.string().trim().min(1).max(80),
    shopierProductId: z.string().trim().min(1).max(120),
  })
  .strict();

export const adminSettingsSchema = z
  .object({
    shopierStoreUrl: z
      .union([z.string().trim().max(500), z.null()])
      .optional()
      .refine(
        (value) =>
          value === undefined ||
          value === null ||
          value === '' ||
          /^https:\/\/[^\s]+$/i.test(value),
        'Shopier mağaza adresi https:// ile başlamalı.',
      ),
  })
  .strict();

export const manualLicenseSchema = z
  .object({
    email: emailSchema,
    packageId: z.string().trim().min(1).max(64),
    note: z.string().trim().max(200).optional(),
  })
  .strict();

export const adminGameLicenseCreateSchema = z
  .object({
    email: emailSchema,
    gameKey: z.string().trim().min(1).max(64),
    durationDays: z.number().int().min(1).max(3650),
    note: z.string().trim().max(200).optional(),
  })
  .strict();

export const adminGameLicenseUpdateSchema = z
  .object({
    durationDays: z.number().int().min(1).max(3650).optional(),
    expiresAt: z.string().datetime({ offset: true }).optional(),
    status: z.enum(['active', 'expired', 'revoked']).optional(),
  })
  .strict()
  .refine((value) => value.durationDays !== undefined || value.expiresAt !== undefined || value.status !== undefined, {
    message: 'Güncelleme için en az bir alan gerekli.',
  });


export const verifyEmailSchema = z
  .object({ token: z.string().trim().min(20).max(200) })
  .strict();

export const emailRequestSchema = z
  .object({ email: emailSchema })
  .strict();

export const resetPasswordSchema = z
  .object({
    token: z.string().trim().min(20).max(200),
    password: passwordSchema,
  })
  .strict();
