/**
 * GA4 custom event helpers.
 * All calls are no-ops if gtag is not loaded (e.g. GA_ID not set).
 */
const gtag = (...args) => {
    if (typeof window !== "undefined" && typeof window.gtag === "function") {
        window.gtag(...args);
    }
};

export const trackEvent = (name, params = {}) => gtag("event", name, params);

// Hearing test events
export const trackTestStarted = () => trackEvent("hearing_test_started");

export const trackTestCompleted = ({ pta, severity }) =>
    trackEvent("hearing_test_completed", { pta_value: pta, severity_label: severity });

// Booking event
export const trackBookingSubmitted = ({ source }) =>
    trackEvent("booking_submitted", { booking_source: source });

// Simulator event
export const trackSimulatorUsed = ({ profile }) =>
    trackEvent("simulator_used", { hearing_profile: profile });
