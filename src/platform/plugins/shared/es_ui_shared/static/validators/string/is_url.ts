/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

const protocolAndDomainRE = /^(?:\w+:)?\/\/(\S+)$/;
const localhostDomainRE = /^localhost[\:?\d]*(?:[^\:?\d]\S*)?$/;
const nonLocalhostDomainRE = /^[^\s\.]+\.\S{2,}$/;
const nonLocalhostDomainNoTldRE = /^[^\s\.]+$/;

export const isUrl = (string: string, { requireTld = true }: { requireTld?: boolean } = {}) => {
  if (typeof string !== 'string') {
    return false;
  }

  const match = string.match(protocolAndDomainRE);

  if (!match) {
    return false;
  }

  const everythingAfterProtocol = match[1];

  if (!everythingAfterProtocol) {
    return false;
  }

  if (
    !requireTld &&
    (localhostDomainRE.test(everythingAfterProtocol) ||
      nonLocalhostDomainNoTldRE.test(everythingAfterProtocol))
  ) {
    return true;
  }

  if (
    localhostDomainRE.test(everythingAfterProtocol) ||
    nonLocalhostDomainRE.test(everythingAfterProtocol)
  ) {
    return true;
  }

  return false;
};
