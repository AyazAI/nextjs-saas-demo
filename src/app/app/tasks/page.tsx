import { TASK_STATUSES, TASK_STATUS_LABEL } from "@/domain/labels";
import { can } from "@/domain/permissions";
import { Flash } from "@/components/flash";
import { requireWorkspace } from "@/lib/context";
import { listClients } from "@/server/clients";
import { listMembers } from "@/server/members";
import { listTasks } from "@/server/tasks";

export default async function TasksPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string; notice?: string }>;
}) {
  const { membership } = await requireWorkspace();
  const params = await searchParams;
  const organizationId = membership.organizationId;
  const [tasks, clients, members] = await Promise.all([
    listTasks(organizationId),
    listClients(organizationId),
    listMembers(organizationId),
  ]);
  const writable = can(membership.role, "task:write");
  return (
    <>
      <header className="page-header">
        <div>
          <h1>Tasks</h1>
          <p className="lede">Work the team still owes a client.</p>
        </div>
      </header>
      <Flash error={params.error} notice={params.notice} />
      {writable ? (
        <form className="card stack" method="post" action={`/api/orgs/${organizationId}/tasks`}>
          <div className="grid-2">
            <label>
              Task title
              <input name="title" required minLength={2} maxLength={160} />
            </label>
            <label>
              Client
              <select name="clientId" defaultValue="">
                <option value="">No client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Assignee
              <select name="assigneeId" defaultValue="">
                <option value="">Unassigned</option>
                {members.map((member) => (
                  <option key={member.userId} value={member.userId}>
                    {member.user.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Due date
              <input name="dueOn" type="date" />
            </label>
          </div>
          <label>
            Description
            <textarea name="description" maxLength={2000} />
          </label>
          <button className="btn primary" type="submit">
            Add task
          </button>
        </form>
      ) : (
        <p>You can view tasks. You cannot change them.</p>
      )}
      <div className="board">
        {TASK_STATUSES.map((status) => (
          <section key={status} className="column" aria-label={TASK_STATUS_LABEL[status]}>
            <h2>{TASK_STATUS_LABEL[status]}</h2>
            {tasks.filter((task) => task.status === status).length === 0 ? (
              <p className="muted">Nothing here.</p>
            ) : null}
            {tasks
              .filter((task) => task.status === status)
              .map((task) => (
                <article key={task.id} className="card task">
                  <h3>{task.title}</h3>
                  {task.client ? <p className="kicker">{task.client.name}</p> : null}
                  {task.description ? <p className="muted">{task.description}</p> : null}
                  <p className="muted">{task.assignee?.name ?? "Unassigned"}</p>
                  {writable ? (
                    <div className="row-actions">
                      <form method="post" action={`/api/orgs/${organizationId}/tasks/${task.id}`}>
                        <label>
                          Status
                          <select
                            name="status"
                            defaultValue={task.status}
                            aria-label={`Status for ${task.title}`}
                          >
                            {TASK_STATUSES.map((option) => (
                              <option key={option} value={option}>
                                {TASK_STATUS_LABEL[option]}
                              </option>
                            ))}
                          </select>
                        </label>
                        <button className="btn" type="submit">
                          Save status
                        </button>
                      </form>
                      <form method="post" action={`/api/orgs/${organizationId}/tasks/${task.id}`}>
                        <input type="hidden" name="_action" value="delete" />
                        <button className="btn danger" type="submit" aria-label={`Delete ${task.title}`}>
                          Delete
                        </button>
                      </form>
                    </div>
                  ) : null}
                </article>
              ))}
          </section>
        ))}
      </div>
    </>
  );
}
