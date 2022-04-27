import { Link, useLoaderData } from "remix";
import { createSearchClient } from "~/backend";
import { ProjectTable } from "./project-list/project-table";

export async function loader() {
  const client = createSearchClient();
  const { projects: hotProjects } = await client.findProjects({
    criteria: {
      tags: { $nin: ["meta", "learning"] },
    },
    sort: {
      "trends.daily": -1,
    },
    limit: 5,
  });
  return { hotProjects };
}

export default function Index() {
  const { hotProjects } = useLoaderData();
  return (
    <div style={{ fontFamily: "system-ui, sans-serif", lineHeight: "1.4" }}>
      <h1>Welcome to Remix</h1>
      <ProjectTable projects={hotProjects} />
      <ul>
        <li>
          <a
            target="_blank"
            href="https://remix.run/tutorials/blog"
            rel="noreferrer"
          >
            15m Quickstart Blog Tutorial
          </a>
        </li>
        <li>
          <a
            target="_blank"
            href="https://remix.run/tutorials/jokes"
            rel="noreferrer"
          >
            Deep Dive Jokes App Tutorial
          </a>
        </li>
        <li>
          <a target="_blank" href="https://remix.run/docs" rel="noreferrer">
            Remix Docs
          </a>
        </li>
      </ul>
      <Link to="/posts">Posts</Link>
    </div>
  );
}
