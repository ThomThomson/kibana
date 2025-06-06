/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import {
  EuiButton,
  EuiCheckbox,
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiText,
} from '@elastic/eui';
import React, { useState } from 'react';
import { render, unmountComponentAtNode } from 'react-dom';

import type {
  AnalyticsServiceStart,
  CoreStart,
  DocLinksStart,
  I18nStart,
  MountPoint,
  ThemeServiceStart,
  UserProfileService,
} from '@kbn/core/public';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';

export const insecureClusterAlertTitle = i18n.translate(
  'xpack.security.checkup.insecureClusterTitle',
  { defaultMessage: 'Your data is not secure' }
);

interface Deps {
  docLinks: DocLinksStart;
  analytics: Pick<AnalyticsServiceStart, 'reportEvent'>;
  i18n: I18nStart;
  theme: Pick<ThemeServiceStart, 'theme$'>;
  userProfile: UserProfileService;
  rendering: CoreStart['rendering'];
}

export const insecureClusterAlertText = (deps: Deps, onDismiss: (persist: boolean) => void) =>
  ((e) => {
    const { docLinks, ...startServices } = deps;
    const AlertText = () => {
      const [persist, setPersist] = useState(false);
      const enableSecurityDocLink = `${docLinks.links.security.elasticsearchEnableSecurity}?blade=kibanasecuritymessage`;

      return (
        <div data-test-subj="insecureClusterAlertText">
          <EuiText size="s">
            <FormattedMessage
              id="xpack.security.checkup.insecureClusterMessage"
              defaultMessage="Don’t lose one bit. Enable our free security features."
            />
          </EuiText>
          <EuiSpacer />
          <EuiCheckbox
            id="persistDismissedAlertPreference"
            checked={persist}
            onChange={(changeEvent) => setPersist(changeEvent.target.checked)}
            label={i18n.translate('xpack.security.checkup.dontShowAgain', {
              defaultMessage: `Don't show again`,
            })}
          />
          <EuiSpacer />
          <EuiFlexGroup justifyContent="spaceBetween">
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                color="primary"
                fill
                href={enableSecurityDocLink}
                target="_blank"
                data-test-subj="learnMoreButton"
              >
                {i18n.translate('xpack.security.checkup.enableButtonText', {
                  defaultMessage: `Enable security`,
                })}
              </EuiButton>
            </EuiFlexItem>
            <EuiFlexItem grow={false}>
              <EuiButton
                size="s"
                onClick={() => onDismiss(persist)}
                data-test-subj="dismissAlertButton"
              >
                {i18n.translate('xpack.security.checkup.dismissButtonText', {
                  defaultMessage: `Dismiss`,
                })}
              </EuiButton>
            </EuiFlexItem>
          </EuiFlexGroup>
        </div>
      );
    };

    render(startServices.rendering.addContext(<AlertText />), e);

    return () => unmountComponentAtNode(e);
  }) as MountPoint;
