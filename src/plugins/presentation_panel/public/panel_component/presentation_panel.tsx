/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import { EuiFlexGroup, EuiPanel, htmlIdGenerator } from '@elastic/eui';
import classNames from 'classnames';
import React, { useEffect, useMemo, useState } from 'react';

import { apiFiresPhaseEvents, useBatchedPublishingSubjects } from '@kbn/presentation-publishing';
import { Subscription } from 'rxjs';
import { PresentationPanelHeader } from './panel_header/presentation_panel_header';
import { PresentationPanelError } from './presentation_panel_error';
import { DefaultPresentationPanelApi, PresentationPanelInternalProps } from './types';

export const PresentationPanelInternal = <
  ApiType extends DefaultPresentationPanelApi = DefaultPresentationPanelApi,
  ComponentPropsType extends {} = {}
>({
  index,
  hideHeader,
  showShadow,

  showBadges,
  showNotifications,
  getActions,
  actionPredicate,

  Component,
  componentProps,

  onPanelStatusChange,
}: PresentationPanelInternalProps<ApiType, ComponentPropsType>) => {
  const [api, setApi] = useState<ApiType | null>(null);
  const headerId = useMemo(() => htmlIdGenerator()(), []);

  const {
    id,
    viewMode,
    fatalError,
    panelTitle,
    dataLoading,
    hidePanelTitle,
    panelDescription,
    defaultPanelTitle,
    parentHidePanelTitle,
  } = useBatchedPublishingSubjects({
    dataLoading: api?.dataLoading,
    fatalError: api?.fatalError,
    viewMode: api?.viewMode,
    id: api?.id,

    panelTitle: api?.panelTitle,
    hidePanelTitle: api?.hidePanelTitle,
    panelDescription: api?.panelDescription,
    defaultPanelTitle: api?.defaultPanelTitle,
    parentHidePanelTitle: (api?.parent?.value as DefaultPresentationPanelApi)?.hidePanelTitle,
  });

  const hideTitle =
    Boolean(hidePanelTitle) ||
    Boolean(parentHidePanelTitle) ||
    (viewMode === 'view' && !Boolean(panelTitle));

  useEffect(() => {
    let subscription: Subscription;
    if (api && onPanelStatusChange && apiFiresPhaseEvents(api)) {
      subscription = api.onPhaseChange.subscribe((phase) => onPanelStatusChange(phase));
    }
    return () => subscription?.unsubscribe();
  }, [api, onPanelStatusChange]);

  const classes = useMemo(
    () =>
      classNames('presentationPanel', {
        'presentationPanel--editing': viewMode !== 'view',
        'presentationPanel--loading': dataLoading,
      }),
    [viewMode, dataLoading]
  );

  const contentAttrs = useMemo(() => {
    const attrs: { [key: string]: boolean } = {};
    if (dataLoading) attrs['data-loading'] = true;
    if (fatalError) attrs['data-error'] = true;
    return attrs;
  }, [dataLoading, fatalError]);

  return (
    <EuiPanel
      role="figure"
      paddingSize="none"
      className={classes}
      hasShadow={showShadow}
      aria-labelledby={headerId}
      data-test-embeddable-id={id}
      data-test-subj="embeddablePanel"
    >
      {!hideHeader && api && (
        <PresentationPanelHeader
          api={api}
          index={index}
          headerId={headerId}
          viewMode={viewMode}
          hideTitle={hideTitle}
          showBadges={showBadges}
          getActions={getActions}
          actionPredicate={actionPredicate}
          panelDescription={panelDescription}
          showNotifications={showNotifications}
          panelTitle={panelTitle ?? defaultPanelTitle}
        />
      )}
      {fatalError && api && (
        <EuiFlexGroup
          alignItems="center"
          className="eui-fullHeight presentationPanel__error"
          data-test-subj="presentationPanelError"
          justifyContent="center"
        >
          <PresentationPanelError api={api} error={fatalError} />
        </EuiFlexGroup>
      )}
      <Component
        {...(componentProps as React.ComponentProps<typeof Component>)}
        {...contentAttrs}
        className="presentationPanel__content"
        ref={(newApi) => {
          if (newApi && !api) setApi(newApi);
        }}
      />
    </EuiPanel>
  );
};
