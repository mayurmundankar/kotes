// Unexpected errors reach the server log (`"sec":"client_error"`, with the
// app version from the User-Agent), like the website's. Native crashes and
// freezes show up in Play Console → Android vitals instead.
import { reportError } from './backend';

declare const ErrorUtils: {
  getGlobalHandler(): (error: unknown, isFatal?: boolean) => void;
  setGlobalHandler(handler: (error: unknown, isFatal?: boolean) => void): void;
};
declare const HermesInternal:
  | { enablePromiseRejectionTracker?: (options: { allRejections: boolean; onUnhandled: (id: number, error: unknown) => void }) => void }
  | undefined;

let installed = false;

export function installCrashReporting() {
  if (installed || typeof ErrorUtils === 'undefined') return;
  installed = true;

  const next = ErrorUtils.getGlobalHandler();
  ErrorUtils.setGlobalHandler((error, isFatal) => {
    reportError(isFatal ? 'fatal' : 'uncaught', error);
    next(error, isFatal);
  });

  // In development React Native shows these itself; in release they'd vanish.
  if (!__DEV__) {
    HermesInternal?.enablePromiseRejectionTracker?.({
      allRejections: true,
      onUnhandled: (_id, error) => reportError('unhandled-promise', error),
    });
  }
}
