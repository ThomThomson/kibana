/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { CoreSetup, NotificationsSetup } from '@kbn/core/public';
import { CoreStart } from '@kbn/core/public';
import {
  apiHasSavedSearchEmbeddableAccessor,
  loadSharingDataHelpers,
  SavedSearchEmbeddableAccessor,
} from '@kbn/discover-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  apiPublishesViewMode,
  HasUnknownApi,
  type PublishesLocalUnifiedSearch,
  type PublishesViewMode,
} from '@kbn/presentation-publishing';
import { CSV_REPORTING_ACTION } from '@kbn/reporting-common';
import type { SavedSearch } from '@kbn/saved-search-plugin/public';
import type { UiActionsActionDefinition as ActionDefinition } from '@kbn/ui-actions-plugin/public';
import { IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import * as Rx from 'rxjs';
import { checkLicense } from '../lib/license_check';
import { ReportingAPIClient } from '../lib/reporting_api_client';
import type { ReportingPublicPluginStartDendencies } from '../plugin';

type GetCsvPanelActionApi = PublishesViewMode &
  SavedSearchEmbeddableAccessor &
  Partial<PublishesLocalUnifiedSearch>;

const apiIsCompatible = (api: unknown): api is GetCsvPanelActionApi => {
  return apiPublishesViewMode(api) && apiHasSavedSearchEmbeddableAccessor(api);
};

interface Params {
  apiClient: ReportingAPIClient;
  core: CoreSetup;
  startServices$: Rx.Observable<[CoreStart, ReportingPublicPluginStartDendencies, unknown]>;
  usesUiCapabilities: boolean;
}

export class ReportingCsvPanelAction implements ActionDefinition<HasUnknownApi> {
  private isDownloading: boolean;
  public readonly type = '';
  public readonly id = CSV_REPORTING_ACTION;
  private licenseHasDownloadCsv: boolean = false;
  private capabilityHasDownloadCsv: boolean = false;
  private notifications: NotificationsSetup;
  private apiClient: ReportingAPIClient;
  private startServices$: Params['startServices$'];
  private usesUiCapabilities: any;

  constructor({ core, apiClient, startServices$, usesUiCapabilities }: Params) {
    this.isDownloading = false;

    this.notifications = core.notifications;
    this.apiClient = apiClient;

    this.startServices$ = startServices$;
    this.usesUiCapabilities = usesUiCapabilities;
  }

  public getIconType() {
    return 'document';
  }

  public getDisplayName() {
    return i18n.translate('xpack.reporting.dashboard.downloadCsvPanelTitle', {
      defaultMessage: 'Download CSV',
    });
  }

  public async getSharingData(savedSearch: SavedSearch) {
    const [{ uiSettings }, { data }] = await Rx.firstValueFrom(this.startServices$);
    const { getSharingData } = await loadSharingDataHelpers();
    return await getSharingData(savedSearch.searchSource, savedSearch, { uiSettings, data });
  }

  public isCompatible = async ({ api }: HasUnknownApi) => {
    if (!apiIsCompatible(api)) return false;
    await new Promise<void>((resolve) => {
      this.startServices$.subscribe(([{ application }, { licensing }]) => {
        licensing.license$.subscribe((license) => {
          const results = license.check('reporting', 'basic');
          const { showLinks } = checkLicense(results);
          this.licenseHasDownloadCsv = showLinks;
        });

        if (this.usesUiCapabilities) {
          this.capabilityHasDownloadCsv = application.capabilities.dashboard?.downloadCsv === true;
        } else {
          this.capabilityHasDownloadCsv = true; // deprecated
        }

        resolve();
      });
    });

    if (!this.licenseHasDownloadCsv || !this.capabilityHasDownloadCsv) {
      return false;
    }

    const savedSearch = api.getSavedSearchEmbeddable().getSavedSearch();
    const query = savedSearch.searchSource.getField('query');

    // using isOfAggregateQueryType(query) added increased the bundle size over the configured limit of 55.7KB
    if (query && Boolean(query && 'sql' in query)) {
      // hide exporting CSV for SQL
      return false;
    }
    return api.viewMode.value !== 'edit';
  };

  public execute = async ({ api }: HasUnknownApi) => {
    if (!apiIsCompatible(api)) throw new IncompatibleActionError();

    if (this.isDownloading) {
      return;
    }

    const savedSearch = api.getSavedSearchEmbeddable().getSavedSearch();
    const { columns, getSearchSource } = await this.getSharingData(savedSearch);

    const immediateJobParams = this.apiClient.getDecoratedJobParams({
      searchSource: getSearchSource({
        addGlobalTimeFilter: !api.getSavedSearchEmbeddable().hasTimeRange(),
        absoluteTime: true,
      }),
      columns,
      title: savedSearch.title || '',
      objectType: 'downloadCsv', // FIXME: added for typescript, but immediate download job does not need objectType
    });

    this.isDownloading = true;

    this.notifications.toasts.addSuccess({
      title: i18n.translate('xpack.reporting.dashboard.csvDownloadStartedTitle', {
        defaultMessage: `CSV Download Started`,
      }),
      text: i18n.translate('xpack.reporting.dashboard.csvDownloadStartedMessage', {
        defaultMessage: `Your CSV will download momentarily.`,
      }),
      'data-test-subj': 'csvDownloadStarted',
    });

    await this.apiClient
      .createImmediateReport(immediateJobParams)
      .then(({ body, response }) => {
        this.isDownloading = false;

        const download = `${savedSearch.title}.csv`;
        const blob = new Blob([body as BlobPart], {
          type: response?.headers.get('content-type') || undefined,
        });

        // Hack for IE11 Support
        // @ts-expect-error
        if (window.navigator.msSaveOrOpenBlob) {
          // @ts-expect-error
          return window.navigator.msSaveOrOpenBlob(blob, download);
        }

        const a = window.document.createElement('a');
        const downloadObject = window.URL.createObjectURL(blob);

        a.href = downloadObject;
        a.download = download;
        document.body.appendChild(a);
        a.click();
        window.URL.revokeObjectURL(downloadObject);
        document.body.removeChild(a);
      })
      .catch(this.onGenerationFail.bind(this));
  };

  private onGenerationFail(_error: Error) {
    this.isDownloading = false;
    this.notifications.toasts.addDanger({
      title: i18n.translate('xpack.reporting.dashboard.failedCsvDownloadTitle', {
        defaultMessage: `CSV download failed`,
      }),
      text: i18n.translate('xpack.reporting.dashboard.failedCsvDownloadMessage', {
        defaultMessage: `We couldn't generate your CSV at this time.`,
      }),
      'data-test-subj': 'downloadCsvFail',
    });
  }
}
