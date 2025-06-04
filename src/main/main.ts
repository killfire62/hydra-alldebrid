<<<<<<< HEAD
import {
  Crypto,
  DownloadManager,
  logger,
  Ludusavi,
  startMainLoop,
} from "./services";
import { RealDebridClient } from "./services/download/real-debrid";
import { AllDebridClient } from "./services/download/all-debrid";
import { HydraApi } from "./services/hydra-api";
import { uploadGamesBatch } from "./services/library-sync";
import { Aria2 } from "./services/aria2";
=======
>>>>>>> upstream/main
import { downloadsSublevel } from "./level/sublevels/downloads";
import { sortBy } from "lodash-es";
import { Downloader } from "@shared";
import { levelKeys, db } from "./level";
import type { UserPreferences } from "@types";
import {
  WSClient,
  SystemPath,
  CommonRedistManager,
  TorBoxClient,
  RealDebridClient,
  Aria2,
  DownloadManager,
  HydraApi,
  uploadGamesBatch,
  startMainLoop,
  Ludusavi,
  Lock,
} from "@main/services";

export const loadState = async () => {
  await Lock.acquireLock();

  const userPreferences = await db.get<string, UserPreferences | null>(
    levelKeys.userPreferences,
    {
      valueEncoding: "json",
    }
  );

  await import("./events");

  if (process.platform !== "darwin") {
    Aria2.spawn();
  }

  if (userPreferences?.realDebridApiToken) {
    RealDebridClient.authorize(userPreferences.realDebridApiToken);
  }

  if (userPreferences?.allDebridApiKey) {
    AllDebridClient.authorize(Crypto.decrypt(userPreferences.allDebridApiKey));
  }

  if (userPreferences?.torBoxApiToken) {
    TorBoxClient.authorize(userPreferences.torBoxApiToken);
  }

  Ludusavi.copyConfigFileToUserData();
  Ludusavi.copyBinaryToUserData();

  await HydraApi.setupApi().then(() => {
    uploadGamesBatch();
    WSClient.connect();
  });

  const downloads = await downloadsSublevel
    .values()
    .all()
    .then((games) => {
      return sortBy(games, "timestamp", "DESC");
    });

  downloads.forEach((download) => {
    if (download.extracting) {
      downloadsSublevel.put(levelKeys.game(download.shop, download.objectId), {
        ...download,
        extracting: false,
      });
    }
  });

  const [nextItemOnQueue] = downloads.filter((game) => game.queued);

  const downloadsToSeed = downloads.filter(
    (game) =>
      game.shouldSeed &&
      game.downloader === Downloader.Torrent &&
      game.progress === 1 &&
      game.uri !== null
  );

  await DownloadManager.startRPC(nextItemOnQueue, downloadsToSeed);

  startMainLoop();
<<<<<<< HEAD
};

const migrateFromSqlite = async () => {
  const sqliteMigrationDone = await db.get(levelKeys.sqliteMigrationDone);

  if (sqliteMigrationDone) {
    return;
  }

  const migrateGames = knexClient("game")
    .select("*")
    .then((games) => {
      return gamesSublevel.batch(
        games.map((game) => ({
          type: "put",
          key: levelKeys.game(game.shop, game.objectID),
          value: {
            objectId: game.objectID,
            shop: game.shop,
            title: game.title,
            iconUrl: game.iconUrl,
            playTimeInMilliseconds: game.playTimeInMilliseconds,
            lastTimePlayed: game.lastTimePlayed,
            remoteId: game.remoteId,
            winePrefixPath: game.winePrefixPath,
            launchOptions: game.launchOptions,
            executablePath: game.executablePath,
            isDeleted: game.isDeleted === 1,
          },
        }))
      );
    })
    .then(() => {
      logger.info("Games migrated successfully");
    });

  const migrateUserPreferences = knexClient("user_preferences")
    .select("*")
    .then(async (userPreferences) => {
      if (userPreferences.length > 0) {
        const { realDebridApiToken, allDebridApiKey, ...rest } =
          userPreferences[0];

        await db.put<string, UserPreferences>(
          levelKeys.userPreferences,
          {
            ...rest,
            realDebridApiToken: realDebridApiToken
              ? Crypto.encrypt(realDebridApiToken)
              : null,
            allDebridApiKey: allDebridApiKey
              ? Crypto.encrypt(allDebridApiKey)
              : null,
            preferQuitInsteadOfHiding: rest.preferQuitInsteadOfHiding === 1,
            runAtStartup: rest.runAtStartup === 1,
            startMinimized: rest.startMinimized === 1,
            disableNsfwAlert: rest.disableNsfwAlert === 1,
            seedAfterDownloadComplete: rest.seedAfterDownloadComplete === 1,
            showHiddenAchievementsDescription:
              rest.showHiddenAchievementsDescription === 1,
            downloadNotificationsEnabled:
              rest.downloadNotificationsEnabled === 1,
            repackUpdatesNotificationsEnabled:
              rest.repackUpdatesNotificationsEnabled === 1,
            achievementNotificationsEnabled:
              rest.achievementNotificationsEnabled === 1,
          },
          { valueEncoding: "json" }
        );

        if (rest.language) {
          await db.put(levelKeys.language, rest.language);
        }
      }
    })
    .then(() => {
      logger.info("User preferences migrated successfully");
    });

  const migrateAchievements = knexClient("game_achievement")
    .select("*")
    .then((achievements) => {
      return gameAchievementsSublevel.batch(
        achievements.map((achievement) => ({
          type: "put",
          key: levelKeys.game(achievement.shop, achievement.objectId),
          value: {
            achievements: JSON.parse(achievement.achievements),
            unlockedAchievements: JSON.parse(achievement.unlockedAchievements),
          },
        }))
      );
    })
    .then(() => {
      logger.info("Achievements migrated successfully");
    });

  const migrateUser = knexClient("user_auth")
    .select("*")
    .then(async (users) => {
      if (users.length > 0) {
        await db.put<string, User>(
          levelKeys.user,
          {
            id: users[0].userId,
            displayName: users[0].displayName,
            profileImageUrl: users[0].profileImageUrl,
            backgroundImageUrl: users[0].backgroundImageUrl,
            subscription: users[0].subscription,
          },
          {
            valueEncoding: "json",
          }
        );

        await db.put<string, Auth>(
          levelKeys.auth,
          {
            accessToken: Crypto.encrypt(users[0].accessToken),
            refreshToken: Crypto.encrypt(users[0].refreshToken),
            tokenExpirationTimestamp: users[0].tokenExpirationTimestamp,
          },
          {
            valueEncoding: "json",
          }
        );
      }
    })
    .then(() => {
      logger.info("User data migrated successfully");
    });

  return Promise.allSettled([
    migrateGames,
    migrateUserPreferences,
    migrateAchievements,
    migrateUser,
  ]);
=======

  CommonRedistManager.downloadCommonRedist();

  SystemPath.checkIfPathsAreAvailable();
>>>>>>> upstream/main
};
