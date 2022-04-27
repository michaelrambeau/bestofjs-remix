import mingo, { Query } from "mingo";
import { RawObject } from "mingo/types";
import fetch from "node-fetch";
import keyBy from "lodash/keyBy";
import debugModule from "debug";
import slugify from "slugify";

const debug = debugModule("bestofjs");

type Data = {
  projectCollection: BestOfJS.RawProject[];
  tagCollection: BestOfJS.RawTag[];
  tagsByKey: { [key: string]: BestOfJS.Tag };
  populate: (project: BestOfJS.RawProject) => BestOfJS.Project;
  projectsBySlug: { [key: string]: BestOfJS.Project };
};

export function createSearchClient() {
  let data: Data;
  async function getData() {
    return data || (await fetchData());
  }

  async function fetchData() {
    const { projects, tags: rawTags } = await fetchProjectData();
    const tagsByKey = getTagsByKey(rawTags, projects);
    const projectsBySlug = keyBy(projects, getProjectId);

    data = {
      projectCollection: projects,
      tagCollection: Object.values(tagsByKey),
      populate: populateProject(tagsByKey),
      tagsByKey,
      projectsBySlug,
    };
    return data;
  }

  return {
    async findProjects(searchQuery: QueryParams) {
      debug("Find", searchQuery);
      const { criteria, sort, skip, limit, projection } = searchQuery;
      const { projectCollection, populate, tagsByKey } = await getData();
      let cursor = mingo
        .find(projectCollection, criteria, projection)
        .sort(sort);
      const total = cursor.count();

      const projects: BestOfJS.Project[] = mingo
        .find(projectCollection, criteria, projection)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .all();

      const tagIds = criteria?.tags?.$all || [];
      const selectedTags = tagIds.map((tag) => tagsByKey[tag]);
      const relevantTagIds =
        tagIds.length > 0
          ? getResultRelevantTags(projects, tagIds).map(([id, count]) => id)
          : [];
      const relevantTags = relevantTagIds.map((tag) => tagsByKey[tag]);

      return {
        projects: projects.map(populate),
        selectedTags,
        relevantTags,
        total,
      };
    },

    async findTags(searchQuery: QueryParams) {
      const { criteria, sort, skip, limit } = searchQuery;
      const { tagCollection } = await getData();
      const query = new Query(criteria || {});
      let cursor = query.find(tagCollection);
      const total = cursor.count();

      const tags: BestOfJS.Tag[] = query
        .find(tagCollection)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .all();

      return {
        tags,
        total,
      };
    },

    // return tags with the most popular projects, for each tag
    async findTagsWithProjects(searchQuery: QueryParams) {
      const { criteria, sort, skip, limit } = searchQuery;
      const { tagCollection } = await getData();
      const query = new Query(criteria || {});
      let cursor = query.find(tagCollection);
      const total = cursor.count();

      const tags: BestOfJS.Tag[] = query
        .find(tagCollection)
        .sort(sort)
        .skip(skip)
        .limit(limit)
        .all();

      for await (const tag of tags) {
        const { projects } = await this.findProjects({
          criteria: { tags: { $in: [tag.code] } },
          sort: { stars: -1 },
          limit: 5,
          projection: { name: 1, owner_id: 1, icon: 1 },
        });

        tag.projects = projects;
      }

      return {
        tags,
        total,
      };
    },

    async findOne(criteria): Promise<BestOfJS.Project> {
      const { projectCollection, populate } = await getData();
      const query = new Query(criteria);
      const cursor = query.find(projectCollection);
      const projects: BestOfJS.Project[] = cursor.limit(1).all();
      return projects.length ? populate(projects[0]) : undefined;
    },

    async getProjectBySlug(slug: string) {
      const { populate, projectsBySlug } = await getData();
      return populate(projectsBySlug[slug]);
    },
  };
}

type QueryParams = {
  criteria: RawObject;
  sort: RawObject;
  limit: number;
  skip?: number;
};

function getTagsByKey(
  tags: BestOfJS.RawTag[],
  projects: BestOfJS.RawProject[]
) {
  const byKey = tags.reduce((acc, tag) => {
    return { ...acc, [tag.code]: tag };
  }, {});

  projects.forEach(({ tags }) => {
    tags.forEach((tag) => {
      byKey[tag].counter = byKey[tag].counter ? byKey[tag].counter + 1 : 1;
    });
  });

  return byKey;
}

const populateProject = (tagsByKey) => (project: BestOfJS.Project) => {
  const populated = { ...project };
  const { full_name, tags } = project;

  if (full_name) {
    populated.repository = "https://github.com/" + full_name;
  }

  if (tags) {
    populated.tags = tags.map((id) => tagsByKey[id]).filter((tag) => !!tag);
  }

  populated.slug = getProjectId(project);

  if (project.npm) {
    populated.packageName = project.npm; // TODO fix data?
  }

  return populated;
};

async function fetchProjectData() {
  try {
    const url = `https://bestofjs-static-api.vercel.app/projects.json`;
    console.log(`Fetching JSON data from ${url}`);
    return await fetch(url).then((res) => res.json());
  } catch (error) {
    console.error(error);
  }
}

// TODO add types: => [[ 'nodejs-framework', 6 ], [...], ...]
function getResultRelevantTags(
  projects: BestOfJS.Project[],
  excludedTags: string[] = []
) {
  const projectCountByTag = getTagsFromProjects(projects, excludedTags);
  return orderBy(
    Array.from(projectCountByTag.entries()),
    ([tagId, count]) => count
  );
}

function orderBy(items, fn) {
  return items.sort((a, b) => fn(b) - fn(a));
}

function getTagsFromProjects(
  projects: BestOfJS.Project[],
  excludedTagIds: any[] = []
) {
  const result = new Map();
  projects.forEach((project) => {
    project.tags
      .filter((tagId) => !excludedTagIds.includes(tagId))
      .forEach((tagId) => {
        if (result.has(tagId)) {
          result.set(tagId, result.get(tagId) + 1);
        } else {
          result.set(tagId, 1);
        }
      });
  });
  return result;
}

export function getProjectId(project: BestOfJS.Project) {
  return slugify(project.name, { lower: true, remove: /[.'/]/g });
}
