"use client";

type ErrorPageProps = {
  error: Error & { digest?: string };
  reset: () => void;
};

export default function ErrorPage({ reset }: ErrorPageProps) {
  return (
    <main className="login-page">
      <section className="panel">
        <p className="section-eyebrow">OmaLeima</p>
        <h1 className="panel-title">Something went wrong</h1>
        <p className="muted-copy">
          The dashboard could not complete this request. Please try again or contact support if the problem persists.
        </p>
        <button className="button button-primary" onClick={reset} type="button">
          Try again
        </button>
      </section>
    </main>
  );
}
