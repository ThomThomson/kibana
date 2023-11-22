/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { OverlayStart, ThemeServiceStart } from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { HasUnknownApi } from '@kbn/presentation-publishing';
import { Action, IncompatibleActionError } from '@kbn/ui-actions-plugin/public';
import { apiProvidesLensConfig } from '../../embeddable/provides_lens_config';
import type { LensPluginStartDependencies } from '../../plugin';

const ACTION_CONFIGURE_IN_LENS = 'ACTION_CONFIGURE_IN_LENS';

export const getConfigureLensHelpersAsync = async () => await import('../../async_services');

export class ConfigureInLensPanelAction implements Action<HasUnknownApi> {
  public type = ACTION_CONFIGURE_IN_LENS;
  public id = ACTION_CONFIGURE_IN_LENS;
  public order = 50;

  constructor(
    protected readonly startDependencies: LensPluginStartDependencies,
    protected readonly overlays: OverlayStart,
    protected readonly theme: ThemeServiceStart
  ) {}

  public getDisplayName({ api }: HasUnknownApi): string {
    if (!apiProvidesLensConfig(api)) throw new IncompatibleActionError();
    const language = api.getTextBasedLanguage();
    return i18n.translate('xpack.lens.app.editVisualizationLabel', {
      defaultMessage: 'Edit {lang} visualization',
      values: { lang: language },
    });
  }

  public getIconType() {
    return 'pencil';
  }

  public async isCompatible({ api }: HasUnknownApi) {
    const { isActionCompatible } = await getConfigureLensHelpersAsync();
    return isActionCompatible(api);
  }

  public async execute({ api }: HasUnknownApi) {
    const { executeAction } = await getConfigureLensHelpersAsync();
    return executeAction({
      api,
      startDependencies: this.startDependencies,
      overlays: this.overlays,
      theme: this.theme,
    });
  }
}
