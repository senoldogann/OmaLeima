import Link from "next/link";

export default function NotFoundPage() {
  return (
    <main className="login-page">
      <section className="panel">
        <p className="section-eyebrow">OmaLeima</p>
        <h1 className="panel-title">Page not found</h1>
        <p className="muted-copy">The page you requested is not available.</p>
        <Link className="button button-primary" href="/login">
          Back to login
        </Link>
      </section>
    </main>
  );
}
