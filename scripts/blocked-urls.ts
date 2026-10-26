// Shared by the release-gate scripts: a source page on a blocked host (see backend BLOCKED_HOSTS) is not fetched.
import { config, hostList } from '../backend/src/config';

const blocked = new Set(config.blockedHosts);

export const isBlockedUrl = (url: string) => {
  try {
    return blocked.has(hostList(new URL(url).host)[0]);
  } catch {
    return false;
  }
};
