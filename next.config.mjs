/** @type {import('next').NextConfig} */
export default {
  // Pin tracing to this folder so a lockfile in a parent directory isn't
  // mistaken for the workspace root.
  outputFileTracingRoot: import.meta.dirname,
};
