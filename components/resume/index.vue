<template>
  <div>
    <div class="text-sm">
      <p>Work</p>
      <div class="space-x-2 flex flex-col mt-2 pb-2" v-for="entry in entries">
        <NuxtLink class="primary" :to="entry.website" target="_blank">
          <span
            class="flex flex-row gap-x-2 align-center justify-content m-auto"
          >
            {{ entry.role }} - {{ entry.company }}
          </span>
        </NuxtLink>
        <div class="">
          <span class="text-gray-500 text-xs pl-2 pt-1">
            · {{ formatEmploymentHistory(entry) }}
          </span>
          <div class="text-sm text-gray-300 cursor-vertical-text pt-1">
            <span>
              {{ entry.tldr }}
            </span>
            <span v-if="summary_view" class="primary"
              ><NuxtLink :to="'/work'">...</NuxtLink></span
            >
          </div>
          <div v-if="!summary_view" class="pt-2 flex flex-row gap-2 flex-wrap">
            <img v-for="t in entry.tech" :src="t" style="height: 25px" />
          </div>
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
      // item.tech = []
      const tldr = item.tldr.split(hiddenChar);
      item.tldr = tldr[0];
    }
    return item;
  });
});
</script>
