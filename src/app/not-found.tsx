import Link from "next/link";
import { Brand } from "@/components/brand";

export default function NotFound() {
  return (
    <main className="gate" id="main">
      <Brand />
      <h1>That page is not here</h1>
      <p>The link may be old, or the record is in another workspace.</p>
      <Link className="btn primary" href="/">
        Back to Harborlane
      </Link>
    </main>
  );
}
