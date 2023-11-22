/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiBadge, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import { METRIC_TYPE } from '@kbn/analytics';
import { TimefilterContract } from '@kbn/data-plugin/public';
import { i18n } from '@kbn/i18n';
import {
  PublishesId,
  PublishesLocalUnifiedSearch,
  PublishesPanelDescription,
  PublishesPanelTitle,
  PublishesViewMode,
} from '@kbn/presentation-publishing';
import { Action, ActionExecutionContext } from '@kbn/ui-actions-plugin/public';
import React from 'react';
import { take } from 'rxjs/operators';
import { ProvidesVisualizeConfig } from '../embeddable/provides_visualize_config';
import {
  getApplication,
  getCapabilities,
  getEmbeddable,
  getUiActions,
  getUsageCollection,
} from '../services';
import { DASHBOARD_VISUALIZATION_PANEL_TRIGGER } from '../triggers';

export const ACTION_EDIT_IN_LENS = 'ACTION_EDIT_IN_LENS';

export interface EditInLensContext {
  api: unknown;
}

type EditInLensActionApi = PublishesViewMode &
  PublishesId &
  ProvidesVisualizeConfig &
  Partial<PublishesPanelDescription & PublishesPanelTitle & PublishesLocalUnifiedSearch>;

const isEditInLensActionApi = (api: unknown | undefined): api is EditInLensActionApi =>
  Boolean(api && (api as EditInLensActionApi).getVis && (api as EditInLensActionApi).viewMode);

const displayName = i18n.translate('visualizations.actions.editInLens.displayName', {
  defaultMessage: 'Convert to Lens',
});

const MenuItem: React.FC = () => {
  return (
    <EuiFlexGroup alignItems="center">
      <EuiFlexItem>{displayName}</EuiFlexItem>
      <EuiFlexItem grow={false}>
        <EuiBadge color={'accent'}>
          {i18n.translate('visualizations.tonNavMenu.tryItBadgeText', {
            defaultMessage: 'Try it',
          })}
        </EuiBadge>
      </EuiFlexItem>
    </EuiFlexGroup>
  );
};

// description, time range, id, title, getVis

export class EditInLensAction implements Action<EditInLensContext> {
  public id = ACTION_EDIT_IN_LENS;
  public readonly type = ACTION_EDIT_IN_LENS;
  public order = 49;
  public showNotification = true;
  public currentAppId: string | undefined;

  constructor(private readonly timefilter: TimefilterContract) {}

  async execute({ api }: ActionExecutionContext<EditInLensContext>): Promise<void> {
    const application = getApplication();
    if (application?.currentAppId$) {
      application.currentAppId$
        .pipe(take(1))
        .subscribe((appId: string | undefined) => (this.currentAppId = appId));
      application.currentAppId$.subscribe(() => {
        getEmbeddable().getStateTransfer().isTransferInProgress = false;
      });
    }
    if (!isEditInLensActionApi(api)) return;

    const vis = api.getVis();
    const navigateToLensConfig = await vis.type.navigateToLens?.(vis, this.timefilter);
    // Filters and query set on the visualization level
    const visFilters = vis.data.searchSource?.getField('filter');
    const visQuery = vis.data.searchSource?.getField('query');
    const parentSearchSource = vis.data.searchSource?.getParent();
    const searchFilters = parentSearchSource?.getField('filter') ?? visFilters;
    const searchQuery = parentSearchSource?.getField('query') ?? visQuery;
    const title = vis.title || api.panelTitle?.value;
    const embeddableId = api.id.value;
    const updatedWithMeta = {
      ...navigateToLensConfig,
      title,
      visTypeTitle: vis.type.title,
      embeddableId,
      originatingApp: this.currentAppId,
      searchFilters,
      searchQuery,
      isEmbeddable: true,
      description: vis.description || api.panelDescription?.value,
      panelTimeRange: api.localTimeRange?.value,
    };
    if (navigateToLensConfig) {
      if (this.currentAppId) {
        getUsageCollection().reportUiCounter(
          this.currentAppId,
          METRIC_TYPE.CLICK,
          ACTION_EDIT_IN_LENS
        );
      }
      getEmbeddable().getStateTransfer().isTransferInProgress = true;
      getUiActions().getTrigger(DASHBOARD_VISUALIZATION_PANEL_TRIGGER).exec(updatedWithMeta);
    }
  }

  getDisplayName(context: ActionExecutionContext<EditInLensContext>): string {
    return displayName;
  }

  MenuItem = MenuItem;

  getIconType(context: ActionExecutionContext<EditInLensContext>): string | undefined {
    return 'merge';
  }

  async isCompatible({ api }: ActionExecutionContext<EditInLensContext>) {
    const { visualize } = getCapabilities();
    if (!isEditInLensActionApi(api) || !visualize.show) {
      return false;
    }
    const vis = api.getVis();
    if (!vis) {
      return false;
    }
    const canNavigateToLens =
      api.getExpressionVariables?.()?.canNavigateToLens ??
      (await vis.type.navigateToLens?.(vis, this.timefilter));
    return Boolean(canNavigateToLens && api.viewMode.value === 'edit');
  }
}
