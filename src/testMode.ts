// Usability-test links: ?test hides prototype-only controls (they give away the answers);
// ?test&fail makes the next "Create VM" with more than 64 GB RAM fail, for the recovery task.
const params = new URLSearchParams(window.location.search);
export const TEST_MODE = params.has("test");
export const FORCE_FAIL = params.has("fail");
