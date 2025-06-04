import { registerEvent } from "../register-event";
import { db, levelKeys } from "@main/level";
import type { UserPreferences } from "@types";

const getUserPreferences = async () =>
  db
    .get<string, UserPreferences | null>(levelKeys.userPreferences, {
      valueEncoding: "json",
    })
    .then((userPreferences) => {
      if (userPreferences?.realDebridApiToken) {
        userPreferences.realDebridApiToken = Crypto.decrypt(
          userPreferences.realDebridApiToken
        );
      }

      if (userPreferences?.allDebridApiKey) {
        userPreferences.allDebridApiKey = Crypto.decrypt(
          userPreferences.allDebridApiKey
        );
      }

      if (userPreferences?.torBoxApiToken) {
        userPreferences.torBoxApiToken = Crypto.decrypt(
          userPreferences.torBoxApiToken
        );
      }

      return userPreferences;
    });
  db.get<string, UserPreferences | null>(levelKeys.userPreferences, {
    valueEncoding: "json",
  });

registerEvent("getUserPreferences", getUserPreferences);
