/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { i18n } from '@kbn/i18n';
import { HasUnknownApi } from '@kbn/presentation-publishing';
import { createAction, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { apiIsFilterByMapExtentActionApi } from './types';

export const FILTER_BY_MAP_EXTENT = 'FILTER_BY_MAP_EXTENT';

function getContainerLabel(api: unknown) {
  if (!apiIsFilterByMapExtentActionApi(api)) throw new IncompatibleActionError();
  return (
    api.parent?.value.getTypeDisplayNameLowerCase?.() ??
    i18n.translate('xpack.maps.filterByMapExtentMenuItem.pageLabel', {
      defaultMessage: 'page',
    })
  );
}

function getDisplayName(api: unknown) {
  return i18n.translate('xpack.maps.filterByMapExtentMenuItem.displayName', {
    defaultMessage: 'Filter {containerLabel} by map bounds',
    values: { containerLabel: getContainerLabel(api) },
  });
}

export const filterByMapExtentAction = createAction<HasUnknownApi>({
  id: FILTER_BY_MAP_EXTENT,
  type: FILTER_BY_MAP_EXTENT,
  order: 20,
  getDisplayName: ({ api }: HasUnknownApi) => getDisplayName(api),
  getDisplayNameTooltip: ({ api }: HasUnknownApi) => {
    return i18n.translate('xpack.maps.filterByMapExtentMenuItem.displayNameTooltip', {
      defaultMessage:
        'As you zoom and pan the map, the {containerLabel} updates to display only the data visible in the map bounds.',
      values: { containerLabel: getContainerLabel(api) },
    });
  },
  getIconType: () => 'filter',
  isCompatible: async ({ api }: HasUnknownApi) => {
    const { isCompatible } = await import('./is_compatible');
    return isCompatible(api);
  },
  execute: async ({ api }: HasUnknownApi) => {
    if (!apiIsFilterByMapExtentActionApi(api)) throw new IncompatibleActionError();
    const { openModal } = await import('./modal');
    openModal(getDisplayName(api));
  },
});
