/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

import React from 'react';
import { EuiFlyout } from '@elastic/eui';
import { DataViewEditorLazy } from './data_view_editor_lazy';
import { DataViewEditorContext, DataViewEditorProps } from '../types';
import { createKibanaReactContext } from '../shared_imports';

export interface DataViewEditorPropsWithServices extends DataViewEditorProps {
  services: DataViewEditorContext;
}

export const DataViewEditor = ({
  onSave,
  onCancel = () => {},
  services,
  defaultTypeIsRollup = false,
  requireTimestampField = false,
  editData,
  allowAdHocDataView,
}: DataViewEditorPropsWithServices) => {
  const { Provider: KibanaReactContextProvider } =
    createKibanaReactContext<DataViewEditorContext>(services);

  return (
    <KibanaReactContextProvider>
      <EuiFlyout onClose={() => {}} hideCloseButton={true} size="l">
        <DataViewEditorLazy
          onSave={onSave}
          onCancel={onCancel}
          defaultTypeIsRollup={defaultTypeIsRollup}
          requireTimestampField={requireTimestampField}
          editData={editData}
          allowAdHocDataView={allowAdHocDataView}
        />
      </EuiFlyout>
    </KibanaReactContextProvider>
  );
};
