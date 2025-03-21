/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { act, waitFor, renderHook } from '@testing-library/react';
import * as api from './api';
import { basicCaseId, basicFileMock } from './mock';
import { useRefreshCaseViewPage } from '../components/case_view/use_on_refresh_case_view_page';
import { useToasts } from '../common/lib/kibana';
import { useDeleteFileAttachment } from './use_delete_file_attachment';
import { TestProviders } from '../common/mock';

jest.mock('./api');
jest.mock('../common/lib/kibana');
jest.mock('../components/case_view/use_on_refresh_case_view_page');

describe('useDeleteFileAttachment', () => {
  const addSuccess = jest.fn();
  const addError = jest.fn();

  (useToasts as jest.Mock).mockReturnValue({ addSuccess, addError });

  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('calls deleteFileAttachment with correct arguments - case', async () => {
    const spyOnDeleteFileAttachments = jest.spyOn(api, 'deleteFileAttachments');

    const { result } = renderHook(() => useDeleteFileAttachment(), {
      wrapper: TestProviders,
    });

    act(() => {
      result.current.mutate({
        caseId: basicCaseId,
        fileId: basicFileMock.id,
      });
    });

    await waitFor(() =>
      expect(spyOnDeleteFileAttachments).toHaveBeenCalledWith({
        caseId: basicCaseId,
        fileIds: [basicFileMock.id],
      })
    );
  });

  it('refreshes the case page view', async () => {
    const { result } = renderHook(() => useDeleteFileAttachment(), {
      wrapper: TestProviders,
    });

    act(() =>
      result.current.mutate({
        caseId: basicCaseId,
        fileId: basicFileMock.id,
      })
    );

    await waitFor(() => expect(useRefreshCaseViewPage()).toBeCalled());
  });

  it('shows a success toaster correctly', async () => {
    const { result } = renderHook(() => useDeleteFileAttachment(), {
      wrapper: TestProviders,
    });

    act(() =>
      result.current.mutate({
        caseId: basicCaseId,
        fileId: basicFileMock.id,
      })
    );

    await waitFor(() =>
      expect(addSuccess).toHaveBeenCalledWith({
        title: 'File deleted successfully',
        className: 'eui-textBreakWord',
      })
    );
  });

  it('sets isError when fails to delete a file attachment', async () => {
    const spyOnDeleteFileAttachments = jest.spyOn(api, 'deleteFileAttachments');
    spyOnDeleteFileAttachments.mockRejectedValue(new Error('Error'));

    const { result } = renderHook(() => useDeleteFileAttachment(), {
      wrapper: TestProviders,
    });

    act(() =>
      result.current.mutate({
        caseId: basicCaseId,
        fileId: basicFileMock.id,
      })
    );

    await waitFor(() => expect(result.current.isError).toBe(true));

    expect(spyOnDeleteFileAttachments).toBeCalledWith({
      caseId: basicCaseId,
      fileIds: [basicFileMock.id],
    });

    expect(addError).toHaveBeenCalled();
  });
});
