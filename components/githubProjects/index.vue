<template>
  <div class="text-sm">
    <h2 class="text-lg font-semibold mb-4">Featured Projects</h2>
    <div v-if="pending" class="text-gray-400">
      Loading projects...
    </div>
    <div v-else-if="error" class="text-red-400">
      {{ error }}
    </div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div 
        v-for="repo in data?.user?.pinnedItems?.nodes" 
        :key="repo.id"
        class="bg-gray-800/50 rounded-lg p-4 hover:bg-gray-700/50 transition-colors duration-200"
      >
        <div class="flex flex-col h-full">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-lg font-medium primary">
              <a :href="repo.url" target="_blank" class="hover:underline">
                {{ repo.name }}
              </a>
            </h3>
            <div class="flex items-center text-sm text-gray-400">
              <span class="flex items-center">
                <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 .25a.75.75 0 01.673.418l3.058 6.197 6.839.994a.75.75 0 01.415 1.279l-4.948 4.823 1.168 6.811a.75.75 0 01-1.088.791L12 18.347l-6.117 3.216a.75.75 0 01-1.088-.79l1.168-6.812-4.948-4.823a.75.75 0 01.416-1.28l6.838-.993L11.327.668A.75.75 0 0112 .25z"/>
                </svg>
                {{ repo.stargazerCount }}
              </span>
            </div>
          </div>
          <p class="text-gray-300 text-sm mb-4 flex-grow">{{ repo.description || 'No description available' }}</p>
          <div class="flex flex-wrap gap-2 mt-auto">
            <span 
              v-for="topic in repo.repositoryTopics.nodes" 
              :key="topic.topic.name"
              class="text-xs px-2 py-1 bg-gray-700/50 rounded-full text-gray-300"
            >
              {{ topic.topic.name }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
const fetchGithubProjects = async () => {
  const config = useRuntimeConfig();
  const token = config.public.githubToken;

  const query = `
    query {
      user(login: "piijt") {
        pinnedItems(first: 6, types: REPOSITORY) {
          nodes {
            ... on Repository {
              id
              name
              description
              url
              stargazerCount
              repositoryTopics(first: 10) {
                nodes {
                  topic {
                    name
                  }
                }
              }
            }
          }
        }
      }
    }
  `;

  return useFetch('https://api.github.com/graphql', {
    method: 'POST',
    body: JSON.stringify({ query }),
    key: 'github-pinned-repos',
    headers: {
      'Content-Type': 'application/json',
      'Accept': 'application/json',
      'Authorization': `Bearer ${token}`
    },
    transform: (response: any) => response.data,
    server: true
  });
};

const { data, pending, error } = await fetchGithubProjects();
</script> 