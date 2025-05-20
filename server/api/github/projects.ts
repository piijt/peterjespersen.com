import { REQUEST_CACHE_DURATION } from "~/caching";
import type { Project } from "~/github";

type GithubRepositoryResponse = {
  data: {
    user: {
      pinnedItems: {
        nodes: Array<{
          description: string | null;
          homepageUrl: string | null;
          languages: { nodes: Array<{ color: string; name: string }> };
          name: string;
          url: string | null;
          stargazerCount: number;
        }>;
      };
    };
  };
};

export default defineCachedEventHandler(
  async (event): Promise<Project[]> => {
    const config = useRuntimeConfig(event);

    const response = await $fetch<GithubRepositoryResponse>(
      "https://api.github.com/graphql",
      {
        method: "POST",
        headers: {
          authorization: `Bearer ${config.githubToken}`,
          "user-agent": "Peter Jespersen +http://peterjespersen.com",
        },
        body: {
          query: `
            query GET_PROJECTS {
              user(login: "piijt") {
                pinnedItems(first: 6) {
                  nodes {
                    ... on Repository {
                      name
                      languages(
                        first: 3
                        orderBy: { field: SIZE, direction: DESC }
                      ) {
                        nodes {
                          color
                          name
                        }
                      }
                      description
                      homepageUrl
                      url
                      stargazerCount
                    }
                  }
                }
              }
            }
          `,
        },
      },
    );

    const projects = (response?.data?.user?.pinnedItems?.nodes ?? []).map(
      (p) => ({
        ...p,
        languages: p?.languages?.nodes ?? [],
        description: p?.description ?? "",
        homepageUrl: p?.homepageUrl ?? "",
        url: p?.url ?? "",
        stargazerCount: p?.stargazerCount ?? 0,
      }),
    );

    return projects;
  },
  {
    maxAge: REQUEST_CACHE_DURATION,
  },
);
