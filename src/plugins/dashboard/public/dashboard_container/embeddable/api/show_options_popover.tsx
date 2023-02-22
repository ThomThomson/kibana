/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import React from 'react';
import ReactDOM from 'react-dom';

import { I18nProvider } from '@kbn/i18n-react';
import { EuiWrappingPopover } from '@elastic/eui';
import { KibanaThemeProvider } from '@kbn/kibana-react-plugin/public';

import { DashboardOptions } from './overlays/options';
import { DashboardContainer, DashboardContainerContext } from '../dashboard_container';
import { pluginServices } from '../../../services/plugin_services';

let isOpen = false;

const container = document.createElement('div');
const onClose = () => {
  ReactDOM.unmountComponentAtNode(container);
  isOpen = false;
};

export function showOptions(this: DashboardContainer, anchorElement: HTMLElement) {
  const {
    settings: {
      theme: { theme$ },
    },
  } = pluginServices.getServices();

  if (isOpen) {
    onClose();
    return;
  }

  isOpen = true;

  document.body.appendChild(container);
  const element = (
    <I18nProvider>
      <KibanaThemeProvider theme$={theme$}>
        <DashboardContainerContext.Provider value={this}>
          <EuiWrappingPopover
            id="popover"
            button={anchorElement}
            isOpen={true}
            closePopover={onClose}
          >
            <DashboardOptions />
          </EuiWrappingPopover>
        </DashboardContainerContext.Provider>
      </KibanaThemeProvider>
    </I18nProvider>
  );
  ReactDOM.render(element, container);
}
