<template>
  <div class="text-sm">
    <h2 class="text-lg font-semibold mb-4">Education</h2>
    <div class="space-y-8">
      <div v-for="(item, index) in entries" :key="index" class="relative pl-6">
        <div class="absolute left-0 top-2 w-2 h-2 rounded-full bg-gray-700"></div>
        <div class="flex flex-col">
          <span class="primary font-medium">
            {{ item.school.title }}
          </span>
          <span class="text-gray-300">
            {{ item.title }}
          </span>
        </div>
        <div class="flex flex-col mt-2 text-gray-500 text-xs">
          <span class="flex items-center">
            <span class="mr-2">·</span>
            {{ item.duration }}
          </span>
          <span class="flex items-center">
            <span class="mr-2">·</span>
            {{ item.location }}
          </span>
        </div>
        <div class="mt-3">
          <p class="text-xs text-gray-400 mb-1">Skills:</p>
          <div class="flex flex-wrap gap-2">
            <span 
              v-for="(skill, skillIndex) in item.skills" 
              :key="skillIndex"
              class="text-xs px-2 py-1 bg-gray-800 rounded-full text-gray-300"
            >
              {{ skill }}
            </span>
          </div>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts" setup>
const entries = ref([
  {
    title: "Bachelor, Web Development",
    location: "Denmark, Kolding",
    school: {
      title: "International Business College, Kolding",
    },
    duration: "2018-2020",
    skills: [
      "Objective Programming",
      "Data Structures",
      "Algorithms",
      "Blockchain Technologies",
    ],
  },
  {
    title: "AP Degree, Multimedia Design",
    location: "Denmark, Kolding",
    school: {
      title: "International Business College, Kolding",
    },
    duration: "2016-2018",
    skills: ["PhP", "Adobe CC", "Photoshop", "Node.js", "Project Planning"],
  },
]);
</script>
