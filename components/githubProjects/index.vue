<template>
  <div class="text-sm">
    <h2 class="text-lg font-semibold mb-4">Featured Projects</h2>
    <div v-if="loading" class="text-gray-400">
      Loading projects...
    </div>
    <div v-else-if="error" class="text-red-400">
      {{ error }}
    </div>
    <div v-else class="grid grid-cols-1 md:grid-cols-2 gap-4">
      <div 
        v-for="repo in repositories" 
        :key="repo.id"
        class="bg-gray-800 rounded-lg p-4 hover:bg-gray-700 transition-colors duration-200"
      >
        <div class="flex flex-col h-full">
          <div class="flex items-center justify-between mb-2">
            <h3 class="text-lg font-medium primary">
              <a :href="repo.url" target="_blank" class="hover:underline">
                {{ repo.name }}
              </a>
            </h3>
            <div class="flex items-center space-x-2 text-sm text-gray-400">
              <span class="flex items-center">
                <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 .25a.75.75 0 01.673.418l3.058 6.197 6.839.994a.75.75 0 01.415 1.279l-4.948 4.823 1.168 6.811a.75.75 0 01-1.088.791L12 18.347l-6.117 3.216a.75.75 0 01-1.088-.79l1.168-6.812-4.948-4.823a.75.75 0 01.416-1.28l6.838-.993L11.327.668A.75.75 0 0112 .25z"/>
                </svg>
                {{ repo.stargazers }}
              </span>
              <span class="flex items-center">
                <svg class="w-4 h-4 mr-1" fill="currentColor" viewBox="0 0 24 24">
                  <path d="M12 21a1.75 1.75 0 110-3.5 1.75 1.75 0 010 3.5zm-3.25-1.75a3.25 3.25 0 106.5 0 3.25 3.25 0 00-6.5 0zm-3-12.75a1.75 1.75 0 110-3.5 1.75 1.75 0 010 3.5zM2.5 4.75a3.25 3.25 0 106.5 0 3.25 3.25 0 00-6.5 0zM18.25 6.5a1.75 1.75 0 110-3.5 1.75 1.75 0 010 3.5zM15 4.75a3.25 3.25 0 106.5 0 3.25 3.25 0 00-6.5 0z"/>
                </svg>
                {{ repo.forks }}
              </span>
            </div>
          </div>
          <p class="text-gray-300 text-sm mb-4 flex-grow">{{ repo.description }}</p>
          <div class="flex flex-wrap gap-2 mt-auto">
            <span 
              v-for="topic in repo.topics" 
              :key="topic"
              class="text-xs px-2 py-1 bg-gray-700 rounded-full text-gray-300"
            >
              {{ topic }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue';
import { useRuntimeConfig } from 'nuxt/app';

interface Repository {
  id: number;
  name: string;
  description: string;
  url: string;
  stargazers: number;
  forks: number;
  topics: string[];
}

const repositories = ref<Repository[]>([]);
const loading = ref(true);
const error = ref('');

const fetchPinnedRepos = async () => {
  try {
    const config = useRuntimeConfig();
    const token = config.public.githubToken;
    
    if (!token) {
      throw new Error('GitHub token is not configured');
    }

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
                forkCount
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

    const response = await fetch('https://api.github.com/graphql', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
        'Authorization': `token ${token}`
      },
      body: JSON.stringify({ query })
    });

    const data = await response.json();
    
    if (data.errors) {
      throw new Error(data.errors[0].message);
    }

    if (!data.data?.user?.pinnedItems?.nodes) {
      throw new Error('No pinned repositories found');
    }

    const pinnedRepos = data.data.user.pinnedItems.nodes.map((repo: any) => ({
      id: repo.id,
      name: repo.name,
      description: repo.description || 'No description available',
      url: repo.url,
      stargazers: repo.stargazerCount,
      forks: repo.forkCount,
      topics: repo.repositoryTopics.nodes.map((node: any) => node.topic.name)
    }));
    
    repositories.value = pinnedRepos;
  } catch (err) {
    error.value = err instanceof Error ? err.message : 'Failed to load projects. Please try again later.';
    console.error('Error fetching GitHub repositories:', err);
  } finally {
    loading.value = false;
  }
};

onMounted(() => {
  fetchPinnedRepos();
});
</script> 