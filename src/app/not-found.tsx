import Link from "next/link";

export default function NotFound() {
  return (
    <main className="page bare" style={{ display: "flex", flexDirection: "column", justifyContent: "center", gap: 22 }}>
      <p className="eyebrow">404</p>
      <h1 className="display">
        This page is <em>unwritten.</em>
      </h1>
      <p className="lede">The line you were looking for isn&apos;t here.</p>
      <div>
        <Link href="/" className="btn">
          Back to kotes
        </Link>
      </div>
    </main>
  );
}
