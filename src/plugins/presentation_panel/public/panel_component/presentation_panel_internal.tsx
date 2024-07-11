/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import {
  EuiButtonIcon,
  EuiErrorBoundary,
  EuiFlexGroup,
  EuiPanel,
  htmlIdGenerator,
} from '@elastic/eui';
import { css } from '@emotion/react';
import { PanelLoader } from '@kbn/panel-loader';
import {
  apiHasParentApi,
  apiPublishesViewMode,
  useBatchedOptionalPublishingSubjects,
} from '@kbn/presentation-publishing';
import classNames from 'classnames';
import React, { useMemo, useRef, useState } from 'react';
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
  showBorder,

  showBadges,
  showNotifications,
  getActions,
  actionPredicate,

  Component,
  componentProps,
}: PresentationPanelInternalProps<ApiType, ComponentPropsType>) => {
  const hoverElementRef = useRef<HTMLDivElement | null>(null);
  const [api, setApi] = useState<ApiType | null>(null);
  const headerId = useMemo(() => htmlIdGenerator()(), []);

  const viewModeSubject = (() => {
    if (apiPublishesViewMode(api)) return api.viewMode;
    if (apiHasParentApi(api) && apiPublishesViewMode(api.parentApi)) return api.parentApi.viewMode;
  })();

  const [
    dataLoading,
    blockingError,
    panelTitle,
    hidePanelTitle,
    panelDescription,
    defaultPanelTitle,
    defaultPanelDescription,
    rawViewMode,
    parentHidePanelTitle,
  ] = useBatchedOptionalPublishingSubjects(
    api?.dataLoading,
    api?.blockingError,
    api?.panelTitle,
    api?.hidePanelTitle,
    api?.panelDescription,
    api?.defaultPanelTitle,
    api?.defaultPanelDescription,
    viewModeSubject,
    api?.parentApi?.hidePanelTitle
  );
  const viewMode = rawViewMode ?? 'view';

  const [initialLoadComplete, setInitialLoadComplete] = useState(!dataLoading);
  if (!initialLoadComplete && (dataLoading === false || (api && !api.dataLoading))) {
    setInitialLoadComplete(true);
  }

  const hideTitle =
    Boolean(hidePanelTitle) ||
    Boolean(parentHidePanelTitle) ||
    (viewMode === 'view' && !Boolean(panelTitle ?? defaultPanelTitle));

  const contentAttrs = useMemo(() => {
    const attrs: { [key: string]: boolean } = {};
    if (dataLoading) {
      attrs['data-loading'] = true;
    } else {
      attrs['data-render-complete'] = true;
    }
    if (blockingError) attrs['data-error'] = true;
    return attrs;
  }, [dataLoading, blockingError]);

  return (
    <EuiPanel
      onMouseOver={(event: any) => {
        const rect = event.currentTarget.getBoundingClientRect();
        const panelCenter = rect.left + rect.width / 2;
        const screenCenter = window.innerWidth / 2;
        hoverElementRef.current?.style.removeProperty('right');
        hoverElementRef.current?.style.removeProperty('left');
        if (panelCenter > screenCenter) {
          hoverElementRef.current?.style.setProperty('right', '0');
        } else {
          hoverElementRef.current?.style.setProperty('left', '0');
        }
      }}
      role="figure"
      paddingSize="none"
      className={classNames('embPanel', {
        'embPanel--editing': viewMode === 'edit',
      })}
      hasShadow={showShadow}
      hasBorder={showBorder}
      aria-labelledby={headerId}
      data-test-embeddable-id={api?.uuid}
      data-test-subj="embeddablePanel"
      {...contentAttrs}
    >
      <div
        ref={hoverElementRef}
        css={css`
          position: absolute;
          top: -30px;
          opacity: 0;
          z-index: 10000;
          min-width: 100%;
          display: flex;
          flex-wrap: nowrap;
          justify-content: space-between;
          padding: 0 15px;

          .embPanel:hover & {
            opacity: 1;
          }
        `}
      >
        <EuiPanel
          css={css`
            display: flex;
            flex-wrap: nowrap;
          `}
          paddingSize="none"
          hasShadow={false}
          hasBorder={true}
          grow={false}
        >
          <EuiButtonIcon size="s" color="primary" iconType="move" />
        </EuiPanel>
        <EuiPanel
          css={css`
            display: flex;
            flex-wrap: nowrap;
          `}
          paddingSize="none"
          hasShadow={false}
          hasBorder={true}
          grow={false}
        >
          <EuiButtonIcon size="s" color="primary" iconType="annotation" />
          <EuiButtonIcon size="s" color="primary" iconType="arrowDown" />
          <EuiButtonIcon size="s" color="primary" iconType="article" />
          <EuiButtonIcon size="s" color="primary" iconType="beaker" />
          <EuiButtonIcon size="s" color="primary" iconType="clock" />
          <EuiButtonIcon size="s" color="primary" iconType="color" />
          <EuiButtonIcon size="s" color="primary" iconType="exit" />
        </EuiPanel>
      </div>
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
          showNotifications={showNotifications}
          panelTitle={panelTitle ?? defaultPanelTitle}
          panelDescription={panelDescription ?? defaultPanelDescription}
        />
      )}
      {blockingError && api && (
        <EuiFlexGroup
          alignItems="center"
          className="eui-fullHeight embPanel__error"
          data-test-subj="embeddableError"
          justifyContent="center"
        >
          <PresentationPanelError api={api} error={blockingError} />
        </EuiFlexGroup>
      )}
      {!initialLoadComplete && <PanelLoader />}
      <div className={blockingError ? 'embPanel__content--hidden' : 'embPanel__content'}>
        <EuiErrorBoundary>
          <Component
            {...(componentProps as React.ComponentProps<typeof Component>)}
            ref={(newApi) => {
              if (newApi && !api) setApi(newApi);
            }}
          />
        </EuiErrorBoundary>
      </div>
    </EuiPanel>
  );
};
