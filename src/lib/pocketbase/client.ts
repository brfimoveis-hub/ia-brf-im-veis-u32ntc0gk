import PocketBase from 'pocketbase'

const pb = new PocketBase(import.meta.env.VITE_POCKETBASE_URL)

// Auto-cancellation is enabled so that when a component unmounts or a request
// becomes stale (React StrictMode double-invoke, route changes, rapid refetches),
// the pending request is cancelled instead of lingering and blocking newer ones.
// Without it, stacked pending requests accumulate and eventually freeze the app.
pb.autoCancellation(true)

export default pb
