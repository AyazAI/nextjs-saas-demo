import type { Metadata } from "next";
import { Brand } from "@/components/brand";

export const metadata: Metadata = { title: "Harborlane" };

export default function HomePage() {
  return (
    <>
      <header className="top">
        <Brand />
        <div className="top-actions">
          <a href="/login">Sign in</a>
          <a className="btn primary" href="/signup">
            Create workspace
          </a>
        </div>
      </header>
      <main id="main">
        <section className="hero">
          <div>
            <p className="kicker">Portfolio demo · Muhammad Ayaz</p>
            <h1>
              Run the work.
              <br />
              Bill the work.
            </h1>
            <p className="lede">
              Harborlane is a multi-tenant workspace for small service teams. Clients, tasks, and
              invoices stay in one organization, with roles and a Pro plan.
            </p>
            <div className="hero-actions">
              <a className="btn primary" href="/signup">
                Create workspace
              </a>
              <a className="btn" href="/login">
                Use the sample login
              </a>
            </div>
            <p className="fine">
              Fictional sample data. Stripe test mode only. The local mock does not charge a card.
            </p>
          </div>
          <aside className="desk" aria-label="Illustrative sample">
            <p className="desk-label">Illustrative sample</p>
            <div className="desk-row">
              <span>Draft the November newsletter</span>
              <span>In progress</span>
            </div>
            <div className="desk-row">
              <span>Reconcile the Paper Lantern invoice</span>
              <span>To do</span>
            </div>
            <div className="desk-row desk-total">
              <span>SAMPLE-1001</span>
              <strong>$1,800.00</strong>
            </div>
          </aside>
        </section>
        <section className="points">
          <article>
            <h2>Organizations</h2>
            <p>Each workspace has its own clients, tasks, and invoices. A person can belong to more than one.</p>
          </article>
          <article>
            <h2>Roles</h2>
            <p>Owners manage the plan. Admins run the books. Members move tasks and cannot send invoices.</p>
          </article>
          <article>
            <h2>Pro plan</h2>
            <p>
              Free workspaces have low limits. Pro raises them through Stripe test mode, or a local mock
              when keys are absent.
            </p>
          </article>
        </section>
      </main>
      <footer className="site-footer">
        <p>
          Harborlane is a portfolio project by{" "}
          <a href="https://github.com/AyazAI">Muhammad Ayaz</a>. MIT license. It is not a launched
          product and it has no customers.
        </p>
      </footer>
    </>
  );
}
