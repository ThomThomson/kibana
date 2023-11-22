/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { apiIsOfType } from '@kbn/presentation-publishing';
import { DOC_TYPE } from '../../common/constants';
import { Document } from '../persistence';
import { LensPluginStartDependencies } from '../plugin';
import { ViewUnderlyingDataArgs } from './embeddable';

export interface ProvidesLensConfig {
  getIsLensEditable: () => boolean;
  getSavedVis: () => Readonly<Document | undefined>;
  getTextBasedLanguage: () => string | undefined;
  canViewUnderlyingData: () => Promise<boolean>;
  getViewUnderlyingDataArgs: () => ViewUnderlyingDataArgs | undefined;
  openConfigPanel: (startDependencies: LensPluginStartDependencies) => Promise<JSX.Element | null>;
}

export const apiProvidesLensConfig = (api: unknown): api is ProvidesLensConfig => {
  return apiIsOfType(api, DOC_TYPE);
};
