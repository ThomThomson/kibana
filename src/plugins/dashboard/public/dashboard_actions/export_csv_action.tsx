/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { exporters } from '@kbn/data-plugin/public';
import type { Adapters } from '@kbn/embeddable-plugin/public';
import { Datatable } from '@kbn/expressions-plugin/public';
import { FormatFactory } from '@kbn/field-formats-plugin/common';
import { downloadMultipleAs } from '@kbn/share-plugin/public';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';

import { apiHasInspectorAdapters, HasInspectorAdapters } from '@kbn/inspector-plugin/public';
import { HasUnknownApi, PublishesPanelTitle } from '@kbn/presentation-publishing';
import { pluginServices } from '../services/plugin_services';
import { dashboardExportCsvActionStrings } from './_dashboard_actions_strings';

export const ACTION_EXPORT_CSV = 'ACTION_EXPORT_CSV';

export type ExportContext = HasUnknownApi & {
  // used for testing
  asString?: boolean;
};

type ExportCsvActionApi = HasInspectorAdapters & Partial<PublishesPanelTitle>;

const isApiCompatible = (api: unknown | null): api is ExportCsvActionApi =>
  Boolean(apiHasInspectorAdapters(api));

export class ExportCSVAction implements Action<ExportContext> {
  public readonly id = ACTION_EXPORT_CSV;
  public readonly type = ACTION_EXPORT_CSV;
  public readonly order = 5;

  private fieldFormats;
  private uiSettings;

  constructor() {
    ({
      data: { fieldFormats: this.fieldFormats },
      settings: { uiSettings: this.uiSettings },
    } = pluginServices.getServices());
  }

  public getIconType() {
    return 'exportAction';
  }

  public readonly getDisplayName = (context: ExportContext): string =>
    dashboardExportCsvActionStrings.getDisplayName();

  public async isCompatible({ api }: ExportContext): Promise<boolean> {
    if (!isApiCompatible(api)) return false;
    return Boolean(this.hasDatatableContent(api?.getInspectorAdapters?.()));
  }

  private hasDatatableContent = (adapters: Adapters | undefined) => {
    return Object.keys(adapters?.tables || {}).length > 0 && adapters!.tables.allowCsvExport;
  };

  private getFormatter = (): FormatFactory | undefined => {
    if (this.fieldFormats) {
      return this.fieldFormats.deserialize;
    }
  };

  private getDataTableContent = (adapters: Adapters | undefined) => {
    if (this.hasDatatableContent(adapters)) {
      return adapters?.tables.tables;
    }
    return;
  };

  private exportCSV = async (api: ExportCsvActionApi) => {
    const formatFactory = this.getFormatter();
    // early exit if not formatter is available
    if (!formatFactory) {
      return;
    }

    const tableAdapters = this.getDataTableContent(api?.getInspectorAdapters()) as Record<
      string,
      Datatable
    >;

    if (tableAdapters) {
      const datatables = Object.values(tableAdapters);
      const content = datatables.reduce<Record<string, { content: string; type: string }>>(
        (memo, datatable, i) => {
          // skip empty datatables
          if (datatable) {
            const postFix = datatables.length > 1 ? `-${i + 1}` : '';
            const untitledFilename = dashboardExportCsvActionStrings.getUntitledFilename();

            memo[`${api.panelTitle?.value || untitledFilename}${postFix}.csv`] = {
              content: exporters.datatableToCSV(datatable, {
                csvSeparator: this.uiSettings.get('csv:separator', ','),
                quoteValues: this.uiSettings.get('csv:quoteValues', true),
                formatFactory,
                escapeFormulaValues: false,
              }),
              type: exporters.CSV_MIME_TYPE,
            };
          }
          return memo;
        },
        {}
      );

      if (content) {
        return downloadMultipleAs(content);
      }
    }
  };

  public async execute({ api }: ExportContext): Promise<void> {
    if (!isApiCompatible(api)) throw new IncompatibleActionError();
    return await this.exportCSV(api);
  }
}
