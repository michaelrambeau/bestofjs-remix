import { Link } from "remix";

export const ProjectTable = ({ projects }: { projects: BestOfJS.Project }) => {
  return (
    <table>
      <tbody>
        {projects.map((project) => (
          <tr key={project.slug}>
            <td>
              <Link to={`projects/${project.slug}`}>{project.name}</Link>
            </td>
            <td>{project.description}</td>
          </tr>
        ))}
      </tbody>
    </table>
  );
};
