/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UpdateGroupsRequest } from '../../../common/types/job_service';
import { CalendarManager } from '../calendar';
import { GLOBAL_CALENDAR } from '../../../common/constants/calendars';
import type { Group } from '../../../common/types/groups';
import type { MlClient } from '../../lib/ml_client';

export interface Results {
  [id: string]: {
    success: boolean;
    error?: any;
  };
}

export function groupsProvider(mlClient: MlClient) {
  const calMngr = new CalendarManager(mlClient);

  async function getAllGroups() {
    const groups: { [id: string]: Group } = Object.create(null);
    const jobIds: { [id: string]: undefined | null } = Object.create(null);
    const [body, calendars] = await Promise.all([mlClient.getJobs(), calMngr.getAllCalendars()]);

    const { jobs } = body;
    if (jobs) {
      jobs.forEach((job) => {
        jobIds[job.job_id] = null;
        if (job.groups !== undefined) {
          job.groups.forEach((g) => {
            if (groups[g] === undefined) {
              groups[g] = {
                id: g,
                jobIds: [job.job_id],
                calendarIds: [],
              };
            } else {
              groups[g].jobIds.push(job.job_id);
            }
          });
        }
      });
    }
    if (calendars) {
      calendars.forEach((cal) => {
        cal.job_ids.forEach((jId) => {
          // don't include _all in the calendar groups list
          if (jId !== GLOBAL_CALENDAR && jobIds[jId] === undefined) {
            if (groups[jId] === undefined) {
              groups[jId] = {
                id: jId,
                jobIds: [],
                calendarIds: [cal.calendar_id],
              };
            } else {
              groups[jId].calendarIds.push(cal.calendar_id);
            }
          }
        });
      });
    }

    return Object.keys(groups)
      .sort()
      .map((g) => groups[g]);
  }

  async function updateGroups(jobs: UpdateGroupsRequest['jobs']) {
    const results: Results = Object.create(null);
    for (const job of jobs) {
      const { jobId, groups } = job;
      try {
        await mlClient.updateJob({ job_id: jobId, groups });
        results[jobId] = { success: true };
      } catch ({ body }) {
        results[jobId] = { success: false, error: body };
      }
    }
    return results;
  }

  return {
    getAllGroups,
    updateGroups,
  };
}
