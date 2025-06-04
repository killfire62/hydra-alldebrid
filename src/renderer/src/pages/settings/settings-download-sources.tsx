import { useContext, useEffect, useState } from "react";

import {
  TextField,
  Button,
  Badge,
  ConfirmationModal,
} from "@renderer/components";
import { useTranslation } from "react-i18next";

import type { DownloadSource } from "@types";
import {
  NoEntryIcon,
  PlusCircleIcon,
  SyncIcon,
  TrashIcon,
} from "@primer/octicons-react";
import { AddDownloadSourceModal } from "./add-download-source-modal";
import { useAppDispatch, useRepacks, useToast } from "@renderer/hooks";
import { DownloadSourceStatus } from "@shared";
import { settingsContext } from "@renderer/context";
import { downloadSourcesTable } from "@renderer/dexie";
import { downloadSourcesWorker } from "@renderer/workers";
import { useNavigate } from "react-router-dom";
import { setFilters, clearFilters } from "@renderer/features";
import "./settings-download-sources.scss";

export function SettingsDownloadSources() {
  const [
    showConfirmationDeleteAllSourcesModal,
    setShowConfirmationDeleteAllSourcesModal,
  ] = useState(false);
  const [showAddDownloadSourceModal, setShowAddDownloadSourceModal] =
    useState(false);
  const [downloadSources, setDownloadSources] = useState<DownloadSource[]>([]);
  const [isSyncingDownloadSources, setIsSyncingDownloadSources] =
    useState(false);
  const [isRemovingDownloadSource, setIsRemovingDownloadSource] =
    useState(false);
  const [isFetchingSources, setIsFetchingSources] = useState(true);

  const { sourceUrl, clearSourceUrl } = useContext(settingsContext);

  const { t } = useTranslation("settings");
  const { showSuccessToast } = useToast();

  const dispatch = useAppDispatch();

  const navigate = useNavigate();

  const { updateRepacks } = useRepacks();

  const getDownloadSources = async () => {
    await downloadSourcesTable
      .toCollection()
      .sortBy("createdAt")
      .then((sources) => {
        setDownloadSources(sources.reverse());
      })
      .finally(() => {
        setIsFetchingSources(false);
      });
  };

  useEffect(() => {
    getDownloadSources();
  }, []);

  useEffect(() => {
    if (sourceUrl) setShowAddDownloadSourceModal(true);
  }, [sourceUrl]);

  const handleRemoveSource = (downloadSource: DownloadSource) => {
    setIsRemovingDownloadSource(true);
    const channel = new BroadcastChannel(
      `download_sources:delete:${downloadSource.id}`
    );

    downloadSourcesWorker.postMessage([
      "DELETE_DOWNLOAD_SOURCE",
      downloadSource.id,
    ]);

    channel.onmessage = () => {
      showSuccessToast(t("removed_download_source"));
      window.electron.removeDownloadSource(downloadSource.url);

      getDownloadSources();
      setIsRemovingDownloadSource(false);
      channel.close();
      updateRepacks();
    };
  };

  const handleRemoveAllDownloadSources = () => {
    setIsRemovingDownloadSource(true);

    const id = crypto.randomUUID();
    const channel = new BroadcastChannel(`download_sources:delete_all:${id}`);

    downloadSourcesWorker.postMessage(["DELETE_ALL_DOWNLOAD_SOURCES", id]);

    channel.onmessage = () => {
      showSuccessToast(t("removed_download_sources"));
      window.electron.removeDownloadSource("", true);
      getDownloadSources();
      setIsRemovingDownloadSource(false);
      setShowConfirmationDeleteAllSourcesModal(false);
      channel.close();
      updateRepacks();
    };
  };

  const handleAddDownloadSource = async () => {
    await getDownloadSources();
    showSuccessToast(t("added_download_source"));
    updateRepacks();
  };

  const syncDownloadSources = async () => {
    setIsSyncingDownloadSources(true);

    const id = crypto.randomUUID();
    const channel = new BroadcastChannel(`download_sources:sync:${id}`);

    downloadSourcesWorker.postMessage(["SYNC_DOWNLOAD_SOURCES", id]);

    channel.onmessage = () => {
      showSuccessToast(t("download_sources_synced"));
      getDownloadSources();
      setIsSyncingDownloadSources(false);
      channel.close();
      updateRepacks();
    };
  };

  const statusTitle = {
    [DownloadSourceStatus.UpToDate]: t("download_source_up_to_date"),
    [DownloadSourceStatus.Errored]: t("download_source_errored"),
  };

  const handleModalClose = () => {
    clearSourceUrl();
    setShowAddDownloadSourceModal(false);
  };

  const navigateToCatalogue = (fingerprint: string) => {
    dispatch(clearFilters());
    dispatch(setFilters({ downloadSourceFingerprints: [fingerprint] }));

    navigate("/catalogue");
  };

  return (
    <>
      <AddDownloadSourceModal
        visible={showAddDownloadSourceModal}
        onClose={handleModalClose}
        onAddDownloadSource={handleAddDownloadSource}
      />
      <ConfirmationModal
        cancelButtonLabel={t("cancel_button_confirmation_delete_all_sources")}
        confirmButtonLabel={t("confirm_button_confirmation_delete_all_sources")}
        descriptionText={t("description_confirmation_delete_all_sources")}
        clickOutsideToClose={false}
        onConfirm={handleRemoveAllDownloadSources}
        visible={showConfirmationDeleteAllSourcesModal}
        title={t("title_confirmation_delete_all_sources")}
        onClose={() => setShowConfirmationDeleteAllSourcesModal(false)}
        buttonsIsDisabled={isRemovingDownloadSource}
      />

      <p>{t("download_sources_description")}</p>

      <div className="settings-download-sources__header">
        <Button
          type="button"
          theme="outline"
          disabled={
            !downloadSources.length ||
            isSyncingDownloadSources ||
            isRemovingDownloadSource ||
            isFetchingSources
          }
          onClick={syncDownloadSources}
        >
          <SyncIcon />
          {t("sync_download_sources")}
        </Button>

        <div className="settings-download-sources__buttons-container">
          <Button
            type="button"
            theme="danger"
            onClick={() => setShowConfirmationDeleteAllSourcesModal(true)}
            disabled={
              isRemovingDownloadSource ||
              isSyncingDownloadSources ||
              !downloadSources.length ||
              isFetchingSources
            }
          >
            <TrashIcon />
            {t("button_delete_all_sources")}
          </Button>

          <Button
            type="button"
            theme="outline"
            onClick={() => setShowAddDownloadSourceModal(true)}
            disabled={
              isSyncingDownloadSources ||
              isFetchingSources ||
              isRemovingDownloadSource
            }
          >
            <PlusCircleIcon />
            {t("add_download_source")}
          </Button>
        </div>
      </div>

      <ul className="settings-download-sources__list">
        {downloadSources.map((downloadSource) => (
          <li
            key={downloadSource.id}
            className={`settings-download-sources__item ${isSyncingDownloadSources ? "settings-download-sources__item--syncing" : ""}`}
          >
            <div className="settings-download-sources__item-header">
              <h2>{downloadSource.name}</h2>

              <div style={{ display: "flex" }}>
                <Badge>{statusTitle[downloadSource.status]}</Badge>
              </div>

              <button
                type="button"
                className="settings-download-sources__navigate-button"
                disabled={!downloadSource.fingerprint}
                onClick={() => navigateToCatalogue(downloadSource.fingerprint)}
              >
                <small>
                  {t("download_count", {
                    count: downloadSource.downloadCount,
                    countFormatted:
                      downloadSource.downloadCount.toLocaleString(),
                  })}
                </small>
              </button>
            </div>

            <TextField
              label={t("download_source_url")}
              value={downloadSource.url}
              readOnly
              theme="dark"
              disabled
              rightContent={
                <Button
                  type="button"
                  theme="outline"
                  onClick={() => handleRemoveSource(downloadSource)}
                  disabled={isRemovingDownloadSource}
                >
                  <NoEntryIcon />
                  {t("remove_download_source")}
                </Button>
              }
            />
          </li>
        ))}
      </ul>
    </>
  );
}
