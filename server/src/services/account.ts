import type { DB } from '../db/index.js';
import { nowIso } from '../db/index.js';
import {
  expireOldSubscriptions,
  findActiveSubscription,
  findGameByUserId,
  findPackageById,
  listPackages,
  listActiveGameLicenses,
  listTeams,
  type PackageRow,
  type SubscriptionRow,
  type UserRow,
} from '../db/repo.js';
import {
  rowToGame,
  rowToPackage,
  rowToSubscription,
  rowToUser,
  subscriptionIsActive,
} from '../game/mappers.js';
import { paymentRequired } from '../lib/errors.js';
import type { MeDTO } from '../../../shared/types.js';

export interface AccountOverview {
  user: UserRow;
  subscriptionRow: SubscriptionRow | null;
  packageRow: PackageRow | null;
  hasPanelAccess: boolean;
}

export function getAccountOverview(db: DB, user: UserRow, now = nowIso()): AccountOverview {
  expireOldSubscriptions(db, user.id, now);
  const subscriptionRow = findActiveSubscription(db, user.id, now) ?? null;
  const packageRow = subscriptionRow ? findPackageById(db, subscriptionRow.package_id) ?? null : null;
  return {
    user,
    subscriptionRow,
    packageRow,
    hasPanelAccess: Boolean(subscriptionRow && packageRow && subscriptionIsActive(subscriptionRow)),
  };
}

export function requirePanelAccess(db: DB, user: UserRow, now = nowIso()): AccountOverview {
  const account = getAccountOverview(db, user, now);
  if (!account.hasPanelAccess) {
    throw paymentRequired('Yayıncı paneline erişmek için aktif bir paket gerekli.');
  }
  return account;
}

export function buildMeDTO(db: DB, user: UserRow, now = nowIso()): MeDTO {
  const account = getAccountOverview(db, user, now);
  const gameRow = findGameByUserId(db, user.id);
  const game = gameRow ? rowToGame(gameRow, listTeams(db, gameRow.id)) : null;
  return {
    user: rowToUser(user),
    subscription:
      account.subscriptionRow && account.packageRow
        ? rowToSubscription(account.subscriptionRow, account.packageRow)
        : null,
    hasPanelAccess: account.hasPanelAccess,
    game,
    packages: listPackages(db)
      .filter((pkg) => !pkg.game_key)
      .map(rowToPackage),
    licenses: listActiveGameLicenses(db, user.id, now).map((license) => {
      const pkg = findPackageById(db, license.package_id);
      return {
        id: license.id,
        gameKey: license.game_key,
        packageId: license.package_id,
        packageName: pkg?.name ?? 'Oyun lisansı',
        startsAt: license.starts_at,
        expiresAt: license.expires_at,
        status: license.status,
      };
    }),
  };
}
