<template>
  <div class="text-sm">
    <h2 class="text-lg font-semibold mb-4">Work Experience</h2>
    <div class="space-y-8">
      <div v-for="(entry, index) in entries" :key="index" class="relative pl-6">
        <div class="absolute left-0 top-2 w-2 h-2 rounded-full bg-gray-700"></div>
        <NuxtLink class="block" :to="entry.website" target="_blank">
          <div class="flex flex-col">
            <span class="primary font-medium">
              {{ entry.role }}
            </span>
            <span class="text-gray-300">
              {{ entry.company }}
            </span>
          </div>
        </NuxtLink>
        <div class="mt-2 text-gray-500 text-xs">
          <span class="flex items-center">
            <span class="mr-2">·</span>
            {{ formatEmploymentHistory(entry) }}
          </span>
        </div>
        <div class="mt-3 text-gray-300">
          <p>{{ entry.tldr }}</p>
          <NuxtLink v-if="summary_view" :to="'/work'" class="primary text-sm mt-1 inline-block">
            Read more...
          </NuxtLink>
        </div>
        <div v-if="!summary_view" class="mt-4 flex flex-wrap gap-2">
          <img 
            v-for="(tech, techIndex) in entry.tech" 
            :key="techIndex" 
            :src="tech" 
            :alt="tech"
            class="h-6"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
import { useWorkHistory } from "~/composables/useResumeHistory";

const props = defineProps<{ length: number; summary_view: boolean }>();

const { formatEmploymentHistory, employment_history, hiddenChar } =
  useWorkHistory();

const entries = computed(() => {
  return employment_history.value.splice(0, props.length).map((item) => {
    if (props.summary_view) {
      const tldr = item.tldr.split(hiddenChar);
      item.tldr = tldr[0];
    }
    return item;
  });
});
</script>
