export default function RouteLoadingFallback() {
  return (
    <div className="lf-content">
      <div className="lf-loading" style={{ minHeight: "400px" }} aria-live="polite">
        <span className="lf-spinner" />
        <strong>Loading page…</strong>
        <p>Fetching view components and latest records…</p>
      </div>
    </div>
  );
}
