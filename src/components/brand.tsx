import Link from "next/link";

export function Brand({ href = "/" }: { href?: string }) {
  return (
    <Link className="brand" href={href}>
      <span className="mark" aria-hidden="true" />
      Harborlane
    </Link>
  );
}
