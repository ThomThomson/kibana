/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0 and the Server Side Public License, v 1; you may not use this file except
 * in compliance with, at your election, the Elastic License 2.0 or the Server
 * Side Public License, v 1.
 */

import classNames from 'classnames';
import React, { useEffect, useMemo, useState } from 'react';
import { EuiFlexGroup, EuiFlexItem, EuiPanel, htmlIdGenerator } from '@elastic/eui';

import { UI_SETTINGS } from '@kbn/data-plugin/common';

import {
  ViewMode,
  EditPanelAction,
  RemovePanelAction,
  InspectPanelAction,
  CustomizePanelAction,
  EmbeddableErrorHandler,
} from '../lib';
import {
  useSelectFromEmbeddableInput,
  useSelectFromEmbeddableOutput,
} from './use_select_from_embeddable';
import { EmbeddablePanelHeader } from './embeddable_panel_header';
import { EmbeddablePanelProps, PanelUniversalActions } from './types';
import { core, embeddableStart, inspector } from '../kibana_services';
import { EmbeddablePanelError } from '../lib/panel/embeddable_panel_error';

export const EmbeddablePanel = (panelProps: EmbeddablePanelProps) => {
  const { hideHeader, showShadow, embeddable, containerContext } = panelProps;
  const embeddableRoot: React.RefObject<HTMLDivElement> = useMemo(() => React.createRef(), []);

  const headerId = useMemo(() => htmlIdGenerator()(), []);
  const [fatalError, setFatalError] = useState<Error>();

  /**
   * Universal actions are exposed on the context menu for every embeddable, they
   * bypass the trigger registry.
   */
  const universalActions = useMemo<PanelUniversalActions>(() => {
    const commonlyUsedRanges = core.uiSettings.get(UI_SETTINGS.TIMEPICKER_QUICK_RANGES);
    const dateFormat = core.uiSettings.get(UI_SETTINGS.DATE_FORMAT);
    const stateTransfer = embeddableStart.getStateTransfer();

    return {
      inspectPanel: new InspectPanelAction(inspector),
      customizePanel: new CustomizePanelAction(
        core.overlays,
        core.theme,
        commonlyUsedRanges,
        dateFormat
      ),
      removePanel: new RemovePanelAction(),
      editPanel: new EditPanelAction(
        embeddableStart.getEmbeddableFactory,
        core.application,
        stateTransfer,
        containerContext?.getCurrentPath
      ),
    };
  }, [containerContext?.getCurrentPath]);

  /**
   * Select state from the embeddable
   */
  const loading = useSelectFromEmbeddableOutput('loading', embeddable);
  const viewMode = useSelectFromEmbeddableInput('viewMode', embeddable);

  /**
   * Render embeddable into ref, set up error subscription
   */
  useEffect(() => {
    if (embeddableRoot.current) {
      embeddable.render(embeddableRoot.current);
    }
    const errorSubscription = embeddable.getOutput$().subscribe({
      next: (output) => {
        if (output.error) setFatalError(output.error);
      },
      error: setFatalError,
    });
    return () => {
      embeddable?.destroy();
      errorSubscription?.unsubscribe();
    };
  }, [embeddable, embeddableRoot]);

  const classes = useMemo(
    () =>
      classNames('embPanel', {
        'embPanel--editing': viewMode !== ViewMode.VIEW,
        'embPanel--loading': loading,
      }),
    [viewMode, loading]
  );

  const contentAttrs = useMemo(() => {
    const attrs: { [key: string]: boolean } = {};
    if (loading) attrs['data-loading'] = true;
    if (fatalError) attrs['data-error'] = true;
    return attrs;
  }, [loading, fatalError]);

  return (
    <EuiPanel
      role="figure"
      paddingSize="none"
      className={classes}
      hasShadow={showShadow}
      aria-labelledby={headerId}
      data-test-subj="embeddablePanel"
      data-test-embeddable-id={embeddable.id}
    >
      {!hideHeader && (
        <EmbeddablePanelHeader
          {...panelProps}
          headerId={headerId}
          universalActions={universalActions}
        />
      )}
      {fatalError && (
        <EuiFlexGroup
          alignItems="center"
          className="eui-fullHeight embPanel__error"
          data-test-subj="embeddableError"
          justifyContent="center"
        >
          <EuiFlexItem>
            <EmbeddableErrorHandler embeddable={embeddable} error={fatalError}>
              {(error) => (
                <EmbeddablePanelError
                  editPanelAction={universalActions.editPanel}
                  embeddable={embeddable}
                  error={error}
                />
              )}
            </EmbeddableErrorHandler>
          </EuiFlexItem>
        </EuiFlexGroup>
      )}
      <div className="embPanel__content" ref={embeddableRoot} {...contentAttrs} />
    </EuiPanel>
  );
};
