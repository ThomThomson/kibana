/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import type { ApplicationStart } from '@kbn/core/public';
import { SEARCH_EMBEDDABLE_TYPE } from '@kbn/discover-utils';
import { i18n } from '@kbn/i18n';
import { apiPublishesViewMode, HasType, PublishesViewMode } from '@kbn/presentation-publishing';
import { apiIsOfType } from '@kbn/presentation-publishing/interfaces/has_type';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import type { DiscoverAppLocator } from '../../common';
import { getDiscoverLocatorParams } from './get_discover_locator_params';
import { apiHasSavedSearchEmbeddableAccessor, SavedSearchEmbeddableAccessor } from './types';

export const ACTION_VIEW_SAVED_SEARCH = 'ACTION_VIEW_SAVED_SEARCH';

interface GenericApiContext {
  api: unknown;
}
type ViewSavedSearchActionApi = PublishesViewMode &
  HasType<typeof SEARCH_EMBEDDABLE_TYPE> &
  SavedSearchEmbeddableAccessor;
const isApiComptaible = (api: unknown): api is ViewSavedSearchActionApi => {
  return (
    apiHasSavedSearchEmbeddableAccessor(api) &&
    apiPublishesViewMode(api) &&
    apiIsOfType(api, SEARCH_EMBEDDABLE_TYPE)
  );
};

export class ViewSavedSearchAction implements Action<GenericApiContext> {
  public id = ACTION_VIEW_SAVED_SEARCH;
  public readonly type = ACTION_VIEW_SAVED_SEARCH;

  constructor(
    private readonly application: ApplicationStart,
    private readonly locator: DiscoverAppLocator
  ) {}

  async execute({ api }: GenericApiContext): Promise<void> {
    if (!isApiComptaible(api)) throw new IncompatibleActionError();
    const embeddable = api.getSavedSearchEmbeddable();
    const locatorParams = getDiscoverLocatorParams({
      input: embeddable.getInput(),
      savedSearch: embeddable.getSavedSearch(),
    });
    await this.locator.navigate(locatorParams);
  }

  getDisplayName(context: GenericApiContext): string {
    return i18n.translate('discover.savedSearchEmbeddable.action.viewSavedSearch.displayName', {
      defaultMessage: 'Open in Discover',
    });
  }

  getIconType(context: GenericApiContext): string | undefined {
    return 'inspect';
  }

  async isCompatible({ api }: GenericApiContext) {
    if (!isApiComptaible(api) || api.viewMode.value !== 'view') return false;
    const { capabilities } = this.application;
    return (capabilities.discover.show as boolean) || (capabilities.discover.save as boolean);
  }
}
