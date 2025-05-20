<template>
  <div class="text-sm">
    <h2 class="text-lg font-semibold mb-4">Education</h2>
    <div class="space-y-8">
      <div v-for="(item, index) in entries" :key="index" class="relative pl-6">
        <div class="absolute left-0 top-2 w-2 h-2 rounded-full bg-gray-700"></div>
        <div class="flex flex-col">
          <span class="primary font-medium cursor-pointer">
            {{ item.school.title }}
          </span>
          <span class="text-gray-300 cursor-pointer">
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
          <div class="flex flex-wrap gap-2">
            <img 
              v-for="(skill, skillIndex) in item.skills" 
              :key="skillIndex" 
              :src="skill" 
              :alt="skill"
              class="h-6"
            />
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
      "https://img.shields.io/badge/Objective_Programming-282C34?style=for-the-badge&logo=java&logoColor=white",
      "https://img.shields.io/badge/Data_Structures-282C34?style=for-the-badge&logo=java&logoColor=white",
      "https://img.shields.io/badge/Algorithms-282C34?style=for-the-badge&logo=java&logoColor=white",
      "https://img.shields.io/badge/Blockchain-282C34?style=for-the-badge&logo=ethereum&logoColor=white",
    ],
  },
  {
    title: "AP Degree, Multimedia Design",
    location: "Denmark, Kolding",
    school: {
      title: "International Business College, Kolding",
    },
    duration: "2016-2018",
    skills: [
      "https://img.shields.io/badge/PHP-282C34?style=for-the-badge&logo=php&logoColor=white",
      "https://img.shields.io/badge/Adobe_CC-282C34?style=for-the-badge&logo=adobe&logoColor=white",
      "https://img.shields.io/badge/Photoshop-282C34?style=for-the-badge&logo=adobe-photoshop&logoColor=white",
      "https://img.shields.io/badge/Node.js-282C34?style=for-the-badge&logo=nodedotjs&logoColor=white",
      "https://img.shields.io/badge/Project_Planning-282C34?style=for-the-badge&logo=trello&logoColor=white",
    ],
  },
]);
</script>
