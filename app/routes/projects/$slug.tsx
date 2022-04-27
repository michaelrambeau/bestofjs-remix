import { LoaderFunction, useLoaderData, useTransition, json } from "remix";
import { createSearchClient } from "~/backend";

export const loader: LoaderFunction = async ({ params }) => {
  const { slug } = params;
  const client = createSearchClient();
  await wait();
  const project = await client.getProjectBySlug(slug);
  return json(project, { headers: { "Cache-Control": "max-age=3600" } });
};

export default function ProjectSlug() {
  const project = useLoaderData<BestOfJS.Project>();
  const { state } = useTransition();
  if (state === "loading") return <>Loading!</>;
  return (
    <>
      <h1>{project.name}</h1>
      <p>{project.description}</p>
    </>
  );
}

function wait(delay = 2000) {
  return new Promise((resolve) => setTimeout(resolve, delay));
}
